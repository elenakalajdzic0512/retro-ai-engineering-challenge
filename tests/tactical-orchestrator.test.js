import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { deriveTacticalSnapshot } from '../src/tactical-snapshot.js';
import { parseTacticalRequest } from '../dist-server/tactical/contracts.js';
import { getTacticalToolDeclarations, invokeTacticalTool, createTacticalToolContext } from '../dist-server/tactical/tools.js';
import { createTacticalFakeProvider, FakeProviderExhaustedError, TacticalFakeProvider } from '../dist-server/tactical/fake-provider.js';
import {
  TacticalCoachError,
  runTacticalCoach,
  getTacticalCoachErrorResponse,
  createTacticalActionTracker,
  createTacticalProviderAttemptBudget,
} from '../dist-server/tactical/orchestrator.js';

const request = () => ({ goal: 'Clear the right side.', state: deriveTacticalSnapshot(createGame()) });
const providerCall = () => ({
  input: request(),
  toolDeclarations: getTacticalToolDeclarations(),
  toolResults: [],
  timeoutMs: 5000,
});

test('fake provider returns scripted tool proposal as an independent copy', async () => {
  const proposal = { type: 'tool_call', toolName: 'get_tactical_snapshot', arguments: {} };
  const fake = createTacticalFakeProvider({ outcomes: [proposal] });
  const output = await fake.generate(providerCall());
  assert.deepEqual(output, proposal);
  assert.notEqual(output, proposal);
  output.toolName = 'move_paddle';
  assert.equal(proposal.toolName, 'get_tactical_snapshot');
  assert.equal(fake.callCount, 1);
});

test('fake provider returns final proposal without deciding if it is premature', async () => {
  const final = { type: 'final', output: { summary: 'Right side first.' } };
  const fake = createTacticalFakeProvider({ outcomes: [final] });
  assert.deepEqual(await fake.generate(providerCall()), final);
  assert.equal(fake.callCount, 1);
});

for (const code of ['provider_timeout', 'provider_unavailable', 'rate_limited']) {
  test(`fake provider returns scripted ${code} failure`, async () => {
    const fake = createTacticalFakeProvider({ outcomes: [{ type: 'failure', code }] });
    assert.deepEqual(await fake.generate(providerCall()), { type: 'failure', code });
    assert.equal(fake.callCount, 1);
  });
}

test('fake outcomes are consumed in order and caller edits cannot rewrite the script', async () => {
  const script = [
    { type: 'tool_call', toolName: 'get_tactical_snapshot', arguments: {} },
    { type: 'tool_call', toolName: 'evaluate_tactical_strategy', arguments: { targetZone: 'right', style: 'safe', paddleContact: 'right', route: 'direct' } },
    { type: 'final', output: { summary: 'Focus right.' } },
  ];
  const fake = createTacticalFakeProvider({ outcomes: script });
  script[0].toolName = 'run_shell';
  assert.equal((await fake.generate(providerCall())).toolName, 'get_tactical_snapshot');
  assert.equal((await fake.generate(providerCall())).toolName, 'evaluate_tactical_strategy');
  assert.deepEqual(await fake.generate(providerCall()), script[2]);
  assert.equal(fake.callCount, 3);
});

test('fake call history holds validated independent input, declarations and prior tool results', async () => {
  const snapshot = deriveTacticalSnapshot(createGame());
  const result = invokeTacticalTool('get_tactical_snapshot', {}, createTacticalToolContext(snapshot));
  const call = providerCall();
  call.toolResults = [structuredClone(result)];
  const original = structuredClone(call);
  const fake = createTacticalFakeProvider({ outcomes: [{ type: 'final', output: {} }] });
  await fake.generate(call);
  call.input.goal = 'Altered';
  call.input.state.bricksByZone.left = 0;
  call.toolDeclarations[0].name = 'run_shell';
  call.toolResults[0].result.bricksByZone.left = 0;
  assert.deepEqual(fake.calls, [{
    input: parseTacticalRequest(original.input),
    toolDeclarations: original.toolDeclarations,
    toolResults: original.toolResults,
    timeoutMs: 5000,
  }]);
  const leaked = fake.calls;
  leaked[0].input.goal = 'Mutated history';
  leaked[0].toolDeclarations[0].name = 'move_paddle';
  assert.equal(fake.calls[0].input.goal, 'Clear the right side.');
  assert.equal(fake.calls[0].toolDeclarations[0].name, 'get_tactical_snapshot');
});

