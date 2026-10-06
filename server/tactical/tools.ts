import {
  parseCandidateStrategy,
  parseStrategyEvaluation,
  parseTacticalSnapshot,
  type StrategyEvaluation,
  type TacticalSnapshot,
} from './contracts.js';
import { evaluateTacticalStrategy } from './evaluator.js';

export const MAX_TOOL_RESULT_BYTES = 8192;

export type TacticalToolName = 'get_tactical_snapshot' | 'evaluate_tactical_strategy';
export interface TacticalToolDeclaration {
  name: TacticalToolName;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, { type: 'string'; enum: string[] }>;
    required: string[];
    additionalProperties: false;
  };
}
export type TacticalToolResult =
  | { toolName: 'get_tactical_snapshot'; result: TacticalSnapshot }
  | { toolName: 'evaluate_tactical_strategy'; result: StrategyEvaluation };
export interface TacticalToolContext { readonly snapshot: TacticalSnapshot }
export type TacticalToolErrorCode =
  | 'invalid_input' | 'unknown_tool' | 'forbidden_tool'
  | 'invalid_tool_arguments' | 'invalid_tool_result' | 'tool_failure';

export class TacticalToolError extends Error {
  constructor(public readonly code: TacticalToolErrorCode, message: string) {
    super(message);
    this.name = 'TacticalToolError';
  }
}

const DECLARATIONS = [
  {
    name: 'get_tactical_snapshot',
    description: 'Read the validated client-reported arena snapshot.',
    inputSchema: { type: 'object', properties: {}, required: [], additionalProperties: false },
  },
  {
    name: 'evaluate_tactical_strategy',
    description: 'Evaluate one bounded strategy against the stored arena snapshot.',
    inputSchema: {
      type: 'object',
      properties: {
        targetZone: { type: 'string', enum: ['left', 'center', 'right'] },
        style: { type: 'string', enum: ['safe', 'balanced', 'aggressive'] },
        paddleContact: { type: 'string', enum: ['left', 'center', 'right'] },
        route: { type: 'string', enum: ['direct', 'portal'] },
      },
      required: ['targetZone', 'style', 'paddleContact', 'route'],
      additionalProperties: false,
    },
  },
] as const;

const contexts = new WeakSet<object>();
const forbiddenNames = new Set(['move_paddle', 'launch_game', 'set_score', 'run_shell', 'fetch_url']);

function freezeTree<T extends object>(value: T): T {
  for (const child of Object.values(value)) {
    if (child !== null && typeof child === 'object') freezeTree(child);
  }
  return Object.freeze(value);
}

function normalized<T>(code: TacticalToolErrorCode, message: string, action: () => T): T {
  try {
    return action();
  } catch {
    throw new TacticalToolError(code, message);
  }
}

export function getTacticalToolDeclarations(): TacticalToolDeclaration[] {
  return structuredClone(DECLARATIONS) as unknown as TacticalToolDeclaration[];
}

export function createTacticalToolContext(snapshot: unknown): TacticalToolContext {
  const validated = normalized('invalid_input', 'Tactical snapshot is invalid.', () => parseTacticalSnapshot(snapshot));
  const context = Object.freeze({ snapshot: freezeTree(validated) });
  contexts.add(context);
  return context;
}

function exactEmptyArguments(value: unknown): void {
  normalized('invalid_tool_arguments', 'Tool arguments are invalid.', () => {
    if (value === null || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype ||
        Reflect.ownKeys(value).length !== 0) {
      throw new Error('Invalid arguments');
    }
  });
}

function toolName(value: unknown): TacticalToolName {
  if (value === 'get_tactical_snapshot' || value === 'evaluate_tactical_strategy') return value;
  if (typeof value === 'string' && forbiddenNames.has(value)) {
    throw new TacticalToolError('forbidden_tool', 'Tool is forbidden.');
  }
  throw new TacticalToolError('unknown_tool', 'Tool is unknown.');
}

function contextSnapshot(value: unknown): TacticalSnapshot {
  if (value === null || typeof value !== 'object' || !contexts.has(value)) {
    throw new TacticalToolError('invalid_input', 'Tactical tool context is invalid.');
  }
  return (value as TacticalToolContext).snapshot;
}

