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

function element(tagName) {
  return {
    tagName, className: '', textContent: '', children: [],
    append(...items) { this.children.push(...items); },
    replaceChildren(...items) { this.children = [...items]; },
  };
}

function visibleText(node) {
  return [node.textContent, ...node.children.map(visibleText)].filter(Boolean).join(' ');
}

test('Coach result renders a player recommendation, plan badges, ordered actions and readable evidence', () => {
  const input = response();
  input.plan.summary = 'Executing a safe, direct tactical approach to clear the center zone.';
  input.plan.strategy = 'safe';
  input.plan.actions = [
    'Position the paddle in the center alignment.',
    'Execute a direct route hit toward the center zone.',
  ];
  input.plan.evidence = [
    { source: 'tactical_snapshot', fact: 'bricksByZone.center' },
    { source: 'strategy_evaluation', fact: 'routeUsable' },
    { source: 'strategy_evaluation', fact: 'paddleAligned' },
  ];
  input.evidence = [
    { ...input.plan.evidence[0], value: 10 },
    { ...input.plan.evidence[1], value: true },
    { ...input.plan.evidence[2], value: true },
  ];
  const root = element('div');
  tacticalUi.renderTacticalCoachResult(parseTacticalCoachResponse(input), root, { createElement: element });
  assert.deepEqual(root.children.map((item) => item.tagName), ['h3', 'p', 'div', 'h3', 'ol', 'h3', 'ul']);
  assert.equal(root.children[0].textContent, 'Recommended move');
  assert.equal(root.children[1].textContent, input.plan.summary);
  assert.deepEqual(root.children[2].children.map((item) => item.textContent), [
    'Safe approach', 'Target center', 'Center paddle contact', 'Direct route',
  ]);
  assert.equal(root.children[3].textContent, 'What to do next');
  assert.deepEqual(root.children[4].children.map((item) => item.textContent), input.plan.actions);
  assert.equal(root.children[5].textContent, 'Why this plan');
  assert.deepEqual(root.children[6].children.map((item) => item.textContent), [
    '10 bricks remain in the target zone.',
    'The direct route is currently usable.',
    'The planned paddle contact matches the target zone.',
  ]);
  assert.doesNotMatch(visibleText(root), /tactical_snapshot|strategy_evaluation|bricksByZone\.center/);
  assert.deepEqual(input.evidence[0], { source: 'tactical_snapshot', fact: 'bricksByZone.center', value: 10 });
});

test('Coach renderer supports different strategies, zones, routes and variable valid content', () => {
  const input = response();
  input.plan.strategy = 'aggressive';
  input.plan.targetZone = 'right';
  input.plan.paddleContact = 'left';
  input.plan.route = 'portal';
  input.plan.summary = 'A'.repeat(240);
  input.plan.actions = ['B'.repeat(160), 'Second instruction.', 'Third instruction.'];
  input.plan.evidence = [
    { source: 'tactical_snapshot', fact: 'portalState' },
    { source: 'tactical_snapshot', fact: 'ballDirection.vertical' },
    { source: 'strategy_evaluation', fact: 'riskLevel' },
    { source: 'strategy_evaluation', fact: 'routeUsable' },
    { source: 'strategy_evaluation', fact: 'paddleAligned' },
    { source: 'strategy_evaluation', fact: 'targetOpportunity' },
  ];
  input.evidence = [
    { ...input.plan.evidence[0], value: 'available' },
    { ...input.plan.evidence[1], value: 'up' },
    { ...input.plan.evidence[2], value: 'high' },
    { ...input.plan.evidence[3], value: true },
    { ...input.plan.evidence[4], value: false },
    { ...input.plan.evidence[5], value: 7 },
  ];
  const root = element('div');
  tacticalUi.renderTacticalCoachResult(parseTacticalCoachResponse(input), root, { createElement: element });
  assert.deepEqual(root.children[2].children.map((item) => item.textContent), [
    'Aggressive approach', 'Target right', 'Left paddle contact', 'Portal route',
  ]);
  assert.equal(root.children[1].textContent, input.plan.summary);
  assert.deepEqual(root.children[4].children.map((item) => item.textContent), input.plan.actions);
  assert.deepEqual(root.children[6].children.map((item) => item.textContent), [
    '7 targets remain in the chosen zone.',
    'The portal route is currently usable.',
    'The planned paddle contact does not match the target zone.',
    'Tactical risk is high.',
    'The portal is available.',
    'Ball moving vertically — Up',
  ]);
  assert.equal(root.children[6].children.filter((item) => item.className.includes('coach-evidence-secondary')).length, 2);
});

test('Coach renderer keeps a one-action, two-fact balanced plan concise', () => {
  const input = response();
  input.plan.targetZone = 'left';
  input.plan.paddleContact = 'right';
  input.plan.actions = ['Aim the next bounce toward the left.'];
  input.plan.evidence = [
    { source: 'tactical_snapshot', fact: 'bricksByZone.left' },
    { source: 'strategy_evaluation', fact: 'shieldInTargetZone' },
  ];
  input.evidence = [
    { ...input.plan.evidence[0], value: 5 },
    { ...input.plan.evidence[1], value: false },
  ];
  const root = element('div');
  tacticalUi.renderTacticalCoachResult(parseTacticalCoachResponse(input), root, { createElement: element });
  assert.deepEqual(root.children[2].children.map((item) => item.textContent), [
    'Balanced approach', 'Target left', 'Right paddle contact', 'Direct route',
  ]);
  assert.deepEqual(root.children[4].children.map((item) => item.textContent), input.plan.actions);
  assert.deepEqual(root.children[6].children.map((item) => item.textContent), [
    '5 bricks remain in the target zone.', 'The shield is outside the target zone.',
  ]);
});