test('fake provider rejects malformed prior tool results before recording a call', async () => {
  const fake = createTacticalFakeProvider({ outcomes: [{ type: 'final', output: {} }] });
  const call = providerCall();
  call.toolResults = [{ toolName: 'get_tactical_snapshot', result: { bad: true } }];
  await assert.rejects(fake.generate(call), (error) => error.code === 'invalid_tool_result');
  assert.equal(fake.callCount, 0);
});

test('script exhaustion fails deterministically without replaying the last output', async () => {
  const fake = createTacticalFakeProvider({ outcomes: [{ type: 'final', output: {} }] });
  await fake.generate(providerCall());
  await assert.rejects(fake.generate(providerCall()), FakeProviderExhaustedError);
  await assert.rejects(fake.generate(providerCall()), FakeProviderExhaustedError);
  assert.equal(fake.callCount, 3);
});

test('fake call history is bounded even after repeated exhausted calls', async () => {
  const fake = createTacticalFakeProvider({ outcomes: [] });
  for (let index = 0; index < TacticalFakeProvider.MAX_CALL_HISTORY + 2; index++) {
    await assert.rejects(fake.generate(providerCall()), FakeProviderExhaustedError);
  }
  assert.equal(fake.callCount, TacticalFakeProvider.MAX_CALL_HISTORY + 2);
  assert.equal(fake.calls.length, TacticalFakeProvider.MAX_CALL_HISTORY);
});

test('fake provider needs no key and makes no network request', async () => {
  const priorFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => { requests++; throw new Error('network used'); };
  try {
    const fake = createTacticalFakeProvider({ outcomes: [{ type: 'failure', code: 'provider_unavailable' }] });
    assert.deepEqual(await fake.generate(providerCall()), { type: 'failure', code: 'provider_unavailable' });
    assert.equal(requests, 0);
  } finally {
    globalThis.fetch = priorFetch;
  }
});

const choice = () => ({ targetZone: 'right', style: 'safe', paddleContact: 'right', route: 'direct' });
const snapshotProposal = () => ({ type: 'tool_call', toolName: 'get_tactical_snapshot', arguments: {} });
const evaluationProposal = (argumentsValue = choice()) => ({ type: 'tool_call', toolName: 'evaluate_tactical_strategy', arguments: argumentsValue });
const finalPlan = () => ({
  summary: 'Clear the right side safely.', strategy: 'safe', targetZone: 'right', paddleContact: 'right', route: 'direct',
  actions: ['Aim with the right paddle third.'],
  evidence: [
    { source: 'tactical_snapshot', fact: 'lives' },
    { source: 'tactical_snapshot', fact: 'portalState' },
    { source: 'strategy_evaluation', fact: 'portalAvailable' },
    { source: 'strategy_evaluation', fact: 'riskLevel' },
  ],
});
const finalProposal = (output = finalPlan()) => ({ type: 'final', output });
const successScript = () => [snapshotProposal(), evaluationProposal(), finalProposal()];
const fakeRun = (outcomes, options = {}) => {
  const provider = createTacticalFakeProvider({ outcomes });
  return { provider, run: () => runTacticalCoach(request(), { provider, ...options }) };
};
const failsCode = async (action, code) => {
  await assert.rejects(action, (error) => error instanceof TacticalCoachError && error.code === code);
};

