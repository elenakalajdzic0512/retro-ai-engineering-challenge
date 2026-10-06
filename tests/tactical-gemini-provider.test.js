import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { deriveTacticalSnapshot } from '../src/tactical-snapshot.js';
import { createTacticalToolContext, getTacticalToolDeclarations, invokeTacticalTool } from '../dist-server/tactical/tools.js';
import { createTacticalCoachGeminiProvider } from '../dist-server/tactical/gemini-provider.js';
import { runTacticalCoach, TacticalCoachError } from '../dist-server/tactical/orchestrator.js';

const MODEL = 'gemini-3.5-flash-lite';
const candidate = { targetZone: 'center', style: 'balanced', paddleContact: 'center', route: 'direct' };
const plan = {
  summary: 'Clear the center with careful paddle control.', strategy: 'balanced', targetZone: 'center',
  paddleContact: 'center', route: 'direct', actions: ['Aim near the center of the paddle.'],
  evidence: [
    { source: 'tactical_snapshot', fact: 'lives' },
    { source: 'strategy_evaluation', fact: 'riskLevel' },
  ],
};

function input() {
  const state = deriveTacticalSnapshot(createGame());
  Object.assign(state, {
    score: 100, lives: 1, bricksRemaining: 30, normalBricksRemaining: 24,
    armoredBricksRemaining: 6, bricksByZone: { left: 10, center: 10, right: 10 },
    armoredByZone: { left: 2, center: 2, right: 2 }, portalState: 'cooldown',
  });
  return { goal: 'Protect my last life while clearing the center.', state };
}

function call(toolResults = [], signal) {
  return { input: input(), toolDeclarations: getTacticalToolDeclarations(), toolResults, timeoutMs: 5000, signal };
}

function results() {
  const context = createTacticalToolContext(input().state);
  return [invokeTacticalTool('get_tactical_snapshot', {}, context),
    invokeTacticalTool('evaluate_tactical_strategy', candidate, context)];
}

function stub(responses) {
  const requests = [];
  return {
    requests,
    client: { models: { async generateContent(request) {
      requests.push(request);
      const next = responses.shift();
      if (next instanceof Error) throw next;
      return next;
    } } },
  };
}

function functionReply(name, args, id) {
  return { candidates: [{ content: { role: 'model', parts: [{ functionCall: { name, args, ...(id ? { id } : {}) } }] } }] };
}

const textReply = (text) => ({ candidates: [{ content: { role: 'model', parts: [{ text }] } }] });

test('initial Gemini request exposes goal and only the snapshot declaration, never request.state', async () => {
  const sdk = stub([functionReply('get_tactical_snapshot', {}, 'snapshot-call')]);
  const provider = createTacticalCoachGeminiProvider({ client: sdk.client });
  const controller = new AbortController();
  const providerCall = call([], controller.signal);
  const serializedState = JSON.stringify(providerCall.input.state);
  assert.deepEqual(await provider.generate(providerCall), {
    type: 'tool_call', toolName: 'get_tactical_snapshot', arguments: {},
  });
  const request = sdk.requests[0];
  assert.deepEqual(Object.keys(request).sort(), ['config', 'contents', 'model']);
  assert.equal(request.model, MODEL);
  assert.deepEqual(request.contents, [{ role: 'user', parts: [{ text: providerCall.input.goal }] }]);
  assert.deepEqual(Object.keys(request.config).sort(), [
    'abortSignal', 'automaticFunctionCalling', 'candidateCount', 'systemInstruction', 'toolConfig', 'tools',
  ]);
  assert.equal(request.config.abortSignal, controller.signal);
  assert.deepEqual(request.config.automaticFunctionCalling, { disable: true });
  assert.equal(request.config.systemInstruction,
    'You are Neon Breaker Tactical Coach. Follow the current server-provided tool or JSON-output instruction. Use only validated tool responses as arena evidence. Follow three stages in order: first request the snapshot, then propose one strategy evaluation candidate, and only after a validated evaluation response produce the final plan. Never claim an exact trajectory or future outcome. First call get_tactical_snapshot with exactly {}. Do not provide a plan yet.');
  assert.deepEqual(request.config.toolConfig.functionCallingConfig, {
    mode: 'ANY', allowedFunctionNames: ['get_tactical_snapshot'],
  });
  assert.deepEqual(request.config.tools, [{ functionDeclarations: [{
    name: 'get_tactical_snapshot',
    description: 'Read the validated client-reported arena snapshot.',
    parametersJsonSchema: { type: 'object', properties: {}, required: [], additionalProperties: false },
  }] }]);
  const modelVisible = {
    contents: request.contents,
    systemInstruction: request.config.systemInstruction,
    tools: request.config.tools,
    toolConfig: request.config.toolConfig,
  };
  const stringsIn = (value) => typeof value === 'string' ? [value]
    : Array.isArray(value) ? value.flatMap(stringsIn)
      : value && typeof value === 'object' ? Object.values(value).flatMap(stringsIn) : [];
  assert.equal(stringsIn(modelVisible).some((text) => text.includes(serializedState)), false);
});

