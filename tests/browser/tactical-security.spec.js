import { createServer } from 'node:http';
import { test, expect } from '@playwright/test';
import { preview } from 'vite';
import { createGame } from '../../src/game.js';
import { deriveTacticalSnapshot } from '../../src/tactical-snapshot.js';
import { createApiServer } from '../../dist-server/index.js';
import { createTacticalFakeProvider } from '../../dist-server/tactical/fake-provider.js';

const host = '127.0.0.1';
const scriptPath = '/w08-control.js';
const scriptBody = 'window.__W08_EXTERNAL_SCRIPT_EXECUTED__ = true;';
const defaultSummary = 'Clear the center with controlled bounces.';
const xssPayload = '<img src="/w08-missing.png" onerror="window.__w08XssMarker = true">';
const candidate = { targetZone: 'center', style: 'balanced', paddleContact: 'center', route: 'direct' };

function tacticalScript(summary) {
  return [
    { type: 'tool_call', toolName: 'get_tactical_snapshot', arguments: {} },
    { type: 'tool_call', toolName: 'evaluate_tactical_strategy', arguments: candidate },
    { type: 'final', output: {
      summary, strategy: 'balanced', targetZone: 'center', paddleContact: 'center', route: 'direct',
      actions: ['Aim for a center paddle bounce when the ball returns.'],
      evidence: [
        { source: 'tactical_snapshot', fact: 'bricksByZone.center' },
        { source: 'strategy_evaluation', fact: 'targetOpportunity' },
      ],
    } },
  ];
}

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
let nextSummary = defaultSummary;
let admissionTime = 0;
const observedGoals = [];

async function submitCoach(page, summary, goal = 'Clear the center safely.') {
  // Keep independent acceptance cases outside the single-process 5-per-60s window.
  admissionTime += 60_001;
  nextSummary = summary;
  const pageResponse = await page.goto(previewUrl);
  expect(pageResponse?.status()).toBe(200);
  await page.evaluate(() => { window.__w08XssMarker = false; });
  expect(await page.evaluate(() => window.__w08XssMarker)).toBe(false);
  await page.locator('#tactical-coach-goal').fill(goal);
  await page.locator('#tactical-coach-button').click();
  await expect(page.locator('#tactical-coach-status')).toHaveText('Tactical plan ready.');
  return page.locator('#tactical-coach-result');
}

async function expectInertText(page, result, value) {
  await expect(result.locator('.coach-recommendation')).toHaveText(value);
  await expect(result.locator('h3')).toHaveCount(3);
  await expect(result.locator('.coach-actions li')).toHaveCount(1);
  await expect(result.locator('.coach-evidence li')).toHaveCount(2);
  await expect(result.locator('img, script, strong, a, [onerror]')).toHaveCount(0);
  expect(await page.evaluate(() => window.__w08XssMarker)).toBe(false);
}

test.beforeAll(async () => {
  // The explicit fake mode is selected before server construction; this guard fails if Gemini is selected.
  const previousMode = process.env.TACTICAL_AI_PROVIDER;
  process.env.TACTICAL_AI_PROVIDER = 'fake';
  try {
    api = createApiServer({
      tacticalAdmissionClock: () => admissionTime,
      tacticalGeminiProviderFactory() {
        throw new Error('Live Gemini must not be selected by the W08 browser fixture.');
      },
      tacticalProviderFactory() {
        const fake = createTacticalFakeProvider({ outcomes: tacticalScript(nextSummary) });
        return { generate(call) {
          observedGoals.push(call.input.goal);
          return fake.generate(call);
        } };
      },
    });
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
  expect(coach.body.plan.summary).toBe(defaultSummary);
});

test('T04 malicious fake final text stays inert in the real Tactical UI', async ({ page }) => {
  const result = await submitCoach(page, xssPayload);
  await expectInertText(page, result, xssPayload);
  await expect(result.locator('.coach-recommendation')).toHaveJSProperty('childElementCount', 0);
});

test('T04 malicious real user goal reaches model context but creates no DOM sink', async ({ page }) => {
  const start = observedGoals.length;
  const result = await submitCoach(page, defaultSummary, xssPayload);
  expect(observedGoals.slice(start)).toContain(xssPayload);
  await expect(page.locator('#tactical-coach-goal')).toHaveValue(xssPayload);
  await expectInertText(page, result, defaultSummary);
  await expect(result).not.toContainText(xssPayload);
});

test('T04 Serbian letters, apostrophe and a < b remain readable', async ({ page }) => {
  const readable = "Čuvaj č ć š ž đ, igrač's plan: a < b.";
  const result = await submitCoach(page, readable);
  await expectInertText(page, result, readable);
  await expect(result.locator('.coach-recommendation')).toHaveJSProperty('childElementCount', 0);
});

test('T05 raw HTML stays literal text, without an attacker element', async ({ page }) => {
  const rawHtml = '<strong>W08 HTML</strong>';
  const result = await submitCoach(page, rawHtml);
  await expectInertText(page, result, rawHtml);
});

test('T05 Markdown stays literal text, without formatting or linkification', async ({ page }) => {
  const markdown = '**W08 bold** [W08 link](https://example.invalid)';
  const result = await submitCoach(page, markdown);
  await expectInertText(page, result, markdown);
});

test('T05 javascript URL and Markdown link attempt stay inert', async ({ page }) => {
  const unsafeLink = 'javascript:window.__w08XssMarker=true [open](javascript:window.__w08XssMarker=true)';
  const result = await submitCoach(page, unsafeLink);
  const location = page.url();
  await expectInertText(page, result, unsafeLink);
  await expect(result.locator('a[href]')).toHaveCount(0);
  expect(page.url()).toBe(location);
});
