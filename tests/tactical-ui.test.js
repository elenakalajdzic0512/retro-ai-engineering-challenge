import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTacticalCoachResponse } from '../src/tactical-ui.js';

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