test('display ordering favors chosen-zone evidence and keeps every validated fact unchanged', () => {
  const input = response();
  input.plan.evidence = [
    { source: 'tactical_snapshot', fact: 'bricksRemaining' },
    { source: 'tactical_snapshot', fact: 'bricksByZone.left' },
    { source: 'strategy_evaluation', fact: 'paddleAligned' },
    { source: 'strategy_evaluation', fact: 'routeUsable' },
    { source: 'strategy_evaluation', fact: 'targetOpportunity' },
    { source: 'strategy_evaluation', fact: 'riskLevel' },
  ];
  input.evidence = [
    { ...input.plan.evidence[0], value: 40 },
    { ...input.plan.evidence[1], value: 15 },
    { ...input.plan.evidence[2], value: true },
    { ...input.plan.evidence[3], value: true },
    { ...input.plan.evidence[4], value: 10 },
    { ...input.plan.evidence[5], value: 'low' },
  ];
  const parsed = parseTacticalCoachResponse(input);
  const original = structuredClone(parsed);
  const root = element('div');
  tacticalUi.renderTacticalCoachResult(parsed, root, { createElement: element });
  assert.equal(root.children[1].textContent, original.plan.summary);
  assert.deepEqual(root.children[4].children.map((item) => item.textContent), original.plan.actions);
  assert.deepEqual(root.children[6].children.map((item) => item.textContent), [
    '10 targets remain in the chosen zone.',
    'The direct route is currently usable.',
    'The planned paddle contact matches the target zone.',
    'Tactical risk is low.',
    'Bricks on left — 15',
    '40 bricks remain overall.',
  ]);
  assert.deepEqual(parsed, original);
  assert.equal(root.children[6].children.length, parsed.evidence.length);
  assert.doesNotMatch(visibleText(root), /tactical_snapshot|strategy_evaluation|bricksRemaining|targetOpportunity|routeUsable/);
});

test('contextual explanations cover armor, portal, route and boolean alternatives', () => {
  const explain = tacticalUi.explainTacticalEvidence;
  const plan = { targetZone: 'right', route: 'portal' };
  assert.equal(explain({ fact: 'armoredTargets', value: 4 }, plan), '4 armored targets remain in the chosen zone.');
  assert.equal(explain({ fact: 'armoredByZone.right', value: 4 }, plan), '4 armored bricks remain in the target zone.');
  assert.equal(explain({ fact: 'routeUsable', value: false }, plan), 'The portal route is not currently usable.');
  assert.equal(explain({ fact: 'paddleAligned', value: false }, plan), 'The planned paddle contact does not match the target zone.');
  assert.equal(explain({ fact: 'riskLevel', value: 'medium' }, plan), 'Tactical risk is medium.');
  assert.equal(explain({ fact: 'portalAvailable', value: true }, plan), 'The portal is available.');
  assert.equal(explain({ fact: 'portalAvailable', value: false }, plan), 'The portal is not currently available.');
  assert.equal(explain({ fact: 'portalState', value: 'cooldown' }, plan), 'The portal is on cooldown.');
  assert.equal(explain({ fact: 'shieldInTargetZone', value: true }, plan), 'The shield is in the target zone.');
  assert.equal(explain({ fact: 'futureMetric.extraCount', value: 3 }, plan), 'Future metric extra count — 3');
  assert.equal(tacticalUi.formatTacticalEvidenceLabel('bricksByZone.right', plan), 'Bricks in target zone');
  assert.equal(tacticalUi.formatTacticalEvidenceLabel('routeUsable', plan), 'Portal route usable');
  assert.equal(tacticalUi.formatTacticalEvidenceLabel('paddleAligned', plan), 'Paddle aligned with target');
});

test('every current evidence fact has an explicit player label and unknown facts fall back safely', () => {
  const labels = {
    lives: 'Lives remaining', bricksRemaining: 'Bricks remaining',
    'bricksByZone.left': 'Bricks on left', 'bricksByZone.center': 'Bricks in center',
    'bricksByZone.right': 'Bricks on right', 'armoredByZone.left': 'Armored bricks on left',
    'armoredByZone.center': 'Armored bricks in center', 'armoredByZone.right': 'Armored bricks on right',
    'ballDirection.horizontal': 'Ball moving horizontally',
    'ballDirection.vertical': 'Ball moving vertically',
    'shield.zone': 'Shield position', 'shield.direction': 'Shield movement',
    portalState: 'Portal status', targetOpportunity: 'Targets in chosen zone',
    armoredTargets: 'Armored targets', riskLevel: 'Risk level',
    paddleAligned: 'Paddle aligned', shieldInTargetZone: 'Shield in target zone',
    portalAvailable: 'Portal available', routeUsable: 'Route usable',
  };
  for (const [fact, label] of Object.entries(labels)) {
    assert.equal(tacticalUi.formatTacticalEvidenceLabel(fact), label);
  }
  assert.equal(tacticalUi.formatTacticalEvidenceLabel('futureMetric.extraCount'), 'Future metric extra count');
  assert.equal(tacticalUi.formatTacticalEvidenceLabel('future_metric'), 'Future metric');
});

test('Coach display values preserve numbers and title-case safe categorical values', () => {
  assert.equal(tacticalUi.formatTacticalEvidenceValue(10), '10');
  assert.equal(tacticalUi.formatTacticalEvidenceValue(true), 'Yes');
  assert.equal(tacticalUi.formatTacticalEvidenceValue(false), 'No');
  for (const value of ['low', 'medium', 'high', 'left', 'center', 'right', 'up', 'down', 'available', 'cooldown', 'neutral']) {
    assert.equal(tacticalUi.formatTacticalEvidenceValue(value), value[0].toUpperCase() + value.slice(1));
  }
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
