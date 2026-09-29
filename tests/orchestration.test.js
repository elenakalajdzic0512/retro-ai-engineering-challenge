import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createApiServer } from '../server/index.js';
import { createFakeProvider } from '../server/ai/fake-provider.js';
import { invokeReadOnlyTool } from '../server/tools.js';

const validRequest = {
  question: 'How am I doing?',
  snapshot: { status: 'playing', score: 20, lives: 2, bricksRemaining: 38 },
};
const toolCall = { type: 'tool_call', toolName: 'get_current_game_snapshot', arguments: {} };
const finalAnswer = { type: 'final', output: { answer: 'You have 2 lives and 38 bricks remaining.' } };
const servers = [];

async function startApi(provider, options = {}) {
  const { orchestrationOptions = {}, ...serverOptions } = options;
  const server = createApiServer({
    provider,
    ...serverOptions,
    orchestrationOptions: { sleep: async () => {}, jitter: () => 0, ...orchestrationOptions },
  });
  servers.push(server);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return `http://127.0.0.1:${server.address().port}`;
}

after(async () => {
  await Promise.all(servers.map((server) => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  })));
});

async function post(baseUrl, body = validRequest) {
  return fetch(`${baseUrl}/api/ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('valid final-answer flow calls the injected fake provider', async () => {
  const provider = createFakeProvider({ outcomes: [finalAnswer] });
  const baseUrl = await startApi(provider);
  const response = await post(baseUrl);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { answer: finalAnswer.output.answer });
  assert.equal(provider.calls.length, 1);
  assert.deepEqual(provider.calls[0].input, validRequest);
});

test('tool proposal executes once and its normalized result is returned to provider before final answer', async () => {
  const provider = createFakeProvider({ outcomes: [toolCall, finalAnswer] });
  let toolExecutions = 0;
  const baseUrl = await startApi(provider, {
    toolExecutor(name, args, context) {
      toolExecutions += 1;
      return invokeReadOnlyTool(name, args, context);
    },
  });
  const response = await post(baseUrl);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { answer: finalAnswer.output.answer });
  assert.equal(toolExecutions, 1);
  assert.equal(provider.calls.length, 2);
  assert.deepEqual(provider.calls[1].toolResults, [{ toolName: 'get_current_game_snapshot', result: validRequest.snapshot }]);
  assert.deepEqual(validRequest.snapshot, { status: 'playing', score: 20, lives: 2, bricksRemaining: 38 });
});

test('invalid HTTP input is rejected before the provider is called', async () => {
  const provider = createFakeProvider({ outcomes: [finalAnswer] });
  const baseUrl = await startApi(provider);
  const response = await post(baseUrl, { ...validRequest, question: '  ' });
  assert.equal(response.status, 400);
  assert.equal(provider.calls.length, 0);
});

test('unknown tool proposal returns a stable sanitized error', async () => {
  const provider = createFakeProvider({ outcomes: [{ type: 'tool_call', toolName: 'delete_game', arguments: {} }] });
  let toolExecutions = 0;
  const baseUrl = await startApi(provider, {
    toolExecutor() { toolExecutions += 1; throw new Error('must not execute'); },
  });
  const response = await post(baseUrl);
  assert.equal(response.status, 502);
  assert.equal(toolExecutions, 0);
  assert.equal(provider.calls.length, 1);
  assert.deepEqual(await response.json(), {
    error: { code: 'UNKNOWN_TOOL', message: 'AI proposed an unsupported tool' },
  });
});

test('invalid tool arguments return a stable sanitized error without execution', async () => {
  const provider = createFakeProvider({ outcomes: [{ type: 'tool_call', toolName: 'get_current_game_snapshot', arguments: { admin: true } }] });
  let toolExecutions = 0;
  const baseUrl = await startApi(provider, {
    toolExecutor() { toolExecutions += 1; throw new Error('must not execute'); },
  });
  const response = await post(baseUrl);
  assert.equal(response.status, 502);
  assert.equal(toolExecutions, 0);
  assert.equal(provider.calls.length, 1);
  assert.deepEqual(await response.json(), {
    error: { code: 'MALFORMED_PROVIDER_OUTPUT', message: 'AI response could not be validated' },
  });
});

test('malformed final output returns a stable sanitized error', async () => {
  const provider = createFakeProvider({ outcomes: [{ type: 'final', output: { answer: '' } }] });
  const baseUrl = await startApi(provider);
  const response = await post(baseUrl);
  assert.equal(response.status, 502);
  assert.equal(provider.calls.length, 1);
  assert.deepEqual(await response.json(), {
    error: { code: 'MALFORMED_PROVIDER_OUTPUT', message: 'AI response could not be validated' },
  });
});

test('missing required tool call maps to a safe non-retryable failure', async () => {
  const provider = createFakeProvider({ outcomes: [{ type: 'failure', code: 'MISSING_TOOL_CALL' }] });
  const baseUrl = await startApi(provider);
  const response = await post(baseUrl);
  assert.equal(response.status, 502);
  assert.equal(provider.calls.length, 1);
  assert.deepEqual(await response.json(), {
    error: { code: 'MISSING_TOOL_CALL', message: 'AI did not provide a required tool call' },
  });
});

test('provider unavailable maps to a sanitized 503 response', async () => {
  const provider = createFakeProvider({ outcomes: [
    { type: 'failure', code: 'PROVIDER_UNAVAILABLE' },
    { type: 'failure', code: 'PROVIDER_UNAVAILABLE' },
  ] });
  const baseUrl = await startApi(provider);
  const response = await post(baseUrl);
  assert.equal(response.status, 503);
  assert.equal(provider.calls.length, 2);
  assert.deepEqual(await response.json(), {
    error: { code: 'PROVIDER_UNAVAILABLE', message: 'AI service is unavailable' },
  });
});

test('timeout maps to a sanitized 504 response', async () => {
  const provider = createFakeProvider({ outcomes: [
    { type: 'failure', code: 'TIMEOUT' },
    { type: 'failure', code: 'TIMEOUT' },
  ] });
  const baseUrl = await startApi(provider);
  const response = await post(baseUrl);
  assert.equal(response.status, 504);
  assert.equal(provider.calls.length, 2);
  assert.deepEqual(await response.json(), {
    error: { code: 'TIMEOUT', message: 'AI request timed out' },
  });
});

test('policy refusal maps to a sanitized non-retryable failure', async () => {
  const provider = createFakeProvider({ outcomes: [{ type: 'failure', code: 'POLICY_REFUSAL' }] });
  const baseUrl = await startApi(provider);
  const response = await post(baseUrl);
  assert.equal(response.status, 422);
  assert.equal(provider.calls.length, 1);
  assert.deepEqual(await response.json(), {
    error: { code: 'POLICY_REFUSAL', message: 'AI request was refused' },
  });
});

test('missing provider configuration maps to a sanitized 503 response', async () => {
  const baseUrl = await startApi(undefined, { providerFactory: () => null });
  const response = await post(baseUrl);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error: { code: 'NOT_CONFIGURED', message: 'AI service is not configured' },
  });
});

test('scripted NOT_CONFIGURED outcome is non-retryable after one provider call', async () => {
  const provider = createFakeProvider({ outcomes: [{ type: 'failure', code: 'NOT_CONFIGURED' }] });
  const baseUrl = await startApi(provider);
  const response = await post(baseUrl);
  assert.equal(response.status, 503);
  assert.equal(provider.calls.length, 1);
  assert.deepEqual(await response.json(), {
    error: { code: 'NOT_CONFIGURED', message: 'AI service is not configured' },
  });
});

test('raw provider exception text and stack are never returned', async () => {
  let providerCalls = 0;
  const provider = { async generate() { providerCalls += 1; throw new Error('private response body and stack details'); } };
  const baseUrl = await startApi(provider);
  const response = await post(baseUrl);
  const body = await response.text();
  assert.equal(response.status, 503);
  assert.equal(providerCalls, 2);
  assert.equal(body, JSON.stringify({
    error: { code: 'PROVIDER_UNAVAILABLE', message: 'AI service is unavailable' },
  }));
  assert.doesNotMatch(body, /private response body|stack details|Error/);
});

test('a second tool proposal is rejected without executing a second tool call', async () => {
  const provider = createFakeProvider({ outcomes: [toolCall, toolCall, finalAnswer] });
  let toolExecutions = 0;
  const baseUrl = await startApi(provider, {
    toolExecutor(name, args, context) {
      toolExecutions += 1;
      return invokeReadOnlyTool(name, args, context);
    },
  });
  const response = await post(baseUrl);
  assert.equal(response.status, 502);
  assert.equal(toolExecutions, 1);
  assert.equal(provider.calls.length, 2);
  assert.deepEqual(await response.json(), {
    error: { code: 'TOOL_STEP_LIMIT', message: 'AI response exceeded the allowed tool steps' },
  });
});

test('provider unavailable then success retries once and succeeds in exactly two calls', async () => {
  const provider = createFakeProvider({ outcomes: [
    { type: 'failure', code: 'PROVIDER_UNAVAILABLE' },
    finalAnswer,
  ] });
  const baseUrl = await startApi(provider);
  const response = await post(baseUrl);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { answer: finalAnswer.output.answer });
  assert.equal(provider.calls.length, 2);
});

test('timeout then success retries once and succeeds in exactly two calls', async () => {
  const provider = createFakeProvider({ outcomes: [
    { type: 'failure', code: 'TIMEOUT' },
    finalAnswer,
  ] });
  const baseUrl = await startApi(provider);
  const response = await post(baseUrl);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { answer: finalAnswer.output.answer });
  assert.equal(provider.calls.length, 2);
});

test('injected jitter determines backoff without waiting in real time', async () => {
  const provider = createFakeProvider({ outcomes: [
    { type: 'failure', code: 'PROVIDER_UNAVAILABLE' },
    finalAnswer,
  ] });
  const delays = [];
  const baseUrl = await startApi(provider, {
    orchestrationOptions: {
      jitter: () => 0.5,
      sleep: async (milliseconds) => { delays.push(milliseconds); },
    },
  });
  const response = await post(baseUrl);
  assert.equal(response.status, 200);
  assert.equal(provider.calls.length, 2);
  assert.deepEqual(delays, [150]);
});

test('retry is not started when the shared deadline expires during backoff', async () => {
  let currentTime = 0;
  const provider = createFakeProvider({ outcomes: [
    { type: 'failure', code: 'PROVIDER_UNAVAILABLE' },
    finalAnswer,
  ] });
  const baseUrl = await startApi(provider, {
    orchestrationOptions: {
      now: () => currentTime,
      sleep: async () => { currentTime = 5000; },
    },
  });
  const response = await post(baseUrl);
  assert.equal(response.status, 504);
  assert.equal(provider.calls.length, 1);
  assert.deepEqual(await response.json(), {
    error: { code: 'TIMEOUT', message: 'AI request timed out' },
  });
});