test('evaluation receives validated snapshot function response with matching ID and only evaluation declaration', async () => {
  const sdk = stub([
    functionReply('get_tactical_snapshot', {}, 'snapshot-call'),
    functionReply('evaluate_tactical_strategy', candidate, 'evaluation-call'),
  ]);
  const provider = createTacticalCoachGeminiProvider({ client: sdk.client });
  await provider.generate(call());
  const [snapshot] = results();
  assert.deepEqual(await provider.generate(call([snapshot])), {
    type: 'tool_call', toolName: 'evaluate_tactical_strategy', arguments: candidate,
  });
  const request = sdk.requests[1];
  assert.deepEqual(request.contents, [
    { role: 'user', parts: [{ text: input().goal }] },
    { role: 'model', parts: [{ functionCall: { name: 'get_tactical_snapshot', args: {}, id: 'snapshot-call' } }] },
    { role: 'user', parts: [{ functionResponse: { name: 'get_tactical_snapshot', id: 'snapshot-call', response: { output: snapshot.result } } }] },
  ]);
  assert.deepEqual(request.config.toolConfig.functionCallingConfig, {
    mode: 'ANY', allowedFunctionNames: ['evaluate_tactical_strategy'],
  });
  assert.deepEqual(request.config.tools[0].functionDeclarations.map((item) => item.name), ['evaluate_tactical_strategy']);
  assert.deepEqual(request.config.tools[0].functionDeclarations[0].parametersJsonSchema.required,
    ['targetZone', 'style', 'paddleContact', 'route']);
  assert.deepEqual(Object.keys(request.config.tools[0].functionDeclarations[0].parametersJsonSchema.properties),
    ['targetZone', 'style', 'paddleContact', 'route']);
});

test('final step sends both function responses and requests exact structured plan references', async () => {
  const sdk = stub([
    functionReply('get_tactical_snapshot', {}, 'snapshot-call'),
    functionReply('evaluate_tactical_strategy', candidate, 'evaluation-call'),
    textReply(JSON.stringify(plan)),
  ]);
  const provider = createTacticalCoachGeminiProvider({ client: sdk.client });
  const [snapshot, evaluation] = results();
  await provider.generate(call());
  await provider.generate(call([snapshot]));
  assert.deepEqual(await provider.generate(call([snapshot, evaluation])), { type: 'final', output: plan });
  const request = sdk.requests[2];
  assert.deepEqual(request.contents.at(-1), {
    role: 'user', parts: [{ functionResponse: {
      name: 'evaluate_tactical_strategy', id: 'evaluation-call', response: { output: evaluation.result },
    } }],
  });
  assert.equal(request.contents.length, 5);
  assert.equal(request.config.tools, undefined);
  assert.equal(request.config.toolConfig?.functionCallingConfig?.mode, 'NONE');
  assert.equal(request.config.responseMimeType, 'application/json');
  const instruction = request.config.systemInstruction;
  for (const rule of [
    'final.targetZone = candidate.targetZone',
    'final.strategy = candidate.style',
    'final.paddleContact = candidate.paddleContact',
    'final.route = candidate.route',
    'exactly these top-level keys: summary, strategy, targetZone, paddleContact, route, actions, evidence; no extra keys',
    'Evidence entries contain only {source,fact}; do not author value, confidence, success, completed, provider, model, explanation, or any extra field',
    'at least one tactical_snapshot reference and at least one strategy_evaluation reference',
    'unique by source + fact',
    'tactical_snapshot facts: lives, bricksRemaining, bricksByZone.left, bricksByZone.center, bricksByZone.right, armoredByZone.left, armoredByZone.center, armoredByZone.right, ballDirection.horizontal, ballDirection.vertical, shield.zone, shield.direction, portalState; no others',
    'strategy_evaluation facts: targetOpportunity, armoredTargets, riskLevel, paddleAligned, shieldInTargetZone, portalAvailable, routeUsable; no others',
    'only facts actually present in the validated function responses',
    'Do not invent evidence, infer new fact names from prose, or turn values into fact names',
    'summary must be nonblank and at most 240 Unicode code points',
    '1 to 3 actions, each nonblank and at most 160 Unicode code points',
    '2 to 6 evidence references',
    'Keep the normalized plan compact for the application 4096-byte limit',
  ]) assert.ok(instruction.includes(rule), `final instruction missing: ${rule}`);
  const schema = request.config.responseJsonSchema;
  assert.deepEqual(Object.keys(schema.properties),
    ['summary', 'strategy', 'targetZone', 'paddleContact', 'route', 'actions', 'evidence']);
  assert.deepEqual(schema.required, Object.keys(schema.properties));
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(Object.keys(schema.properties.evidence.items.properties), ['source', 'fact']);
  assert.equal(schema.properties.evidence.items.additionalProperties, false);
});