test('three-state success materializes integer, string, and boolean evidence without changing game', async () => {
  const game = createGame();
  const input = { goal: 'Clear the right side.', state: deriveTacticalSnapshot(game) };
  const originalGame = structuredClone(game);
  const originalInput = structuredClone(input);
  const proposal = finalPlan();
  const candidate = choice();
  const originalCandidate = structuredClone(candidate);
  const provider = createTacticalFakeProvider({ outcomes: [snapshotProposal(), evaluationProposal(candidate), finalProposal(proposal)] });
  let toolCalls = 0;
  const toolResults = [];
  const result = await runTacticalCoach(input, {
    provider,
    toolExecutor(name, args, context) {
      toolCalls++;
      const output = invokeTacticalTool(name, args, context);
      toolResults.push({ output, original: structuredClone(output) });
      return output;
    },
  });
  assert.deepEqual(Object.keys(result), ['plan', 'evidence']);
  assert.deepEqual(result.plan, proposal);
  assert.deepEqual(result.evidence, [
    { source: 'tactical_snapshot', fact: 'lives', value: 3 },
    { source: 'tactical_snapshot', fact: 'portalState', value: 'available' },
    { source: 'strategy_evaluation', fact: 'portalAvailable', value: true },
    { source: 'strategy_evaluation', fact: 'riskLevel', value: 'low' },
  ]);
  assert.equal(provider.callCount, 3);
  assert.equal(toolCalls, 2);
  assert.deepEqual(provider.calls.map((call) => call.toolResults.length), [0, 1, 2]);
  assert.deepEqual(game, originalGame);
  assert.deepEqual(input, originalInput);
  assert.deepEqual(candidate, originalCandidate);
  for (const { output, original } of toolResults) assert.deepEqual(output, original);
});

test('premature final before either required tool stops without a plan', async () => {
  for (const script of [[finalProposal()], [snapshotProposal(), finalProposal()]]) {
    const { provider, run } = fakeRun(script);
    await failsCode(run, 'missing_required_evidence');
    assert.equal(provider.callCount, script.length);
    assert.deepEqual(provider.calls.map((call) => call.toolResults.length), script.length === 1 ? [0] : [0, 1]);
  }
});

test('out-of-order tool proposals and a third tool never execute', async () => {
  for (const [script, code, expectedResults] of [
    [[evaluationProposal()], 'step_limit', [0]],
    [[snapshotProposal(), snapshotProposal()], 'step_limit', [0, 1]],
    [[snapshotProposal(), evaluationProposal(), snapshotProposal()], 'tool_call_limit', [0, 1, 2]],
  ]) {
    let executions = 0;
    const { provider, run } = fakeRun(script, { toolExecutor(name, args, context) { executions++; return invokeTacticalTool(name, args, context); } });
    await failsCode(run, code);
    assert.deepEqual(provider.calls.map((call) => call.toolResults.length), expectedResults);
    assert.equal(executions, script.length === 1 ? 0 : script.length - 1);
  }
});

test('unknown and forbidden proposals stop with distinct codes and no tool execution', async () => {
  for (const [name, code] of [['make_coffee', 'unknown_tool'], ['move_paddle', 'forbidden_tool'], ['run_shell', 'forbidden_tool']]) {
    let executions = 0;
    const { run } = fakeRun([{ type: 'tool_call', toolName: name, arguments: {} }], {
      toolExecutor() { executions++; throw new Error('must not execute'); },
    });
    await failsCode(run, code);
    assert.equal(executions, 0);
  }
});

test('invalid known-tool arguments stop before local execution', async () => {
  for (const bad of [{ x: 1 }, null, []]) {
    let executions = 0;
    const { run } = fakeRun([{ type: 'tool_call', toolName: 'get_tactical_snapshot', arguments: bad }], {
      toolExecutor() { executions++; throw new Error('must not execute'); },
    });
    await failsCode(run, 'invalid_tool_arguments');
    assert.equal(executions, 0);
  }
  const { run } = fakeRun([snapshotProposal(), evaluationProposal({ ...choice(), lives: 1 })]);
  await failsCode(run, 'invalid_tool_arguments');
});

test('a rejected candidate stops after two provider attempts and two tools', async () => {
  const { provider, run } = fakeRun([snapshotProposal(), evaluationProposal({ ...choice(), targetZone: 'center', route: 'portal' }), finalProposal()]);
  await failsCode(run, 'candidate_rejected');
  assert.equal(provider.callCount, 2);
  assert.deepEqual(provider.calls.map((call) => call.toolResults.length), [0, 1]);
});

