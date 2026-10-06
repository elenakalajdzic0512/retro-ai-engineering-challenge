import {
  parseCandidateStrategy,
  parseTacticalPlanForCandidate,
  parseTacticalRequest,
  type CandidateStrategy,
  type EvidenceReference,
  type StrategyEvaluation,
  type TacticalPlan,
  type TacticalRequest,
  type TacticalSnapshot,
} from './contracts.js';
import type { TacticalProvider, TacticalProviderFailureCode, TacticalProviderOutcome } from './provider-contracts.js';
import {
  createTacticalToolContext,
  getTacticalToolDeclarations,
  invokeTacticalTool,
  parseTacticalToolResult,
  TacticalToolError,
  type TacticalToolContext,
  type TacticalToolName,
  type TacticalToolResult,
} from './tools.js';

export const MAX_AGENT_STEPS = 3;
export const MAX_TOOL_CALLS = 2;
export const MAX_PROVIDER_CALLS = 4;
export const PER_CALL_TIMEOUT_MS = 5000;
export const TOTAL_AGENT_DEADLINE_MS = 22000;
export const LOCAL_TOOL_BUDGET_MS = 100;
export const RETRY_BACKOFF_MS = 100;
const MAX_BODY_BYTES = 4096;

export type TacticalAgentState = 'NEED_SNAPSHOT' | 'NEED_EVALUATION' | 'NEED_FINAL';
type ProviderProposal = Exclude<TacticalProviderOutcome, { type: 'failure' }>;
export type TacticalCoachErrorCode =
  | 'invalid_input' | 'unknown_tool' | 'forbidden_tool' | 'invalid_tool_arguments'
  | 'invalid_tool_result' | 'tool_failure' | 'tool_timeout'
  | 'provider_timeout' | 'provider_unavailable' | 'rate_limited'
  | 'provider_rejected' | 'provider_not_configured'
  | 'malformed_model_output' | 'missing_required_evidence' | 'repeated_action'
  | 'step_limit' | 'tool_call_limit' | 'provider_call_budget' | 'deadline'
  | 'invalid_final_output' | 'candidate_rejected' | 'cancelled';

const PUBLIC_MESSAGES: Readonly<Record<TacticalCoachErrorCode, string>> = Object.freeze({
  invalid_input: 'Tactical request is invalid.',
  unknown_tool: 'Tactical Coach proposed an unknown tool.',
  forbidden_tool: 'Tactical Coach proposed a forbidden action.',
  invalid_tool_arguments: 'Tactical tool arguments are invalid.',
  invalid_tool_result: 'Tactical tool result is invalid.',
  tool_failure: 'Tactical tool could not complete.',
  tool_timeout: 'Tactical tool exceeded its time limit.',
  provider_timeout: 'Tactical Coach provider timed out.',
  provider_unavailable: 'Tactical Coach provider is unavailable.',
  rate_limited: 'Tactical Coach provider is rate limited.',
  provider_rejected: 'The AI provider could not complete this request.',
  provider_not_configured: 'The Tactical Coach provider is not configured.',
  malformed_model_output: 'Tactical Coach response is malformed.',
  missing_required_evidence: 'Tactical Coach did not gather required evidence.',
  repeated_action: 'Tactical Coach repeated an action.',
  step_limit: 'Tactical Coach exceeded its allowed steps.',
  tool_call_limit: 'Tactical Coach exceeded its tool limit.',
  provider_call_budget: 'Tactical Coach exceeded its provider call limit.',
  deadline: 'Tactical Coach exceeded its deadline.',
  invalid_final_output: 'Tactical Coach plan is invalid.',
  candidate_rejected: 'Tactical strategy was rejected.',
  cancelled: 'Tactical Coach request was cancelled.',
});

export class TacticalCoachError extends Error {
  constructor(public readonly code: TacticalCoachErrorCode) {
    super(PUBLIC_MESSAGES[code]);
    this.name = 'TacticalCoachError';
  }
}