test('final phase rejects every malformed or changed prior-result sequence before calling Gemini', async () => {
  const cases = [
    ['malformed first result', (snapshot, evaluation) => [
      { toolName: 'get_tactical_snapshot', result: { bad: true } }, evaluation,
    ]],
    ['swapped order', (snapshot, evaluation) => [evaluation, snapshot]],
    ['changed valid snapshot', (snapshot, evaluation) => [
      { toolName: 'get_tactical_snapshot', result: deriveTacticalSnapshot(createGame()) }, evaluation,
    ]],
    ['extra third result', (snapshot, evaluation) => [snapshot, evaluation, snapshot]],
  ];
  for (const [label, makeResults] of cases) {
    const sdk = stub([
      functionReply('get_tactical_snapshot', {}),
      functionReply('evaluate_tactical_strategy', candidate),
      textReply(JSON.stringify(plan)),
    ]);
    const provider = createTacticalCoachGeminiProvider({ client: sdk.client });
    const [snapshot, evaluation] = results().map((result) => structuredClone(result));
    await provider.generate(call());
    await provider.generate(call([snapshot]));
    assert.equal(sdk.requests.length, 2, label);
    assert.equal(await provider.generate(call(makeResults(snapshot, evaluation))), null, label);
    assert.equal(sdk.requests.length, 2, `${label}: Gemini must not receive a final request`);
  }
});

test('evaluation phase rejects wrong or extra prior results before calling Gemini', async () => {
  const [snapshot, evaluation] = results();
  for (const badResults of [[], [evaluation], [snapshot, evaluation],
    [{ toolName: 'get_tactical_snapshot', result: { bad: true } }]]) {
    const sdk = stub([functionReply('get_tactical_snapshot', {}), functionReply('evaluate_tactical_strategy', candidate)]);
    const provider = createTacticalCoachGeminiProvider({ client: sdk.client });
    await provider.generate(call());
    assert.equal(await provider.generate(call(badResults)), null);
    assert.equal(sdk.requests.length, 1);
  }
  const first = stub([functionReply('get_tactical_snapshot', {})]);
  const provider = createTacticalCoachGeminiProvider({ client: first.client });
  assert.equal(await provider.generate(call([snapshot])), null);
  assert.equal(first.requests.length, 0);
});

test('accepted snapshot continuity is independent of later caller mutation', async () => {
  const sdk = stub([
    functionReply('get_tactical_snapshot', {}),
    functionReply('evaluate_tactical_strategy', candidate),
    textReply(JSON.stringify(plan)),
  ]);
  const provider = createTacticalCoachGeminiProvider({ client: sdk.client });
  const [snapshot, evaluation] = results().map((result) => structuredClone(result));
  const acceptedSnapshot = structuredClone(snapshot);
  await provider.generate(call());
  await provider.generate(call([snapshot]));
  snapshot.result = deriveTacticalSnapshot(createGame());
  assert.equal(await provider.generate(call([snapshot, evaluation])), null);
  assert.equal(sdk.requests.length, 2);
  assert.deepEqual(acceptedSnapshot.result.score, 100);
});

