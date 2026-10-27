import { createServer } from 'node:http';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test, expect } from '@playwright/test';
import { preview } from 'vite';
import { createGame } from '../../src/game.js';
import { deriveTacticalSnapshot } from '../../src/tactical-snapshot.js';
import { createApiServer } from '../../dist-server/index.js';
import { createTacticalFakeProvider } from '../../dist-server/tactical/fake-provider.js';

const host = '127.0.0.1';
const scriptPath = '/w08-control.js';
const scriptBody = 'window.__W08_EXTERNAL_SCRIPT_EXECUTED__ = true;';
const sentinel = 'W08_SERVER_SECRET_DO_NOT_EXPOSE';
const expectedCsp = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'none'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'";
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
let noCspControl;
let previewUrl;
let scriptUrl;
let controlUrl;
let nextSummary = defaultSummary;
let admissionTime = 0;
const observedGoals = [];
const securityEvents = [];
const previousGeminiKey = process.env.GEMINI_API_KEY;

async function artifactFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? artifactFiles(path) : [path];
  }));
  return nested.flat();
}

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
  process.env.GEMINI_API_KEY = sentinel;
  try {
    api = createApiServer({
      tacticalAdmissionClock: () => admissionTime,
      tacticalSecurityEventSink: (event) => securityEvents.push(event),
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

  // Use the actual production preview proxy/headers with this fixture's isolated API port.
  const previousPreviewPort = process.env.W08_PREVIEW_API_PORT;
  process.env.W08_PREVIEW_API_PORT = new URL(apiUrl).port;
  try {
    previewServer = await preview({
      logLevel: 'error',
      preview: { host, port: 0, strictPort: true },
    });
  } finally {
    if (previousPreviewPort === undefined) delete process.env.W08_PREVIEW_API_PORT;
    else process.env.W08_PREVIEW_API_PORT = previousPreviewPort;
  }
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

  noCspControl = createServer((_request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(`<!doctype html><html><head><script src="${scriptUrl}"></script></head><body>W08 no-CSP control</body></html>`);
  });
  controlUrl = await listen(noCspControl);
});

test.afterAll(async () => {
  if (previousGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = previousGeminiKey;
  const shutdown = await Promise.allSettled([
    close(noCspControl),
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

test('T038 configuration smoke delivers headers and keeps built game and fake Coach working', async ({ page }) => {
  const cspViolations = [];
  const pageErrors = [];
  page.on('console', (message) => {
    if (/content security policy|violat(?:es|ion).*directive/i.test(message.text())) {
      cspViolations.push(message.text());
    }
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  nextSummary = defaultSummary;
  admissionTime += 60_001;
  const pageResponse = await page.goto(previewUrl);
  expect(pageResponse?.status()).toBe(200);
  const headers = pageResponse.headers();
  expect(headers['content-security-policy']).toContain("default-src 'self'");
  expect(headers['content-security-policy']).toContain("script-src 'self'");
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['referrer-policy']).toBe('no-referrer');
  await expect(page.locator('#status')).toHaveText('Press Space to launch');
  expect(await page.locator('h1').evaluate((node) => getComputedStyle(node).color)).toBe('rgb(112, 246, 255)');

  await page.locator('#tactical-coach-goal').fill('Clear the center safely.');
  await page.locator('#tactical-coach-button').click();
  await expect(page.locator('#tactical-coach-status')).toHaveText('Tactical plan ready.');
  await expect(page.locator('.coach-recommendation')).toHaveText(defaultSummary);
  expect(cspViolations).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('T16 T039 available second-origin script executes without CSP and is blocked by production script-src', async ({ page, request }) => {
  const resource = await request.get(scriptUrl);
  expect(resource.status()).toBe(200);
  expect(resource.headers()['content-type']).toMatch(/^application\/javascript\b/);
  expect(await resource.text()).toBe(scriptBody);
  expect(new URL(scriptUrl).origin).not.toBe(new URL(controlUrl).origin);
  expect(new URL(scriptUrl).origin).not.toBe(new URL(previewUrl).origin);

  await page.addInitScript(() => { window.__W08_EXTERNAL_SCRIPT_EXECUTED__ = false; });
  const controlResponse = await page.goto(controlUrl);
  expect(controlResponse?.status()).toBe(200);
  expect(controlResponse.headers()['content-security-policy']).toBeUndefined();
  expect(await page.evaluate(() => window.__W08_EXTERNAL_SCRIPT_EXECUTED__)).toBe(true);

  const productionResponse = await page.goto(previewUrl);
  expect(productionResponse?.status()).toBe(200);
  const headers = productionResponse.headers();
  expect(headers['content-security-policy']).toBe(expectedCsp);
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['referrer-policy']).toBe('no-referrer');

  await page.evaluate((url) => {
    window.__W08_EXTERNAL_SCRIPT_EXECUTED__ = false;
    window.__w08ScriptViolations = [];
    document.addEventListener('securitypolicyviolation', (event) => {
      window.__w08ScriptViolations.push({
        effectiveDirective: event.effectiveDirective,
        violatedDirective: event.violatedDirective,
        blockedURI: event.blockedURI,
      });
    });
    const script = document.createElement('script');
    script.src = url;
    document.head.append(script);
  }, scriptUrl);
  await expect.poll(() => page.evaluate(() => window.__w08ScriptViolations.length)).toBeGreaterThan(0);
  const violations = await page.evaluate(() => window.__w08ScriptViolations);
  const scriptViolation = violations.find((event) => /^script-src(?:-elem)?$/.test(event.effectiveDirective)
    && event.blockedURI === scriptUrl);
  expect(scriptViolation).toBeDefined();
  console.info('T039 browser CSP violation:', JSON.stringify(scriptViolation));
  expect(await page.evaluate(() => window.__W08_EXTERNAL_SCRIPT_EXECUTED__)).toBe(false);
});

test('T16 T040 synthetic server sentinel stays outside built client and fake production UI', async ({ page }) => {
  expect(process.env.GEMINI_API_KEY).toBe(sentinel);
  const files = await artifactFiles('dist');
  expect(files.length).toBeGreaterThan(0);
  const matches = [];
  for (const path of files) {
    if ((await readFile(path)).includes(Buffer.from(sentinel))) matches.push(path);
  }
  expect(matches).toEqual([]);

  const pageErrors = [];
  const unexpectedViolations = [];
  const tacticalRequests = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (/content security policy|violat(?:es|ion).*directive/i.test(message.text())) {
      unexpectedViolations.push(message.text());
    }
  });
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/tactical-coach') tacticalRequests.push(request.url());
  });

  nextSummary = defaultSummary;
  admissionTime += 60_001;
  const pageResponse = await page.goto(previewUrl);
  expect(pageResponse?.status()).toBe(200);
  expect(await pageResponse.text()).not.toContain(sentinel);
  await expect(page.locator('#game')).toHaveCount(1);
  await expect(page.locator('#status')).toHaveText('Press Space to launch');
  expect(await page.locator('h1').evaluate((node) => getComputedStyle(node).color)).toBe('rgb(112, 246, 255)');

  const apiResponsePromise = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/tactical-coach');
  await page.locator('#tactical-coach-goal').fill('Clear the center safely.');
  await page.locator('#tactical-coach-button').click();
  const apiResponse = await apiResponsePromise;
  expect(apiResponse.status()).toBe(200);
  expect(await apiResponse.text()).not.toContain(sentinel);
  await expect(page.locator('#tactical-coach-status')).toHaveText('Tactical plan ready.');
  await expect(page.locator('.coach-recommendation')).toHaveText(defaultSummary);
  await expect(page.locator('.coach-evidence li')).toHaveCount(2);
  await expect(page.locator('#tactical-coach-result')).not.toContainText(sentinel);
  expect(tacticalRequests).toEqual([`${new URL(previewUrl).origin}/api/tactical-coach`]);

  const invalidResponse = await page.evaluate(async () => {
    const response = await fetch('/api/tactical-coach', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
    });
    return { status: response.status, body: await response.text() };
  });
  expect(invalidResponse.status).toBe(400);
  expect(invalidResponse.body).not.toContain(sentinel);
  expect(securityEvents.length).toBeGreaterThan(0);
  expect(JSON.stringify(securityEvents)).not.toContain(sentinel);

  const hostileResult = await submitCoach(page, xssPayload);
  await expectInertText(page, hostileResult, xssPayload);
  await expect(hostileResult).not.toContainText(sentinel);
  expect(pageErrors).toEqual([]);
  expect(unexpectedViolations).toEqual([]);
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
