import { ContractError } from '../contracts.js';
import { getReadOnlyToolDeclarations } from '../tools.js';
import {
  createAiFailure,
  normalizeProviderOutput,
  parseAiToolResults,
  parseAiProviderRequest,
} from './contracts.js';

const PROVIDER_ID = 'fake';
const MODEL_ID = 'fake-deterministic-v1';

function cloneDeclarations(declarations) {
  const expected = getReadOnlyToolDeclarations();
  if (JSON.stringify(declarations) !== JSON.stringify(expected)) {
    throw new ContractError('INVALID_INPUT', 'Unexpected tool declarations.');
  }
  return structuredClone(expected);
}

export function createFakeProvider({ outcomes = [] } = {}) {
  const scriptedOutcomes = structuredClone(outcomes);
  const calls = [];

  return {
    provider: PROVIDER_ID,
    model: MODEL_ID,
    calls,
    async generate(request, toolDeclarations = getReadOnlyToolDeclarations(), toolResults = []) {
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

      if (scriptedOutcome?.type === 'failure') {
        return createAiFailure(scriptedOutcome.code);
      }

      try {
        return {
          ok: true,
          provider: PROVIDER_ID,
          model: MODEL_ID,
          output: normalizeProviderOutput(scriptedOutcome, declarations),
        };
      } catch (error) {
        if (error instanceof ContractError && error.code === 'UNKNOWN_TOOL') {
          return createAiFailure('UNKNOWN_TOOL');
        }
        return createAiFailure('MALFORMED_PROVIDER_OUTPUT');
      }
    },
  };
}