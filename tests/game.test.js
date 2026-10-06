import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, launch, update, WIDTH, DEFAULT_GAME_CONFIG, validateGameConfig } from '../src/game.js';

test('explicit valid GameConfig is accepted', () => {
  const config = { lives: 3, brickRows: 5, brickColumns: 8 };
  assert.deepEqual(DEFAULT_GAME_CONFIG, config);
  assert.ok(Object.isFrozen(DEFAULT_GAME_CONFIG));
  assert.deepEqual(validateGameConfig(config), config);
  const game = createGame(config);
  assert.equal(game.lives, 3);
  assert.equal(game.bricks.length, 40);
});

test('default and explicit valid GameConfig produce equivalent initial states', () => {
  assert.deepEqual(createGame(), createGame({ lives: 3, brickRows: 5, brickColumns: 8 }));
});

test('E3 rejects string lives with the exact TypeError without coercion', () => {
  assert.throws(() => createGame({ lives: '3', brickRows: 5, brickColumns: 8 }), {
    name: 'TypeError',
    message: 'Invalid GameConfig: lives must be the integer 3.',
  });
});

test('GameConfig rejects a missing required property', () => {
  assert.throws(() => createGame({ lives: 3, brickRows: 5 }), TypeError);
});

test('GameConfig rejects an extra property', () => {
  assert.throws(() => createGame({ lives: 3, brickRows: 5, brickColumns: 8, extra: true }), TypeError);
});

test('GameConfig rejects null and non-object input', () => {
  for (const input of [null, 3, '3', true, []]) {
    assert.throws(() => validateGameConfig(input), TypeError);
    assert.throws(() => createGame(input), TypeError);
  }
  assert.throws(() => validateGameConfig(undefined), TypeError);
});

function playing() {
  const game = createGame();
  launch(game);
  return game;
}

// Approach from above for one physics step; cleared earlier rows cannot interfere.
function hitBrick(game, brick) {
  Object.assign(game.ball, {
    x: brick.x + brick.width / 2, y: brick.y - game.ball.radius - 1, vx: 0, vy: 280,
  });
  update(game, 0, 1 / 240);
}

test('initial layout has exactly eight approved armored bricks and 32 normal bricks', () => {
  const game = createGame();
  const armoredIndices = [2, 5, 10, 13, 18, 21, 26, 29];
  assert.equal(game.bricks.length, 40);
  assert.deepEqual(game.bricks.flatMap((brick, index) => brick.kind === 'armored' ? [index] : []), armoredIndices);
  assert.equal(game.bricks.filter((brick) => brick.kind === 'normal').length, 32);
  game.bricks.forEach((brick, index) => {
    assert.equal(brick.alive, true);
    assert.equal(brick.hitsRemaining, armoredIndices.includes(index) ? 2 : 1);
  });
  assert.equal(game.bricks[32].kind, 'normal');
});

test('armored brick reflects both hits and awards ten points only on destruction', () => {
  const game = playing();
  const brick = game.bricks[2];
  hitBrick(game, brick);
  assert.equal(brick.alive, true);
  assert.equal(brick.hitsRemaining, 1);
  assert.equal(game.score, 0);
  assert.equal(game.ball.vy, -280);
  update(game, 0, 0.01);
  assert.equal(brick.hitsRemaining, 1);
  hitBrick(game, brick);
  assert.equal(brick.alive, false);
  assert.equal(brick.hitsRemaining, 0);
  assert.equal(game.score, 10);
  assert.equal(game.ball.vy, -280);
  hitBrick(game, brick);
  assert.equal(brick.hitsRemaining, 0);
  assert.equal(game.score, 10);
});

test('normal brick reaches zero hits and awards ten points on its first collision', () => {
  const game = playing();
  const brick = game.bricks[0];
  assert.equal(brick.kind, 'normal');
  assert.equal(brick.hitsRemaining, 1);
  hitBrick(game, brick);
  assert.equal(brick.hitsRemaining, 0);
  assert.equal(brick.alive, false);
  assert.equal(game.score, 10);
});

