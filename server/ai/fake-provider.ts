import { ContractError } from '../contracts.js';
import { getReadOnlyToolDeclarations, type ReadOnlyToolDeclaration } from '../tools.js';
import {
  createAiFailure,
  normalizeProviderOutput,
  parseAiToolResults,
  parseAiProviderRequest,
  type AiProviderRequest,
  type AiProviderResult,
  type AiToolResult,
} from './contracts.js';

const PROVIDER_ID = 'fake';
const MODEL_ID = 'fake-deterministic-v1';

export interface FakeProviderCall {
  provider: typeof PROVIDER_ID;
  model: typeof MODEL_ID;
  operation: AiProviderRequest['operation'];
  input: AiProviderRequest['input'];
  toolDeclarations: ReadOnlyToolDeclaration[];
  toolResults: AiToolResult[];
}

export interface FakeProviderOptions {
  outcomes?: readonly unknown[];
}

export interface FakeProvider {
  provider: typeof PROVIDER_ID;
  model: typeof MODEL_ID;
  calls: FakeProviderCall[];
  generate(
    request: unknown,
    toolDeclarations?: readonly ReadOnlyToolDeclaration[],
    toolResults?: readonly unknown[],
  ): Promise<AiProviderResult>;
}

function cloneDeclarations(declarations: readonly ReadOnlyToolDeclaration[]): ReadOnlyToolDeclaration[] {
  const expected = getReadOnlyToolDeclarations();
  if (JSON.stringify(declarations) !== JSON.stringify(expected)) {
    throw new ContractError('INVALID_INPUT', 'Unexpected tool declarations.');
  }
  return structuredClone(expected);
}

function isFailureOutcome(value: unknown): value is { type: 'failure'; code: unknown } {
  return value !== null && typeof value === 'object' && (value as Record<string, unknown>).type === 'failure';
}

export function createFakeProvider({ outcomes = [] }: FakeProviderOptions = {}): FakeProvider {
  const scriptedOutcomes = structuredClone([...outcomes]);
  const calls: FakeProviderCall[] = [];

  return {
    provider: PROVIDER_ID,
    model: MODEL_ID,
    calls,
    async generate(
      request: unknown,
      toolDeclarations = getReadOnlyToolDeclarations(),
      toolResults: readonly unknown[] = [],
    ): Promise<AiProviderResult> {
      const validatedRequest = parseAiProviderRequest(request);
      const declarations = cloneDeclarations(toolDeclarations);
      const validatedToolResults = parseAiToolResults(toolResults);
      calls.push({
        provider: PROVIDER_ID,
        model: MODEL_ID,
        operation: validatedRequest.operation,
        input: structuredClone(validatedRequest.input),
        toolDeclarations: structuredClone(declarations),
        toolResults: structuredClone(validatedToolResults),
      });

      const scriptedOutcome = scriptedOutcomes.shift();
      if (scriptedOutcome === undefined) {
        return createAiFailure('PROVIDER_UNAVAILABLE');
      }

      if (isFailureOutcome(scriptedOutcome)) {
        return createAiFailure(scriptedOutcome.code);
      }

      try {
        return {
          ok: true,
          provider: PROVIDER_ID,
          model: MODEL_ID,
          output: normalizeProviderOutput(scriptedOutcome, declarations),
        };
      } catch (error: unknown) {
        if (error instanceof ContractError && error.code === 'UNKNOWN_TOOL') {
          return createAiFailure('UNKNOWN_TOOL');
        }
        return createAiFailure('MALFORMED_PROVIDER_OUTPUT');
      }
    },
  };
}
