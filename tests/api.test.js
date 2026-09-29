import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { createApiServer } from '../server/index.js';
import { parsePublicAiResponse } from '../server/contracts.js';

const validRequest = {
  question: 'How am I doing?',
  snapshot: { status: 'playing', score: 10, lives: 3, bricksRemaining: 39 },
};

let server;
let baseUrl;

before(async () => {
  server = createApiServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

test('valid POST /api/ai returns 200 with a validated local fake-provider response', async () => {
  const response = await fetch(`${baseUrl}/api/ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(validRequest),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(parsePublicAiResponse(await response.json()), {
    answer: 'Local fake provider response.',
  });
});

test('empty question returns 400', async () => {
  const response = await fetch(`${baseUrl}/api/ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...validRequest, question: '  ' }),
  });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: { code: 'INVALID_REQUEST', message: 'Invalid request' } });
});

test('invalid snapshot returns 400', async () => {
  const response = await fetch(`${baseUrl}/api/ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...validRequest, snapshot: { ...validRequest.snapshot, lives: '3' } }),
  });
  assert.equal(response.status, 400);
});

test('malformed JSON returns 400', async () => {
  const response = await fetch(`${baseUrl}/api/ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"question":',
  });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: { code: 'INVALID_REQUEST', message: 'Invalid request' } });
});

test('unsupported method returns 405 and Allow header', async () => {
  const response = await fetch(`${baseUrl}/api/ai`);
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'POST');
});

test('unknown route returns 404', async () => {
  const response = await fetch(`${baseUrl}/api/unknown`, { method: 'POST' });
  assert.equal(response.status, 404);
});

test('oversized request body returns 413', async () => {
  const response = await fetch(`${baseUrl}/api/ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...validRequest, question: 'q'.repeat(20 * 1024) }),
  });
  assert.equal(response.status, 413);
  assert.deepEqual(await response.json(), { error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body too large' } });
});

test('endpoint responses use application/json content type', async () => {
  const response = await fetch(`${baseUrl}/api/ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(validRequest),
  });
  assert.match(response.headers.get('content-type'), /^application\/json\b/);
});

test('validation details are not exposed in the public error response', async () => {
  const response = await fetch(`${baseUrl}/api/ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...validRequest, snapshot: { ...validRequest.snapshot, status: 'private-internal-detail' } }),
  });
  const body = await response.text();
  assert.equal(response.status, 400);
  assert.equal(body, JSON.stringify({ error: { code: 'INVALID_REQUEST', message: 'Invalid request' } }));
  assert.doesNotMatch(body, /private-internal-detail|stack|ContractError/);
});

test('non-JSON content type is rejected', async () => {
  const response = await fetch(`${baseUrl}/api/ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(validRequest),
  });
  assert.equal(response.status, 415);
});