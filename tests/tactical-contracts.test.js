import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TacticalContractError,
  parseTacticalRequest,
  parseTacticalSnapshot,
  parseCandidateStrategy,
  parseStrategyEvaluation,
  parseTacticalPlan,
  parseTacticalPlanForCandidate,
} from '../dist-server/tactical/contracts.js';

const snapshot = () => ({
  snapshotVersion: 1,
  status: 'playing',
  score: 100,
  lives: 2,
  bricksRemaining: 30,
  normalBricksRemaining: 24,
  armoredBricksRemaining: 6,
  bricksByZone: { left: 8, center: 10, right: 12 },
  armoredByZone: { left: 2, center: 2, right: 2 },
  ballDirection: { horizontal: 'right', vertical: 'up' },
  shield: { zone: 'center', direction: 'left' },
  portalState: 'available',
});
const candidate = () => ({ targetZone: 'right', style: 'safe', paddleContact: 'right', route: 'direct' });
const evaluation = () => ({
  candidateAccepted: true,
  rejectionReason: 'none',
  targetOpportunity: 12,
  armoredTargets: 2,
  riskLevel: 'low',
  paddleAligned: true,
  shieldInTargetZone: false,
  portalAvailable: true,
  routeUsable: true,
  evidenceCodes: ['target_count', 'armored_count', 'lives', 'paddle_alignment', 'shield_zone', 'portal_state', 'risk_rule'],
});
const plan = () => ({
  summary: '  Clear the right side carefully.  ',
  strategy: 'safe', targetZone: 'right', paddleContact: 'right', route: 'direct',
  actions: ['  Aim with the right paddle third.  '],
  evidence: [
    { source: 'tactical_snapshot', fact: 'bricksByZone.right' },
    { source: 'strategy_evaluation', fact: 'riskLevel' },
  ],
});
const rejects = (action) => assert.throws(action, TacticalContractError);

test('request accepts exact shape and trims goal without changing input', () => {
  const input = { goal: '  Clear right  ', state: snapshot() };
  const output = parseTacticalRequest(input);
  assert.equal(output.goal, 'Clear right');
  assert.deepEqual(output.state, snapshot());
  assert.equal(input.goal, '  Clear right  ');
  assert.notEqual(output.state, input.state);
});

test('request accepts exactly 240 Unicode code points and rejects 241', () => {
  assert.equal(parseTacticalRequest({ goal: '😀'.repeat(240), state: snapshot() }).goal, '😀'.repeat(240));
  rejects(() => parseTacticalRequest({ goal: '😀'.repeat(241), state: snapshot() }));
});

test('request rejects empty, whitespace, and non-string goals', () => {
  for (const goal of ['', '   ', 42, null]) rejects(() => parseTacticalRequest({ goal, state: snapshot() }));
});

test('request rejects extra or missing keys, null, array, and non-plain objects', () => {
  for (const input of [null, [], 42, Object.create(null), { goal: 'Go' }, { goal: 'Go', state: snapshot(), model: 'x' }]) {
    rejects(() => parseTacticalRequest(input));
  }
});

test('plain-object contract rejects accessors and symbol keys without invoking getters', () => {
  let called = false;
  const input = { goal: 'Go', state: snapshot() };
  Object.defineProperty(input, 'goal', { enumerable: true, get() { called = true; return 'Go'; } });
  rejects(() => parseTacticalRequest(input));
  assert.equal(called, false);
  rejects(() => parseTacticalRequest({ goal: 'Go', state: snapshot(), [Symbol('hidden')]: 1 }));
});

test('snapshot accepts its exact nested shape and copies it', () => {
  const input = snapshot();
  assert.deepEqual(parseTacticalSnapshot(input), input);
  assert.notEqual(parseTacticalSnapshot(input).bricksByZone, input.bricksByZone);
});

test('snapshot accepts ready and both score endpoints when counts agree', () => {
  const fresh = snapshot();
  Object.assign(fresh, { status: 'ready', score: 0, bricksRemaining: 40, normalBricksRemaining: 32, armoredBricksRemaining: 8 });
  fresh.bricksByZone = { left: 15, center: 10, right: 15 };
  fresh.armoredByZone = { left: 3, center: 2, right: 3 };
  assert.equal(parseTacticalSnapshot(fresh).score, 0);
  const last = snapshot();
  Object.assign(last, { score: 390, bricksRemaining: 1, normalBricksRemaining: 0, armoredBricksRemaining: 1 });
  last.bricksByZone = { left: 0, center: 0, right: 1 };
  last.armoredByZone = { left: 0, center: 0, right: 1 };
  assert.equal(parseTacticalSnapshot(last).score, 390);
});

