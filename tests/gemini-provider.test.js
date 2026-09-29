import test from 'node:test';
import assert from 'node:assert/strict';
import { createGeminiProvider, GEMINI_MODEL } from '../dist-server/ai/gemini-provider.js';

const request = {
  operation: 'game-assistant',
  input: { status: 'playing', score: 12.5, lives: 2, bricksRemaining: 31 },
  timeoutMs: 5000,
  maxOutputTokens: 200,
};

test('Gemini provider sends the fixed model, validated snapshot, and structured JSON config', async () => {
  let captured;
  const client = { models: { async generateContent(value) { captured = value; return { text: '{"hint":"Watch timing.","category":"timing"}' }; } } };
  const provider = createGeminiProvider({ apiKey: 'sentinel-key', client });
  const result = await provider.generate(request, [], [], { signal: new AbortController().signal });
  assert.equal(captured.model, GEMINI_MODEL);
  assert.match(captured.contents, /status=playing/);
  assert.match(captured.contents, /score=12.5/);
  assert.match(captured.contents, /lives=2/);
  assert.match(captured.contents, /bricksRemaining=31/);
  assert.equal(captured.config.responseMimeType, 'application/json');
  assert.deepEqual(captured.config.responseJsonSchema.required, ['hint', 'category']);
  assert.equal(result.output.output, '{"hint":"Watch timing.","category":"timing"}');
});

test('Gemini provider forwards the supplied AbortSignal', async () => {
  let captured;
  const client = { models: { async generateContent(value) { captured = value; return { text: '{}' }; } } };
  const signal = new AbortController().signal;
  await createGeminiProvider({ client }).generate(request, [], [], { signal });
  assert.equal(captured.config.abortSignal, signal);
});

test('browser request data cannot select another provider or model', async () => {
  let calls = 0;
  const client = { models: { async generateContent() { calls += 1; return { text: '{}' }; } } };
  const provider = createGeminiProvider({ client });
  await assert.rejects(() => provider.generate({ ...request, provider: 'fake', model: 'other' }, [], [], { signal: new AbortController().signal }));
  assert.equal(calls, 0);
});

test('API key is absent from the provider result and captured request', async () => {
  let captured;
  const client = { models: { async generateContent(value) { captured = value; return { text: '{"hint":"Play safe.","category":"general"}' }; } } };
  const result = await createGeminiProvider({ apiKey: 'secret-sentinel', client }).generate(request, [], [], { signal: new AbortController().signal });
  assert.doesNotMatch(JSON.stringify(result), /secret-sentinel/);
  assert.doesNotMatch(JSON.stringify(captured), /secret-sentinel/);
});

test('Gemini authentication and access failures are non-retryable NOT_CONFIGURED failures', async () => {
  for (const status of [401, 403]) {
    const client = {
      models: {
        async generateContent() {
          const error = new Error('private SDK details and secret context');
          error.status = status;
          throw error;
        },
      },
    };
    const result = await createGeminiProvider({ client }).generate(request, [], [], { signal: new AbortController().signal });
    assert.deepEqual(result, { ok: false, code: 'NOT_CONFIGURED', retryable: false });
    assert.doesNotMatch(JSON.stringify(result), /private SDK details|secret context/);
  }
});
