import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { deriveTacticalSnapshot } from '../src/tactical-snapshot.js';
import { parseTacticalRequest } from '../dist-server/tactical/contracts.js';
import { getTacticalToolDeclarations, invokeTacticalTool, createTacticalToolContext } from '../dist-server/tactical/tools.js';
import { createTacticalFakeProvider, FakeProviderExhaustedError, TacticalFakeProvider } from '../dist-server/tactical/fake-provider.js';

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
