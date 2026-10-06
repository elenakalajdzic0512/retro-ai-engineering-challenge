export const WIDTH = 800;
export const HEIGHT = 600;
const PADDLE_SPEED = 460;
const PADDLE_BOUNCE_HORIZONTAL_SPEED = 240;
const STEP = 1 / 240;
const ARMORED_BRICK_INDICES = new Set([2, 5, 10, 13, 18, 21, 26, 29]);

export const DEFAULT_GAME_CONFIG = Object.freeze({ lives: 3, brickRows: 5, brickColumns: 8 });

export function validateGameConfig(config) {
  if (config === null || typeof config !== 'object' || Object.getPrototypeOf(config) !== Object.prototype) {
    throw new TypeError('Invalid GameConfig: expected a plain object.');
  }
  const fields = Object.keys(DEFAULT_GAME_CONFIG);
  if (Reflect.ownKeys(config).length !== fields.length || fields.some((field) => !Object.hasOwn(config, field))) {
    throw new TypeError('Invalid GameConfig: expected exactly lives, brickRows, brickColumns.');
  }
  const validated = {};
  for (const field of fields) {
    const value = Object.getOwnPropertyDescriptor(config, field).value;
    const expected = DEFAULT_GAME_CONFIG[field];
    if (!Number.isInteger(value) || value !== expected) {
      throw new TypeError(`Invalid GameConfig: ${field} must be the integer ${expected}.`);
    }
    validated[field] = value;
  }
  return validated;
}

function resetBall(game) {
  game.paddle = { x: 345, y: 552, width: 110, height: 14 };
  game.ball = { x: 400, y: 543, radius: 8, vx: 190, vy: -280 };
}

function createBumpers() {
  return [
    { id: 'left', x: 210, y: 310, radius: 24 },
    { id: 'right', x: 590, y: 310, radius: 24 },
    { id: 'center', x: 400, y: 405, radius: 24 },
  ];
}

export function createGame(config = DEFAULT_GAME_CONFIG) {
  const { lives, brickRows, brickColumns } = validateGameConfig(config);
  const game = { score: 0, lives, status: 'ready', bricks: [], bumpers: createBumpers() };
  for (let row = 0; row < brickRows; row++) {
    for (let column = 0; column < brickColumns; column++) {
      const armored = ARMORED_BRICK_INDICES.has(row * brickColumns + column);
      game.bricks.push({
        x: 44 + column * 90, y: 64 + row * 30, width: 82, height: 22, alive: true,
        kind: armored ? 'armored' : 'normal', hitsRemaining: armored ? 2 : 1,
      });
    }
  }
  resetBall(game);
  return game;
}

export function launch(game) {
  if (game.status === 'won' || game.status === 'lost') Object.assign(game, createGame());
  if (game.status === 'ready') game.status = 'playing';
}

function overlaps(ball, rect) {
  const x = Math.max(rect.x, Math.min(ball.x, rect.x + rect.width));
  const y = Math.max(rect.y, Math.min(ball.y, rect.y + rect.height));
  return (ball.x - x) ** 2 + (ball.y - y) ** 2 <= ball.radius ** 2;
}

function resolveBumperCollision(ball, bumper) {
  const dx = ball.x - bumper.x;
  const dy = ball.y - bumper.y;
  const distance = Math.hypot(dx, dy);
  const contactDistance = ball.radius + bumper.radius;
  if (distance > contactDistance) return false;

  // At coincident centers, oppose velocity; a stationary ball separates to the right.
  const speed = Math.hypot(ball.vx, ball.vy);
  const nx = distance > 0 ? dx / distance : speed > 0 ? -ball.vx / speed : 1;
  const ny = distance > 0 ? dy / distance : speed > 0 ? -ball.vy / speed : 0;
  const inwardSpeed = ball.vx * nx + ball.vy * ny;
  if (inwardSpeed < 0) {
    ball.vx -= 2 * inwardSpeed * nx;
    ball.vy -= 2 * inwardSpeed * ny;
  }
  const separation = contactDistance + 1e-6;
  ball.x = bumper.x + nx * separation;
  ball.y = bumper.y + ny * separation;
  return true;
}

function step(game, direction, dt) {
  const { paddle, ball } = game;
  paddle.x = Math.max(0, Math.min(WIDTH - paddle.width, paddle.x + direction * PADDLE_SPEED * dt));
  if (game.status === 'ready') {
    ball.x = paddle.x + paddle.width / 2;
    return;
  }
  const previousX = ball.x;
  const previousY = ball.y;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
  if (ball.x - ball.radius <= 0) {
    ball.x = ball.radius;
    ball.vx = Math.abs(ball.vx);
  } else if (ball.x + ball.radius >= WIDTH) {
    ball.x = WIDTH - ball.radius;
    ball.vx = -Math.abs(ball.vx);
  }
  if (ball.y - ball.radius <= 0) {
    ball.y = ball.radius;
    ball.vy = Math.abs(ball.vy);
  }
  if (ball.vy > 0 && previousY + ball.radius <= paddle.y && overlaps(ball, paddle)) {
    ball.y = paddle.y - ball.radius;
    ball.vy = -Math.abs(ball.vy);
    // Compare geometric boundaries directly so both exact thirds belong to center.
    if (ball.x < paddle.x + paddle.width / 3) {
      ball.vx = -PADDLE_BOUNCE_HORIZONTAL_SPEED;
    } else if (ball.x > paddle.x + 2 * paddle.width / 3) {
      ball.vx = PADDLE_BOUNCE_HORIZONTAL_SPEED;
    } else {
      ball.vx = 0;
    }
  }
  for (const brick of game.bricks) {
    if (!brick.alive || !overlaps(ball, brick)) continue;
    brick.hitsRemaining -= 1;
    if (brick.hitsRemaining === 0) {
      brick.alive = false;
      game.score += 10;
    }
    if (previousX + ball.radius <= brick.x || previousX - ball.radius >= brick.x + brick.width) {
      ball.vx *= -1;
      ball.x = previousX;
    } else {
      ball.vy *= -1;
      ball.y = previousY;
    }
    if (game.bricks.every((item) => !item.alive)) game.status = 'won';
    break;
  }
  if (game.status === 'won') return;
  for (const bumper of game.bumpers) {
    if (resolveBumperCollision(ball, bumper)) break;
  }
  if (ball.y - ball.radius > paddle.y + paddle.height) {
    game.lives -= 1;
    resetBall(game);
    game.status = game.lives === 0 ? 'lost' : 'ready';
  }
}

// Bound elapsed time and subdivide movement to avoid large jumps after slow frames.
export function update(game, direction, elapsed) {
  if (game.status === 'won' || game.status === 'lost') return;
  const initialStatus = game.status;
  let remaining = Math.max(0, Math.min(elapsed, 0.1));
  while (remaining > 0) {
    const dt = Math.min(remaining, STEP);
    step(game, Math.max(-1, Math.min(1, direction)), dt);
    remaining -= dt;
    if (game.status !== initialStatus) break;
  }
}