test('snapshot rejects invalid version, won/lost, and uncoachable zero bricks', () => {
  for (const snapshotVersion of [0, 2, 1.1, '1']) rejects(() => parseTacticalSnapshot({ ...snapshot(), snapshotVersion }));
  for (const status of ['won', 'lost']) rejects(() => parseTacticalSnapshot({ ...snapshot(), status }));
  rejects(() => parseTacticalSnapshot({ ...snapshot(), bricksRemaining: 0 }));
});

test('snapshot rejects score bounds, increments, and brick-score mismatch', () => {
  for (const score of [-10, 400, 101, 12.5, '100', NaN, Infinity]) rejects(() => parseTacticalSnapshot({ ...snapshot(), score }));
  rejects(() => parseTacticalSnapshot({ ...snapshot(), bricksRemaining: 29 }));
});

test('snapshot rejects lives and total-count bounds', () => {
  for (const lives of [0, 4, 1.5, '2', NaN, Infinity]) rejects(() => parseTacticalSnapshot({ ...snapshot(), lives }));
  for (const bricksRemaining of [0, 41, 2.5, '30', NaN, Infinity]) rejects(() => parseTacticalSnapshot({ ...snapshot(), bricksRemaining }));
  for (const normalBricksRemaining of [-1, 33, 1.5, '24']) rejects(() => parseTacticalSnapshot({ ...snapshot(), normalBricksRemaining }));
  for (const armoredBricksRemaining of [-1, 9, 1.5, '6']) rejects(() => parseTacticalSnapshot({ ...snapshot(), armoredBricksRemaining }));
});

test('snapshot rejects total, zone, armor-zone, and per-zone armor inconsistencies', () => {
  rejects(() => parseTacticalSnapshot({ ...snapshot(), normalBricksRemaining: 23 }));
  rejects(() => parseTacticalSnapshot({ ...snapshot(), bricksByZone: { left: 7, center: 10, right: 12 } }));
  rejects(() => parseTacticalSnapshot({ ...snapshot(), armoredByZone: { left: 1, center: 2, right: 2 } }));
  rejects(() => parseTacticalSnapshot({ ...snapshot(), armoredByZone: { left: 9, center: 0, right: -3 } }));
  const altered = snapshot();
  altered.bricksByZone = { left: 0, center: 18, right: 12 };
  rejects(() => parseTacticalSnapshot(altered));
});

test('snapshot rejects noninteger, nonfinite, and numeric-string zone counts', () => {
  for (const value of [-1, 1.5, NaN, Infinity, '8']) {
    rejects(() => parseTacticalSnapshot({ ...snapshot(), bricksByZone: { left: value, center: 10, right: 12 } }));
  }
});

test('snapshot rejects missing or extra nested fields and invalid categorical values', () => {
  const bad = [
    { bricksByZone: { left: 8, center: 10 } },
    { armoredByZone: { left: 2, center: 2, right: 2, top: 0 } },
    { ballDirection: { horizontal: 'left' } },
    { ballDirection: { horizontal: 'east', vertical: 'up' } },
    { shield: { zone: 'center', direction: 'neutral' } },
    { portalState: 'inactive' },
  ];
  for (const patch of bad) rejects(() => parseTacticalSnapshot({ ...snapshot(), ...patch }));
  const { shield, ...missingShield } = snapshot();
  rejects(() => parseTacticalSnapshot(missingShield));
  rejects(() => parseTacticalSnapshot({ ...snapshot(), debug: true }));
});

test('candidate accepts enum combinations and returns exact copy', () => {
  for (const targetZone of ['left', 'center', 'right']) {
    for (const style of ['safe', 'balanced', 'aggressive']) {
      const input = { targetZone, style, paddleContact: 'center', route: 'portal' };
      assert.deepEqual(parseCandidateStrategy(input), input);
      assert.notEqual(parseCandidateStrategy(input), input);
    }
  }
});

test('candidate rejects invalid enums, missing/extra keys, null, and arrays', () => {
  for (const patch of [{ targetZone: 'top' }, { style: 'reckless' }, { paddleContact: 1 }, { route: 'teleport' }]) {
    rejects(() => parseCandidateStrategy({ ...candidate(), ...patch }));
  }
  const { route, ...missingRoute } = candidate();
  for (const value of [missingRoute, { ...candidate(), x: 100 }, null, []]) rejects(() => parseCandidateStrategy(value));
});

test('evaluation accepts exact accepted and rejected results', () => {
  assert.deepEqual(parseStrategyEvaluation(evaluation()), evaluation());
  const rejected = { ...evaluation(), candidateAccepted: false, rejectionReason: 'empty_target', targetOpportunity: 0, armoredTargets: 0 };
  assert.deepEqual(parseStrategyEvaluation(rejected), rejected);
});

