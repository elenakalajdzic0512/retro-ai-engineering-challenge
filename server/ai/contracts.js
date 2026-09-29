import {
  ContractError,
  parseAiRequest,
  parseGameSnapshot,
  parseGetCurrentGameSnapshotArguments,
  parsePublicAiResponse,
} from '../contracts.js';

export const GAME_ASSISTANT_OPERATION = 'game-assistant';
export const MAX_AI_TIMEOUT_MS = 30_000;
export const MAX_OUTPUT_TOKENS = 1_000;
export const AI_FAILURE_RETRYABILITY = Object.freeze({
  INVALID_REQUEST: false,
  MALFORMED_PROVIDER_OUTPUT: false,
  UNKNOWN_TOOL: false,
  MISSING_TOOL_CALL: false,
  PROVIDER_UNAVAILABLE: true,
  TIMEOUT: true,
  POLICY_REFUSAL: false,
  NOT_CONFIGURED: false,
});

export function createAiFailure(code) {
  if (typeof code !== 'string' || !Object.hasOwn(AI_FAILURE_RETRYABILITY, code)) {
    return { ok: false, code: 'MALFORMED_PROVIDER_OUTPUT', retryable: false };
  }
  return { ok: false, code, retryable: AI_FAILURE_RETRYABILITY[code] };
}

function fail(code, message) {
  throw new ContractError(code, message);
}

function readExactObject(value, fields, code, label) {
  if (value === null || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) {
    fail(code, `${label} must be a plain object.`);
  }
  const keys = Reflect.ownKeys(value);
  if (keys.length !== fields.length || fields.some((field) => !keys.includes(field))) {
    fail(code, `${label} must contain exactly: ${fields.join(', ')}.`);
  }
  const result = {};
  for (const field of fields) {
    const descriptor = Object.getOwnPropertyDescriptor(value, field);
    if (!Object.hasOwn(descriptor, 'value')) fail(code, `${label}.${field} must be a data property.`);
    result[field] = descriptor.value;
  }
  return result;
}

export function parseAiProviderRequest(request) {
  const values = readExactObject(
    request,
    ['operation', 'input', 'timeoutMs', 'maxOutputTokens'],
    'INVALID_INPUT',
    'AI request',
  );
  if (values.operation !== GAME_ASSISTANT_OPERATION) {
    fail('INVALID_INPUT', `operation must be ${GAME_ASSISTANT_OPERATION}.`);
  }
  const input = readExactObject(values.input, ['question', 'snapshot'], 'INVALID_INPUT', 'AI request input');
  const validatedInput = parseAiRequest(input);
  if (!Number.isInteger(values.timeoutMs) || values.timeoutMs < 1 || values.timeoutMs > MAX_AI_TIMEOUT_MS) {
    fail('INVALID_INPUT', `timeoutMs must be an integer from 1 to ${MAX_AI_TIMEOUT_MS}.`);
  }
  if (!Number.isInteger(values.maxOutputTokens) || values.maxOutputTokens < 1 || values.maxOutputTokens > MAX_OUTPUT_TOKENS) {
    fail('INVALID_INPUT', `maxOutputTokens must be an integer from 1 to ${MAX_OUTPUT_TOKENS}.`);
  }
  return {
    operation: values.operation,
    input: validatedInput,
    timeoutMs: values.timeoutMs,
    maxOutputTokens: values.maxOutputTokens,
  };
}

export function normalizeProviderOutput(output, toolDeclarations) {
  if (output === null || typeof output !== 'object' || Object.getPrototypeOf(output) !== Object.prototype) {
    fail('MALFORMED_OUTPUT', 'Provider output must be a plain object.');
  }
  const typeDescriptor = Object.getOwnPropertyDescriptor(output, 'type');
  if (!typeDescriptor || !Object.hasOwn(typeDescriptor, 'value')) {
    fail('MALFORMED_OUTPUT', 'Provider output must include a type.');
  }

  if (typeDescriptor.value === 'final') {
    const values = readExactObject(output, ['type', 'output'], 'MALFORMED_OUTPUT', 'final provider output');
    return parseNormalizedProviderOutput({ kind: 'final', output: values.output }, toolDeclarations);
  }

  if (typeDescriptor.value === 'tool_call') {
    const values = readExactObject(
      output,
      ['type', 'toolName', 'arguments'],
      'MALFORMED_OUTPUT',
      'tool-call provider output',
    );
    return parseNormalizedProviderOutput({
      kind: 'tool_call',
      toolName: values.toolName,
      arguments: values.arguments,
    }, toolDeclarations);
  }

  fail('MALFORMED_OUTPUT', 'Provider returned an unsupported output type.');
}

