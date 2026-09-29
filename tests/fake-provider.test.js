import test from 'node:test';
import assert from 'node:assert/strict';
import { createFakeProvider } from '../dist-server/ai/fake-provider.js';
import { GAME_ASSISTANT_OPERATION, parseAiProviderRequest } from '../dist-server/ai/contracts.js';
import { getReadOnlyToolDeclarations } from '../dist-server/tools.js';

const input = { status: 'playing', score: 10, lives: 2, bricksRemaining: 39 };
const finalOutput = JSON.stringify({ hint: 'Keep the ball in play.', category: 'strategy' });

function request(overrides = {}) {
  return { operation: GAME_ASSISTANT_OPERATION, input, timeoutMs: 5000, maxOutputTokens: 200, ...overrides };
}

test('fake provider receives direct provider-neutral input and safe tool declarations', async () => {
  const provider = createFakeProvider({ outcomes: [{ type: 'final', output: finalOutput }] });
  await provider.generate(request(), getReadOnlyToolDeclarations());
  assert.equal(provider.calls[0].operation, 'game-assistant');
  assert.deepEqual(provider.calls[0].input, input);
  assert.equal(provider.calls[0].toolDeclarations[0].name, 'get_current_game_snapshot');
});

test('fake provider makes zero network calls', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('Network access attempted.'); };
  try {
    const provider = createFakeProvider({ outcomes: [{ type: 'final', output: finalOutput }] });
    assert.equal((await provider.generate(request())).ok, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('fake provider preserves raw final provider JSON text', async () => {
  const provider = createFakeProvider({ outcomes: [{ type: 'final', output: finalOutput }] });
  assert.deepEqual(await provider.generate(request()), {
    ok: true,
    provider: 'fake',
    model: 'fake-deterministic-v1',
    output: { kind: 'final', output: finalOutput },
  });
});

test('fake provider can propose the declared read-only snapshot tool', async () => {
  const provider = createFakeProvider({ outcomes: [{ type: 'tool_call', toolName: 'get_current_game_snapshot', arguments: {} }] });
  const result = await provider.generate(request());
  assert.deepEqual(result.output, { kind: 'tool_call', toolName: 'get_current_game_snapshot', arguments: {} });
});

test('fake provider records every call and direct input', async () => {
  const provider = createFakeProvider({ outcomes: [
    { type: 'final', output: finalOutput },
    { type: 'final', output: JSON.stringify({ hint: 'Watch timing.', category: 'timing' }) },
  ] });
  await provider.generate(request());
  await provider.generate(request({ input: { ...input, score: 20 } }));
  assert.equal(provider.calls.length, 2);
  assert.equal(provider.calls[1].input.score, 20);
  assert.equal(provider.calls[1].provider, 'fake');
  assert.equal(provider.calls[1].model, 'fake-deterministic-v1');
});

test('unknown scripted outcome becomes a safe normalized failure', async () => {
  const provider = createFakeProvider({ outcomes: [{ type: 'raw_sdk_response', secret: 'not exposed' }] });
  assert.deepEqual(await provider.generate(request()), { ok: false, code: 'MALFORMED_PROVIDER_OUTPUT', retryable: false });
});

test('malformed raw provider output reaches application validation through orchestration', async () => {
  const provider = createFakeProvider({ outcomes: [{ type: 'final', output: '{"hint":' }] });
  const result = await provider.generate(request());
  assert.equal(result.ok, true);
  assert.deepEqual(result.output, { kind: 'final', output: '{"hint":' });
});

test('fake provider works without an API key or environment setup', async () => {
  const provider = createFakeProvider({ outcomes: [{ type: 'final', output: finalOutput }] });
  assert.equal((await provider.generate(request())).ok, true);
});

test('provider and model cannot be selected through provider-neutral request data', () => {
  assert.throws(() => parseAiProviderRequest(request({ provider: 'openai' })), /exactly/);
  assert.throws(() => parseAiProviderRequest(request({ model: 'browser-selected-model' })), /exactly/);
});

test('tool declarations expose only the allowlisted read-only tool contract', () => {
  const declarations = getReadOnlyToolDeclarations();
  assert.equal(declarations.length, 1);
  assert.deepEqual(Object.keys(declarations[0]).sort(), ['description', 'inputSchema', 'name']);
  assert.equal(declarations[0].name, 'get_current_game_snapshot');
  assert.deepEqual(declarations[0].inputSchema, { type: 'object', properties: {}, required: [], additionalProperties: false });
});

test('scripted failure codes have fixed retryability', async () => {
  const cases = [
    ['INVALID_REQUEST', false], ['MALFORMED_PROVIDER_OUTPUT', false], ['UNKNOWN_TOOL', false],
    ['MISSING_TOOL_CALL', false], ['PROVIDER_UNAVAILABLE', true], ['TIMEOUT', true],
    ['POLICY_REFUSAL', false], ['NOT_CONFIGURED', false],
  ];
  for (const [code, retryable] of cases) {
    const provider = createFakeProvider({ outcomes: [{ type: 'failure', code }] });
    assert.deepEqual(await provider.generate(request()), { ok: false, code, retryable });
  }
});