test('one transient failure retries in the same state and still uses three logical steps', async () => {
  let slept = 0;
  const { provider, run } = fakeRun([
    { type: 'failure', code: 'provider_unavailable' }, ...successScript(),
  ], { sleep: async (ms) => { slept += ms; } });
  const result = await run();
  assert.equal(result.plan.targetZone, 'right');
  assert.equal(provider.callCount, 4);
  assert.deepEqual(provider.calls.map((call) => call.toolResults.length), [0, 0, 1, 2]);
  assert.ok(slept > 0 && slept <= 250);
});

for (const code of ['provider_timeout', 'provider_unavailable', 'rate_limited']) {
  test(`two scripted ${code} failures consume one retry and stop`, async () => {
    const { provider, run } = fakeRun([{ type: 'failure', code }, { type: 'failure', code }], { sleep: async () => {} });
    await failsCode(run, code);
    assert.equal(provider.callCount, 2);
    assert.deepEqual(provider.calls.map((call) => call.toolResults.length), [0, 0]);
  });
}

test('a later transient failure after one retry does not get another retry', async () => {
  const { provider, run } = fakeRun([
    { type: 'failure', code: 'provider_unavailable' }, snapshotProposal(),
    { type: 'failure', code: 'rate_limited' }, evaluationProposal(),
  ], { sleep: async () => {} });
  await failsCode(run, 'rate_limited');
  assert.equal(provider.callCount, 3);
});

test('a nonsettling provider attempt is actually timed out and aborted', async () => {
  let time = 0;
  let observedTimeout = 0;
  let aborted = 0;
  let attempts = 0;
  const provider = { generate(call) {
    attempts++;
    call.signal.addEventListener('abort', () => { aborted++; }, { once: true });
    return new Promise(() => {});
  } };
  const scheduler = {
    set(ms, callback) {
      observedTimeout = ms;
      const handle = { cancelled: false };
      setImmediate(() => { if (!handle.cancelled) { time += ms; callback(); } });
      return handle;
    },
    clear(handle) { handle.cancelled = true; },
  };
  await failsCode(() => runTacticalCoach(request(), { provider, now: () => time, sleep: async () => {}, scheduler }), 'provider_timeout');
  assert.equal(observedTimeout, 5000);
  assert.equal(attempts, 2);
  assert.equal(aborted, 2);
});

test('provider attempt timeout shrinks to remaining absolute deadline', async () => {
  let time = 0;
  const timeouts = [];
  let aborted = false;
  const provider = { generate(call) {
    timeouts.push(call.timeoutMs);
    if (timeouts.length === 1) { time = 20000; return Promise.resolve(snapshotProposal()); }
    call.signal.addEventListener('abort', () => { aborted = true; }, { once: true });
    return new Promise(() => {});
  } };
  const scheduler = {
    set(ms, callback) {
      const handle = { cancelled: false };
      setImmediate(() => { if (!handle.cancelled) { time += ms; callback(); } });
      return handle;
    },
    clear(handle) { handle.cancelled = true; },
  };
  await failsCode(() => runTacticalCoach(request(), { provider, now: () => time, scheduler }), 'deadline');
  assert.deepEqual(timeouts, [5000, 2000]);
  assert.equal(aborted, true);
});

test('deadline stops before provider, after backoff, and after tool execution', async () => {
  let checks = 0;
  const before = fakeRun(successScript(), { now: () => checks++ === 0 ? 0 : 22000 });
  await failsCode(before.run, 'deadline');
  assert.equal(before.provider.callCount, 0);

  let time = 0;
  const afterBackoff = fakeRun([{ type: 'failure', code: 'provider_unavailable' }, snapshotProposal()], {
    now: () => time,
    sleep: async () => { time = 22000; },
  });
  await failsCode(afterBackoff.run, 'deadline');
  assert.equal(afterBackoff.provider.callCount, 1);

  time = 0;
  const scripted = createTacticalFakeProvider({ outcomes: successScript() });
  const provider = {
    async generate(call) { const output = await scripted.generate(call); time = 21920; return output; },
  };
  await failsCode(() => runTacticalCoach(request(), {
    provider, now: () => time,
    toolExecutor(name, args, context) { const result = invokeTacticalTool(name, args, context); time += 81; return result; },
  }), 'deadline');
  assert.equal(scripted.callCount, 1);
});

