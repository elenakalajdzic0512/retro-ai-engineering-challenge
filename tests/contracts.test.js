import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import {
  ContractError,
  parseAiRequest,
  parseGameSnapshot,
  parseGetCurrentGameSnapshotArguments,
  parsePublicAiResponse,
} from '../dist-server/contracts.js';

const validRequest = { status: 'playing', score: 10, lives: 3, bricksRemaining: 39 };
const statuses = ['ready', 'playing', 'won', 'lost'];
const categories = ['movement', 'timing', 'strategy', 'general'];

function assertContractError(action, code = 'INVALID_INPUT') {
  assert.throws(action, (error) => error instanceof ContractError && error.code === code);
}

function rawResponse(hint, category = 'general') {
  return JSON.stringify({ hint, category });
}

function rawResponseWithBytes(bytes, hint = 'Use the paddle carefully.', category = 'general') {
  const json = rawResponse(hint, category);
  const padding = bytes - Buffer.byteLength(json, 'utf8');
  assert.ok(padding >= 0);
  return `${json}${' '.repeat(padding)}`;
}

test('valid final request returns exactly the four fields', () => {
  assert.deepEqual(parseAiRequest(validRequest), validRequest);
});

test('all game statuses are accepted', () => {
  for (const status of statuses) {
    assert.deepEqual(parseAiRequest({ ...validRequest, status }), { ...validRequest, status });
  }
});

test('independent request boundaries are accepted without cross-field consistency rules', () => {
  assert.deepEqual(parseAiRequest({ status: 'ready', score: 400, lives: 0, bricksRemaining: 40 }), {
    status: 'ready', score: 400, lives: 0, bricksRemaining: 40,
  });
  assert.deepEqual(parseAiRequest({ status: 'won', score: 0, lives: 3, bricksRemaining: 0 }), {
    status: 'won', score: 0, lives: 3, bricksRemaining: 0,
  });
});

test('score accepts inclusive and fractional values', () => {
  assert.equal(parseAiRequest({ ...validRequest, score: 0 }).score, 0);
  assert.equal(parseAiRequest({ ...validRequest, score: 400 }).score, 400);
  assert.equal(parseAiRequest({ ...validRequest, score: 12.5 }).score, 12.5);
});

test('lives and bricksRemaining accept inclusive integer boundaries', () => {
  assert.equal(parseAiRequest({ ...validRequest, lives: 0 }).lives, 0);
  assert.equal(parseAiRequest({ ...validRequest, lives: 3 }).lives, 3);
  assert.equal(parseAiRequest({ ...validRequest, bricksRemaining: 0 }).bricksRemaining, 0);
  assert.equal(parseAiRequest({ ...validRequest, bricksRemaining: 40 }).bricksRemaining, 40);
});

test('numeric strings are rejected without coercion', () => {
  assertContractError(() => parseAiRequest({ ...validRequest, score: '10' }));
  assertContractError(() => parseAiRequest({ ...validRequest, lives: '3' }));
  assertContractError(() => parseAiRequest({ ...validRequest, bricksRemaining: '39' }));
});

test('non-finite and out-of-range scores are rejected', () => {
  for (const score of [NaN, Infinity, -1, 401]) {
    assertContractError(() => parseAiRequest({ ...validRequest, score }));
  }
});

test('fractional and out-of-range lives are rejected', () => {
  for (const lives of [-1, 1.5, 4]) {
    assertContractError(() => parseAiRequest({ ...validRequest, lives }));
  }
});

test('fractional and out-of-range bricksRemaining are rejected', () => {
  for (const bricksRemaining of [-1, 1.5, 41]) {
    assertContractError(() => parseAiRequest({ ...validRequest, bricksRemaining }));
  }
});

test('invalid status is rejected', () => {
  assertContractError(() => parseAiRequest({ ...validRequest, status: 'paused' }));
});

test('missing and extra request fields are rejected', () => {
  const { lives, ...missingLives } = validRequest;
  assertContractError(() => parseAiRequest(missingLives));
  assertContractError(() => parseAiRequest({ ...validRequest, provider: 'fake' }));
});

