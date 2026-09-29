import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createApiServer } from '../dist-server/index.js';
import { createFakeProvider } from '../dist-server/ai/fake-provider.js';
import { invokeReadOnlyTool } from '../dist-server/tools.js';

const validRequest = { status: 'playing', score: 20, lives: 2, bricksRemaining: 38 };
const toolCall = { type: 'tool_call', toolName: 'get_current_game_snapshot', arguments: {} };
const finalHint = { type: 'final', output: JSON.stringify({ hint: 'Use the center lane.', category: 'strategy' }) };
const servers = [];

async function startApi(provider, options = {}) {
  const { orchestrationOptions = {}, ...serverOptions } = options;
  const server = createApiServer({ provider, ...serverOptions, orchestrationOptions: { sleep: async () => {}, jitter: () => 0, ...orchestrationOptions } });
  servers.push(server);
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return `http://127.0.0.1:${server.address().port}`;
}

after(async () => Promise.all(servers.map((server) => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())))));

async function post(baseUrl, body = validRequest) {
  return fetch(`${baseUrl}/api/ai`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

test('valid final hint flow calls the injected fake provider', async () => {
  const provider = createFakeProvider({ outcomes: [finalHint] });
  const response = await post(await startApi(provider));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { hint: 'Use the center lane.', category: 'strategy' });
  assert.equal(provider.calls.length, 1);
  assert.deepEqual(provider.calls[0].input, validRequest);
});

test('tool proposal executes once and direct snapshot is passed to the tool', async () => {
  const provider = createFakeProvider({ outcomes: [toolCall, finalHint] });
  let toolExecutions = 0;
  const response = await post(await startApi(provider, { toolExecutor(name, args, context) { toolExecutions += 1; return invokeReadOnlyTool(name, args, context); } }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { hint: 'Use the center lane.', category: 'strategy' });
  assert.equal(toolExecutions, 1);
  assert.equal(provider.calls.length, 2);
  assert.deepEqual(provider.calls[1].toolResults, [{ toolName: 'get_current_game_snapshot', result: validRequest }]);
});

test('invalid HTTP input is rejected before the provider is called', async () => {
  const provider = createFakeProvider({ outcomes: [finalHint] });
  const response = await post(await startApi(provider), { ...validRequest, score: '20' });
  assert.equal(response.status, 400);
  assert.equal(provider.calls.length, 0);
});

test('unknown tool proposal returns a stable sanitized error', async () => {
  const provider = createFakeProvider({ outcomes: [{ type: 'tool_call', toolName: 'delete_game', arguments: {} }] });
  const response = await post(await startApi(provider, { toolExecutor() { throw new Error('must not execute'); } }));
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), { error: { code: 'UNKNOWN_TOOL', message: 'AI proposed an unsupported tool' } });
});

test('malformed raw final output returns a stable sanitized error', async () => {
  const provider = createFakeProvider({ outcomes: [{ type: 'final', output: '{"hint":' }] });
  const response = await post(await startApi(provider));
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), { error: { code: 'MALFORMED_PROVIDER_OUTPUT', message: 'AI response could not be validated' } });
});

test('provider unavailable maps to a sanitized 503 response after two calls', async () => {
  const provider = createFakeProvider({ outcomes: [{ type: 'failure', code: 'PROVIDER_UNAVAILABLE' }, { type: 'failure', code: 'PROVIDER_UNAVAILABLE' }] });
  const response = await post(await startApi(provider));
  assert.equal(response.status, 503);
  assert.equal(provider.calls.length, 2);
  assert.deepEqual(await response.json(), { error: { code: 'PROVIDER_UNAVAILABLE', message: 'AI service is unavailable' } });
});

test('provider unavailable then success retries once and returns the hint', async () => {
  const provider = createFakeProvider({ outcomes: [{ type: 'failure', code: 'PROVIDER_UNAVAILABLE' }, finalHint] });
  const response = await post(await startApi(provider));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { hint: 'Use the center lane.', category: 'strategy' });
  assert.equal(provider.calls.length, 2);
});

