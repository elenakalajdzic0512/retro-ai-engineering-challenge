import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { deriveTacticalSnapshot } from '../src/tactical-snapshot.js';
import { createApiServer } from '../dist-server/index.js';
import { createTacticalFakeProvider } from '../dist-server/tactical/fake-provider.js';
import { createTacticalCoachGeminiProvider } from '../dist-server/tactical/gemini-provider.js';

const validRequest = () => ({ goal: 'Clear the center safely.', state: deriveTacticalSnapshot(createGame()) });
const candidate = { targetZone: 'center', style: 'balanced', paddleContact: 'center', route: 'direct' };
const final = {
  summary: 'Clear the center with controlled bounces.', strategy: 'balanced', targetZone: 'center',
  paddleContact: 'center', route: 'direct', actions: ['Aim near the center of the paddle.'],
  evidence: [{ source: 'tactical_snapshot', fact: 'lives' },
    { source: 'tactical_snapshot', fact: 'portalState' },
    { source: 'strategy_evaluation', fact: 'paddleAligned' }],
};
const script = () => [
  { type: 'tool_call', toolName: 'get_tactical_snapshot', arguments: {} },
  { type: 'tool_call', toolName: 'evaluate_tactical_strategy', arguments: candidate },
  { type: 'final', output: final },
];

async function withServer(options, action) {
  const server = createApiServer(options);
  await new Promise((resolve, reject) => server.listen(0, '127.0.0.1', resolve).once('error', reject));
  const base = `http://127.0.0.1:${server.address().port}`;
  try { return await action(base); }
  finally { await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
}

function post(base, body, headers = { 'Content-Type': 'application/json' }, signal) {
  return fetch(`${base}/api/tactical-coach`, {
    method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body), signal,
  });
}

async function withTacticalMode(mode, action) {
  const original = process.env.TACTICAL_AI_PROVIDER;
  if (mode === undefined) delete process.env.TACTICAL_AI_PROVIDER;
  else process.env.TACTICAL_AI_PROVIDER = mode;
  try { return await action(); }
  finally {
    if (original === undefined) delete process.env.TACTICAL_AI_PROVIDER;
    else process.env.TACTICAL_AI_PROVIDER = original;
  }
}

test('unset and explicit fake Tactical modes use the deterministic local provider', async () => {
  for (const mode of [undefined, 'fake']) {
    await withTacticalMode(mode, () => withServer({ tacticalGeminiProviderFactory() {
      throw new Error('Gemini factory must not be selected');
    } }, async (base) => {
      const response = await post(base, validRequest());
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.equal(body.plan.summary, 'Clear the center with controlled bounces.');
      assert.equal(body.evidence.length, 2);
    }));
  }
});

test('Gemini Tactical mode selects the injected factory and makes a fresh provider per request', async () => {
  const instances = [];
  await withTacticalMode('gemini', () => withServer({ tacticalGeminiProviderFactory() {
    const id = instances.length + 1;
    const requests = [];
    const client = { models: { async generateContent(request) {
      requests.push(request);
      const part = requests.length === 1
        ? { functionCall: { name: 'get_tactical_snapshot', args: {}, id: `snapshot-${id}` } }
        : requests.length === 2
          ? { functionCall: { name: 'evaluate_tactical_strategy', args: candidate, id: `evaluation-${id}` } }
          : { text: JSON.stringify(final) };
      return { candidates: [{ content: { role: 'model', parts: [part] } }] };
    } } };
    const provider = createTacticalCoachGeminiProvider({ client });
    instances.push({ provider, requests });
    return provider;
  } }, async (base) => {
    for (let run = 0; run < 2; run++) {
      const response = await post(base, validRequest());
      assert.equal(response.status, 200);
      assert.deepEqual((await response.json()).plan, final);
    }
  }));
  assert.equal(instances.length, 2);
  assert.notEqual(instances[0].provider, instances[1].provider);
  assert.deepEqual(instances.map(({ requests }) => requests.length), [3, 3]);
  for (const { requests } of instances) {
    assert.equal(requests[0].model, 'gemini-3.5-flash-lite');
    assert.deepEqual(requests[0].contents, [{ role: 'user', parts: [{ text: validRequest().goal }] }]);
  }
});

test('unknown Tactical mode fails safely before Gemini factory or network work', async () => {
  let geminiFactories = 0;
  await withTacticalMode('banana', () => withServer({ tacticalGeminiProviderFactory() {
    geminiFactories++;
    throw new Error('Gemini factory must not be selected');
  } }, async (base) => {
    const response = await post(base, validRequest());
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      error: { code: 'provider_not_configured', message: 'The Tactical Coach provider is not configured.' },
    });
  }));
  assert.equal(geminiFactories, 0);
});