export function getTacticalCoachErrorResponse(error: unknown): { error: { code: TacticalCoachErrorCode; message: string } } {
  const code = error instanceof TacticalCoachError && Object.hasOwn(PUBLIC_MESSAGES, error.code)
    ? error.code : 'provider_unavailable';
  return { error: { code, message: PUBLIC_MESSAGES[code] } };
}

export interface MaterializedEvidence extends EvidenceReference { value: string | number | boolean }
export interface TacticalCoachSuccess { plan: TacticalPlan; evidence: MaterializedEvidence[] }

interface Scheduler {
  set(milliseconds: number, callback: () => void): unknown;
  clear(handle: unknown): void;
}

const defaultScheduler: Scheduler = {
  set(milliseconds, callback) { return setTimeout(callback, milliseconds); },
  clear(handle) { clearTimeout(handle as NodeJS.Timeout); },
};

export interface RunTacticalCoachOptions {
  provider: TacticalProvider | null;
  signal?: AbortSignal;
  now?: () => number;
  sleep?: (milliseconds: number) => Promise<void>;
  scheduler?: Scheduler;
  toolExecutor?: typeof invokeTacticalTool;
}

class AttemptTimeout extends Error {}
class RunCancelled extends Error {}
class DeadlineElapsed extends Error {}
class ProviderRaised extends Error {}

function fail(code: TacticalCoachErrorCode): never { throw new TacticalCoachError(code); }

function exactObject(value: unknown, fields: readonly string[]): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) {
    fail('malformed_model_output');
  }
  const keys = Reflect.ownKeys(value);
  if (keys.length !== fields.length || fields.some((field) => !keys.includes(field))) fail('malformed_model_output');
  const result: Record<string, unknown> = {};
  for (const field of fields) {
    const descriptor = Object.getOwnPropertyDescriptor(value, field);
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) fail('malformed_model_output');
    result[field] = descriptor.value;
  }
  return result;
}

function parseProviderOutcome(value: unknown): TacticalProviderOutcome {
  try {
    if (value === null || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) {
      fail('malformed_model_output');
    }
    const type = Object.getOwnPropertyDescriptor(value, 'type');
    if (!type || !Object.hasOwn(type, 'value')) fail('malformed_model_output');
    if (type.value === 'tool_call') {
      const data = exactObject(value, ['type', 'toolName', 'arguments']);
      if (typeof data.toolName !== 'string') fail('malformed_model_output');
      return { type: 'tool_call', toolName: data.toolName, arguments: data.arguments };
    }
    if (type.value === 'final') {
      const data = exactObject(value, ['type', 'output']);
      return { type: 'final', output: data.output };
    }
    if (type.value === 'failure') {
      const data = exactObject(value, ['type', 'code']);
      if (data.code !== 'provider_timeout' && data.code !== 'provider_unavailable' && data.code !== 'rate_limited' &&
          data.code !== 'provider_rejected' && data.code !== 'provider_not_configured') {
        fail('malformed_model_output');
      }
      return { type: 'failure', code: data.code as TacticalProviderFailureCode };
    }
    fail('malformed_model_output');
  } catch {
    fail('malformed_model_output');
  }
}

function isRetryableProviderFailure(code: TacticalProviderFailureCode): boolean {
  return code === 'provider_timeout' || code === 'provider_unavailable' || code === 'rate_limited';
}

function parseToolName(name: string): TacticalToolName {
  if (name === 'get_tactical_snapshot' || name === 'evaluate_tactical_strategy') return name;
  if (name === 'move_paddle' || name === 'launch_game' || name === 'set_score' || name === 'run_shell' || name === 'fetch_url') {
    fail('forbidden_tool');
  }
  fail('unknown_tool');
}

