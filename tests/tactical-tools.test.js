import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { deriveTacticalSnapshot } from '../src/tactical-snapshot.js';
import { parseTacticalSnapshot, parseStrategyEvaluation } from '../dist-server/tactical/contracts.js';
import { evaluateTacticalStrategy } from '../dist-server/tactical/evaluator.js';
import {
  TacticalToolError,
  getTacticalToolDeclarations,
  createTacticalToolContext,
  invokeTacticalTool,
  parseTacticalToolResult,
  assertTacticalToolResultByteLength,
} from '../dist-server/tactical/tools.js';

const snapshot = () => deriveTacticalSnapshot(createGame());
const candidate = () => ({ targetZone: 'right', style: 'safe', paddleContact: 'right', route: 'direct' });
const context = () => createTacticalToolContext(snapshot());
const fails = (action, code) => assert.throws(action, (error) => error instanceof TacticalToolError && error.code === code);

test('allowlist declarations contain exactly the two fixed names and exact schemas', () => {
  const declarations = getTacticalToolDeclarations();
  assert.deepEqual(declarations.map((item) => item.name), ['get_tactical_snapshot', 'evaluate_tactical_strategy']);
  assert.equal(declarations.length, 2);
  assert.deepEqual(declarations[0].inputSchema, { type: 'object', properties: {}, required: [], additionalProperties: false });
  assert.deepEqual(declarations[1].inputSchema, {
    type: 'object',
    properties: {
      targetZone: { type: 'string', enum: ['left', 'center', 'right'] },
      style: { type: 'string', enum: ['safe', 'balanced', 'aggressive'] },
      paddleContact: { type: 'string', enum: ['left', 'center', 'right'] },
      route: { type: 'string', enum: ['direct', 'portal'] },
    },
    required: ['targetZone', 'style', 'paddleContact', 'route'],
    additionalProperties: false,
  });
});

test('declaration callers receive independent copies, not mutable registration', () => {
  const declarations = getTacticalToolDeclarations();
  declarations.push({ name: 'run_shell' });
  declarations[0].name = 'move_paddle';
  assert.deepEqual(getTacticalToolDeclarations().map((item) => item.name), ['get_tactical_snapshot', 'evaluate_tactical_strategy']);
});

test('context validates, copies, and freezes only a request-scoped snapshot', () => {
  const original = snapshot();
  const stored = createTacticalToolContext(original);
  assert.deepEqual(stored.snapshot, parseTacticalSnapshot(original));
  assert.deepEqual(Reflect.ownKeys(stored), ['snapshot']);
  assert.ok(Object.isFrozen(stored));
  assert.ok(Object.isFrozen(stored.snapshot));
  assert.ok(Object.isFrozen(stored.snapshot.bricksByZone));
  original.bricksByZone.left = 0;
  assert.equal(stored.snapshot.bricksByZone.left, 15);
  fails(() => createTacticalToolContext({ ...snapshot(), score: 13 }), 'invalid_input');
});

test('snapshot tool accepts exact empty arguments and returns validated envelope', () => {
  const stored = context();
  const envelope = invokeTacticalTool('get_tactical_snapshot', {}, stored);
  assert.deepEqual(envelope, { toolName: 'get_tactical_snapshot', result: stored.snapshot });
  assert.deepEqual(parseTacticalSnapshot(envelope.result), stored.snapshot);
  assert.deepEqual(parseTacticalToolResult(envelope), envelope);
  assert.ok(Buffer.byteLength(JSON.stringify(envelope.result), 'utf8') < 8192);
});

test('snapshot results are fresh frozen copies independent of context and later results', () => {
  const stored = context();
  const first = invokeTacticalTool('get_tactical_snapshot', {}, stored);
  assert.ok(Object.isFrozen(first.result));
  assert.ok(Object.isFrozen(first.result.bricksByZone));
  assert.throws(() => { first.result.bricksByZone.left = 0; }, TypeError);
  assert.throws(() => { first.result.ballDirection.horizontal = 'neutral'; }, TypeError);
  const second = invokeTacticalTool('get_tactical_snapshot', {}, stored);
  assert.equal(second.result.bricksByZone.left, 15);
  assert.equal(second.result.ballDirection.horizontal, 'right');
  assert.notEqual(first.result, stored.snapshot);
  assert.notEqual(first.result, second.result);
});

test('snapshot tool rejects extra, missing, null, array and inherited arguments', () => {
  const stored = context();
  for (const args of [{ admin: true }, undefined, null, [], Object.create({})]) {
    fails(() => invokeTacticalTool('get_tactical_snapshot', args, stored), 'invalid_tool_arguments');
  }
});

test('evaluator tool uses context snapshot and returns contract-valid result envelope', () => {
  const stored = context();
  const result = invokeTacticalTool('evaluate_tactical_strategy', candidate(), stored);
  assert.equal(result.toolName, 'evaluate_tactical_strategy');
  assert.equal(result.result.targetOpportunity, 15);
  assert.equal(result.result.armoredTargets, 4);
  assert.deepEqual(parseStrategyEvaluation(result.result), result.result);
  assert.deepEqual(parseTacticalToolResult(result), result);
  assert.ok(Object.isFrozen(result.result));
  assert.ok(Buffer.byteLength(JSON.stringify(result.result), 'utf8') < 8192);
});