test('Gemini Tactical mode with an explicitly empty key returns provider_not_configured offline', async () => {
  await withTacticalMode('gemini', () => withServer({ tacticalGeminiProviderFactory() {
    return createTacticalCoachGeminiProvider({ apiKey: '' });
  } }, async (base) => {
    const response = await post(base, validRequest());
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      error: { code: 'provider_not_configured', message: 'The Tactical Coach provider is not configured.' },
    });
  }));
});

test('explicit Tactical provider factory takes precedence over an invalid environment mode', async () => {
  let geminiFactories = 0;
  let explicitFactories = 0;
  await withTacticalMode('banana', () => withServer({
    tacticalProviderFactory() {
      explicitFactories++;
      return createTacticalFakeProvider({ outcomes: script() });
    },
    tacticalGeminiProviderFactory() { geminiFactories++; throw new Error('must not run'); },
  }, async (base) => {
    const response = await post(base, validRequest());
    assert.equal(response.status, 200);
  }));
  assert.equal(explicitFactories, 1);
  assert.equal(geminiFactories, 0);
});

test('Week 4 fake remains independent of Tactical Gemini, and Tactical fake ignores Week 4 mode', async () => {
  const originalWeek4Mode = process.env.AI_PROVIDER;
  try {
    process.env.AI_PROVIDER = 'fake';
    await withTacticalMode('gemini', () => withServer({ tacticalGeminiProviderFactory() {
      return createTacticalFakeProvider({ outcomes: script() });
    } }, async (base) => {
      const hint = await fetch(`${base}/api/ai`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'playing', score: 10, lives: 3, bricksRemaining: 39 }),
      });
      assert.equal(hint.status, 200);
      assert.deepEqual(await hint.json(), { hint: 'Keep the ball in play.', category: 'general' });
      assert.equal((await post(base, validRequest())).status, 200);
    }));
    process.env.AI_PROVIDER = 'gemini';
    await withTacticalMode('fake', () => withServer({}, async (base) => {
      const response = await post(base, validRequest());
      assert.equal(response.status, 200);
      assert.equal((await response.json()).plan.summary, 'Clear the center with controlled bounces.');
    }));
  } finally {
    if (originalWeek4Mode === undefined) delete process.env.AI_PROVIDER;
    else process.env.AI_PROVIDER = originalWeek4Mode;
  }
});

test('browser provider field is rejected before Tactical provider factory creation', async () => {
  let factories = 0;
  await withTacticalMode('gemini', () => withServer({ tacticalGeminiProviderFactory() {
    factories++;
    throw new Error('must not run');
  } }, async (base) => {
    const response = await post(base, { ...validRequest(), provider: 'gemini' });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, 'invalid_input');
  }));
  assert.equal(factories, 0);
});

test('fake-first tactical route returns only validated plan and typed server evidence', async () => {
  const provider = createTacticalFakeProvider({ outcomes: script() });
  const game = createGame();
  const originalGame = structuredClone(game);
  const input = { goal: 'Clear the center safely.', state: deriveTacticalSnapshot(game) };
  let tools = 0;
  const { invokeTacticalTool } = await import('../dist-server/tactical/tools.js');
  await withServer({ tacticalProvider: provider, tacticalToolExecutor(name, args, context) {
    tools++;
    return invokeTacticalTool(name, args, context);
  } }, async (base) => {
    const response = await post(base, input);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /^application\/json\b/);
    assert.deepEqual(await response.json(), {
      plan: final,
      evidence: [
        { source: 'tactical_snapshot', fact: 'lives', value: 3 },
        { source: 'tactical_snapshot', fact: 'portalState', value: 'available' },
        { source: 'strategy_evaluation', fact: 'paddleAligned', value: true },
      ],
    });
  });
  assert.equal(provider.callCount, 3);
  assert.equal(tools, 2);
  assert.deepEqual(game, originalGame);
});

test('Coach routing is separate and Week 4 request/response still works', async () => {
  await withServer({}, async (base) => {
    const method = await fetch(`${base}/api/tactical-coach`);
    assert.equal(method.status, 405);
    assert.equal(method.headers.get('allow'), 'POST');
    assert.equal((await fetch(`${base}/api/nope`)).status, 404);
    const hint = await fetch(`${base}/api/ai`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'playing', score: 10, lives: 3, bricksRemaining: 39 }),
    });
    assert.equal(hint.status, 200);
    assert.deepEqual(await hint.json(), { hint: 'Keep the ball in play.', category: 'general' });
  });
});

