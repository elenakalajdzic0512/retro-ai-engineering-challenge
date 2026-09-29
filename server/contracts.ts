const GAME_STATUSES = new Set<GameStatus>(['ready', 'playing', 'won', 'lost']);
const MAX_SCORE = 400;
const MAX_LIVES = 3;
const MAX_BRICKS = 40;
const MAX_HINT_CODE_POINTS = 240;
const MAX_PROVIDER_OUTPUT_BYTES = 2_048;

export type GameStatus = 'ready' | 'playing' | 'won' | 'lost';

export interface GameSnapshot {
  status: GameStatus;
  score: number;
  lives: number;
  bricksRemaining: number;
}

export type AiRequest = GameSnapshot;

export type AiHintCategory = 'movement' | 'timing' | 'strategy' | 'general';

export interface PublicAiResponse {
  hint: string;
  category: AiHintCategory;
}

export class ContractError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'ContractError';
    this.code = code;
  }
}

function fail(code: string, message: string): never {
  throw new ContractError(code, message);
}

function readExactObject(
  value: unknown,
  fields: readonly string[],
  code: string,
  label: string,
): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) {
    fail(code, `${label} must be a plain object.`);
  }
  const objectValue = value as object;
  const keys = Reflect.ownKeys(objectValue);
  if (keys.length !== fields.length || fields.some((field) => !keys.includes(field))) {
    fail(code, `${label} must contain exactly: ${fields.join(', ')}.`);
  }
  const result: Record<string, unknown> = {};
  for (const field of fields) {
    const descriptor = Object.getOwnPropertyDescriptor(objectValue, field);
    if (descriptor === undefined || !Object.hasOwn(descriptor, 'value')) {
      fail(code, `${label}.${field} must be a data property.`);
    }
    result[field] = descriptor.value;
  }
  return result;
}

export function parseGameSnapshot(snapshot: unknown): GameSnapshot {
  const values = readExactObject(
    snapshot,
    ['status', 'score', 'lives', 'bricksRemaining'],
    'INVALID_INPUT',
    'snapshot',
  );
  if (typeof values.status !== 'string' || !GAME_STATUSES.has(values.status as GameStatus)) {
    fail('INVALID_INPUT', 'snapshot.status must be ready, playing, won, or lost.');
  }
  if (typeof values.score !== 'number' || !Number.isFinite(values.score) || values.score < 0 || values.score > MAX_SCORE) {
    fail('INVALID_INPUT', `snapshot.score must be a finite number from 0 to ${MAX_SCORE}.`);
  }
  if (typeof values.lives !== 'number' || !Number.isInteger(values.lives) || values.lives < 0 || values.lives > MAX_LIVES) {
    fail('INVALID_INPUT', `snapshot.lives must be an integer from 0 to ${MAX_LIVES}.`);
  }
  if (
    typeof values.bricksRemaining !== 'number' ||
    !Number.isInteger(values.bricksRemaining) ||
    values.bricksRemaining < 0 ||
    values.bricksRemaining > MAX_BRICKS
  ) {
    fail('INVALID_INPUT', `snapshot.bricksRemaining must be an integer from 0 to ${MAX_BRICKS}.`);
  }
  return {
    status: values.status as GameStatus,
    score: values.score,
    lives: values.lives,
    bricksRemaining: values.bricksRemaining,
  };
}

export function parseAiRequest(request: unknown): AiRequest {
  return parseGameSnapshot(request);
}

export function parsePublicAiResponse(response: unknown): PublicAiResponse {
  if (typeof response !== 'string' || Buffer.byteLength(response, 'utf8') > MAX_PROVIDER_OUTPUT_BYTES) {
    fail('MALFORMED_OUTPUT', 'response must be valid JSON within the maximum size.');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(response);
  } catch {
    fail('MALFORMED_OUTPUT', 'response must contain valid JSON.');
  }
  const values = readExactObject(parsed, ['hint', 'category'], 'MALFORMED_OUTPUT', 'response');
  if (typeof values.hint !== 'string') fail('MALFORMED_OUTPUT', 'response.hint must be a string.');
  const hint = values.hint.trim();
  if (Array.from(hint).length === 0 || Array.from(hint).length > MAX_HINT_CODE_POINTS) {
    fail('MALFORMED_OUTPUT', `response.hint must contain 1 to ${MAX_HINT_CODE_POINTS} Unicode code points.`);
  }
  if (typeof values.category !== 'string' || !['movement', 'timing', 'strategy', 'general'].includes(values.category)) {
    fail('MALFORMED_OUTPUT', 'response.category is invalid.');
  }
  return { hint, category: values.category as AiHintCategory };
}

export function parseGetCurrentGameSnapshotArguments(args: unknown): Record<string, never> {
  readExactObject(args, [], 'INVALID_INPUT', 'get_current_game_snapshot arguments');
  return {};
}
