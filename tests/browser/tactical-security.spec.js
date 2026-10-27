import { createServer } from 'node:http';
import { test, expect } from '@playwright/test';
import { preview } from 'vite';
import { createGame } from '../../src/game.js';
import { deriveTacticalSnapshot } from '../../src/tactical-snapshot.js';
import { createApiServer } from '../../dist-server/index.js';

const host = '127.0.0.1';
const scriptPath = '/w08-control.js';
const scriptBody = 'window.__W08_EXTERNAL_SCRIPT_EXECUTED__ = true;';

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, host, resolve);
  });
  return `http://${host}:${server.address().port}`;
}

async function close(server) {
  if (!server?.listening) return;
  server.closeAllConnections();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

let api;
let previewServer;
let secondOrigin;
let previewUrl;
let scriptUrl;

test.beforeAll(async () => {
  // The explicit fake mode is selected before server construction; this guard fails if Gemini is selected.
  const previousMode = process.env.TACTICAL_AI_PROVIDER;
  process.env.TACTICAL_AI_PROVIDER = 'fake';
  try {
    api = createApiServer({ tacticalGeminiProviderFactory() {
      throw new Error('Live Gemini must not be selected by the W08 browser fixture.');
    } });
  } finally {
    if (previousMode === undefined) delete process.env.TACTICAL_AI_PROVIDER;
    else process.env.TACTICAL_AI_PROVIDER = previousMode;
  }
  const apiUrl = await listen(api);

  // Serve the real production build. The inline proxy is test-only; vite.config.js remains for T038.
  previewServer = await preview({
    logLevel: 'error',
    preview: { host, port: 0, strictPort: true, proxy: { '/api': { target: apiUrl } } },
  });
  previewUrl = `http://${host}:${previewServer.httpServer.address().port}`;

  secondOrigin = createServer((request, response) => {
    if (request.url !== scriptPath) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
    response.end(scriptBody);
  });
  scriptUrl = `${await listen(secondOrigin)}${scriptPath}`;
});

test.afterAll(async () => {
  const shutdown = await Promise.allSettled([
    close(secondOrigin),
    previewServer?.close(),
    close(api),
  ]);
  const failed = shutdown.find((result) => result.status === 'rejected');
  if (failed) throw failed.reason;
});

test('T008 production-profile fixture starts fake API, preview and controlled script origin', async ({ page, request }) => {
  const pageResponse = await page.goto(previewUrl);
  expect(pageResponse?.status()).toBe(200);
  await expect(page.locator('#game')).toHaveCount(1);

  const scriptResponse = await request.get(scriptUrl);
  expect(scriptResponse.status()).toBe(200);
  expect(await scriptResponse.text()).toBe(scriptBody);

  const tacticalInput = { goal: 'Clear the center safely.', state: deriveTacticalSnapshot(createGame()) };
  const coach = await page.evaluate(async (input) => {
    const response = await fetch('/api/tactical-coach', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
    });
    return { status: response.status, body: await response.json() };
  }, tacticalInput);
  expect(coach.status).toBe(200);
  expect(coach.body.plan.summary).toBe('Clear the center with controlled bounces.');
});
