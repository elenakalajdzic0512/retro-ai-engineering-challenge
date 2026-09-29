import { ContractError, parseAiRequest, parsePublicAiResponse, type AiRequest, type PublicAiResponse } from '../contracts.js';
import { getReadOnlyToolDeclarations, invokeReadOnlyTool, type ReadOnlyToolDeclaration } from '../tools.js';
import {
  GAME_ASSISTANT_OPERATION,
  createAiFailure,
  parseAiProviderResult,
  type AiProviderResult,
  type NormalizedProviderOutput,
  type ToolDeclaration,
} from './contracts.js';

const TIMEOUT_MS = 5000;
const MAX_OUTPUT_TOKENS = 200;
const MAX_TOOL_CALLS = 1;
const MAX_TOTAL_ATTEMPTS = 2;
const BASE_BACKOFF_MS = 100;

class ProviderTimeoutError extends Error {
  constructor() {
    super('Provider interaction timed out.');
    this.name = 'TimeoutError';
  }
}

const PUBLIC_FAILURE_MESSAGES: Readonly<Record<string, string>> = Object.freeze({
  INVALID_REQUEST: 'Invalid request',
  MALFORMED_PROVIDER_OUTPUT: 'AI response could not be validated',
  UNKNOWN_TOOL: 'AI proposed an unsupported tool',
  MISSING_TOOL_CALL: 'AI did not provide a required tool call',
  PROVIDER_UNAVAILABLE: 'AI service is unavailable',
  TIMEOUT: 'AI request timed out',
  POLICY_REFUSAL: 'AI request was refused',
  NOT_CONFIGURED: 'AI service is not configured',
  TOOL_EXECUTION_FAILED: 'Game snapshot could not be read',
  TOOL_STEP_LIMIT: 'AI response exceeded the allowed tool steps',
});

const PUBLIC_FAILURE_STATUSES: Readonly<Record<string, number>> = Object.freeze({
  INVALID_REQUEST: 400,
  MALFORMED_PROVIDER_OUTPUT: 502,
  UNKNOWN_TOOL: 502,
  MISSING_TOOL_CALL: 502,
  PROVIDER_UNAVAILABLE: 503,
  TIMEOUT: 504,
  POLICY_REFUSAL: 422,
  NOT_CONFIGURED: 503,
  TOOL_EXECUTION_FAILED: 502,
  TOOL_STEP_LIMIT: 502,
});

type OrchestrationErrorCode = keyof typeof PUBLIC_FAILURE_MESSAGES;

interface ProviderGenerateOptions { signal: AbortSignal }

interface AiProvider {
  generate(
    request: unknown,
    toolDeclarations: readonly ReadOnlyToolDeclaration[],
    toolResults: readonly unknown[],
    options: ProviderGenerateOptions,
  ): unknown | PromiseLike<unknown>;
}

type ToolExecutor = (name: string, args: unknown, context: unknown) => unknown;
type Clock = () => number;
type Sleeper = (milliseconds: number) => Promise<void>;
type Jitter = () => number;

interface RunGameAssistantOptions {
  provider?: AiProvider | null;
  toolExecutor?: ToolExecutor;
  now?: Clock;
  sleep?: Sleeper;
  jitter?: Jitter;
}

function defaultSleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function waitForProviderResult(promise: unknown | PromiseLike<unknown>, milliseconds: number, controller: AbortController): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      controller.abort();
      reject(new ProviderTimeoutError());
    }, milliseconds);
    Promise.resolve(promise).then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error: unknown) => { clearTimeout(timer); reject(error); },
    );
  });
}

function hasNamedProperty(value: unknown, property: string): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && property in value;
}

function parseFinalOutput(output: unknown): PublicAiResponse {
  try {
    return parsePublicAiResponse(output);
  } catch (error: unknown) {
    if (error instanceof ContractError) throw new AiOrchestrationError('MALFORMED_PROVIDER_OUTPUT');
    throw error;
  }
}

export class AiOrchestrationError extends Error {
  code: OrchestrationErrorCode;

  constructor(code: string) {
    const safeCode: OrchestrationErrorCode = Object.hasOwn(PUBLIC_FAILURE_MESSAGES, code)
      ? code as OrchestrationErrorCode
      : 'PROVIDER_UNAVAILABLE';
    super(PUBLIC_FAILURE_MESSAGES[safeCode]);
    this.name = 'AiOrchestrationError';
    this.code = safeCode;
  }
}