test('evaluator rejects model-supplied snapshot and other extra fields before execution', () => {
  let calls = 0;
  const spy = () => { calls++; throw new Error('must not run'); };
  for (const args of [{ ...candidate(), snapshot: snapshot() }, { ...candidate(), lives: 3 }, { ...candidate(), provider: 'fake' }]) {
    fails(() => invokeTacticalTool('evaluate_tactical_strategy', args, context(), spy), 'invalid_tool_arguments');
  }
  assert.equal(calls, 0);
});

test('invalid candidate enum and shape cases never reach evaluator', () => {
  let calls = 0;
  const spy = () => { calls++; throw new Error('must not run'); };
  const { route, ...missingRoute } = candidate();
  const cases = [
    { ...candidate(), targetZone: 'up' }, { ...candidate(), style: 'reckless' },
    { ...candidate(), paddleContact: 'upper' }, { ...candidate(), route: 'warp' },
    missingRoute, { ...candidate(), extra: 1 }, null, [],
  ];
  for (const args of cases) fails(() => invokeTacticalTool('evaluate_tactical_strategy', args, context(), spy), 'invalid_tool_arguments');
  assert.equal(calls, 0);
});

test('unknown and representative forbidden names stop before evaluator execution', () => {
  let calls = 0;
  const spy = () => { calls++; throw new Error('must not run'); };
  fails(() => invokeTacticalTool('make_coffee', candidate(), context(), spy), 'unknown_tool');
  for (const name of ['move_paddle', 'set_score', 'run_shell', 'fetch_url']) {
    fails(() => invokeTacticalTool(name, candidate(), context(), spy), 'forbidden_tool');
  }
  assert.equal(calls, 0);
});

test('unconstructed or malformed context fails before tool behavior', () => {
  let calls = 0;
  const spy = () => { calls++; throw new Error('must not run'); };
  fails(() => invokeTacticalTool('evaluate_tactical_strategy', candidate(), { snapshot: snapshot() }, spy), 'invalid_input');
  fails(() => invokeTacticalTool('get_tactical_snapshot', {}, null), 'invalid_input');
  assert.equal(calls, 0);
});

test('tool result envelope rejects mismatched name and result, extra keys and wrong types', () => {
  const snapshotResult = invokeTacticalTool('get_tactical_snapshot', {}, context());
  const evaluationResult = invokeTacticalTool('evaluate_tactical_strategy', candidate(), context());
  for (const bad of [
    { toolName: 'evaluate_tactical_strategy', result: snapshotResult.result },
    { toolName: 'get_tactical_snapshot', result: evaluationResult.result },
    { ...snapshotResult, provider: 'fake' },
    { toolName: 'run_shell', result: snapshotResult.result },
    null, [],
  ]) fails(() => parseTacticalToolResult(bad), 'invalid_tool_result');
});

test('UTF-8 byte bound rejects oversized synthetic data and stringification failures', () => {
  assertTacticalToolResultByteLength({ text: 'a'.repeat(8192 - 11) });
  fails(() => assertTacticalToolResultByteLength({ text: '😀'.repeat(2049) }), 'invalid_tool_result');
  const cyclic = {}; cyclic.self = cyclic;
  fails(() => assertTacticalToolResultByteLength(cyclic), 'invalid_tool_result');
});

test('repeated evaluator calls are equal and never mutate context or candidate', () => {
  const stored = context();
  const choice = candidate();
  const beforeContext = structuredClone(stored.snapshot);
  const beforeChoice = structuredClone(choice);
  const first = invokeTacticalTool('evaluate_tactical_strategy', choice, stored);
  assert.deepEqual(invokeTacticalTool('evaluate_tactical_strategy', choice, stored), first);
  assert.deepEqual(stored.snapshot, beforeContext);
  assert.deepEqual(choice, beforeChoice);
});

test('invalid evaluator result fails before forwarding as a tool result', () => {
  const broken = () => ({ candidateAccepted: true, rejectionReason: 'none' });
  fails(() => invokeTacticalTool('evaluate_tactical_strategy', candidate(), context(), broken), 'invalid_tool_result');
});

test('schema-valid target opportunity mismatch fails trusted recomputation', () => {
  const stored = context();
  const choice = candidate();
  assert.equal(stored.snapshot.bricksByZone.right, 15);
  const injected = (state, proposed) => {
    const wrong = { ...evaluateTacticalStrategy(state, proposed), targetOpportunity: 14 };
    assert.deepEqual(parseStrategyEvaluation(wrong), wrong);
    return wrong;
  };
  fails(() => invokeTacticalTool('evaluate_tactical_strategy', choice, stored, injected), 'invalid_tool_result');
});

test('schema-valid risk mismatch also fails trusted recomputation', () => {
  const stored = context();
  const choice = candidate();
  const injected = (state, proposed) => {
    const wrong = { ...evaluateTacticalStrategy(state, proposed), riskLevel: 'medium' };
    assert.equal(evaluateTacticalStrategy(state, proposed).riskLevel, 'low');
    assert.deepEqual(parseStrategyEvaluation(wrong), wrong);
    return wrong;
  };
  fails(() => invokeTacticalTool('evaluate_tactical_strategy', choice, stored, injected), 'invalid_tool_result');
});
