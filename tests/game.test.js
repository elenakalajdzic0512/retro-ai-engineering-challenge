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

const EXPECTED_BUMPERS = [
  { id: 'left', x: 210, y: 310, radius: 24 },
  { id: 'right', x: 590, y: 310, radius: 24 },
  { id: 'center', x: 400, y: 405, radius: 24 },
];

// Place the ball at a controlled contact point after one movement substep.
function bumperContact(game, bumper, offsetX, offsetY, vx, vy) {
  const dt = 1 / 240;
  Object.assign(game.ball, {
    x: bumper.x + offsetX - vx * dt,
    y: bumper.y + offsetY - vy * dt,
    vx, vy,
  });
  update(game, 0, dt);
}

function assertClose(actual, expected) {
  // Reflection normalization introduces only floating-point rounding error.
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);
}

test('fresh games contain exactly the approved three bumpers with independent objects', () => {
  const game = createGame();
  const other = createGame();
  assert.deepEqual(game.bumpers, EXPECTED_BUMPERS);
  assert.equal(game.bricks.length, 40);
  assert.notEqual(game.bumpers, other.bumpers);
  game.bumpers.forEach((bumper, index) => assert.notEqual(bumper, other.bumpers[index]));
  game.bumpers[0].x = 0;
  assert.deepEqual(other.bumpers, EXPECTED_BUMPERS);
  assert.deepEqual(createGame().bumpers, EXPECTED_BUMPERS);
});

test('direct collisions on every bumper reflect away and separate the ball', () => {
  for (let index = 0; index < 3; index++) {
    const game = playing();
    const bumper = game.bumpers[index];
    bumperContact(game, bumper, -32, 0, 240, 0);
    assert.equal(game.ball.vx, -240);
    assert.equal(game.ball.vy, 0);
    assert.ok(Number.isFinite(game.ball.vx) && Number.isFinite(game.ball.vy));
    assert.ok(Math.hypot(game.ball.x - bumper.x, game.ball.y - bumper.y) >= 32);
    const separatedX = game.ball.x;
    update(game, 0, 0.01);
    assert.ok(game.ball.x < separatedX);
    assert.equal(game.ball.vx, -240);
  }
});

test('angled bumper reflection follows the surface normal and preserves speed', () => {
  const game = playing();
  const bumper = game.bumpers[0];
  // Normal (0.6, 0.8), incoming (-200, 100): dot=-40, outgoing=(-152, 164).
  bumperContact(game, bumper, 18.6, 24.8, -200, 100);
  assertClose(game.ball.vx, -152);
  assertClose(game.ball.vy, 164);
  assertClose(Math.hypot(game.ball.vx, game.ball.vy), Math.hypot(-200, 100));
  assert.ok(game.ball.vx * 0.6 + game.ball.vy * 0.8 > 0);
  assert.ok(Math.hypot(game.ball.x - bumper.x, game.ball.y - bumper.y) >= 32);
});

test('bumper contact preserves score lives status paddle and all brick state', () => {
  const game = playing();
  hitBrick(game, game.bricks[0]);
  hitBrick(game, game.bricks[2]);
  const before = structuredClone(game);
  bumperContact(game, game.bumpers[0], 0, -32, 0, 280);
  assert.equal(game.ball.vy, -280);
  for (const field of ['score', 'lives', 'status', 'paddle', 'bricks', 'bumpers']) {
    assert.deepEqual(game[field], before[field]);
  }
  assert.equal(game.bricks.length, 40);
  assert.equal(game.bricks.filter((brick) => brick.alive).length, 39);
});

test('repeated bumper impacts preserve speed and leave all bumpers indestructible', () => {
  const game = playing();
  for (let hit = 0; hit < 60; hit++) {
    const bumper = game.bumpers[hit % 3];
    // Same normal, tangential speed 100 and inward normal speed 240.
    bumperContact(game, bumper, 18.6, 24.8, -224, -132);
    assertClose(game.ball.vx, 64);
    assertClose(game.ball.vy, 252);
    assertClose(Math.hypot(game.ball.vx, game.ball.vy), 260);
    assert.deepEqual(game.bumpers, EXPECTED_BUMPERS);
  }
  assert.equal(game.score, 0);
  assert.equal(game.lives, 3);
});

test('overlapping balls moving away are separated without reflection or jitter', () => {
  const game = playing();
  const bumper = game.bumpers[0];
  bumperContact(game, bumper, -31, 0, -240, 0);
  assert.equal(game.ball.vx, -240);
  assert.equal(game.ball.vy, 0);
  assert.ok(bumper.x - game.ball.x >= 32);
  for (let step = 0; step < 10; step++) {
    const x = game.ball.x;
    update(game, 0, 1 / 240);
    assert.equal(game.ball.vx, -240);
    assert.ok(game.ball.x < x);
  }
});