test('media, JSON, schema and oversized body fail before any Coach provider or tool call', async () => {
  const provider = createTacticalFakeProvider({ outcomes: script() });
  let tools = 0;
  await withServer({ tacticalProvider: provider, tacticalToolExecutor() { tools++; throw new Error('must not execute'); } }, async (base) => {
    const noContentType = await fetch(`${base}/api/tactical-coach`, {
      method: 'POST', body: new TextEncoder().encode(JSON.stringify(validRequest())),
    });
    assert.equal(noContentType.status, 415);
    assert.equal((await post(base, validRequest(), { 'Content-Type': 'text/plain' })).status, 415);
    assert.equal((await post(base, '{"goal":')).status, 400);
    assert.equal((await post(base, { ...validRequest(), goal: '' })).status, 400);
    assert.equal((await post(base, { ...validRequest(), provider: 'gemini' })).status, 400);
    assert.equal((await post(base, JSON.stringify(validRequest()) + ' '.repeat(4097))).status, 413);
  });
  assert.equal(provider.callCount, 0);
  assert.equal(tools, 0);
});

test('Week 5 accepts a padded 4096-byte JSON body while Week 4 keeps its 1024-byte limit', async () => {
  await withServer({}, async (base) => {
    const tactical = JSON.stringify(validRequest());
    assert.ok(Buffer.byteLength(tactical) < 4096);
    const exact = tactical + ' '.repeat(4096 - Buffer.byteLength(tactical));
    assert.equal((await post(base, exact)).status, 200);
    const week4 = JSON.stringify({ status: 'playing', score: 10, lives: 3, bricksRemaining: 39 });
    const hint = await fetch(`${base}/api/ai`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: week4 + ' '.repeat(1025 - Buffer.byteLength(week4)),
    });
    assert.equal(hint.status, 413);
  });
});

test('Coach HTTP failures use fixed statuses and sanitized bodies', async () => {
  const cases = [
    [[{ type: 'failure', code: 'provider_unavailable' }, { type: 'failure', code: 'provider_unavailable' }], 503, 'provider_unavailable'],
    [[{ type: 'failure', code: 'rate_limited' }, { type: 'failure', code: 'rate_limited' }], 429, 'rate_limited'],
    [[{ type: 'failure', code: 'provider_timeout' }, { type: 'failure', code: 'provider_timeout' }], 504, 'provider_timeout'],
    [[{ type: 'failure', code: 'provider_rejected' }], 502, 'provider_rejected'],
    [[{ type: 'failure', code: 'provider_not_configured' }], 503, 'provider_not_configured'],
    [[script()[0], { type: 'tool_call', toolName: 'evaluate_tactical_strategy', arguments: { ...candidate, route: 'portal' } }], 502, 'candidate_rejected'],
    [[script()[0], script()[1], { type: 'final', output: { ...final, strategy: 'safe' } }], 502, 'invalid_final_output'],
  ];
  for (const [outcomes, status, code] of cases) {
    const provider = createTacticalFakeProvider({ outcomes });
    await withServer({ tacticalProvider: provider }, async (base) => {
      const response = await post(base, validRequest());
      assert.equal(response.status, status);
      const body = await response.json();
      assert.equal(body.error.code, code);
      assert.deepEqual(Object.keys(body), ['error']);
      assert.deepEqual(Object.keys(body.error), ['code', 'message']);
      assert.doesNotMatch(JSON.stringify(body), /stack|PRIVATE|targetZone|toolResults/);
      if (code === 'provider_rejected' || code === 'provider_not_configured') {
        assert.equal(provider.callCount, 1);
        assert.equal(body.error.message, code === 'provider_rejected'
          ? 'The AI provider could not complete this request.'
          : 'The Tactical Coach provider is not configured.');
      }
    });
  }
});

test('an elapsed Coach deadline maps to 504 before provider use', async () => {
  let reads = 0;
  const provider = createTacticalFakeProvider({ outcomes: script() });
  await withServer({ tacticalProvider: provider, tacticalOrchestrationOptions: {
    now: () => reads++ === 0 ? 0 : 22_000,
  } }, async (base) => {
    const response = await post(base, validRequest());
    assert.equal(response.status, 504);
    assert.equal((await response.json()).error.code, 'deadline');
  });
  assert.equal(provider.callCount, 0);
});

test('client abort cancels an in-flight Coach provider without an unsafe response write', async () => {
  let started;
  const entered = new Promise((resolve) => { started = resolve; });
  let aborted = false;
  const provider = { generate(call) {
    call.signal.addEventListener('abort', () => { aborted = true; }, { once: true });
    started();
    return new Promise(() => {});
  } };
  await withServer({ tacticalProvider: provider }, async (base) => {
    const controller = new AbortController();
    const pending = post(base, validRequest(), { 'Content-Type': 'application/json' }, controller.signal);
    await entered;
    controller.abort();
    await assert.rejects(pending);
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(aborted, true);
  });
});