function parseToolArguments(name: TacticalToolName, args: unknown): CandidateStrategy | Record<string, never> {
  if (name === 'evaluate_tactical_strategy') {
    try { return parseCandidateStrategy(args); } catch { fail('invalid_tool_arguments'); }
  }
  try {
    if (args === null || typeof args !== 'object' || Object.getPrototypeOf(args) !== Object.prototype ||
        Reflect.ownKeys(args).length !== 0) fail('invalid_tool_arguments');
    return {};
  } catch { fail('invalid_tool_arguments'); }
}

export function createTacticalActionTracker(): {
  register(state: TacticalAgentState, name: TacticalToolName, args: CandidateStrategy | Record<string, never>): void;
} {
  const seen = new Set<string>();
  return {
    register(state, name, args) {
      const canonical = parseToolArguments(name, args);
      const key = JSON.stringify([state, name, canonical]);
      if (seen.has(key)) fail('repeated_action');
      seen.add(key);
    },
  };
}

export function createTacticalProviderAttemptBudget(): { readonly count: number; reserve(): void } {
  let count = 0;
  return {
    get count() { return count; },
    reserve() {
      if (count >= MAX_PROVIDER_CALLS) fail('provider_call_budget');
      count++;
    },
  };
}

function checkAbortAndDeadline(signal: AbortSignal | undefined, now: () => number, deadline: number): number {
  if (signal?.aborted) fail('cancelled');
  const remaining = deadline - now();
  if (remaining <= 0) fail('deadline');
  return remaining;
}

async function providerAttempt(
  provider: TacticalProvider,
  input: TacticalRequest,
  toolResults: TacticalToolResult[],
  timeoutMs: number,
  signal: AbortSignal | undefined,
  scheduler: Scheduler,
): Promise<unknown> {
  const controller = new AbortController();
  let cancel: (() => void) | undefined;
  let timer: unknown;
  try {
    let pending: Promise<unknown>;
    try {
      pending = provider.generate({
        input: parseTacticalRequest(input),
        toolDeclarations: getTacticalToolDeclarations(),
        toolResults: toolResults.map(parseTacticalToolResult),
        timeoutMs,
        signal: controller.signal,
      });
    } catch { throw new ProviderRaised(); }
    return await new Promise((resolve, reject) => {
      cancel = () => { controller.abort(); reject(new RunCancelled()); };
      if (signal?.aborted) { cancel(); return; }
      signal?.addEventListener('abort', cancel, { once: true });
      Promise.resolve(pending).then(resolve, reject);
      timer = scheduler.set(timeoutMs, () => { controller.abort(); reject(new AttemptTimeout()); });
    }).catch((error: unknown) => {
      if (error instanceof AttemptTimeout || error instanceof RunCancelled) throw error;
      throw new ProviderRaised();
    });
  } finally {
    if (timer !== undefined) scheduler.clear(timer);
    if (cancel) signal?.removeEventListener('abort', cancel);
  }
}

async function boundedSleep(
  sleep: (milliseconds: number) => Promise<void>,
  milliseconds: number,
  remaining: number,
  signal: AbortSignal | undefined,
  scheduler: Scheduler,
): Promise<void> {
  let cancel: (() => void) | undefined;
  let timer: unknown;
  try {
    const pending = sleep(milliseconds);
    await new Promise<void>((resolve, reject) => {
      cancel = () => reject(new RunCancelled());
      if (signal?.aborted) { cancel(); return; }
      signal?.addEventListener('abort', cancel, { once: true });
      Promise.resolve(pending).then(resolve, reject);
      timer = scheduler.set(remaining, () => reject(new DeadlineElapsed()));
    });
  } finally {
    if (timer !== undefined) scheduler.clear(timer);
    if (cancel) signal?.removeEventListener('abort', cancel);
  }
}

