import { WIDTH } from './game.js';

function zoneForCenter(x) {
  if (x < WIDTH / 3) return 'left';
  if (x > 2 * WIDTH / 3) return 'right';
  return 'center';
}

function horizontalDirection(vx) {
  return vx < 0 ? 'left' : vx > 0 ? 'right' : 'neutral';
}

function verticalDirection(vy) {
  return vy < 0 ? 'up' : vy > 0 ? 'down' : 'neutral';
}

export function deriveTacticalSnapshot(game) {
  if (!Number.isFinite(game.shield.vx) || game.shield.vx === 0) {
    throw new TypeError('Shield velocity must be nonzero to derive tactical direction.');
  }
  const bricksByZone = { left: 0, center: 0, right: 0 };
  const armoredByZone = { left: 0, center: 0, right: 0 };
  let normalBricksRemaining = 0;
  let armoredBricksRemaining = 0;
  for (const brick of game.bricks) {
    if (!brick.alive) continue;
    const zone = zoneForCenter(brick.x + brick.width / 2);
    bricksByZone[zone]++;
    if (brick.kind === 'armored') {
      armoredBricksRemaining++;
      armoredByZone[zone]++;
    } else if (brick.kind === 'normal') {
      normalBricksRemaining++;
    } else {
      throw new TypeError('Unknown brick kind in tactical snapshot.');
    }
  }
  return {
    snapshotVersion: 1,
    status: game.status,
    score: game.score,
    lives: game.lives,
    bricksRemaining: normalBricksRemaining + armoredBricksRemaining,
    normalBricksRemaining,
    armoredBricksRemaining,
    bricksByZone,
    armoredByZone,
    ballDirection: {
      horizontal: horizontalDirection(game.ball.vx),
      vertical: verticalDirection(game.ball.vy),
    },
    shield: {
      zone: zoneForCenter(game.shield.x + game.shield.width / 2),
      direction: game.shield.vx < 0 ? 'left' : 'right',
    },
    portalState: game.portalCooldown > 0 ? 'cooldown' : 'available',
  };
}
