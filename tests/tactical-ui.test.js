import test from 'node:test';
import assert from 'node:assert/strict';
import * as tacticalUi from '../src/tactical-ui.js';
import { parseTacticalCoachResponse } from '../src/tactical-ui.js';
import { createGame, launch } from '../src/game.js';

const response = () => ({
  plan: {
    summary: 'Clear the center safely.', strategy: 'balanced', targetZone: 'center',
    paddleContact: 'center', route: 'direct', actions: ['Use a center paddle bounce.'],
    evidence: [
      { source: 'tactical_snapshot', fact: 'lives' },
      { source: 'tactical_snapshot', fact: 'portalState' },
      { source: 'strategy_evaluation', fact: 'paddleAligned' },
    ],
  },
  evidence: [
    { source: 'tactical_snapshot', fact: 'lives', value: 3 },
    { source: 'tactical_snapshot', fact: 'portalState', value: 'available' },
    { source: 'strategy_evaluation', fact: 'paddleAligned', value: true },
  ],
});

test('browser accepts a copied exact public result with integer, string and boolean evidence', () => {
  const input = response();
  const parsed = parseTacticalCoachResponse(input);
  assert.deepEqual(parsed, input);
  assert.notEqual(parsed, input);
  assert.notEqual(parsed.plan, input.plan);
  assert.equal(typeof parsed.evidence[0].value, 'number');
  assert.equal(typeof parsed.evidence[1].value, 'string');
  assert.equal(typeof parsed.evidence[2].value, 'boolean');
});

test('browser rejects extra or missing public result and plan fields', () => {
  for (const value of [
    { ...response(), provider: 'private' },
    { plan: response().plan },
    { ...response(), plan: { ...response().plan, completed: true } },
    { ...response(), plan: { ...response().plan, actions: [] } },
    { ...response(), plan: { ...response().plan, targetZone: 'far-right' } },
  ]) assert.throws(() => parseTacticalCoachResponse(value), TypeError);
});

test('browser rejects malformed, unsupported or model-authored evidence values', () => {
  for (const value of [null, [], 1.5, NaN, Infinity, {}, '3']) {
    const input = response();
    input.evidence[0].value = value;
    assert.throws(() => parseTacticalCoachResponse(input), TypeError);
  }
  for (const bad of [
    { ...response().evidence[0], debug: true },
    { source: 'tactical_snapshot', fact: 'unsupported', value: 3 },
    { source: 'strategy_evaluation', fact: 'lives', value: 3 },
  ]) {
    const input = response();
    input.evidence[0] = bad;
    assert.throws(() => parseTacticalCoachResponse(input), TypeError);
  }
});

test('browser requires materialized evidence to match plan references and both sources', () => {
  const absent = response();
  absent.evidence.pop();
  assert.throws(() => parseTacticalCoachResponse(absent), TypeError);
  const duplicate = response();
  duplicate.evidence[1] = { ...duplicate.evidence[0] };
  assert.throws(() => parseTacticalCoachResponse(duplicate), TypeError);
  const noEvaluation = response();
  noEvaluation.plan.evidence.pop();
  noEvaluation.evidence.pop();
  assert.throws(() => parseTacticalCoachResponse(noEvaluation), TypeError);
});

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

function coachHarness() {
  const requests = [];
  const button = { disabled: false };
  const status = { textContent: '' };
  const result = { plans: [], replaceChildren() { this.plans = []; } };
  const listeners = new Map();
  const pageWindow = { addEventListener(name, listener) { listeners.set(name, listener); } };
  const controller = tacticalUi.createTacticalCoachRequestController({
    button, status, result, pageWindow,
    fetchRequest(url, options) {
      const pending = deferred();
      requests.push({ url, options, ...pending });
      return pending.promise;
    },
    render(plan) { result.plans.push(plan); },
  });
  return { controller, button, status, result, requests, listeners };
}

function ok(value = response()) {
  return { ok: true, async json() { return value; } };
}

