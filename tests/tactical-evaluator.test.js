import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { deriveTacticalSnapshot } from '../src/tactical-snapshot.js';
import { parseTacticalSnapshot, parseCandidateStrategy, parseStrategyEvaluation } from '../dist-server/tactical/contracts.js';
import { evaluateTacticalStrategy } from '../dist-server/tactical/evaluator.js';

const snapshot = () => parseTacticalSnapshot(deriveTacticalSnapshot(createGame()));
const candidate = (patch = {}) => parseCandidateStrategy({
  targetZone: 'left', style: 'safe', paddleContact: 'left', route: 'direct', ...patch,
});
const evaluate = (state = snapshot(), choice = candidate()) => evaluateTacticalStrategy(state, choice);

test('all nine lives/style combinations use the exact risk table', () => {
  const rows = [
    [1, 'safe', 'high'], [1, 'balanced', 'high'], [1, 'aggressive', 'high'],
    [2, 'safe', 'low'], [2, 'balanced', 'medium'], [2, 'aggressive', 'high'],
    [3, 'safe', 'low'], [3, 'balanced', 'low'], [3, 'aggressive', 'medium'],
  ];
  for (const [lives, style, riskLevel] of rows) {
    assert.equal(evaluate({ ...snapshot(), lives }, candidate({ style })).riskLevel, riskLevel);
  }
});

test('target opportunity and armor count come from the same selected zone', () => {
  const state = snapshot();
  for (const [targetZone, count, armored] of [['left', 15, 4], ['center', 10, 0], ['right', 15, 4]]) {
    const result = evaluate(state, candidate({ targetZone }));
    assert.equal(result.targetOpportunity, count);
    assert.equal(result.armoredTargets, armored);
    assert.equal(result.candidateAccepted, true);
  }
});

test('empty target is rejected without proposing another candidate', () => {
  const state = snapshot();
  state.bricksByZone = { left: 0, center: 10, right: 30 };
  state.armoredByZone = { left: 0, center: 0, right: 8 };
  const result = evaluate(parseTacticalSnapshot(state), candidate());
  assert.equal(result.targetOpportunity, 0);
  assert.equal(result.armoredTargets, 0);
  assert.equal(result.rejectionReason, 'empty_target');
  assert.equal(result.candidateAccepted, false);
});

test('direct route stays usable while portal is cooling down', () => {
  const result = evaluate({ ...snapshot(), portalState: 'cooldown' });
  assert.equal(result.portalAvailable, false);
  assert.equal(result.routeUsable, true);
  assert.equal(result.rejectionReason, 'none');
});

test('available portal is usable for left and right targets', () => {
  for (const targetZone of ['left', 'right']) {
    const result = evaluate(snapshot(), candidate({ targetZone, route: 'portal' }));
    assert.equal(result.portalAvailable, true);
    assert.equal(result.routeUsable, true);
    assert.equal(result.candidateAccepted, true);
  }
});

test('portal cooldown rejects an otherwise valid target', () => {
  const result = evaluate({ ...snapshot(), portalState: 'cooldown' }, candidate({ route: 'portal' }));
  assert.equal(result.routeUsable, false);
  assert.equal(result.rejectionReason, 'portal_cooldown');
  assert.equal(result.candidateAccepted, false);
});

test('center portal target is rejected despite portal availability', () => {
  const result = evaluate(snapshot(), candidate({ targetZone: 'center', route: 'portal' }));
  assert.equal(result.routeUsable, false);
  assert.equal(result.rejectionReason, 'portal_center_target');
  assert.equal(result.candidateAccepted, false);
});

test('rejection precedence is empty target, cooldown, center target, then none', () => {
  const state = snapshot();
  state.bricksByZone = { left: 20, center: 0, right: 20 };
  state.armoredByZone = { left: 4, center: 0, right: 4 };
  const empty = parseTacticalSnapshot({ ...state, portalState: 'cooldown' });
  assert.equal(evaluate(empty, candidate({ targetZone: 'center', route: 'portal' })).rejectionReason, 'empty_target');
  assert.equal(evaluate({ ...snapshot(), portalState: 'cooldown' }, candidate({ targetZone: 'center', route: 'portal' })).rejectionReason, 'portal_cooldown');
  assert.equal(evaluate(snapshot(), candidate({ targetZone: 'center', route: 'portal' })).rejectionReason, 'portal_center_target');
  assert.equal(evaluate(snapshot(), candidate({ targetZone: 'center', route: 'direct' })).rejectionReason, 'none');
});

test('paddle alignment compares contact and target as a coarse cue', () => {
  assert.equal(evaluate(snapshot(), candidate({ targetZone: 'right', paddleContact: 'right' })).paddleAligned, true);
  assert.equal(evaluate(snapshot(), candidate({ targetZone: 'right', paddleContact: 'left' })).paddleAligned, false);
});

test('shield zone cue is true only for the target zone', () => {
  const state = snapshot();
  assert.equal(evaluate(state, candidate({ targetZone: 'center' })).shieldInTargetZone, true);
  assert.equal(evaluate(state, candidate({ targetZone: 'left' })).shieldInTargetZone, false);
});

test('evidence codes are exact, ordered, and result passes runtime contract', () => {
  const result = evaluate();
  assert.deepEqual(result.evidenceCodes, [
    'target_count', 'armored_count', 'lives', 'paddle_alignment', 'shield_zone', 'portal_state', 'risk_rule',
  ]);
  assert.deepEqual(parseStrategyEvaluation(result), result);
  assert.ok(Buffer.byteLength(JSON.stringify(result), 'utf8') <= 8192);
});

test('same inputs produce deep-equal output and neither input is mutated', () => {
  const state = snapshot();
  const choice = candidate({ targetZone: 'right', style: 'balanced', paddleContact: 'center', route: 'portal' });
  const beforeState = structuredClone(state);
  const beforeChoice = structuredClone(choice);
  const first = evaluate(state, choice);
  assert.deepEqual(evaluate(state, choice), first);
  assert.deepEqual(state, beforeState);
  assert.deepEqual(choice, beforeChoice);
});