function sameEvaluation(left: StrategyEvaluation, right: StrategyEvaluation): boolean {
  const fields = [
    'candidateAccepted', 'rejectionReason', 'targetOpportunity', 'armoredTargets', 'riskLevel',
    'paddleAligned', 'shieldInTargetZone', 'portalAvailable', 'routeUsable',
  ] as const;
  return fields.every((field) => left[field] === right[field]) &&
    left.evidenceCodes.length === right.evidenceCodes.length &&
    left.evidenceCodes.every((code, index) => code === right.evidenceCodes[index]);
}

export function assertTacticalToolResultByteLength(value: unknown): void {
  normalized('invalid_tool_result', 'Tool result is invalid or oversized.', () => {
    const serialized = JSON.stringify(value);
    if (typeof serialized !== 'string' || Buffer.byteLength(serialized, 'utf8') > MAX_TOOL_RESULT_BYTES) {
      throw new Error('Invalid result size');
    }
  });
}

export function parseTacticalToolResult(value: unknown): TacticalToolResult {
  return normalized('invalid_tool_result', 'Tool result is invalid.', () => {
    if (value === null || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) {
      throw new Error('Invalid result envelope');
    }
    const keys = Reflect.ownKeys(value);
    if (keys.length !== 2 || !keys.includes('toolName') || !keys.includes('result')) {
      throw new Error('Invalid result envelope');
    }
    const name = Object.getOwnPropertyDescriptor(value, 'toolName');
    const result = Object.getOwnPropertyDescriptor(value, 'result');
    if (!name || !result || !Object.hasOwn(name, 'value') || !Object.hasOwn(result, 'value')) {
      throw new Error('Invalid result envelope');
    }
    let parsed: TacticalToolResult;
    if (name.value === 'get_tactical_snapshot') {
      parsed = { toolName: name.value, result: parseTacticalSnapshot(result.value) };
    } else if (name.value === 'evaluate_tactical_strategy') {
      parsed = { toolName: name.value, result: parseStrategyEvaluation(result.value) };
    } else {
      throw new Error('Invalid result tool name');
    }
    assertTacticalToolResultByteLength(parsed.result);
    return parsed;
  });
}

export function invokeTacticalTool(
  name: unknown,
  args: unknown,
  context: unknown,
  evaluator: typeof evaluateTacticalStrategy = evaluateTacticalStrategy,
): TacticalToolResult {
  const allowedName = toolName(name);
  if (allowedName === 'get_tactical_snapshot') exactEmptyArguments(args);
  const candidate = allowedName === 'evaluate_tactical_strategy'
    ? normalized('invalid_tool_arguments', 'Tool arguments are invalid.', () => parseCandidateStrategy(args))
    : undefined;
  const snapshot = contextSnapshot(context);
  if (allowedName === 'get_tactical_snapshot') {
    const result = parseTacticalToolResult({ toolName: allowedName, result: snapshot });
    if (result.toolName !== allowedName) throw new TacticalToolError('invalid_tool_result', 'Tool result is invalid.');
    return Object.freeze({ toolName: allowedName, result: freezeTree(result.result) });
  }
  const validatedCandidate = Object.freeze(candidate!);
  const evaluation = normalized('tool_failure', 'Tactical tool failed.', () => evaluator(snapshot, validatedCandidate));
  const validatedEvaluation = normalized('invalid_tool_result', 'Tool result is invalid.', () => parseStrategyEvaluation(evaluation));
  const trustedEvaluation = normalized('invalid_tool_result', 'Tool result is invalid.', () =>
    parseStrategyEvaluation(evaluateTacticalStrategy(snapshot, validatedCandidate)));
  if (!sameEvaluation(validatedEvaluation, trustedEvaluation)) {
    throw new TacticalToolError('invalid_tool_result', 'Tool result disagrees with deterministic evaluation.');
  }
  const result = parseTacticalToolResult({ toolName: allowedName, result: validatedEvaluation });
  if (result.toolName !== allowedName) throw new TacticalToolError('invalid_tool_result', 'Tool result is invalid.');
  return Object.freeze({ toolName: allowedName, result: freezeTree(result.result) });
}
