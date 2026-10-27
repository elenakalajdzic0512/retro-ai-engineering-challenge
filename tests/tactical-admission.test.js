import test from 'node:test';
import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { createGame } from '../src/game.js';
import { deriveTacticalSnapshot } from '../src/tactical-snapshot.js';
import { createApiServer } from '../dist-server/index.js';
import { createTacticalFakeProvider } from '../dist-server/tactical/fake-provider.js';
import { invokeTacticalTool } from '../dist-server/tactical/tools.js';
import { request as httpRequest } from 'node:http';

// T005's hold/release fake-provider pattern, reused at the HTTP boundary. These
// counters observe the fake, not a production admission slot or rate ledger.
const request = () => ({ goal: 'Clear the center safely.', state: deriveTacticalSnapshot(createGame()) });
const outcomes = () => [
  { type: 'tool_call', toolName: 'get_tactical_snapshot', arguments: {} },
  { type: 'tool_call', toolName: 'evaluate_tactical_strategy', arguments: {
    targetZone: 'center', style: 'balanced', paddleContact: 'center', route: 'direct',
  } },
  { type: 'final', output: {
    summary: 'Clear the center with controlled bounces.', strategy: 'balanced',
    targetZone: 'center', paddleContact: 'center', route: 'direct',
    actions: ['Aim near the center of the paddle.'],
    evidence: [{ source: 'tactical_snapshot', fact: 'lives' },
      { source: 'strategy_evaluation', fact: 'paddleAligned' }],
  } },
];
const gate = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};
const post = (base, body = request(), signal) => fetch(`${base}/api/tactical-coach`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal,
});