test('null, arrays, and the old question/snapshot wrapper are rejected', () => {
  assertContractError(() => parseAiRequest(null));
  assertContractError(() => parseAiRequest([]));
  assertContractError(() => parseAiRequest({ question: 'How am I doing?', snapshot: validRequest }));
});

test('valid hint/category response returns exactly the two fields', () => {
  assert.deepEqual(parsePublicAiResponse(rawResponse('  Keep the ball in play.  ', 'strategy')), {
    hint: 'Keep the ball in play.',
    category: 'strategy',
  });
});

test('all response categories are accepted', () => {
  for (const category of categories) {
    assert.deepEqual(parsePublicAiResponse(rawResponse('Watch the next bounce.', category)), {
      hint: 'Watch the next bounce.',
      category,
    });
  }
});

test('240 Unicode code points are accepted and 241 are rejected', () => {
  const codePoints240 = '😀'.repeat(240);
  const codePoints241 = '😀'.repeat(241);
  assert.equal(parsePublicAiResponse(rawResponse(codePoints240)).hint, codePoints240);
  assertContractError(() => parsePublicAiResponse(rawResponse(codePoints241)), 'MALFORMED_OUTPUT');
});

test('exact 2,048-byte raw JSON response is accepted', () => {
  const response = rawResponseWithBytes(2048);
  assert.equal(Buffer.byteLength(response, 'utf8'), 2048);
  assert.equal(parsePublicAiResponse(response).category, 'general');
});

test('2,049-byte raw JSON response is rejected', () => {
  const response = rawResponseWithBytes(2049);
  assert.equal(Buffer.byteLength(response, 'utf8'), 2049);
  assertContractError(() => parsePublicAiResponse(response), 'MALFORMED_OUTPUT');
});

test('whitespace-only and non-string hints are rejected', () => {
  assertContractError(() => parsePublicAiResponse(rawResponse('   ')), 'MALFORMED_OUTPUT');
  assertContractError(() => parsePublicAiResponse(JSON.stringify({ hint: 42, category: 'general' })), 'MALFORMED_OUTPUT');
});

test('missing, extra, unknown, and mis-cased response fields are rejected', () => {
  assertContractError(() => parsePublicAiResponse(JSON.stringify({ hint: 'Try timing.' })), 'MALFORMED_OUTPUT');
  assertContractError(() => parsePublicAiResponse(JSON.stringify({ hint: 'Try timing.', category: 'general', model: 'private' })), 'MALFORMED_OUTPUT');
  assertContractError(() => parsePublicAiResponse(rawResponse('Try timing.', 'unknown')), 'MALFORMED_OUTPUT');
  assertContractError(() => parsePublicAiResponse(rawResponse('Try timing.', 'Movement')), 'MALFORMED_OUTPUT');
});

test('null and array responses are rejected', () => {
  assertContractError(() => parsePublicAiResponse('null'), 'MALFORMED_OUTPUT');
  assertContractError(() => parsePublicAiResponse('[]'), 'MALFORMED_OUTPUT');
});

test('malformed JSON, prose, and fenced JSON are rejected', () => {
  assertContractError(() => parsePublicAiResponse('{"hint":'), 'MALFORMED_OUTPUT');
  assertContractError(() => parsePublicAiResponse(`Advice: ${rawResponse('Move left.')}`), 'MALFORMED_OUTPUT');
  assertContractError(() => parsePublicAiResponse(`\`\`\`json\n${rawResponse('Move left.')}\n\`\`\``), 'MALFORMED_OUTPUT');
});

test('game snapshot helper still matches the current game state contract', () => {
  const game = createGame();
  assert.deepEqual(parseGameSnapshot({
    status: game.status,
    score: game.score,
    lives: game.lives,
    bricksRemaining: game.bricks.filter((brick) => brick.alive).length,
  }), { status: 'ready', score: 0, lives: 3, bricksRemaining: 40 });
});

test('empty get_current_game_snapshot arguments pass', () => {
  assert.deepEqual(parseGetCurrentGameSnapshotArguments({}), {});
});

test('unexpected tool arguments fail', () => {
  assertContractError(() => parseGetCurrentGameSnapshotArguments({ admin: true }));
  assertContractError(() => parseGetCurrentGameSnapshotArguments({ viewerScope: 'team' }));
});