test('tangent bumper contact and a near miss leave velocity unchanged', () => {
  for (const offsetX of [32, 32.01]) {
    const game = playing();
    const bumper = game.bumpers[0];
    bumperContact(game, bumper, offsetX, 0, 0, 240);
    assert.equal(game.ball.vx, 0);
    assert.equal(game.ball.vy, 240);
    if (offsetX > 32) assertClose(game.ball.x, bumper.x + offsetX);
  }
});

test('coincident bumper centers have a deterministic finite fallback even at zero speed', () => {
  for (const [vx, vy] of [[240, 0], [0, 0]]) {
    const game = playing();
    const bumper = game.bumpers[0];
    bumperContact(game, bumper, 0, 0, vx, vy);
    for (const field of ['x', 'y', 'vx', 'vy']) assert.ok(Number.isFinite(game.ball[field]));
    assertClose(game.ball.vx, vx === 0 ? 0 : -vx);
    assertClose(game.ball.vy, 0);
    assertClose(Math.hypot(game.ball.vx, game.ball.vy), Math.hypot(vx, vy));
    assert.ok(Math.hypot(game.ball.x - bumper.x, game.ball.y - bumper.y) >= 32);
    const repeated = playing();
    bumperContact(repeated, repeated.bumpers[0], 0, 0, vx, vy);
    assert.deepEqual(repeated.ball, game.ball);
  }
});

test('won and lost restarts restore fresh approved bumper layouts', () => {
  for (const status of ['won', 'lost']) {
    const game = playing();
    const oldBumpers = game.bumpers;
    oldBumpers[0].radius = 1;
    oldBumpers.pop();
    game.status = status;
    launch(game);
    assert.deepEqual(game.bumpers, EXPECTED_BUMPERS);
    assert.notEqual(game.bumpers, oldBumpers);
    assert.notEqual(game.bumpers[0], oldBumpers[0]);
    assert.deepEqual(game, playing());
  }
});

const EXPECTED_PORTALS = [
  { id: 'a', pairId: 'b', x: 100, y: 390, radius: 20 },
  { id: 'b', pairId: 'a', x: 700, y: 390, radius: 20 },
];

function enterPortal(game, index = 0, vx = 190, vy = -280, offsetX = 0) {
  const portal = game.portals[index];
  const dt = 1 / 240;
  Object.assign(game.ball, {
    x: portal.x + offsetX - vx * dt, y: portal.y - vy * dt, vx, vy,
  });
  update(game, 0, dt);
}

test('fresh games have exactly two approved linked portals and zero cooldown', () => {
  const game = createGame();
  const other = createGame();
  assert.deepEqual(game.portals, EXPECTED_PORTALS);
  assert.equal(game.portalCooldown, 0);
  assert.notEqual(game.portals, other.portals);
  game.portals.forEach((portal, index) => assert.notEqual(portal, other.portals[index]));
  game.portals[0].x = 0;
  assert.deepEqual(other.portals, EXPECTED_PORTALS);
  assert.deepEqual(createGame().portals, EXPECTED_PORTALS);
});

for (const [source, target] of [[0, 1], [1, 0]]) {
  test(`portal ${source === 0 ? 'A -> B' : 'B -> A'} preserves velocity and exits right/up outside the trigger`, () => {
    const game = playing();
    const destination = game.portals[target];
    enterPortal(game, source);
    assert.equal(game.ball.vx, 190);
    assert.equal(game.ball.vy, -280);
    assert.ok(game.ball.x > destination.x);
    assert.ok(game.ball.y < destination.y);
    const distance = destination.radius + game.ball.radius + 1e-6;
    const speed = Math.hypot(190, -280);
    assertClose(game.ball.x, destination.x + 190 / speed * distance);
    assertClose(game.ball.y, destination.y - 280 / speed * distance);
    assert.ok(Math.hypot(game.ball.x - destination.x, game.ball.y - destination.y) > 28);
    assert.equal(game.portalCooldown, 0.15);
  });
}

test('portal exit follows negative horizontal and positive vertical velocity too', () => {
  const game = playing();
  enterPortal(game, 0, -190, 280);
  assert.ok(game.ball.x < game.portals[1].x);
  assert.ok(game.ball.y > game.portals[1].y);
  assert.equal(game.ball.vx, -190);
  assert.equal(game.ball.vy, 280);
});