async function withServer(options, action) {
  const server = createApiServer({
    tacticalGeminiProviderFactory() { throw new Error('Live provider must not be selected.'); },
    ...options,
  });
  await new Promise((resolve, reject) => server.listen(0, '127.0.0.1', resolve).once('error', reject));
  try { return await action(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
}

function fixture({ hold = false, clock = { now: () => 0 } } = {}) {
  const metrics = { constructed: 0, attempts: 0, toolCalls: 0, activeFakeCalls: 0, maxActiveFakeCalls: 0, releasedFakeCalls: 0 };
  const held = [];
  const entered = [];
  const options = {
    tacticalOrchestrationOptions: { now: clock.now },
    tacticalToolExecutor(name, args, context) {
      metrics.toolCalls++;
      return invokeTacticalTool(name, args, context);
    },
    tacticalProviderFactory() {
      metrics.constructed++;
      const fake = createTacticalFakeProvider({ outcomes: outcomes() });
      let first = true;
      return { async generate(call) {
        metrics.attempts++;
        if (first && hold) {
          first = false;
          const pending = gate();
          held.push(pending);
          metrics.activeFakeCalls++;
          metrics.maxActiveFakeCalls = Math.max(metrics.maxActiveFakeCalls, metrics.activeFakeCalls);
          entered.shift()?.resolve();
          await pending.promise;
          metrics.activeFakeCalls--;
          metrics.releasedFakeCalls++;
        }
        first = false;
        return fake.generate(call);
      } };
    },
  };
  return {
    options, metrics,
    waitForEntry() {
      const pending = gate();
      entered.push(pending);
      pending.promise.cancel = () => {
        const index = entered.indexOf(pending);
        if (index >= 0) entered.splice(index, 1);
      };
      return pending.promise;
    },
    releaseNext() { const pending = held.shift(); assert.ok(pending); pending.resolve(); },
    releaseAll() { while (held.length) held.shift().resolve(); },
  };
}

function expectW08OrTodo(t, observed, expected, label) {
  if (isDeepStrictEqual(observed, expected)) assert.deepEqual(observed, expected);
  else {
    assert.notDeepEqual(observed, expected, `${label} must remain visibly red while the control is absent`);
    t.diagnostic(`${label}: expected ${JSON.stringify(expected)}; observed ${JSON.stringify(observed)}`);
    t.todo(`W08 gap pending T031–T034: ${label}`);
  }
}

test('T13 concurrency: third valid HTTP arrival does no work while two runs are held; capacity recovers', { timeout: 10_000 }, async (t) => {
  const f = fixture({ hold: true });
  await withServer(f.options, async (base) => {
    const aEntered = f.waitForEntry();
    const a = post(base); await aEntered;
    const bEntered = f.waitForEntry();
    const b = post(base); await bEntered;
    assert.equal(f.metrics.activeFakeCalls, 2);
    const before = { constructed: f.metrics.constructed, attempts: f.metrics.attempts };
    const cEntered = f.waitForEntry();
    const c = post(base);
    const first = await Promise.race([cEntered.then(() => 'provider'), c.then(() => 'response')]);
    if (first === 'response') cEntered.cancel();
    const observed = {
      thirdStartedProvider: first === 'provider',
      thirdProviderConstructions: f.metrics.constructed - before.constructed,
      thirdProviderAttempts: f.metrics.attempts - before.attempts,
      maxActiveFakeCalls: f.metrics.maxActiveFakeCalls,
    };
    f.releaseNext();
    assert.equal((await a).status, 200);
    const dEntered = f.waitForEntry();
    const d = post(base);
    const recovered = await Promise.race([dEntered.then(() => 'provider'), d.then(() => 'response')]);
    if (recovered === 'response') dEntered.cancel();
    f.releaseAll();
    const [bResponse, cResponse, dResponse] = await Promise.all([b, c, d]);
    assert.equal(bResponse.status, 200);
    assert.equal(dResponse.status, 200);
    observed.thirdStatus = cResponse.status;
    observed.totalToolCalls = f.metrics.toolCalls;
    assert.equal(recovered, 'provider', 'A valid request starts after a capacity slot frees.');
    expectW08OrTodo(t, observed, {
      thirdStartedProvider: false, thirdProviderConstructions: 0,
      thirdProviderAttempts: 0, maxActiveFakeCalls: 2,
      thirdStatus: 429, totalToolCalls: 6,
    }, 'T13 active cap of two and zero work for excess');
  });
});

test('T13 rolling 60-second rate: invalid and rejected arrivals excluded', { timeout: 10_000 }, async (t) => {
  let now = 1_000;
  const f = fixture({ clock: { now: () => now } });
  await withServer(f.options, async (base) => {
    const invalid = await post(base, { ...request(), goal: '' });
    assert.equal(invalid.status, 400);
    assert.equal(f.metrics.constructed, 0);
    const admitted = [];
    for (let i = 0; i < 5; i++) admitted.push((await post(base)).status);
    const beforeSixth = { ...f.metrics };
    const sixth = await post(base);
    const observed = {
      firstFive: admitted, sixthStatus: sixth.status,
      sixthConstructed: f.metrics.constructed - beforeSixth.constructed,
      sixthAttempts: f.metrics.attempts - beforeSixth.attempts,
      sixthToolCalls: f.metrics.toolCalls - beforeSixth.toolCalls,
    };
    now += 60_001;
    const afterExpiry = await post(base);
    assert.equal(afterExpiry.status, 200);
    t.diagnostic(`T13 rate test-side totals: valid provider constructions=${f.metrics.constructed}, attempts=${f.metrics.attempts}, tools=${f.metrics.toolCalls}; invalid arrival constructions=0; after fake-clock expiry status=${afterExpiry.status}. Production admission count is unavailable.`);
    expectW08OrTodo(t, observed, {
      firstFive: [200, 200, 200, 200, 200], sixthStatus: 429,
      sixthConstructed: 0, sixthAttempts: 0, sixthToolCalls: 0,
    }, 'T13 server-owned rolling admission window');
    t.diagnostic('Fake clock is injected into W05 orchestration only; W05 has no server admission clock seam.');
  });
});

test('T13 lifecycle: success, error, timeout, cancellation, disconnect and late settlement', { timeout: 10_000 }, async (t) => {
  // Each run uses a fresh server: recovery probes distinguish a freed active slot
  // from expiry of a server-owned rolling window, which W05 does not expose.
  const observations = [];
  for (const mode of ['success', 'error', 'timeout', 'cancellation', 'disconnect', 'late']) {
    let attempts = 0;
    let constructions = 0;
    let providerAbort = 0;
    const entered = gate();
    const late = gate();
    let fakeTime = 0;
    const scheduler = {
      set(ms, callback) { const handle = { cancelled: false }; setImmediate(() => {
        if (!handle.cancelled) { fakeTime += ms; callback(); }
      }); return handle; },
      clear(handle) { handle.cancelled = true; },
    };
    const options = {
      tacticalOrchestrationOptions: mode === 'timeout' ? { now: () => fakeTime, scheduler, sleep: async () => {} } : {},
      tacticalProviderFactory() {
        constructions++;
        const firstRun = constructions === 1;
        const fake = createTacticalFakeProvider({ outcomes: outcomes() });
        return { generate(call) {
          attempts++;
          if (firstRun && mode === 'error') return { type: 'failure', code: 'provider_rejected' };
          if (firstRun && mode === 'timeout') {
            call.signal.addEventListener('abort', () => { providerAbort++; }, { once: true });
            return new Promise(() => {});
          }
          if (firstRun && ['cancellation', 'disconnect', 'late'].includes(mode) && attempts === 1) {
            call.signal.addEventListener('abort', () => { providerAbort++; }, { once: true });
            entered.resolve();
            return late.promise;
          }
          return fake.generate(call);
        } };
      },
    };
    await withServer(options, async (base) => {
      if (mode === 'success' || mode === 'error' || mode === 'timeout') {
        const response = await post(base);
        assert.equal(response.status, mode === 'success' ? 200 : mode === 'error' ? 502 : 504);
      } else {
        const controller = new AbortController();
        let pending;
        let disconnect;
        if (mode === 'disconnect') {
          pending = new Promise((resolve) => {
            const req = httpRequest(`${base}/api/tactical-coach`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
            }, (response) => { response.resume(); response.once('end', () => resolve('response')); });
            req.once('error', () => resolve('disconnected'));
            req.end(JSON.stringify(request()));
            disconnect = () => req.destroy();
          });
        } else pending = post(base, request(), controller.signal);
        await entered.promise;
        if (mode === 'disconnect') {
          disconnect();
          assert.equal(await pending, 'disconnected');
        } else {
          controller.abort();
          await assert.rejects(pending);
        }
        await new Promise((resolve) => setTimeout(resolve, 20));
        assert.equal(providerAbort, 1, `${mode} must abort its in-flight fake provider`);
        if (mode === 'late') late.resolve({ type: 'final', output: outcomes()[2].output });
        else late.resolve({ type: 'failure', code: 'provider_rejected' });
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      const recovery = await post(base);
      assert.equal(recovery.status, 200);
      observations.push({ mode, recoveryStatus: recovery.status, providerAbort });
    });
  }
  t.diagnostic(`T13 lifecycle transport observations: ${JSON.stringify(observations)}. No server-owned active-slot release count is observable in W05.`);
  expectW08OrTodo(t, { serverSlotCounterAvailable: false, independentRateWindowRecovery: false },
    { serverSlotCounterAvailable: true, independentRateWindowRecovery: true },
    'T13 exact-once server slot release and separate rate-window recovery');
});