test('evaluation rejects acceptance/reason mismatch and invalid enums or booleans', () => {
  rejects(() => parseStrategyEvaluation({ ...evaluation(), candidateAccepted: false }));
  rejects(() => parseStrategyEvaluation({ ...evaluation(), rejectionReason: 'empty_target' }));
  rejects(() => parseStrategyEvaluation({ ...evaluation(), rejectionReason: 'other' }));
  rejects(() => parseStrategyEvaluation({ ...evaluation(), riskLevel: 'extreme' }));
  rejects(() => parseStrategyEvaluation({ ...evaluation(), routeUsable: 1 }));
});

test('evaluation rejects bad opportunity/armor counts and evidence-code changes', () => {
  for (const targetOpportunity of [-1, 1.5, '12', NaN, Infinity]) rejects(() => parseStrategyEvaluation({ ...evaluation(), targetOpportunity }));
  for (const armoredTargets of [-1, 13, 1.5, '2']) rejects(() => parseStrategyEvaluation({ ...evaluation(), armoredTargets }));
  const codes = evaluation().evidenceCodes;
  for (const evidenceCodes of [codes.slice(1), [...codes, 'extra'], [codes[1], codes[0], ...codes.slice(2)]]) {
    rejects(() => parseStrategyEvaluation({ ...evaluation(), evidenceCodes }));
  }
  rejects(() => parseStrategyEvaluation({ ...evaluation(), extra: 1 }));
});

test('final plan accepts exact shape, trims text, and matches accepted candidate', () => {
  const result = parseTacticalPlanForCandidate(plan(), candidate());
  assert.equal(result.summary, 'Clear the right side carefully.');
  assert.deepEqual(result.actions, ['Aim with the right paddle third.']);
  assert.deepEqual(result.evidence, plan().evidence);
});

test('final plan rejects extra/model-authority fields and wrong enums', () => {
  for (const extra of ['completed', 'success', 'confidence', 'provider', 'model']) rejects(() => parseTacticalPlan({ ...plan(), [extra]: true }));
  rejects(() => parseTacticalPlan({ ...plan(), strategy: 'reckless' }));
  rejects(() => parseTacticalPlan(null));
  rejects(() => parseTacticalPlan([]));
});

test('final plan enforces Unicode summary/action length, nonblank text, and action count', () => {
  assert.equal(parseTacticalPlan({ ...plan(), summary: '😀'.repeat(240) }).summary, '😀'.repeat(240));
  assert.equal(parseTacticalPlan({ ...plan(), actions: ['😀'.repeat(160)] }).actions[0], '😀'.repeat(160));
  for (const summary of ['', '  ', '😀'.repeat(241), 1]) rejects(() => parseTacticalPlan({ ...plan(), summary }));
  for (const actions of [[], Array(4).fill('Act'), [' '], ['😀'.repeat(161)], [1]]) rejects(() => parseTacticalPlan({ ...plan(), actions }));
});

test('final plan enforces evidence count, both sources, unique references, and known facts', () => {
  const evidence = plan().evidence;
  for (const invalid of [
    [], [evidence[0]], Array(7).fill(evidence[0]),
    [{ source: 'tactical_snapshot', fact: 'lives' }, { source: 'tactical_snapshot', fact: 'portalState' }],
    [{ source: 'strategy_evaluation', fact: 'riskLevel' }, { source: 'strategy_evaluation', fact: 'routeUsable' }],
    [evidence[0], evidence[0]],
    [evidence[0], { source: 'strategy_evaluation', fact: 'unknown' }],
    [evidence[0], { source: 'tactical_snapshot', fact: 'riskLevel' }],
    [evidence[0], { ...evidence[1], value: 'high' }],
  ]) rejects(() => parseTacticalPlan({ ...plan(), evidence: invalid }));
});

test('final plan rejects all four candidate-choice mismatches', () => {
  for (const patch of [
    { targetZone: 'left' }, { strategy: 'balanced' }, { paddleContact: 'center' }, { route: 'portal' },
  ]) rejects(() => parseTacticalPlanForCandidate({ ...plan(), ...patch }, candidate()));
  rejects(() => parseTacticalPlanForCandidate(plan(), { ...candidate(), style: 'aggressive' }));
});

test('final plan rejects an oversized normalized UTF-8 result', () => {
  const oversized = { ...plan(), summary: '\u0000'.repeat(240), actions: Array(3).fill('\u0000'.repeat(160)) };
  assert.ok(Buffer.byteLength(JSON.stringify(oversized), 'utf8') > 4096);
  rejects(() => parseTacticalPlan(oversized));
});