test('portal cooldown prevents immediate ping-pong and blocks both triggers', () => {
  const game = playing();
  enterPortal(game);
  const ball = { ...game.ball };
  update(game, 0, 1 / 240);
  assertClose(game.ball.x, ball.x + ball.vx / 240);
  assertClose(game.ball.y, ball.y + ball.vy / 240);
  assertClose(game.portalCooldown, 0.15 - 1 / 240);
  for (const index of [0, 1]) {
    const before = game.portalCooldown;
    enterPortal(game, index, 0, 0);
    assert.equal(game.ball.x, game.portals[index].x);
    assert.equal(game.ball.y, game.portals[index].y);
    assertClose(game.portalCooldown, before - 1 / 240);
  }
});

test('portal cooldown expires using simulation time and allows later entry', () => {
  const game = playing();
  enterPortal(game);
  Object.assign(game.ball, { x: 400, y: 250, vx: 0, vy: 0 });
  update(game, 0, 0.1);
  assertClose(game.portalCooldown, 0.05);
  update(game, 0, 0.06);
  assert.equal(game.portalCooldown, 0);
  enterPortal(game, 1);
  assert.ok(game.ball.x > 100 && game.ball.x < 128);
  assert.equal(game.portalCooldown, 0.15);
});

test('zero-velocity portal entry uses a finite deterministic positive-X exit', () => {
  const game = playing();
  enterPortal(game, 0, 0, 0);
  assertClose(game.ball.x, 728.000001);
  assert.equal(game.ball.y, 390);
  assert.equal(game.ball.vx, 0);
  assert.equal(game.ball.vy, 0);
  const ball = { ...game.ball };
  update(game, 0, 0.1);
  update(game, 0, 0.1);
  assert.deepEqual(game.ball, ball); // Exit separation prevents re-entry even after expiry.
  assert.equal(game.portalCooldown, 0);
});

test('portal trigger includes exact tangency but excludes a near miss', () => {
  for (const offset of [-28, 28, -28.0001, 28.0001]) {
    const game = playing();
    enterPortal(game, 0, 0, 0, offset);
    if (Math.abs(offset) === 28) {
      assertClose(game.ball.x, 728.000001);
      assert.equal(game.portalCooldown, 0.15);
    } else {
      assertClose(game.ball.x, 100 + offset);
      assert.equal(game.portalCooldown, 0);
    }
  }
});

test('teleport preserves score lives status paddle bricks bumpers and portal layout', () => {
  const game = playing();
  hitBrick(game, game.bricks[0]);
  hitBrick(game, game.bricks[2]);
  const before = structuredClone(game);
  enterPortal(game);
  for (const field of ['score', 'lives', 'status', 'paddle', 'bricks', 'bumpers', 'portals']) {
    assert.deepEqual(game[field], before[field]);
  }
  assert.equal(game.bricks.length, 40);
  assert.equal(game.bricks.filter((brick) => brick.alive).length, 39);
  assert.equal(game.bricks[2].hitsRemaining, 1);
});

test('won and lost restarts restore fresh portals and clear an active cooldown', () => {
  for (const status of ['won', 'lost']) {
    const game = playing();
    enterPortal(game);
    assert.equal(game.portalCooldown, 0.15);
    const oldPortals = game.portals;
    oldPortals[0].pairId = 'changed';
    oldPortals.pop();
    game.status = status;
    launch(game);
    assert.deepEqual(game.portals, EXPECTED_PORTALS);
    assert.notEqual(game.portals, oldPortals);
    assert.notEqual(game.portals[0], oldPortals[0]);
    assert.equal(game.portalCooldown, 0);
    assert.deepEqual(game, playing());
  }
});

test('a miss clears portal cooldown while preserving layout and gameplay progress', () => {
  const game = playing();
  hitBrick(game, game.bricks[0]);
  enterPortal(game);
  Object.assign(game.ball, { x: 20, y: 580, vx: 0, vy: 280 });
  update(game, 0, 1 / 240);
  assert.equal(game.portalCooldown, 0);
  assert.equal(game.status, 'ready');
  assert.equal(game.lives, 2);
  assert.equal(game.score, 10);
  assert.deepEqual(game.portals, EXPECTED_PORTALS);
});

test('portal cooldown and activation stay frozen outside playing', () => {
  for (const status of ['ready', 'won', 'lost']) {
    const game = createGame();
    game.status = status;
    game.portalCooldown = 0.1;
    Object.assign(game.ball, { x: 100, y: 390, vx: 0, vy: 0 });
    update(game, 0, 0.1);
    assert.equal(game.portalCooldown, 0.1);
    assert.equal(game.ball.y, 390);
    assert.equal(game.status, status);
  }
});
