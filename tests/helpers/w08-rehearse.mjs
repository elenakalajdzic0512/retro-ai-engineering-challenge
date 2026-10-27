// Paced technical dry run of T055. This is not either human's presentation/review.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { preview } from 'vite';
import { chromium } from '@playwright/test';
import { createApiServer } from '../../dist-server/index.js';

const execute = promisify(execFile);
const output = resolve('node_modules/.cache/w08-t055');
await mkdir(output, { recursive: true });
process.env.AI_PROVIDER = 'fake';
process.env.TACTICAL_AI_PROVIDER = 'fake';
process.env.GEMINI_API_KEY = '';
const record = {
  kind: 'Codex paced technical dry run; no spoken or two-person rehearsal',
  timezone: 'Europe/Budapest', targetMs: 480_000,
  sourceRevision: (await execute('git', ['rev-parse', 'HEAD'])).stdout.trim(),
  preparation: [], phases: [],
};
async function command(name, args, timeout = 120_000) {
  const started = performance.now();
  try {
    const result = await execute(process.execPath, args, { timeout, maxBuffer: 4 * 1024 * 1024,
      env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' } });
    await writeFile(resolve(output, `${name}.log`), result.stdout + result.stderr);
    return { name, command: ['node', ...args], exit: 0, durationMs: Math.round(performance.now() - started) };
  } catch (error) {
    await writeFile(resolve(output, `${name}.log`), (error.stdout ?? '') + (error.stderr ?? '') + String(error));
    throw error;
  }
}
record.preparation.push(await command('server-build', ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.server.json']));
record.preparation.push(await command('client-build', ['node_modules/vite/bin/vite.js', 'build']));
await readFile('node_modules/.cache/w08-before/dist-server/index.js');

async function normalBrowserDemo() {
  let attempts = 0;
  const events = [];
  const api = createApiServer({
    tacticalGeminiProviderFactory() { throw new Error('Live Gemini forbidden in T055'); },
    tacticalSecurityEventSink(event) {
      events.push(event);
      if (event.providerAttempts !== undefined) attempts += event.providerAttempts;
    },
  });
  let serving;
  let browser;
  try {
    await new Promise((done, reject) => api.listen(0, '127.0.0.1', done).once('error', reject));
    serving = await preview({ logLevel: 'error', preview: { host: '127.0.0.1', port: 0, strictPort: true,
      proxy: { '/api': { target: `http://127.0.0.1:${api.address().port}` } } } });
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const response = await page.goto(`http://127.0.0.1:${serving.httpServer.address().port}`);
    assert.equal(response.status(), 200);
    assert.ok(response.headers()['content-security-policy'].includes("script-src 'self'"));
    assert.equal(await page.locator('#status').textContent(), 'Press Space to launch');
    await page.locator('#tactical-coach-goal').fill('Clear the center safely.');
    await page.locator('#tactical-coach-button').click();
    await page.waitForFunction(() => document.querySelector('#tactical-coach-status').textContent === 'Tactical plan ready.');
    assert.equal(await page.locator('.coach-evidence li').count(), 2);
    await page.locator('#ai-hint-button').click();
    await page.waitForFunction(() => document.querySelector('#ai-hint-status').textContent === 'AI hint ready.');
    assert.match(await page.locator('#ai-hint-result').textContent(), /Keep the ball in play/);
    await page.locator('#ai-hint-button').blur();
    await page.keyboard.press('Space');
    await page.waitForFunction(() => document.querySelector('#status').textContent === 'Break every brick. Keep the ball in play.');
    await page.screenshot({ path: resolve(output, 'normal-coach-hint.png'), fullPage: true });
    assert.equal(attempts, 3);
    assert.equal(events.at(-1).executedToolCalls, 2);
    assert.deepEqual(errors, []);
    return { game: 'launched', coach: 'Tactical plan ready.', hint: 'AI hint ready.',
      providerAttempts: attempts, executedToolCalls: events.at(-1).executedToolCalls, pageErrors: errors,
      screenshot: 'node_modules/.cache/w08-t055/normal-coach-hint.png' };
  } finally {
    await browser?.close(); await serving?.close();
    if (api.listening) {
      api.closeAllConnections();
      await new Promise((done, reject) => api.close((error) => error ? reject(error) : done()));
    }
  }
}

const schedule = [
  { name: '0:00–1:00 game and boundaries', start: 0, end: 60_000, work: normalBrowserDemo },
  { name: '1:00–2:30 normal T00', start: 60_000, end: 150_000,
    work: () => command('t00', ['--test', '--test-reporter=tap', '--test-name-pattern=^T00 ', 'tests/tactical-api.test.js']) },
  { name: '2:30–5:00 HTTP, browser and forbidden tools', start: 150_000, end: 300_000, async work() {
    return [await command('negative-http-tools', ['--test', '--test-reporter=tap',
      '--test-name-pattern=^T(?:02|07|09|17)(?: |/)', 'tests/tactical-api.test.js',
      'tests/tactical-orchestrator.test.js', 'tests/tactical-tools.test.js']),
    await command('browser', ['node_modules/@playwright/test/cli.js', 'test', '--config=playwright.config.js',
      '--grep', 'T04|T05|T16'])];
  } },
  { name: '5:00–6:30 budgets, timeout and recovery', start: 300_000, end: 390_000,
    work: () => command('budgets', ['--test', '--test-reporter=tap', '--test-name-pattern=^T(?:11|12|13)(?: |/)',
      'tests/tactical-orchestrator.test.js', 'tests/tactical-admission.test.js']) },
  { name: '6:30–8:00 comparisons and limitations', start: 390_000, end: 480_000, async work() {
    const comparison = await command('comparisons', ['tests/helpers/w08-compare.mjs',
      'node_modules/.cache/w08-before', '.', 'node_modules/.cache/w08-t055/comparison.json']);
    const data = JSON.parse(await readFile(resolve(output, 'comparison.json'), 'utf8'));
    const [before, after] = data.revisions;
    assert.equal(before.P1.peakHeldProviderRuns, 3); assert.equal(after.P1.peakHeldProviderRuns, 2);
    assert.equal(before.P2.marker, true); assert.equal(after.P2.marker, false);
    assert.equal(after.P3.every((row) => row.forbidden === 0), true);
    const policy = JSON.parse(await readFile('docs/evidence/w08-policy.json', 'utf8'));
    const fullAudit = JSON.parse(await readFile('docs/evidence/w08-audit-full.json', 'utf8'));
    const runtimeAudit = JSON.parse(await readFile('docs/evidence/w08-audit-runtime.json', 'utf8'));
    assert.equal(policy.totalDeadlineMs, 22000); assert.equal(policy.normalizedProviderBytes, 8192);
    return { comparison, openDevelopmentPackages: Object.keys(fullAudit.vulnerabilities),
      runtimeAuditFindings: runtimeAudit.metadata.vulnerabilities.total,
      limits: ['post-SDK bytes', 'single-process admission', 'unverified client state',
        'no live-Gemini immunity proof', 'human review/rehearsal still pending'] };
  } },
];
const started = performance.now();
record.startedAtUtc = new Date().toISOString();
const elapsed = () => Math.round(performance.now() - started);
async function waitUntil(offset) {
  while (elapsed() < offset) await new Promise((done) => setTimeout(done, Math.min(1000, offset - elapsed())));
}
console.info(JSON.stringify({ event: 'timer-start', targetMs: record.targetMs, startedAtUtc: record.startedAtUtc }));
try {
  for (const phase of schedule) {
    await waitUntil(phase.start);
    const actualStartMs = elapsed();
    console.info(JSON.stringify({ event: 'phase-start', name: phase.name, actualStartMs }));
    const result = await phase.work();
    const workFinishedMs = elapsed();
    const item = { name: phase.name, scheduledStartMs: phase.start, scheduledEndMs: phase.end,
      actualStartMs, workFinishedMs, activeWorkMs: workFinishedMs - actualStartMs,
      spareMs: phase.end - workFinishedMs, result };
    record.phases.push(item);
    assert.ok(item.spareMs >= 0, `Phase exceeds its window: ${phase.name}`);
    await writeFile(resolve(output, 'rehearsal.json'), JSON.stringify(record, null, 2) + '\n');
    console.info(JSON.stringify({ event: 'phase-pass', ...item }));
  }
  await waitUntil(record.targetMs);
  record.elapsedMs = elapsed();
  record.finishedAtUtc = new Date().toISOString();
  record.status = 'technical PASS; time paced by automation, not a spoken rehearsal';
  record.activeWorkMs = record.phases.reduce((total, phase) => total + phase.activeWorkMs, 0);
  record.pacingAndReviewMs = record.elapsedMs - record.activeWorkMs;
  await writeFile(resolve(output, 'rehearsal.json'), JSON.stringify(record, null, 2) + '\n');
  console.info(JSON.stringify({ event: 'timer-finish', elapsedMs: record.elapsedMs,
    activeWorkMs: record.activeWorkMs, pacingAndReviewMs: record.pacingAndReviewMs, status: record.status }));
} catch (error) {
  record.elapsedMs = elapsed(); record.status = 'FAIL'; record.error = String(error);
  await writeFile(resolve(output, 'rehearsal.json'), JSON.stringify(record, null, 2) + '\n');
  throw error;
}