test('destroying all 40 bricks through 48 hits scores exactly 400 with no repeat rewards', () => {
  const game = playing();
  let hits = 0;
  game.bricks.forEach((brick, index) => {
    const requiredHits = brick.kind === 'armored' ? 2 : 1;
    for (let hit = 1; hit <= requiredHits; hit++) {
      hitBrick(game, brick);
      hits++;
      assert.equal(game.score, index * 10 + (hit === requiredHits ? 10 : 0));
    }
    assert.equal(brick.alive, false);
    assert.equal(brick.hitsRemaining, 0);
    hitBrick(game, brick);
    assert.equal(game.score, (index + 1) * 10);
  });
  assert.equal(hits, 48);
  assert.equal(game.score, 400);
  assert.equal(game.status, 'won');
});

test('last armored brick must be destroyed before winning and restarting', () => {
  const game = playing();
  game.bricks.forEach((brick, index) => {
    if (index !== 2) {
      brick.alive = false;
      brick.hitsRemaining = 0;
    }
  });
  game.score = 390;
  hitBrick(game, game.bricks[2]);
  assert.equal(game.status, 'playing');
  assert.equal(game.score, 390);
  hitBrick(game, game.bricks[2]);
  assert.equal(game.status, 'won');
  assert.equal(game.score, 400);
  launch(game);
  assert.deepEqual(game, playing());
});

test('restart after losing restores damaged and destroyed armored bricks', () => {
  const game = playing();
  hitBrick(game, game.bricks[2]);
  hitBrick(game, game.bricks[5]);
  hitBrick(game, game.bricks[5]);
  assert.equal(game.bricks[2].hitsRemaining, 1);
  assert.equal(game.bricks[5].alive, false);
  assert.equal(game.score, 10);
  game.lives = 1;
  Object.assign(game.ball, { x: 20, y: 580, vx: 0, vy: 280 });
  update(game, 0, 0.01);
  assert.equal(game.status, 'lost');
  launch(game);
  assert.deepEqual(game, playing());
  for (const brick of game.bricks.filter((item) => item.kind === 'armored')) {
    assert.equal(brick.alive, true);
    assert.equal(brick.hitsRemaining, 2);
  }
});

test('ready paddle movement is equal at 60 and 120 FPS before and at the boundary', () => {
  for (const [seconds, expectedDistance] of [[0.5, 230], [1, 345]]) {
    const distances = [60, 120].map((fps) => {
      const game = createGame();
      const start = game.paddle.x;
      for (let frame = 0; frame < fps * seconds; frame++) update(game, 1, 1 / fps);
      assert.equal(game.status, 'ready');
      assert.equal(game.ball.x, game.paddle.x + game.paddle.width / 2);
      return game.paddle.x - start;
    });
    assert.ok(Math.abs(distances[0] - distances[1]) < 1e-9);
    for (const distance of distances) assert.ok(Math.abs(distance - expectedDistance) < 1e-9);
  }
});

test('playing update stops after a miss without moving the reset paddle', () => {
  const game = playing();
  Object.assign(game.ball, { x: 20, y: 580, vy: 280 });
  update(game, 1, 0.1);
  assert.equal(game.status, 'ready');
  assert.equal(game.lives, 2);
  assert.deepEqual(game.paddle, createGame().paddle);
  assert.deepEqual(game.ball, createGame().ball);
});

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

function hitPaddle(game, contactX, vx = 190, vy = 280) {
  const dt = 1 / 240;
  Object.assign(game.ball, {
    x: contactX - vx * dt, y: game.paddle.y - game.ball.radius - 1, vx, vy,
  });
  update(game, 0, dt);
}

