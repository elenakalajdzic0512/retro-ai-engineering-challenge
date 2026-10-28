import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { deriveTacticalSnapshot } from '../src/tactical-snapshot.js';
import { createApiServer } from '../dist-server/index.js';
import { createTacticalFakeProvider } from '../dist-server/tactical/fake-provider.js';
import { invokeTacticalTool } from '../dist-server/tactical/tools.js';
import { createTacticalAdmission } from '../dist-server/tactical/admission.js';
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
  const admission = createTacticalAdmission(clock.now);
  const securityEvents = [];
  const metrics = { constructed: 0, attempts: 0, toolCalls: 0, activeFakeCalls: 0, maxActiveFakeCalls: 0, releasedFakeCalls: 0 };
  const held = [];
  const entered = [];
  const options = {
    tacticalAdmission: admission,
    tacticalSecurityEventSink: (event) => securityEvents.push(event),
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
    options, metrics, admission, securityEvents,
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

test('T13 concurrency: third valid HTTP arrival does no work while two runs are held; capacity recovers', { timeout: 10_000 }, async (t) => {
  const f = fixture({ hold: true });
  await withServer(f.options, async (base) => {
    const aEntered = f.waitForEntry();
    const a = post(base); await aEntered;
    const bEntered = f.waitForEntry();
    const b = post(base); await bEntered;
    assert.equal(f.metrics.activeFakeCalls, 2);
    assert.deepEqual(f.admission.snapshot(), { activeRuns: 2, admittedRuns: 2, releasedRuns: 0 });
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
    assert.deepEqual(f.admission.snapshot(), { activeRuns: 2, admittedRuns: 2, releasedRuns: 0 });
    f.releaseNext();
    assert.equal((await a).status, 200);
    assert.deepEqual(f.admission.snapshot(), { activeRuns: 1, admittedRuns: 2, releasedRuns: 1 });
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
    assert.deepEqual(f.admission.snapshot(), { activeRuns: 0, admittedRuns: 3, releasedRuns: 3 });
    assert.deepEqual(observed, {
      thirdStartedProvider: false, thirdProviderConstructions: 0,
      thirdProviderAttempts: 0, maxActiveFakeCalls: 2,
      thirdStatus: 429, totalToolCalls: 6,
    }, 'T13 enforces an active cap of two and zero work for the excess request');
    assert.equal(f.securityEvents.filter((event) => event.event === 'agent.run.rejected' && event.reason === 'ACTIVE_LIMIT').length, 1);
    const redacted = (event) => ({ ...event, timestamp: '[redacted]', correlationId: '[redacted]' });
    t.diagnostic(`T13 actual allowlisted events (time/ID redacted): ${JSON.stringify([
      redacted(f.securityEvents.find((event) => event.event === 'agent.run.admitted')),
      redacted(f.securityEvents.find((event) => event.event === 'agent.run.rejected' && event.reason === 'ACTIVE_LIMIT')),
    ])}`);
  });
});

test('T13 rolling 60-second rate: invalid and rejected arrivals excluded', { timeout: 10_000 }, async (t) => {
  let now = 1_000;
  const f = fixture({ clock: { now: () => now } });
  await withServer(f.options, async (base) => {
    const invalid = await post(base, { ...request(), goal: '' });
    assert.equal(invalid.status, 400);
    assert.equal(f.metrics.constructed, 0);
    assert.deepEqual(f.admission.snapshot(), { activeRuns: 0, admittedRuns: 0, releasedRuns: 0 });
    const admitted = [];
    for (let i = 0; i < 5; i++) admitted.push((await post(base)).status);
    assert.deepEqual(f.admission.snapshot(), { activeRuns: 0, admittedRuns: 5, releasedRuns: 5 });
    const beforeSixth = { ...f.metrics };
    const sixth = await post(base);
    assert.deepEqual(f.admission.snapshot(), { activeRuns: 0, admittedRuns: 5, releasedRuns: 5 });
    const observed = {
      firstFive: admitted, sixthStatus: sixth.status,
      sixthConstructed: f.metrics.constructed - beforeSixth.constructed,
      sixthAttempts: f.metrics.attempts - beforeSixth.attempts,
      sixthToolCalls: f.metrics.toolCalls - beforeSixth.toolCalls,
    };
    now += 60_001;
    const afterExpiry = await post(base);
    assert.equal(afterExpiry.status, 200);
    assert.deepEqual(f.admission.snapshot(), { activeRuns: 0, admittedRuns: 1, releasedRuns: 6 });
    t.diagnostic(`T13 rate totals: admitted=6 across both windows, provider constructions=${f.metrics.constructed}, attempts=${f.metrics.attempts}, tools=${f.metrics.toolCalls}; invalid arrival constructions=0; after fake-clock expiry status=${afterExpiry.status}.`);
    assert.deepEqual(observed, {
      firstFive: [200, 200, 200, 200, 200], sixthStatus: 429,
      sixthConstructed: 0, sixthAttempts: 0, sixthToolCalls: 0,
    }, 'T13 enforces the server-owned rolling admission window');
    assert.equal(f.securityEvents.filter((event) => event.event === 'agent.run.rejected' && event.reason === 'RATE_LIMIT').length, 1);
    assert.equal(f.securityEvents.filter((event) => event.event === 'agent.run.rejected' && event.reason === 'INVALID_REQUEST').length, 1);
    t.diagnostic('The fake clock is injected into server-owned admission and orchestration.');
  });
  // A rolling window expires individual timestamps; it is not a fixed minute bucket.
  let staggeredTime = 0;
  const staggered = createTacticalAdmission(() => staggeredTime);
  const first = staggered.tryAdmit();
  assert.equal(first.admitted, true);
  if (first.admitted) first.lease.release();
  staggeredTime = 10_000;
  for (let i = 0; i < 4; i++) {
    const decision = staggered.tryAdmit();
    assert.equal(decision.admitted, true);
    if (decision.admitted) decision.lease.release();
  }
  staggeredTime = 59_999;
  assert.deepEqual(staggered.tryAdmit(), { admitted: false, reason: 'RATE_LIMIT' });
  staggeredTime = 60_000;
  const afterFirstExpiry = staggered.tryAdmit();
  assert.equal(afterFirstExpiry.admitted, true);
  if (afterFirstExpiry.admitted) afterFirstExpiry.lease.release();
  assert.deepEqual(staggered.tryAdmit(), { admitted: false, reason: 'RATE_LIMIT' });
  staggeredTime = 70_000;
  assert.equal(staggered.snapshot().admittedRuns, 1);
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
    const abortObserved = gate();
    const completionObserved = gate();
    let fakeTime = 0;
    const admission = createTacticalAdmission(() => 0);
    const securityEvents = [];
    const scheduler = {
      set(ms, callback) { const handle = { cancelled: false }; setImmediate(() => {
        if (!handle.cancelled) { fakeTime += ms; callback(); }
      }); return handle; },
      clear(handle) { handle.cancelled = true; },
    };
    const options = {
      tacticalAdmission: admission,
      tacticalSecurityEventSink(event) {
        securityEvents.push(event);
        if (event.event === 'agent.run.completed') completionObserved.resolve();
      },
      tacticalOrchestrationOptions: mode === 'timeout' ? { now: () => fakeTime, scheduler, sleep: async () => {} } : {},
      tacticalProviderFactory() {
        constructions++;
        const firstRun = constructions === 1;
        const fake = createTacticalFakeProvider({ outcomes: outcomes() });
        return { generate(call) {
          attempts++;
          if (firstRun && mode === 'error') return { type: 'failure', code: 'provider_rejected' };
          if (firstRun && mode === 'timeout') {
            return new Promise((resolve) => call.signal.addEventListener('abort', () => {
              providerAbort++;
              resolve({ type: 'failure', code: 'provider_timeout' });
            }, { once: true }));
          }
          if (firstRun && ['cancellation', 'disconnect', 'late'].includes(mode) && attempts === 1) {
            call.signal.addEventListener('abort', () => { providerAbort++; abortObserved.resolve(); }, { once: true });
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
        await abortObserved.promise;
        await completionObserved.promise;
        assert.equal(providerAbort, 1, `${mode} must abort its in-flight fake provider`);
        if (mode === 'late') late.resolve({ type: 'final', output: outcomes()[2].output });
        else late.resolve({ type: 'failure', code: 'provider_rejected' });
        await new Promise((resolve) => setImmediate(resolve));
      }
      assert.deepEqual(admission.snapshot(), { activeRuns: 0, admittedRuns: 1, releasedRuns: 1 },
        `${mode} releases its one server slot exactly once`);
      const recovery = await post(base);
      assert.equal(recovery.status, 200);
      assert.deepEqual(admission.snapshot(), { activeRuns: 0, admittedRuns: 2, releasedRuns: 2 });
      assert.deepEqual(securityEvents.map((event) => event.event), [
        'agent.run.admitted', 'agent.run.completed', 'agent.run.admitted', 'agent.run.completed',
      ]);
      assert.equal(securityEvents[1].outcome,
        mode === 'success' ? 'success' : mode === 'error' || mode === 'timeout' ? 'failed' : 'aborted');
      observations.push({ mode, recoveryStatus: recovery.status, providerAbort, releasedRuns: 2 });
    });
  }
  t.diagnostic(`T13 lifecycle observations: ${JSON.stringify(observations)}.`);
  let now = 0;
  const admission = createTacticalAdmission(() => now);
  const first = admission.tryAdmit();
  const second = admission.tryAdmit();
  assert.equal(first.admitted, true);
  assert.equal(second.admitted, true);
  assert.deepEqual(admission.tryAdmit(), { admitted: false, reason: 'ACTIVE_LIMIT' });
  assert.deepEqual(admission.snapshot(), { activeRuns: 2, admittedRuns: 2, releasedRuns: 0 });
  if (!first.admitted || !second.admitted) throw new Error('Expected the first two admissions.');
  first.lease.release();
  first.lease.release();
  assert.deepEqual(admission.snapshot(), { activeRuns: 1, admittedRuns: 2, releasedRuns: 1 });
  const third = admission.tryAdmit();
  assert.equal(third.admitted, true, 'Active capacity recovers immediately.');
  second.lease.release();
  if (!third.admitted) throw new Error('Expected recovered admission.');
  third.lease.release();
  for (let i = 0; i < 2; i++) {
    const decision = admission.tryAdmit();
    assert.equal(decision.admitted, true);
    if (decision.admitted) decision.lease.release();
  }
  assert.deepEqual(admission.snapshot(), { activeRuns: 0, admittedRuns: 5, releasedRuns: 5 });
  assert.deepEqual(admission.tryAdmit(), { admitted: false, reason: 'RATE_LIMIT' });
  now = 60_000;
  const afterWindow = admission.tryAdmit();
  assert.equal(afterWindow.admitted, true, 'Rate capacity recovers only when the rolling window expires.');
  if (afterWindow.admitted) afterWindow.lease.release();
  assert.deepEqual(admission.snapshot(), { activeRuns: 0, admittedRuns: 1, releasedRuns: 6 });
});

async function waitUntil(predicate) {
  for (let i = 0; i < 100; i++) {
    if (predicate()) return;
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.fail('Expected provider settlement to update admission capacity.');
}

function observedAdmission() {
  const actual = createTacticalAdmission(() => 0);
  const releases = [];
  return {
    releases,
    admission: {
      snapshot() { return actual.snapshot(); },
      tryAdmit() {
        const decision = actual.tryAdmit();
        if (!decision.admitted) return decision;
        const record = { calls: 0, finished: gate() };
        releases.push(record);
        return { admitted: true, lease: { release() {
          record.calls++;
          decision.lease.release();
          record.finished.resolve();
        } } };
      },
    },
  };
}

test('T12/T13 aborted HTTP run retains capacity while an abort-ignoring provider is still active',
  { timeout: 10_000 }, async () => {
    const admission = createTacticalAdmission(() => 0);
    const held = [gate(), gate()];
    const entered = [gate(), gate()];
    const completed = gate();
    const events = [];
    const metrics = { constructions: 0, attempts: 0, tools: 0, activeProvider: 0, peakProvider: 0 };
    await withServer({
      tacticalAdmission: admission,
      tacticalSecurityEventSink(event) {
        events.push(event);
        if (event.event === 'agent.run.completed' && event.outcome === 'aborted') completed.resolve();
      },
      tacticalToolExecutor(name, args, context) {
        metrics.tools++;
        return invokeTacticalTool(name, args, context);
      },
      tacticalProviderFactory() {
        const id = metrics.constructions++;
        const fake = createTacticalFakeProvider({ outcomes: outcomes() });
        let first = true;
        return { async generate(call) {
          metrics.attempts++;
          metrics.activeProvider++;
          metrics.peakProvider = Math.max(metrics.peakProvider, metrics.activeProvider);
          try {
            if (first && id < 2) {
              first = false;
              entered[id].resolve();
              await held[id].promise; // Deliberately ignores call.signal.
            }
            first = false;
            return fake.generate(call);
          } finally { metrics.activeProvider--; }
        } };
      },
    }, async (base) => {
      const controller = new AbortController();
      const first = post(base, request(), controller.signal);
      await entered[0].promise;
      const second = post(base);
      await entered[1].promise;
      try {
        assert.equal(metrics.activeProvider, 2);
        controller.abort();
        await assert.rejects(first);
        await completed.promise;
        assert.deepEqual(admission.snapshot(), { activeRuns: 2, admittedRuns: 2, releasedRuns: 0 });
        const rejected = await post(base);
        assert.equal(rejected.status, 429);
        assert.equal(metrics.constructions, 2);
        assert.equal(metrics.attempts, 2);
        assert.equal(metrics.tools, 0);
        assert.equal(metrics.activeProvider, 2);
        held[0].resolve();
        await waitUntil(() => admission.snapshot().releasedRuns === 1);
        assert.deepEqual(admission.snapshot(), { activeRuns: 1, admittedRuns: 2, releasedRuns: 1 });
        assert.equal(metrics.attempts, 2, 'Late proposal must not start another model step.');
        assert.equal(metrics.tools, 0, 'Late proposal must not execute a tool.');
        assert.equal(events.filter((event) => event.event === 'agent.run.completed' && event.outcome === 'aborted').length, 1);
        assert.equal(events.some((event) => event.event === 'agent.run.completed' && event.outcome === 'success'), false);
        const recovery = await post(base);
        assert.equal(recovery.status, 200);
        assert.equal(metrics.peakProvider, 2);
        assert.equal(admission.snapshot().releasedRuns, 2);
        held[1].resolve();
        assert.equal((await second).status, 200);
        assert.deepEqual(admission.snapshot(), { activeRuns: 0, admittedRuns: 3, releasedRuns: 3 });
      } finally {
        held[0].resolve();
        held[1].resolve();
        await Promise.allSettled([first, second]);
      }
    });
  });

test('T12/T13 timed-out retry cannot start another provider job while the first ignores abort',
  { timeout: 10_000 }, async () => {
    const admission = createTacticalAdmission(() => 0);
    const held = [gate(), gate()];
    const entered = [gate(), gate()];
    let fakeTime = 0;
    const metrics = { constructions: 0, attempts: 0, tools: 0, activeProvider: 0, peakProvider: 0 };
    const scheduler = {
      set(ms, callback) { const handle = { cancelled: false }; setImmediate(() => {
        if (!handle.cancelled) { fakeTime += ms; callback(); }
      }); return handle; },
      clear(handle) { handle.cancelled = true; },
    };
    await withServer({
      tacticalAdmission: admission,
      tacticalOrchestrationOptions: { now: () => fakeTime, scheduler, sleep: async () => {} },
      tacticalToolExecutor(name, args, context) {
        metrics.tools++;
        return invokeTacticalTool(name, args, context);
      },
      tacticalProviderFactory() {
        const id = metrics.constructions++;
        const fake = createTacticalFakeProvider({ outcomes: outcomes() });
        let first = true;
        return { async generate(call) {
          metrics.attempts++;
          metrics.activeProvider++;
          metrics.peakProvider = Math.max(metrics.peakProvider, metrics.activeProvider);
          try {
            if (first && id < 2) {
              first = false;
              entered[id].resolve();
              await held[id].promise; // Abort does not settle the underlying operation.
            }
            first = false;
            return fake.generate(call);
          } finally { metrics.activeProvider--; }
        } };
      },
    }, async (base) => {
      const first = post(base);
      await entered[0].promise;
      try {
        assert.equal((await first).status, 504);
        assert.equal(metrics.attempts, 1, 'Retry must not start while its prior provider job is unresolved.');
        assert.deepEqual(admission.snapshot(), { activeRuns: 1, admittedRuns: 1, releasedRuns: 0 });
        const second = post(base);
        await entered[1].promise;
        assert.equal((await second).status, 504);
        assert.equal(metrics.activeProvider, 2);
        assert.equal(metrics.peakProvider, 2);
        const rejected = await post(base);
        assert.equal(rejected.status, 429);
        assert.equal(metrics.attempts, 2);
        assert.equal(metrics.tools, 0);
        held[0].resolve();
        await waitUntil(() => admission.snapshot().releasedRuns === 1);
        held[1].resolve();
        await waitUntil(() => admission.snapshot().releasedRuns === 2);
        assert.deepEqual(admission.snapshot(), { activeRuns: 0, admittedRuns: 2, releasedRuns: 2 });
        assert.equal(metrics.attempts, 2, 'Late replies must not start later phases.');
        assert.equal(metrics.tools, 0);
        assert.equal((await post(base)).status, 200);
      } finally {
        held[0].resolve();
        held[1].resolve();
        await Promise.allSettled([first]);
      }
    });
  });

test('T13 synchronous provider throw returns a sanitized error and releases once before recovery', async () => {
  const { admission, releases } = observedAdmission();
  const events = [];
  let constructions = 0;
  let generateCalls = 0;
  let toolCalls = 0;
  const sentinel = 'W08_SYNTHETIC_SYNC_THROW_DETAIL';
  await withServer({
    tacticalAdmission: admission,
    tacticalSecurityEventSink: (event) => events.push(event),
    tacticalProviderFactory() {
      if (constructions++ === 0) return { generate() {
        generateCalls++;
        throw new Error(sentinel);
      } };
      const fake = createTacticalFakeProvider({ outcomes: outcomes() });
      return { generate(call) { generateCalls++; return fake.generate(call); } };
    },
    tacticalToolExecutor(name, args, context) {
      toolCalls++;
      return invokeTacticalTool(name, args, context);
    },
  }, async (base) => {
    const failed = await post(base);
    assert.equal(failed.status, 503);
    const body = await failed.json();
    assert.deepEqual(body, { error: { code: 'provider_unavailable',
      message: 'Tactical Coach provider is unavailable.' } });
    assert.doesNotMatch(JSON.stringify(body), /W08_SYNTHETIC_SYNC_THROW_DETAIL/);
    await releases[0].finished.promise;
    assert.equal(releases[0].calls, 1);
    assert.deepEqual(admission.snapshot(), { activeRuns: 0, admittedRuns: 1, releasedRuns: 1 });
    assert.equal(generateCalls, 2, 'A settled synchronous failure may use the one legitimate retry.');
    assert.equal(toolCalls, 0);
    assert.equal(events[1].providerAttempts, 2);
    assert.equal(events[1].executedToolCalls, 0);
    const recovery = await post(base);
    assert.equal(recovery.status, 200);
    await releases[1].finished.promise;
    assert.equal(releases[0].calls, 1);
    assert.equal(releases[1].calls, 1);
    assert.deepEqual(admission.snapshot(), { activeRuns: 0, admittedRuns: 2, releasedRuns: 2 });
    assert.equal(generateCalls, 5);
    assert.equal(toolCalls, 2);
  });
});

test('T12/T13 late provider rejection retains capacity until settlement without unhandled work',
  { timeout: 10_000 }, async () => {
    const { admission, releases } = observedAdmission();
    const entered = gate();
    const completed = gate();
    const events = [];
    const unhandled = [];
    const onUnhandled = (error) => unhandled.push(error);
    process.on('unhandledRejection', onUnhandled);
    let fakeTime = 0;
    let rejectLate;
    let inFlight = 0;
    let generateCalls = 0;
    let toolCalls = 0;
    let constructions = 0;
    const scheduler = {
      set(ms, callback) { const handle = { cancelled: false }; setImmediate(() => {
        if (!handle.cancelled) { fakeTime += ms; callback(); }
      }); return handle; },
      clear(handle) { handle.cancelled = true; },
    };
    try {
      await withServer({
        tacticalAdmission: admission,
        tacticalOrchestrationOptions: { now: () => fakeTime, scheduler, sleep: async () => {} },
        tacticalSecurityEventSink(event) {
          events.push(event);
          if (event.event === 'agent.run.completed' && event.outcome === 'failed') completed.resolve();
        },
        tacticalProviderFactory() {
          if (constructions++ === 0) return { generate() {
            generateCalls++;
            inFlight++;
            entered.resolve();
            return new Promise((_resolve, reject) => {
              rejectLate = () => { inFlight--; reject(new Error('W08_SYNTHETIC_LATE_REJECT')); };
            }); // Deliberately ignores AbortSignal.
          } };
          const fake = createTacticalFakeProvider({ outcomes: outcomes() });
          return { generate(call) { generateCalls++; return fake.generate(call); } };
        },
        tacticalToolExecutor(name, args, context) {
          toolCalls++;
          return invokeTacticalTool(name, args, context);
        },
      }, async (base) => {
        const first = post(base);
        await entered.promise;
        try {
          assert.equal((await first).status, 504, 'The HTTP timeout must not await provider settlement.');
          await completed.promise;
          assert.equal(inFlight, 1);
          assert.equal(generateCalls, 1, 'An unresolved attempt must not start a retry.');
          assert.equal(toolCalls, 0);
          assert.deepEqual(admission.snapshot(), { activeRuns: 1, admittedRuns: 1, releasedRuns: 0 });
          assert.equal(releases[0].calls, 0);
          assert.equal(events[1].providerAttempts, 1);
          rejectLate();
          await releases[0].finished.promise;
          await new Promise((resolve) => setImmediate(resolve)); // Flush the unhandled-rejection checkpoint.
          assert.equal(inFlight, 0);
          assert.equal(releases[0].calls, 1);
          assert.deepEqual(admission.snapshot(), { activeRuns: 0, admittedRuns: 1, releasedRuns: 1 });
          assert.equal(generateCalls, 1);
          assert.equal(toolCalls, 0);
          assert.equal(unhandled.length, 0);
          assert.equal(events.filter((event) => event.event === 'agent.run.completed').length, 1);
          assert.equal(events.some((event) => event.outcome === 'success'), false);
          const recovery = await post(base);
          assert.equal(recovery.status, 200);
          await releases[1].finished.promise;
          assert.equal(releases[0].calls, 1);
          assert.equal(releases[1].calls, 1);
          assert.equal(generateCalls, 4);
          assert.equal(toolCalls, 2);
        } finally {
          if (inFlight) rejectLate?.();
          await Promise.allSettled([first]);
        }
      });
    } finally { process.off('unhandledRejection', onUnhandled); }
  });