function parseNormalizedProviderOutput(output, toolDeclarations) {
  if (output === null || typeof output !== 'object' || Object.getPrototypeOf(output) !== Object.prototype) {
    fail('MALFORMED_OUTPUT', 'Normalized provider output must be a plain object.');
  }
  const kindDescriptor = Object.getOwnPropertyDescriptor(output, 'kind');
  if (!kindDescriptor || !Object.hasOwn(kindDescriptor, 'value')) {
    fail('MALFORMED_OUTPUT', 'Normalized provider output must include a kind.');
  }
  if (kindDescriptor.value === 'final') {
    const values = readExactObject(output, ['kind', 'output'], 'MALFORMED_OUTPUT', 'normalized final output');
    return { kind: 'final', output: parsePublicAiResponse(values.output) };
  }
  if (kindDescriptor.value === 'tool_call') {
    const values = readExactObject(
      output,
      ['kind', 'toolName', 'arguments'],
      'MALFORMED_OUTPUT',
      'normalized tool call',
    );
    if (typeof values.toolName !== 'string' || !toolDeclarations.some((tool) => tool.name === values.toolName)) {
      fail('UNKNOWN_TOOL', 'Provider proposed an undeclared tool.');
    }
    if (values.toolName !== 'get_current_game_snapshot') {
      fail('MALFORMED_OUTPUT', 'Provider proposed an unsupported tool.');
    }
    return {
      kind: 'tool_call',
      toolName: values.toolName,
      arguments: parseGetCurrentGameSnapshotArguments(values.arguments),
    };
  }
  fail('MALFORMED_OUTPUT', 'Provider returned an unsupported normalized output type.');
}

export function parseAiProviderResult(result, toolDeclarations) {
  if (result === null || typeof result !== 'object' || Object.getPrototypeOf(result) !== Object.prototype) {
    fail('MALFORMED_OUTPUT', 'Provider result must be a plain object.');
  }
  const okDescriptor = Object.getOwnPropertyDescriptor(result, 'ok');
  if (!okDescriptor || !Object.hasOwn(okDescriptor, 'value') || typeof okDescriptor.value !== 'boolean') {
    fail('MALFORMED_OUTPUT', 'Provider result must include a boolean ok field.');
  }

  if (!okDescriptor.value) {
    const values = readExactObject(result, ['ok', 'code', 'retryable'], 'MALFORMED_OUTPUT', 'provider failure');
    const normalizedFailure = createAiFailure(values.code);
    if (normalizedFailure.code !== values.code || normalizedFailure.retryable !== values.retryable) {
      fail('MALFORMED_OUTPUT', 'Provider failure result is invalid.');
    }
    return normalizedFailure;
  }

  const values = readExactObject(result, ['ok', 'provider', 'model', 'output'], 'MALFORMED_OUTPUT', 'provider success');
  for (const field of ['provider', 'model']) {
    if (typeof values[field] !== 'string' || values[field].trim().length === 0 || values[field].length > 100) {
      fail('MALFORMED_OUTPUT', `Provider ${field} is invalid.`);
    }
  }
  return {
    ok: true,
    provider: values.provider,
    model: values.model,
    output: parseNormalizedProviderOutput(values.output, toolDeclarations),
  };
}

export function parseAiToolResults(toolResults) {
  if (!Array.isArray(toolResults) || toolResults.length > 1) {
    fail('INVALID_INPUT', 'At most one tool result is supported.');
  }
  return toolResults.map((toolResult) => {
    const values = readExactObject(toolResult, ['toolName', 'result'], 'INVALID_INPUT', 'tool result');
    if (values.toolName !== 'get_current_game_snapshot') {
      fail('INVALID_INPUT', 'Unsupported tool result.');
    }
    const snapshot = parseGameSnapshot(values.result);
    return { toolName: values.toolName, result: snapshot };
  });
}