test('local tool taking more than 100 ms stops with tool_timeout and no retry', async () => {
  let time = 0;
  const { provider, run } = fakeRun(successScript(), {
    now: () => time,
    toolExecutor(name, args, context) { const result = invokeTacticalTool(name, args, context); time += 101; return result; },
  });
  await failsCode(run, 'tool_timeout');
  assert.equal(provider.callCount, 1);
});

test('provider attempt budget rejects a fifth reservation before a fifth call', () => {
  const budget = createTacticalProviderAttemptBudget();
  for (let index = 0; index < 4; index++) budget.reserve();
  assert.equal(budget.count, 4);
  assert.throws(() => budget.reserve(), (error) => error instanceof TacticalCoachError && error.code === 'provider_call_budget');
  assert.equal(budget.count, 4);
});

test('request-scoped canonical action key rejects same-state duplicate', () => {
  const tracker = createTacticalActionTracker();
  tracker.register('NEED_EVALUATION', 'evaluate_tactical_strategy', choice());
  assert.throws(() => tracker.register('NEED_EVALUATION', 'evaluate_tactical_strategy', { route: 'direct', paddleContact: 'right', style: 'safe', targetZone: 'right' }),
    (error) => error instanceof TacticalCoachError && error.code === 'repeated_action');
});

test('cancellation before run, during provider, and before later step stops without partial result', async () => {
  const first = new AbortController();
  first.abort();
  const before = fakeRun(successScript(), { signal: first.signal });
  await failsCode(before.run, 'cancelled');
  assert.equal(before.provider.callCount, 0);

  const active = new AbortController();
  let providerAborted = false;
  const never = { generate(call) { call.signal.addEventListener('abort', () => { providerAborted = true; }, { once: true }); active.abort(); return new Promise(() => {}); } };
  await failsCode(() => runTacticalCoach(request(), { provider: never, signal: active.signal }), 'cancelled');
  assert.equal(providerAborted, true);

  const later = new AbortController();
  const provider = createTacticalFakeProvider({ outcomes: successScript() });
  await failsCode(() => runTacticalCoach(request(), {
    provider, signal: later.signal,
    toolExecutor(name, args, context) { const result = invokeTacticalTool(name, args, context); later.abort(); return result; },
  }), 'cancelled');
  assert.equal(provider.callCount, 1);
});

test('malformed provider envelopes and tool proposals fail safely', async () => {
  for (const output of [null, [], { type: 'other' }, { type: 'tool_call', arguments: {} }, { type: 'failure', code: 'mystery' }, { type: 'final' }]) {
    const { run } = fakeRun([output]);
    await failsCode(run, 'malformed_model_output');
  }
});

test('final candidate mismatch, absent source, invented fact, and model-authored value fail', async () => {
  const base = finalPlan();
  const invalid = [
    { ...base, strategy: 'aggressive' },
    { ...base, evidence: [{ source: 'tactical_snapshot', fact: 'lives' }, { source: 'tactical_snapshot', fact: 'portalState' }] },
    { ...base, evidence: [{ source: 'strategy_evaluation', fact: 'riskLevel' }, { source: 'strategy_evaluation', fact: 'portalAvailable' }] },
    { ...base, evidence: [{ source: 'tactical_snapshot', fact: 'lives' }, { source: 'strategy_evaluation', fact: 'madeUp' }] },
    { ...base, evidence: [{ source: 'tactical_snapshot', fact: 'lives', value: 3 }, { source: 'strategy_evaluation', fact: 'riskLevel' }] },
  ];
  for (const output of invalid) {
    const { provider, run } = fakeRun([snapshotProposal(), evaluationProposal(), finalProposal(output)]);
    await failsCode(run, 'invalid_final_output');
    assert.equal(provider.callCount, 3);
  }
});