// Hazard Arena replaces the old no-spin rule with contact-zone direction.
for (const [zone, fraction, expectedVx] of [['left', 1 / 6, -240], ['center', 1 / 2, 0], ['right', 5 / 6, 240]]) {
  test(`descending ball reflects upward from the ${zone} paddle third`, () => {
    const game = playing();
    const bricks = structuredClone(game.bricks);
    hitPaddle(game, game.paddle.x + game.paddle.width * fraction);
    assert.equal(game.ball.vy, -280);
    assert.equal(game.ball.vx, expectedVx);
    assert.equal(game.ball.y, game.paddle.y - game.ball.radius);
    assert.equal(game.lives, 3);
    assert.equal(game.status, 'playing');
    assert.equal(game.score, 0);
    assert.deepEqual(game.bricks, bricks);
    // The reflected ball moves clear without retriggering the same contact.
    update(game, 0, 0.01);
    assert.ok(game.ball.y < game.paddle.y - game.ball.radius);
    assert.equal(game.ball.vx, expectedVx);
    assert.equal(game.ball.vy, -280);
    assert.equal(game.lives, 3);
  });
}

test('exact third boundaries belong to center while adjacent contacts use the proper zone', () => {
  for (const paddleX of [0, 345, WIDTH - 110]) {
    for (const third of [1, 2]) {
      for (const offset of [-1e-7, 0, 1e-7]) {
        const game = playing();
        game.paddle.x = paddleX;
        // Construct geometric boundaries directly; vx=0 avoids contact-point drift.
        const boundary = game.paddle.x + third * game.paddle.width / 3;
        hitPaddle(game, boundary + offset, 0);
        const expectedVx = third === 1 && offset < 0 ? -240 : third === 2 && offset > 0 ? 240 : 0;
        assert.equal(game.ball.vx, expectedVx);
        assert.equal(game.ball.vy, -280);
      }
    }
  }
});

test('paddle zones replace incoming horizontal velocity instead of accumulating spin', () => {
  for (const [fraction, incomingVx, expectedVx] of [[5 / 6, -190, 240], [1 / 6, 190, -240], [1 / 2, -240, 0]]) {
    const game = playing();
    hitPaddle(game, game.paddle.x + game.paddle.width * fraction, incomingVx);
    assert.equal(game.ball.vx, expectedVx);
    assert.equal(game.ball.vy, -280);
  }
});

test('repeated paddle contacts keep horizontal speed bounded and preserve vertical magnitude', () => {
  for (const verticalSpeed of [280, 360]) {
    const game = playing();
    const zones = [[1 / 6, -240], [1 / 2, 0], [5 / 6, 240]];
    for (let hit = 0; hit < 60; hit++) {
      const [fraction, expectedVx] = zones[hit % zones.length];
      hitPaddle(game, game.paddle.x + game.paddle.width * fraction, game.ball.vx, verticalSpeed);
      assert.equal(game.ball.vx, expectedVx);
      assert.ok(Math.abs(game.ball.vx) <= 240);
      assert.equal(game.ball.vy, -verticalSpeed);
      assert.ok(Math.hypot(game.ball.vx, game.ball.vy) <= Math.hypot(240, verticalSpeed));
    }
    assert.equal(game.lives, 3);
    assert.equal(game.score, 0);
    assert.equal(game.status, 'playing');
  }
});

test('small overlaps beyond either paddle edge use the nearest side zone safely', () => {
  for (const [side, expectedVx] of [['left', -240], ['right', 240]]) {
    const game = playing();
    const contactX = side === 'left' ? game.paddle.x - 0.1 : game.paddle.x + game.paddle.width + 0.1;
    hitPaddle(game, contactX, 0);
    assert.equal(game.ball.vx, expectedVx);
    assert.equal(game.ball.vy, -280);
    assert.equal(game.ball.y, game.paddle.y - game.ball.radius);
    assert.equal(game.lives, 3);
  }
});

test('an ascending ball near the paddle does not receive another directional bounce', () => {
  const game = playing();
  Object.assign(game.ball, { x: 400, y: game.paddle.y - game.ball.radius, vx: 190, vy: -280 });
  update(game, 0, 1 / 240);
  assert.equal(game.ball.vx, 190);
  assert.equal(game.ball.vy, -280);
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
