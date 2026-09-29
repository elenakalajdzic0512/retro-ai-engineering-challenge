import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { createApiServer } from '../dist-server/index.js';

const validRequest = { status: 'playing', score: 10, lives: 3, bricksRemaining: 39 };
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

async function post(body, options = {}) {
  return fetch(`${baseUrl}/api/ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

test('valid four-field request returns exactly a hint and category', async () => {
  const response = await post(validRequest);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { hint: 'Keep the ball in play.', category: 'general' });
});

test('invalid local input is rejected before provider invocation', async () => {
  let providerCallCount = 0;
  const provider = { async generate() { providerCallCount += 1; throw new Error('must not call'); } };
  const localServer = createApiServer({ provider });
  await new Promise((resolve, reject) => localServer.listen(0, '127.0.0.1', resolve).once('error', reject));
  const url = `http://127.0.0.1:${localServer.address().port}/api/ai`;
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...validRequest, score: '10' }) });
  assert.equal(response.status, 400);
  assert.equal(providerCallCount, 0);
  await new Promise((resolve, reject) => localServer.close((error) => error ? reject(error) : resolve()));
});

test('old question/snapshot wrapper is rejected with zero provider calls', async () => {
  let providerCallCount = 0;
  const provider = { async generate() { providerCallCount += 1; } };
  const localServer = createApiServer({ provider });
  await new Promise((resolve, reject) => localServer.listen(0, '127.0.0.1', resolve).once('error', reject));
  const url = `http://127.0.0.1:${localServer.address().port}/api/ai`;
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: 'How am I doing?', snapshot: validRequest }) });
  assert.equal(response.status, 400);
  assert.equal(providerCallCount, 0);
  await new Promise((resolve, reject) => localServer.close((error) => error ? reject(error) : resolve()));
});

test('malformed JSON returns 400', async () => {
  const response = await post('{"status":');
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: { code: 'INVALID_REQUEST', message: 'Invalid request' } });
});

test('non-JSON content type returns 415', async () => {
  const response = await post(validRequest, { headers: { 'Content-Type': 'text/plain' } });
  assert.equal(response.status, 415);
});

test('oversized request body returns 413', async () => {
  const response = await post(JSON.stringify({ status: 'playing', score: 10, lives: 3, bricksRemaining: 39, padding: 'x'.repeat(2_000) }));
  assert.equal(response.status, 413);
  assert.deepEqual(await response.json(), { error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body too large' } });
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

test('validation details are not exposed in public errors', async () => {
  const response = await post({ ...validRequest, status: 'private-internal-detail' });
  const body = await response.text();
  assert.equal(response.status, 400);
  assert.equal(body, JSON.stringify({ error: { code: 'INVALID_REQUEST', message: 'Invalid request' } }));
  assert.doesNotMatch(body, /private-internal-detail|stack|ContractError/);
});

test('endpoint response uses application/json content type', async () => {
  const response = await post(validRequest);
  assert.match(response.headers.get('content-type'), /^application\/json\b/);
});