test('malformed final content, invalid tool result, and tool failure stop safely', async () => {
  await failsCode(fakeRun([snapshotProposal(), evaluationProposal(), finalProposal(null)]).run, 'invalid_final_output');
  const invalidResult = fakeRun([snapshotProposal()], { toolExecutor: () => ({ toolName: 'get_tactical_snapshot', result: { bad: true } }) });
  await failsCode(invalidResult.run, 'invalid_tool_result');
  assert.equal(invalidResult.provider.callCount, 1);
  const toolFailure = fakeRun([snapshotProposal()], { toolExecutor: () => { throw new Error('PRIVATE_TOOL_DETAIL'); } });
  await failsCode(toolFailure.run, 'tool_failure');
  assert.equal(toolFailure.provider.callCount, 1);
});

test('representative stopped runs do not mutate the canonical game', async () => {
  for (const outcomes of [
    [finalProposal()],
    [snapshotProposal(), evaluationProposal({ ...choice(), targetZone: 'center', route: 'portal' })],
    [snapshotProposal(), evaluationProposal(), finalProposal(null)],
    [{ type: 'failure', code: 'rate_limited' }, { type: 'failure', code: 'rate_limited' }],
  ]) {
    const game = createGame();
    const before = structuredClone(game);
    const input = { goal: 'Clear right', state: deriveTacticalSnapshot(game) };
    const provider = createTacticalFakeProvider({ outcomes });
    await assert.rejects(runTacticalCoach(input, { provider, sleep: async () => {} }), TacticalCoachError);
    assert.deepEqual(game, before);
  }
});

test('oversized normalized final plan and public materialized response fail closed', async () => {
  const oversized = { ...finalPlan(), summary: '\u0000'.repeat(240), actions: Array(3).fill('\u0000'.repeat(160)) };
  await failsCode(fakeRun([snapshotProposal(), evaluationProposal(), finalProposal(oversized)]).run, 'invalid_final_output');
  const nearBound = { ...finalPlan(), summary: '\u0000'.repeat(220), actions: Array(3).fill('\u0000'.repeat(130)) };
  assert.ok(Buffer.byteLength(JSON.stringify(nearBound), 'utf8') <= 4096);
  await failsCode(fakeRun([snapshotProposal(), evaluationProposal(), finalProposal(nearBound)]).run, 'invalid_final_output');
});

test('invalid input uses zero provider calls and public errors never expose raw exceptions', async () => {
  const { provider } = fakeRun(successScript());
  await failsCode(() => runTacticalCoach({ goal: '', state: request().state }, { provider }), 'invalid_input');
  assert.equal(provider.callCount, 0);
  const secret = 'PRIVATE_PROVIDER_PAYLOAD';
  const broken = { generate() { throw new Error(secret); } };
  let caught;
  try { await runTacticalCoach(request(), { provider: broken, sleep: async () => {} }); } catch (error) { caught = error; }
  const publicResult = getTacticalCoachErrorResponse(caught);
  assert.equal(publicResult.error.code, 'provider_unavailable');
  assert.equal(JSON.stringify(publicResult).includes(secret), false);
});

test('provider-thrown orchestration-shaped errors cannot choose application failure codes', async () => {
  let calls = 0;
  const provider = { generate() { calls++; throw new TacticalCoachError('candidate_rejected'); } };
  await failsCode(() => runTacticalCoach(request(), { provider, sleep: async () => {} }), 'provider_unavailable');
  assert.equal(calls, 2);
  assert.equal(getTacticalCoachErrorResponse(new TacticalCoachError('not_a_code')).error.code, 'provider_unavailable');
  const forged = new TacticalCoachError('invalid_input');
  forged.message = 'PRIVATE_PROVIDER_PAYLOAD';
  assert.equal(getTacticalCoachErrorResponse(forged).error.message, 'Tactical request is invalid.');
});