test('tool states reject missing, multiple, wrong, malformed or conflicting function calls', async () => {
  const bad = [
    textReply('no call'),
    { candidates: [{ content: { role: 'model', parts: [
      { functionCall: { name: 'get_tactical_snapshot', args: {} } },
      { functionCall: { name: 'get_tactical_snapshot', args: {} } },
    ] } }] },
    functionReply('evaluate_tactical_strategy', {}),
    functionReply('get_tactical_snapshot', undefined),
    functionReply('get_tactical_snapshot', { state: {} }),
    { candidates: [{ content: { role: 'model', parts: [{ functionCall: {
      name: 'get_tactical_snapshot', args: {}, partialArgs: [{ jsonPath: '$' }],
    } }] } }] },
    { candidates: [
      { content: { role: 'model', parts: [{ functionCall: { name: 'get_tactical_snapshot', args: {} } }] } },
      { content: { role: 'model', parts: [{ functionCall: { name: 'get_tactical_snapshot', args: {} } }] } },
    ] },
    { candidates: [{ content: { role: 'model', parts: [
      { functionCall: { name: 'get_tactical_snapshot', args: {} } }, { text: 'final answer' },
    ] } }] },
    { candidates: [{ content: { role: 'model', parts: [
      { functionCall: { name: 'get_tactical_snapshot', args: {} }, text: 'final answer' },
    ] } }] },
    { candidates: [{ finishReason: 'MAX_TOKENS', content: { role: 'model', parts: [
      { functionCall: { name: 'get_tactical_snapshot', args: {} } },
    ] } }] },
  ];
  for (const response of bad) {
    const provider = createTacticalCoachGeminiProvider({ client: stub([response]).client });
    assert.equal(await provider.generate(call()), null);
  }
});

test('final JSON is parsed strictly and never repaired', async () => {
  for (const value of ['```json\n{}\n```', '{"summary":', '[]', 'null']) {
    const sdk = stub([functionReply('get_tactical_snapshot', {}), functionReply('evaluate_tactical_strategy', candidate), textReply(value)]);
    const provider = createTacticalCoachGeminiProvider({ client: sdk.client });
    const [snapshot, evaluation] = results();
    await provider.generate(call());
    await provider.generate(call([snapshot]));
    assert.equal(await provider.generate(call([snapshot, evaluation])), null);
  }
  const sdk = stub([functionReply('get_tactical_snapshot', {}), functionReply('evaluate_tactical_strategy', candidate), textReply('{"summary":"incomplete"}')]);
  const provider = createTacticalCoachGeminiProvider({ client: sdk.client });
  const [snapshot, evaluation] = results();
  await provider.generate(call());
  await provider.generate(call([snapshot]));
  assert.deepEqual(await provider.generate(call([snapshot, evaluation])), { type: 'final', output: { summary: 'incomplete' } });
});

test('stable SDK statuses and refusal finish reasons map to bounded provider failures', async () => {
  const cases = [
    [408, 'provider_timeout'], [504, 'provider_timeout'], [503, 'provider_unavailable'],
    [429, 'rate_limited'], [401, 'provider_not_configured'], [403, 'provider_not_configured'],
    [404, 'provider_not_configured'],
    [400, 'provider_rejected'],
  ];
  for (const [status, code] of cases) {
    const error = Object.assign(new Error('PRIVATE_PROVIDER_DETAIL'), { status });
    const provider = createTacticalCoachGeminiProvider({ client: stub([error]).client });
    assert.deepEqual(await provider.generate(call()), { type: 'failure', code });
  }
  const refused = { candidates: [{ finishReason: 'SAFETY', content: { role: 'model', parts: [] } }] };
  const provider = createTacticalCoachGeminiProvider({ client: stub([refused]).client });
  assert.deepEqual(await provider.generate(call()), { type: 'failure', code: 'provider_rejected' });
  const blocked = createTacticalCoachGeminiProvider({ client: stub([{ promptFeedback: { blockReason: 'OTHER' } }]).client });
  assert.deepEqual(await blocked.generate(call()), { type: 'failure', code: 'provider_rejected' });
  const timeout = Object.assign(new Error('PRIVATE_TIMEOUT'), { name: 'AbortError' });
  const timedOut = createTacticalCoachGeminiProvider({ client: stub([timeout]).client });
  assert.deepEqual(await timedOut.generate(call()), { type: 'failure', code: 'provider_timeout' });
});

test('missing server configuration stops without constructing a live client', async () => {
  const provider = createTacticalCoachGeminiProvider({ apiKey: '' });
  assert.deepEqual(await provider.generate(call()), { type: 'failure', code: 'provider_not_configured' });
});