function materializeEvidence(plan: TacticalPlan, snapshot: TacticalSnapshot, evaluation: StrategyEvaluation): MaterializedEvidence[] {
  const snapshotFacts: Record<string, unknown> = {
    lives: snapshot.lives,
    bricksRemaining: snapshot.bricksRemaining,
    'bricksByZone.left': snapshot.bricksByZone.left,
    'bricksByZone.center': snapshot.bricksByZone.center,
    'bricksByZone.right': snapshot.bricksByZone.right,
    'armoredByZone.left': snapshot.armoredByZone.left,
    'armoredByZone.center': snapshot.armoredByZone.center,
    'armoredByZone.right': snapshot.armoredByZone.right,
    'ballDirection.horizontal': snapshot.ballDirection.horizontal,
    'ballDirection.vertical': snapshot.ballDirection.vertical,
    'shield.zone': snapshot.shield.zone,
    'shield.direction': snapshot.shield.direction,
    portalState: snapshot.portalState,
  };
  const evaluationFacts: Record<string, unknown> = {
    targetOpportunity: evaluation.targetOpportunity,
    armoredTargets: evaluation.armoredTargets,
    riskLevel: evaluation.riskLevel,
    paddleAligned: evaluation.paddleAligned,
    shieldInTargetZone: evaluation.shieldInTargetZone,
    portalAvailable: evaluation.portalAvailable,
    routeUsable: evaluation.routeUsable,
  };
  return plan.evidence.map(({ source, fact }) => {
    const facts = source === 'tactical_snapshot' ? snapshotFacts : evaluationFacts;
    if (!Object.hasOwn(facts, fact)) fail('invalid_final_output');
    const value = facts[fact];
    if (typeof value !== 'string' && typeof value !== 'boolean' &&
        !(typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value))) {
      fail('invalid_final_output');
    }
    return { source, fact, value: value as string | number | boolean };
  });
}

