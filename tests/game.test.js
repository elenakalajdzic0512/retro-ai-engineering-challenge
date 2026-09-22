import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, launch, update, WIDTH } from '../src/game.js';

function playing() {
  const game = createGame();
  launch(game);
  return game;
}

test('initial state has approved grid, score, lives and waits for launch', () => {
  const game = createGame();
  assert.equal(game.bricks.length, 40);
  assert.equal(game.score, 0);
  assert.equal(game.lives, 3);
  const ball = { ...game.ball };
  update(game, 0, 0.1);
  assert.deepEqual(game.ball, ball);
  launch(game);
  update(game, 0, 0.01);
  assert.ok(game.ball.y < ball.y);
});

test('paddle moves both ways and stays inside the playfield', () => {
  const game = playing();
  const x = game.paddle.x;
  update(game, -1, 0.05);
  assert.ok(game.paddle.x < x);
  update(game, 1, 0.1);
  assert.ok(game.paddle.x > x);
  game.paddle.x = 1;
  update(game, -1, 0.1);
  assert.equal(game.paddle.x, 0);
  game.paddle.x = WIDTH - game.paddle.width - 1;
  update(game, 1, 0.1);
  assert.equal(game.paddle.x, WIDTH - game.paddle.width);
});

test('ball reflects from left, right and top boundaries', () => {
  for (const [x, y, vx, vy, axis, sign] of [[8, 300, -190, 0, 'vx', 1], [792, 300, 190, 0, 'vx', -1], [400, 8, 0, -280, 'vy', 1]]) {
    const game = playing();
    Object.assign(game.ball, { x, y, vx, vy });
    update(game, 0, 0.01);
    assert.equal(Math.sign(game.ball[axis]), sign);
  }
});

test('descending ball reflects from paddle without spin', () => {
  const game = playing();
  Object.assign(game.ball, { x: 400, y: 543, vx: 190, vy: 280 });
  update(game, 0, 0.02);
  assert.equal(game.ball.vy, -280);
  assert.equal(game.ball.vx, 190);
  assert.equal(game.lives, 3);
});

test('brick hit removes one brick, reflects and scores only once', () => {
  const game = playing();
  const brick = game.bricks[32];
  Object.assign(game.ball, { x: brick.x + 40, y: brick.y + brick.height + 9, vx: 0, vy: -280 });
  update(game, 0, 0.01);
  assert.equal(brick.alive, false);
  assert.equal(game.score, 10);
  assert.ok(game.ball.vy > 0);
  update(game, 0, 0.1);
  assert.equal(game.score, 10);
});

test('miss loses exactly one life and preserves progress until relaunch', () => {
  const game = playing();
  game.bricks[0].alive = false;
  game.score = 10;
  Object.assign(game.ball, { x: 20, y: 580, vy: 280 });
  update(game, 0, 0.1);
  assert.equal(game.lives, 2);
  assert.equal(game.status, 'ready');
  assert.equal(game.score, 10);
  assert.equal(game.bricks[0].alive, false);
  assert.deepEqual(game.ball, createGame().ball);
  assert.deepEqual(game.paddle, createGame().paddle);
  update(game, 0, 0.1);
  assert.equal(game.lives, 2);
  launch(game);
  assert.equal(game.status, 'playing');
});

test('zero lives loses immediately, freezes, and Space action fully restarts', () => {
  const game = playing();
  game.lives = 1;
  game.score = 10;
  game.bricks[0].alive = false;
  game.ball.y = 580;
  update(game, 0, 0.1);
  assert.equal(game.lives, 0);
  assert.equal(game.status, 'lost');
  const frozen = structuredClone(game);
  update(game, 1, 0.1);
  assert.deepEqual(game, frozen);
  launch(game);
  assert.deepEqual(game, playing());
});

test('last brick wins immediately, freezes, and can restart', () => {
  const game = playing();
  game.bricks.forEach((brick, index) => { brick.alive = index === 32; });
  game.score = 390;
  const brick = game.bricks[32];
  Object.assign(game.ball, { x: brick.x + 40, y: brick.y + brick.height + 9, vx: 0, vy: -280 });
  update(game, 0, 0.1);
  assert.equal(game.score, 400);
  assert.equal(game.status, 'won');
  const frozen = structuredClone(game);
  update(game, -1, 0.1);
  assert.deepEqual(game, frozen);
  launch(game);
  assert.deepEqual(game, playing());
});
