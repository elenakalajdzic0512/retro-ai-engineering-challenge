const GAME_STATUSES = new Set<GameStatus>(['ready', 'playing', 'won', 'lost']);
const MAX_QUESTION_LENGTH = 500;
const MAX_ANSWER_LENGTH = 2000;
const MAX_SCORE = 400;
const MAX_LIVES = 3;
const MAX_BRICKS = 40;

export type GameStatus = 'ready' | 'playing' | 'won' | 'lost';

export interface GameSnapshot {
  status: GameStatus;
  score: number;
  lives: number;
  bricksRemaining: number;
}

export interface AiRequest {
  question: string;
  snapshot: GameSnapshot;
}

export interface PublicAiResponse {
  answer: string;
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
  const values = readExactObject(request, ['question', 'snapshot'], 'INVALID_INPUT', 'request');
  if (typeof values.question !== 'string') fail('INVALID_INPUT', 'request.question must be a string.');
  const question = values.question.trim();
  if (question.length === 0 || question.length > MAX_QUESTION_LENGTH) {
    fail('INVALID_INPUT', `request.question must contain 1 to ${MAX_QUESTION_LENGTH} characters.`);
  }
  return { question, snapshot: parseGameSnapshot(values.snapshot) };
}

export function parsePublicAiResponse(response: unknown): PublicAiResponse {
  const values = readExactObject(response, ['answer'], 'MALFORMED_OUTPUT', 'response');
  if (typeof values.answer !== 'string') fail('MALFORMED_OUTPUT', 'response.answer must be a string.');
  const answer = values.answer.trim();
  if (answer.length === 0 || answer.length > MAX_ANSWER_LENGTH) {
    fail('MALFORMED_OUTPUT', `response.answer must contain 1 to ${MAX_ANSWER_LENGTH} characters.`);
  }
  return { answer };
}

export function parseGetCurrentGameSnapshotArguments(args: unknown): Record<string, never> {
  readExactObject(args, [], 'INVALID_INPUT', 'get_current_game_snapshot arguments');
  return {};
}