export async function runTacticalCoach(request: unknown, options: RunTacticalCoachOptions): Promise<TacticalCoachSuccess> {
  const now = options.now ?? (() => performance.now());
  const scheduler = options.scheduler ?? defaultScheduler;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const signal = options.signal;
  const deadline = now() + TOTAL_AGENT_DEADLINE_MS;
  let input: TacticalRequest;
  try {
    input = parseTacticalRequest(request);
    if (Buffer.byteLength(JSON.stringify(input), 'utf8') > MAX_BODY_BYTES) fail('invalid_input');
  } catch { fail('invalid_input'); }
  checkAbortAndDeadline(signal, now, deadline);
  if (!options.provider || typeof options.provider.generate !== 'function') fail('provider_unavailable');
  const provider = options.provider;
  const context = createTacticalToolContext(input.state);
  const toolExecutor = options.toolExecutor ?? invokeTacticalTool;
  const attempts = createTacticalProviderAttemptBudget();
  const actions = createTacticalActionTracker();
  let retryUsed = false;
  let steps = 0;
  let toolCalls = 0;
  const results: TacticalToolResult[] = [];

  async function nextOutput(state: TacticalAgentState): Promise<ProviderProposal> {
    if (steps >= MAX_AGENT_STEPS) fail('step_limit');
    while (true) {
      const remaining = checkAbortAndDeadline(signal, now, deadline);
      attempts.reserve();
      let output: TacticalProviderOutcome;
      try {
        const raw = await providerAttempt(provider, input, results, Math.min(PER_CALL_TIMEOUT_MS, remaining), signal, scheduler);
        checkAbortAndDeadline(signal, now, deadline);
        output = parseProviderOutcome(raw);
      } catch (error) {
        if (error instanceof RunCancelled) fail('cancelled');
        if (error instanceof AttemptTimeout) {
          checkAbortAndDeadline(signal, now, deadline);
          output = { type: 'failure', code: 'provider_timeout' };
        } else if (error instanceof TacticalCoachError) {
          throw error;
        } else {
          checkAbortAndDeadline(signal, now, deadline);
          output = { type: 'failure', code: 'provider_unavailable' };
        }
      }
      if (output.type !== 'failure') return output;
      if (!isRetryableProviderFailure(output.code)) fail(output.code);
      if (retryUsed) fail(output.code);
      retryUsed = true;
      if (attempts.count >= MAX_PROVIDER_CALLS) fail('provider_call_budget');
      const beforeBackoff = checkAbortAndDeadline(signal, now, deadline);
      if (beforeBackoff <= RETRY_BACKOFF_MS) fail('deadline');
      try {
        await boundedSleep(sleep, RETRY_BACKOFF_MS, beforeBackoff, signal, scheduler);
      } catch (error) {
        if (error instanceof RunCancelled) fail('cancelled');
        if (error instanceof DeadlineElapsed) fail('deadline');
        fail('provider_unavailable');
      }
      checkAbortAndDeadline(signal, now, deadline);
    }
  }

  function execute(
    state: 'NEED_SNAPSHOT' | 'NEED_EVALUATION',
    proposal: Extract<TacticalProviderOutcome, { type: 'tool_call' }>,
  ): TacticalToolResult {
    const name = parseToolName(proposal.toolName);
    const expected = state === 'NEED_SNAPSHOT' ? 'get_tactical_snapshot' : 'evaluate_tactical_strategy';
    if (name !== expected) fail('step_limit');
    const args = parseToolArguments(name, proposal.arguments);
    if (toolCalls >= MAX_TOOL_CALLS) fail('tool_call_limit');
    checkAbortAndDeadline(signal, now, deadline);
    actions.register(state, name, args);
    const started = now();
    let raw: unknown;
    try { raw = toolExecutor(name, args, context as TacticalToolContext); }
    catch (error) {
      if (error instanceof TacticalToolError) fail(error.code);
      fail('tool_failure');
    }
    if (signal?.aborted) fail('cancelled');
    const finished = now();
    if (finished >= deadline) fail('deadline');
    if (finished - started > LOCAL_TOOL_BUDGET_MS) fail('tool_timeout');
    let validated: TacticalToolResult;
    try { validated = parseTacticalToolResult(raw); }
    catch { fail('invalid_tool_result'); }
    if (validated.toolName !== name) fail('invalid_tool_result');
    toolCalls++;
    results.push(validated);
    steps++;
    checkAbortAndDeadline(signal, now, deadline);
    return validated;
  }

  const snapshotOutput = await nextOutput('NEED_SNAPSHOT');
  if (snapshotOutput.type === 'final') fail('missing_required_evidence');
  const snapshotEnvelope = execute('NEED_SNAPSHOT', snapshotOutput);
  if (snapshotEnvelope.toolName !== 'get_tactical_snapshot') fail('invalid_tool_result');

  const evaluationOutput = await nextOutput('NEED_EVALUATION');
  if (evaluationOutput.type === 'final') fail('missing_required_evidence');
  const evaluationEnvelope = execute('NEED_EVALUATION', evaluationOutput);
  if (evaluationEnvelope.toolName !== 'evaluate_tactical_strategy') fail('invalid_tool_result');
  const candidate = parseToolArguments('evaluate_tactical_strategy', evaluationOutput.arguments) as CandidateStrategy;
  if (!evaluationEnvelope.result.candidateAccepted) fail('candidate_rejected');

  const finalOutput = await nextOutput('NEED_FINAL');
  if (finalOutput.type === 'tool_call') fail('tool_call_limit');
  checkAbortAndDeadline(signal, now, deadline);
  let plan: TacticalPlan;
  try { plan = parseTacticalPlanForCandidate(finalOutput.output, candidate); }
  catch { fail('invalid_final_output'); }
  checkAbortAndDeadline(signal, now, deadline);
  const evidence = materializeEvidence(plan, snapshotEnvelope.result, evaluationEnvelope.result);
  const success = { plan, evidence };
  if (Buffer.byteLength(JSON.stringify(success), 'utf8') > MAX_BODY_BYTES) fail('invalid_final_output');
  checkAbortAndDeadline(signal, now, deadline);
  steps++;
  return success;
}
