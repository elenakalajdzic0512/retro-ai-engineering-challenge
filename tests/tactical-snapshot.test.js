import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, launch, update, WIDTH } from '../src/game.js';
import { deriveTacticalSnapshot } from '../src/tactical-snapshot.js';
import { parseTacticalSnapshot } from '../dist-server/tactical/contracts.js';

function hitBrick(game, brick) {
  Object.assign(game.ball, { x: brick.x + brick.width / 2, y: brick.y - game.ball.radius - 1, vx: 0, vy: 280 });
  update(game, 0, 1 / 240);
}

test('fresh game derives exact 40/32/8 counts and a contract-valid snapshot', () => {
  const snapshot = deriveTacticalSnapshot(createGame());
  assert.equal(snapshot.snapshotVersion, 1);
  assert.equal(snapshot.status, 'ready');
  assert.equal(snapshot.score, 0);
  assert.equal(snapshot.lives, 3);
  assert.equal(snapshot.bricksRemaining, 40);
  assert.equal(snapshot.normalBricksRemaining, 32);
  assert.equal(snapshot.armoredBricksRemaining, 8);
  assert.deepEqual(snapshot.bricksByZone, { left: 15, center: 10, right: 15 });
  assert.deepEqual(snapshot.armoredByZone, { left: 4, center: 0, right: 4 });
  assert.deepEqual(parseTacticalSnapshot(snapshot), snapshot);
  assert.ok(Buffer.byteLength(JSON.stringify(snapshot), 'utf8') <= 8192);
});

test('all 40 brick centers use arena thirds, with exact boundaries in center', () => {
  const game = createGame();
  for (let index = 0; index < game.bricks.length; index++) {
    const brick = game.bricks[index];
    const center = brick.x + brick.width / 2;
    const expected = index % 8 < 3 ? 'left' : index % 8 < 5 ? 'center' : 'right';
    assert.equal(center < WIDTH / 3 ? 'left' : center > 2 * WIDTH / 3 ? 'right' : 'center', expected);
    const isolated = createGame();
    isolated.bricks.forEach((item, otherIndex) => { item.alive = otherIndex === index; });
    const zones = deriveTacticalSnapshot(isolated).bricksByZone;
    assert.deepEqual(zones, {
      left: Number(expected === 'left'), center: Number(expected === 'center'), right: Number(expected === 'right'),
    });
  }
  const first = game.bricks[0];
  first.x = WIDTH / 3 - first.width / 2;
  assert.deepEqual(deriveTacticalSnapshot(game).bricksByZone, { left: 14, center: 11, right: 15 });
  first.x = 2 * WIDTH / 3 - first.width / 2;
  assert.deepEqual(deriveTacticalSnapshot(game).bricksByZone, { left: 14, center: 11, right: 15 });
});

test('destroying a normal brick updates counts with score-compatible result', () => {
  const game = createGame();
  launch(game);
  hitBrick(game, game.bricks[0]);
  const snapshot = deriveTacticalSnapshot(game);
  assert.equal(snapshot.score, 10);
  assert.equal(snapshot.bricksRemaining, 39);
  assert.equal(snapshot.normalBricksRemaining, 31);
  assert.deepEqual(snapshot.bricksByZone, { left: 14, center: 10, right: 15 });
  assert.deepEqual(parseTacticalSnapshot(snapshot), snapshot);
});

test('damaged armor stays alive and counted, then destruction changes armor count', () => {
  const game = createGame();
  launch(game);
  hitBrick(game, game.bricks[2]);
  assert.equal(game.bricks[2].hitsRemaining, 1);
  const damaged = deriveTacticalSnapshot(game);
  assert.equal(damaged.bricksRemaining, 40);
  assert.equal(damaged.armoredBricksRemaining, 8);
  assert.equal(damaged.score, 0);
  hitBrick(game, game.bricks[2]);
  const destroyed = deriveTacticalSnapshot(game);
  assert.equal(destroyed.bricksRemaining, 39);
  assert.equal(destroyed.armoredBricksRemaining, 7);
  assert.deepEqual(destroyed.armoredByZone, { left: 3, center: 0, right: 4 });
  assert.equal(destroyed.score, 10);
  assert.deepEqual(parseTacticalSnapshot(destroyed), destroyed);
});

test('ball horizontal and vertical velocity signs map to three categorical directions', () => {
  const game = createGame();
  for (const [vx, horizontal] of [[-1, 'left'], [0, 'neutral'], [1, 'right']]) {
    for (const [vy, vertical] of [[-1, 'up'], [0, 'neutral'], [1, 'down']]) {
      Object.assign(game.ball, { vx, vy });
      assert.deepEqual(deriveTacticalSnapshot(game).ballDirection, { horizontal, vertical });
    }
  }
});

test('shield center uses left, center, and right zones, including exact boundary ties', () => {
  const game = createGame();
  const centerAt = (x) => { game.shield.x = x - game.shield.width / 2; return deriveTacticalSnapshot(game).shield.zone; };
  assert.equal(centerAt(WIDTH / 3 - 0.001), 'left');
  assert.equal(centerAt(WIDTH / 3), 'center');
  assert.equal(centerAt(WIDTH / 2), 'center');
  assert.equal(centerAt(2 * WIDTH / 3), 'center');
  assert.equal(centerAt(2 * WIDTH / 3 + 0.001), 'right');
});

test('shield direction uses nonzero velocity sign and rejects zero velocity', () => {
  const game = createGame();
  game.shield.vx = -110;
  assert.equal(deriveTacticalSnapshot(game).shield.direction, 'left');
  game.shield.vx = 110;
  assert.equal(deriveTacticalSnapshot(game).shield.direction, 'right');
  game.shield.vx = 0;
  assert.throws(() => deriveTacticalSnapshot(game), TypeError);
});

test('portal reports available or cooldown without exposing duration', () => {
  const game = createGame();
  assert.equal(deriveTacticalSnapshot(game).portalState, 'available');
  game.portalCooldown = 0.15;
  const snapshot = deriveTacticalSnapshot(game);
  assert.equal(snapshot.portalState, 'cooldown');
  assert.equal(Object.hasOwn(snapshot, 'portalCooldown'), false);
  game.portalCooldown = 0;
  assert.equal(deriveTacticalSnapshot(game).portalState, 'available');
});

test('snapshot is independent of later game mutation and derivation never mutates game', () => {
  const game = createGame();
  const before = structuredClone(game);
  const snapshot = deriveTacticalSnapshot(game);
  assert.deepEqual(game, before);
  game.bricks[0].alive = false;
  game.shield.x += 100;
  game.ball.vx = -100;
  assert.deepEqual(snapshot, deriveTacticalSnapshot(before));
  assert.equal(Object.hasOwn(snapshot, 'bricks'), false);
  assert.equal(Object.hasOwn(snapshot, 'ball'), false);
  assert.notEqual(snapshot.bricksByZone, game.bricks);
});

test('terminal game status is preserved for later server rejection', () => {
  const game = createGame();
  game.status = 'won';
  const snapshot = deriveTacticalSnapshot(game);
  assert.equal(snapshot.status, 'won');
  assert.throws(() => parseTacticalSnapshot(snapshot));
});