export async function runGameAssistant(
  request: unknown,
  { provider, toolExecutor = invokeReadOnlyTool, now = () => performance.now(), sleep = defaultSleep, jitter = Math.random }: RunGameAssistantOptions = {},
): Promise<PublicAiResponse> {
  const input: AiRequest = parseAiRequest(request);
  if (!provider || typeof provider.generate !== 'function') throw new AiOrchestrationError('NOT_CONFIGURED');
  const activeProvider = provider;
  const toolDeclarations = getReadOnlyToolDeclarations();
  const deadline = now() + TIMEOUT_MS;
  let totalAttempts = 0;
  let toolCalls = 0;

  const providerRequest = { operation: GAME_ASSISTANT_OPERATION, input, timeoutMs: TIMEOUT_MS, maxOutputTokens: MAX_OUTPUT_TOKENS };

  async function generate(toolResults: readonly unknown[] = []): Promise<NormalizedProviderOutput> {
    while (true) {
      const remainingMs = deadline - now();
      if (remainingMs <= 0 || totalAttempts >= MAX_TOTAL_ATTEMPTS) throw new AiOrchestrationError('TIMEOUT');
      totalAttempts += 1;
      const controller = new AbortController();
      let rawResult: unknown;
      try {
        const pendingResult = activeProvider.generate(providerRequest, toolDeclarations, toolResults, { signal: controller.signal });
        rawResult = await waitForProviderResult(pendingResult, remainingMs, controller);
      } catch (error: unknown) {
        rawResult = createAiFailure(hasNamedProperty(error, 'name') && error.name === 'TimeoutError' ? 'TIMEOUT' : 'PROVIDER_UNAVAILABLE');
      }

      let result: AiProviderResult;
      try {
        result = parseAiProviderResult(rawResult, toolDeclarations);
      } catch (error: unknown) {
        if (hasNamedProperty(error, 'code') && error.code === 'UNKNOWN_TOOL') throw new AiOrchestrationError('UNKNOWN_TOOL');
        throw new AiOrchestrationError('MALFORMED_PROVIDER_OUTPUT');
      }
      if (result.ok) return result.output;
      if (!result.retryable || totalAttempts >= MAX_TOTAL_ATTEMPTS) throw new AiOrchestrationError(result.code);

      const jitterValue = jitter();
      const safeJitter = Number.isFinite(jitterValue) ? Math.max(0, Math.min(0.999, jitterValue)) : 0;
      const delayMs = BASE_BACKOFF_MS + Math.floor(safeJitter * BASE_BACKOFF_MS);
      if (deadline - now() <= delayMs) throw new AiOrchestrationError('TIMEOUT');
      await sleep(delayMs);
      if (deadline - now() <= 0) throw new AiOrchestrationError('TIMEOUT');
    }
  }

  let output = await generate();
  if (output.kind === 'final') return parseFinalOutput(output.output);
  toolCalls += 1;
  if (toolCalls > MAX_TOOL_CALLS || totalAttempts >= MAX_TOTAL_ATTEMPTS) throw new AiOrchestrationError('TOOL_STEP_LIMIT');

  let toolResult: { toolName: 'get_current_game_snapshot'; result: unknown };
  try {
    const value = toolExecutor(output.toolName, output.arguments, { snapshot: input });
    toolResult = { toolName: output.toolName, result: value };
  } catch {
    throw new AiOrchestrationError('TOOL_EXECUTION_FAILED');
  }

  output = await generate([toolResult]);
  if (output.kind === 'tool_call') {
    toolCalls += 1;
    if (toolCalls > MAX_TOOL_CALLS) throw new AiOrchestrationError('TOOL_STEP_LIMIT');
    throw new AiOrchestrationError('TOOL_STEP_LIMIT');
  }
  return parseFinalOutput(output.output);
}

export function getAiOrchestrationErrorResponse(error: unknown): { error: { code: OrchestrationErrorCode; message: string } } {
  const orchestrationError = error instanceof AiOrchestrationError ? error : new AiOrchestrationError('AI_UNAVAILABLE');
  return { error: { code: orchestrationError.code, message: orchestrationError.message } };
}

export function getAiOrchestrationHttpStatus(error: unknown): number {
  return error instanceof AiOrchestrationError ? PUBLIC_FAILURE_STATUSES[error.code] ?? 503 : 503;
}
