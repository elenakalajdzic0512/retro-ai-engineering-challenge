import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import {
  ContractError,
  parseAiRequest,
  parseGameSnapshot,
  parseGetCurrentGameSnapshotArguments,
  parsePublicAiResponse,
} from '../server/contracts.js';

const validSnapshot = { status: 'playing', score: 10, lives: 3, bricksRemaining: 39 };
const validRequest = { question: '  How am I doing?  ', snapshot: validSnapshot };

function assertContractError(action, code = 'INVALID_INPUT') {
  assert.throws(action, (error) => error instanceof ContractError && error.code === code);
}

test('valid request passes and trims the question', () => {
  assert.deepEqual(parseAiRequest(validRequest), {
    question: 'How am I doing?',
    snapshot: validSnapshot,
  });
});

test('game snapshot matches the current game state contract', () => {
  const game = createGame();
  assert.deepEqual(parseGameSnapshot({
    status: game.status,
    score: game.score,
    lives: game.lives,
    bricksRemaining: game.bricks.filter((brick) => brick.alive).length,
  }), { status: 'ready', score: 0, lives: 3, bricksRemaining: 40 });
});

test('empty question fails with INVALID_INPUT', () => {
  assertContractError(() => parseAiRequest({ ...validRequest, question: '  \n ' }));
});

test('overly long question fails with INVALID_INPUT', () => {
  assertContractError(() => parseAiRequest({ ...validRequest, question: 'q'.repeat(501) }));
});

test('snapshot missing a required field fails', () => {
  const { lives, ...snapshot } = validSnapshot;
  assertContractError(() => parseAiRequest({ ...validRequest, snapshot }));
});

test('score supplied as a string fails without coercion', () => {
  assertContractError(() => parseGameSnapshot({ ...validSnapshot, score: '10' }));
});

test('non-integer lives fails', () => {
  assertContractError(() => parseGameSnapshot({ ...validSnapshot, lives: 2.5 }));
});

test('negative bricksRemaining fails', () => {
  assertContractError(() => parseGameSnapshot({ ...validSnapshot, bricksRemaining: -1 }));
});

test('invalid game status fails', () => {
  assertContractError(() => parseGameSnapshot({ ...validSnapshot, status: 'paused' }));
});

test('unexpected snapshot field fails', () => {
  assertContractError(() => parseGameSnapshot({ ...validSnapshot, admin: true }));
});

test('unexpected top-level request field fails', () => {
  assertContractError(() => parseAiRequest({ ...validRequest, provider: 'internal' }));
});

test('valid public response passes and trims the answer', () => {
  assert.deepEqual(parsePublicAiResponse({ answer: '  Keep the ball in play.  ' }), {
    answer: 'Keep the ball in play.',
  });
});

test('empty public answer fails with MALFORMED_OUTPUT', () => {
  assertContractError(() => parsePublicAiResponse({ answer: '  ' }), 'MALFORMED_OUTPUT');
});

test('non-string public answer fails with MALFORMED_OUTPUT', () => {
  assertContractError(() => parsePublicAiResponse({ answer: 42 }), 'MALFORMED_OUTPUT');
});

test('unexpected private response field fails with MALFORMED_OUTPUT', () => {
  assertContractError(() => parsePublicAiResponse({ answer: 'Try the left side.', model: 'private-model' }), 'MALFORMED_OUTPUT');
});

test('empty get_current_game_snapshot arguments pass', () => {
  assert.deepEqual(parseGetCurrentGameSnapshotArguments({}), {});
});

test('unexpected tool argument fails', () => {
  assertContractError(() => parseGetCurrentGameSnapshotArguments({ admin: true }));
  assertContractError(() => parseGetCurrentGameSnapshotArguments({ viewerScope: 'team' }));
});