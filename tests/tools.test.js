import test from 'node:test';
import assert from 'node:assert/strict';
import { ContractError } from '../dist-server/contracts.js';
import { invokeReadOnlyTool } from '../dist-server/tools.js';

const snapshot = { status: 'playing', score: 20, lives: 2, bricksRemaining: 38 };
const context = { snapshot };

test('get_current_game_snapshot returns the validated request-scoped snapshot', () => {
  assert.deepEqual(
    invokeReadOnlyTool('get_current_game_snapshot', {}, context),
    snapshot,
  );
});

test('tool result is a copy and does not expose mutable request context', () => {
  const result = invokeReadOnlyTool('get_current_game_snapshot', {}, context);
  result.score = 400;
  assert.equal(snapshot.score, 20);
});

test('tool rejects arguments that attempt to expand its authority', () => {
  for (const args of [{ admin: true }, { viewerScope: 'team' }]) {
    assert.throws(
      () => invokeReadOnlyTool('get_current_game_snapshot', args, context),
      (error) => error instanceof ContractError && error.code === 'INVALID_INPUT',
    );
  }
});

test('tool rejects unknown names', () => {
  assert.throws(
    () => invokeReadOnlyTool('delete_game', {}, context),
    (error) => error instanceof ContractError && error.code === 'INVALID_INPUT',
  );
});

test('tool rejects missing or invalid snapshot context', () => {
  assert.throws(
    () => invokeReadOnlyTool('get_current_game_snapshot', {}, {}),
    (error) => error instanceof ContractError && error.code === 'INVALID_INPUT',
  );
  assert.throws(
    () => invokeReadOnlyTool('get_current_game_snapshot', {}, { snapshot: { ...snapshot, lives: '2' } }),
    (error) => error instanceof ContractError && error.code === 'INVALID_INPUT',
  );
});