test('Coach request uses an AbortSignal, one generic pending state and renders a valid plan', async () => {
  const ui = coachHarness();
  const pending = ui.controller.submit('Clear center', { snapshotVersion: 1 });
  assert.equal(ui.requests.length, 1);
  assert.equal(ui.requests[0].url, '/api/tactical-coach');
  assert.ok(ui.requests[0].options.signal instanceof AbortSignal);
  assert.equal(ui.button.disabled, true);
  assert.equal(ui.status.textContent, 'Analyzing arena...');
  assert.deepEqual(ui.result.plans, []);
  await new Promise((done) => setTimeout(done, 0));
  assert.equal(ui.status.textContent, 'Analyzing arena...');
  ui.requests[0].resolve(ok());
  await pending;
  assert.equal(ui.result.plans[0].plan.summary, 'Clear the center safely.');
  assert.equal(ui.status.textContent, 'Tactical plan ready.');
  assert.equal(ui.button.disabled, false);
});

test('full Space restart cancels old Coach work; ordinary launch does not', async () => {
  const ui = coachHarness();
  const game = createGame();
  const pending = ui.controller.submit('Old game', { snapshotVersion: 1 });
  ui.controller.beforeGameLaunch(game.status);
  launch(game);
  assert.equal(ui.requests[0].options.signal.aborted, false);
  game.status = 'won';
  ui.controller.beforeGameLaunch(game.status);
  launch(game);
  assert.equal(game.status, 'playing');
  assert.equal(game.score, 0);
  assert.equal(ui.requests[0].options.signal.aborted, true);
  assert.equal(ui.button.disabled, false);
  assert.equal(ui.status.textContent, '');
  ui.requests[0].resolve(ok());
  await pending;
  assert.deepEqual(ui.result.plans, []);
  assert.equal(ui.status.textContent, '');
});

test('cancelled Coach failure stays silent and a new request can succeed', async () => {
  const ui = coachHarness();
  const old = ui.controller.submit('Old game', { snapshotVersion: 1 });
  ui.controller.cancel();
  ui.requests[0].reject(new Error('late transport failure'));
  await old;
  assert.equal(ui.status.textContent, '');
  assert.equal(ui.button.disabled, false);
  const current = ui.controller.submit('New game', { snapshotVersion: 1 });
  ui.requests[1].resolve(ok());
  await current;
  assert.equal(ui.status.textContent, 'Tactical plan ready.');
});

test('cancellation during response-body parsing ignores a late valid plan', async () => {
  const ui = coachHarness();
  const body = deferred();
  const pending = ui.controller.submit('Old game', { snapshotVersion: 1 });
  ui.requests[0].resolve({ ok: true, json() { return body.promise; } });
  await new Promise((done) => setTimeout(done, 0));
  ui.controller.cancel();
  body.resolve(response());
  await pending;
  assert.deepEqual(ui.result.plans, []);
  assert.equal(ui.status.textContent, '');
  assert.equal(ui.button.disabled, false);
});

test('a genuine current Coach failure shows the fixed safe message', async () => {
  const ui = coachHarness();
  const pending = ui.controller.submit('Current game', { snapshotVersion: 1 });
  ui.requests[0].reject(new Error('private transport detail'));
  await pending;
  assert.equal(ui.status.textContent, 'Tactical Coach is unavailable. Please try again.');
  assert.equal(ui.button.disabled, false);
});

test('superseded Coach result cannot overwrite the current result', async () => {
  const ui = coachHarness();
  const old = ui.controller.submit('First', { snapshotVersion: 1 });
  const current = ui.controller.submit('Second', { snapshotVersion: 1 });
  assert.equal(ui.requests[0].options.signal.aborted, true);
  const second = response();
  second.plan.summary = 'Current plan.';
  ui.requests[1].resolve(ok(second));
  await current;
  ui.requests[0].resolve(ok());
  await old;
  assert.deepEqual(ui.result.plans.map((item) => item.plan.summary), ['Current plan.']);
  assert.equal(ui.status.textContent, 'Tactical plan ready.');
});

test('pagehide aborts Coach without showing a provider error', async () => {
  const ui = coachHarness();
  const pending = ui.controller.submit('Leaving', { snapshotVersion: 1 });
  assert.equal(typeof ui.listeners.get('pagehide'), 'function');
  ui.listeners.get('pagehide')();
  assert.equal(ui.requests[0].options.signal.aborted, true);
  assert.equal(ui.button.disabled, false);
  assert.equal(ui.status.textContent, '');
  ui.requests[0].reject(new Error('aborted'));
  await pending;
  assert.deepEqual(ui.result.plans, []);
});