test('timeout that remains timeout returns a safe 504 with bounded calls', async () => {
  const provider = createFakeProvider({ outcomes: [
    { type: 'failure', code: 'TIMEOUT' },
    { type: 'failure', code: 'TIMEOUT' },
  ] });
  const response = await post(await startApi(provider));
  assert.equal(response.status, 504);
  assert.equal(provider.calls.length, 2);
  assert.deepEqual(await response.json(), { error: { code: 'TIMEOUT', message: 'AI request timed out' } });
});

test('NOT_CONFIGURED returns a safe 503 without retry', async () => {
  const provider = createFakeProvider({ outcomes: [{ type: 'failure', code: 'NOT_CONFIGURED' }] });
  const response = await post(await startApi(provider));
  assert.equal(response.status, 503);
  assert.equal(provider.calls.length, 1);
  assert.deepEqual(await response.json(), { error: { code: 'NOT_CONFIGURED', message: 'AI service is not configured' } });
});

test('policy refusal returns a safe 422 without retry', async () => {
  const provider = createFakeProvider({ outcomes: [{ type: 'failure', code: 'POLICY_REFUSAL' }] });
  const response = await post(await startApi(provider));
  assert.equal(response.status, 422);
  assert.equal(provider.calls.length, 1);
  assert.deepEqual(await response.json(), { error: { code: 'POLICY_REFUSAL', message: 'AI request was refused' } });
});

test('raw provider exception text and stack are not exposed publicly', async () => {
  let providerCalls = 0;
  const provider = { async generate() { providerCalls += 1; throw new Error('private response body and stack details'); } };
  const response = await post(await startApi(provider));
  const body = await response.text();
  assert.equal(response.status, 503);
  assert.equal(providerCalls, 2);
  assert.equal(body, JSON.stringify({ error: { code: 'PROVIDER_UNAVAILABLE', message: 'AI service is unavailable' } }));
  assert.doesNotMatch(body, /private response body|stack details|Error/);
});

test('timeout then success retries once and returns the hint', async () => {
  const provider = createFakeProvider({ outcomes: [{ type: 'failure', code: 'TIMEOUT' }, finalHint] });
  const response = await post(await startApi(provider));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { hint: 'Use the center lane.', category: 'strategy' });
  assert.equal(provider.calls.length, 2);
});

test('injected jitter determines backoff without waiting in real time', async () => {
  const provider = createFakeProvider({ outcomes: [{ type: 'failure', code: 'PROVIDER_UNAVAILABLE' }, finalHint] });
  const delays = [];
  const response = await post(await startApi(provider, { orchestrationOptions: { jitter: () => 0.5, sleep: async (milliseconds) => delays.push(milliseconds) } }));
  assert.equal(response.status, 200);
  assert.deepEqual(delays, [150]);
});

test('retry does not continue after the shared deadline', async () => {
  let currentTime = 0;
  const provider = createFakeProvider({ outcomes: [
    { type: 'failure', code: 'PROVIDER_UNAVAILABLE' },
    finalHint,
  ] });
  const response = await post(await startApi(provider, {
    orchestrationOptions: {
      now: () => currentTime,
      sleep: async () => { currentTime = 5000; },
    },
  }));
  assert.equal(response.status, 504);
  assert.equal(provider.calls.length, 1);
  assert.deepEqual(await response.json(), { error: { code: 'TIMEOUT', message: 'AI request timed out' } });
});

test('second tool proposal is rejected without executing a second tool call', async () => {
  const provider = createFakeProvider({ outcomes: [toolCall, toolCall, finalHint] });
  let toolExecutions = 0;
  const response = await post(await startApi(provider, { toolExecutor(name, args, context) { toolExecutions += 1; return invokeReadOnlyTool(name, args, context); } }));
  assert.equal(response.status, 502);
  assert.equal(toolExecutions, 1);
  assert.equal(provider.calls.length, 2);
  assert.deepEqual(await response.json(), { error: { code: 'TOOL_STEP_LIMIT', message: 'AI response exceeded the allowed tool steps' } });
});