test('orchestrator signal is forwarded exactly; aborted calls do not create adapter timeouts', async () => {
  const sdk = stub([functionReply('get_tactical_snapshot', {})]);
  const provider = createTacticalCoachGeminiProvider({ client: sdk.client });
  const signal = new AbortController().signal;
  await provider.generate(call([], signal));
  assert.equal(sdk.requests[0].config.abortSignal, signal);
  const controller = new AbortController();
  controller.abort();
  const aborted = Object.assign(new Error('caller abort'), { name: 'AbortError' });
  const abortingProvider = createTacticalCoachGeminiProvider({ client: stub([aborted]).client });
  await assert.rejects(abortingProvider.generate(call([], controller.signal)), aborted);
});

test('a transient SDK failure leaves tool continuation pending for the orchestrator retry', async () => {
  const unavailable = Object.assign(new Error('PRIVATE_OUTAGE'), { status: 503 });
  const sdk = stub([
    functionReply('get_tactical_snapshot', {}, 'snapshot-call'),
    unavailable,
    functionReply('evaluate_tactical_strategy', candidate),
  ]);
  const provider = createTacticalCoachGeminiProvider({ client: sdk.client });
  const [snapshot] = results();
  await provider.generate(call());
  assert.deepEqual(await provider.generate(call([snapshot])), { type: 'failure', code: 'provider_unavailable' });
  assert.deepEqual(await provider.generate(call([snapshot])), {
    type: 'tool_call', toolName: 'evaluate_tactical_strategy', arguments: candidate,
  });
  assert.deepEqual(sdk.requests[1].contents, sdk.requests[2].contents);
  assert.equal(sdk.requests[2].contents.length, 3);
});

test('separate providers have separate bounded histories and no cross-request call IDs', async () => {
  const first = stub([functionReply('get_tactical_snapshot', {}, 'PRIVATE_RUN_A_ID'), functionReply('evaluate_tactical_strategy', candidate)]);
  const second = stub([functionReply('get_tactical_snapshot', {})]);
  const runA = createTacticalCoachGeminiProvider({ client: first.client });
  const runB = createTacticalCoachGeminiProvider({ client: second.client });
  await runA.generate(call());
  await runA.generate(call([results()[0]]));
  await runB.generate(call());
  assert.deepEqual(second.requests[0].contents, [{ role: 'user', parts: [{ text: input().goal }] }]);
  assert.equal(JSON.stringify(second.requests[0]).includes('PRIVATE_RUN_A_ID'), false);
});

test('stubbed Gemini proposals complete through the authoritative orchestrator without adapter tool execution', async () => {
  const sdk = stub([
    functionReply('get_tactical_snapshot', {}, 'snapshot-call'),
    functionReply('evaluate_tactical_strategy', candidate, 'evaluation-call'),
    textReply(JSON.stringify(plan)),
  ]);
  const provider = createTacticalCoachGeminiProvider({ client: sdk.client });
  let tools = 0;
  const result = await runTacticalCoach(input(), {
    provider,
    toolExecutor(name, args, context) { tools++; return invokeTacticalTool(name, args, context); },
  });
  assert.equal(tools, 2);
  assert.equal(sdk.requests.length, 3);
  assert.deepEqual(result.plan, plan);
  assert.deepEqual(result.evidence, [
    { source: 'tactical_snapshot', fact: 'lives', value: 1 },
    { source: 'strategy_evaluation', fact: 'riskLevel', value: 'high' },
  ]);
});

test('orchestrator rejects a schema-shaped Gemini final that changes the evaluated candidate', async () => {
  const sdk = stub([
    functionReply('get_tactical_snapshot', {}, 'snapshot-call'),
    functionReply('evaluate_tactical_strategy', candidate, 'evaluation-call'),
    textReply(JSON.stringify({ ...plan, strategy: 'aggressive' })),
  ]);
  const provider = createTacticalCoachGeminiProvider({ client: sdk.client });
  let tools = 0;
  await assert.rejects(runTacticalCoach(input(), {
    provider,
    toolExecutor(name, args, context) { tools++; return invokeTacticalTool(name, args, context); },
  }), (error) => error instanceof TacticalCoachError && error.code === 'invalid_final_output');
  assert.equal(tools, 2);
  assert.equal(sdk.requests.length, 3);
});

test('malformed Gemini tool output stops through the orchestrator without local tool execution', async () => {
  const provider = createTacticalCoachGeminiProvider({ client: stub([textReply('not a function call')]).client });
  let tools = 0;
  await assert.rejects(runTacticalCoach(input(), {
    provider,
    toolExecutor() { tools++; throw new Error('must not execute'); },
  }), (error) => error instanceof TacticalCoachError && error.code === 'malformed_model_output');
  assert.equal(tools, 0);
});
