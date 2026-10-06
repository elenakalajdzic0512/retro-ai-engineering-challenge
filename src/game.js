export const WIDTH = 800;
export const HEIGHT = 600;
const PADDLE_SPEED = 460;
const PADDLE_BOUNCE_HORIZONTAL_SPEED = 240;
const PORTAL_COOLDOWN_SECONDS = 0.15;
const SHIELD_MIN_X = 170;
const SHIELD_MAX_X = 450;
const SHIELD_SPEED = 110;
const SHIELD_SEPARATION_EPSILON = 0.000001;
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
  game.portalCooldown = 0;
  game.shieldContact = false;
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

function createPortals() {
  return [
    { id: 'a', pairId: 'b', x: 100, y: 390, radius: 20 },
    { id: 'b', pairId: 'a', x: 700, y: 390, radius: 20 },
  ];
}

function createShield() {
  return { x: 310, y: 250, width: 180, height: 12, vx: SHIELD_SPEED };
}

function moveShield(shield, dt) {
  const nextX = shield.x + shield.vx * dt;
  if (nextX >= SHIELD_MAX_X) {
    shield.x = SHIELD_MAX_X - (nextX - SHIELD_MAX_X);
    shield.vx = -SHIELD_SPEED;
  } else if (nextX <= SHIELD_MIN_X) {
    shield.x = SHIELD_MIN_X + (SHIELD_MIN_X - nextX);
    shield.vx = SHIELD_SPEED;
  } else {
    shield.x = nextX;
  }
  // A substep travels at most 110/240 pixels, far less than the travel range.
  shield.x = Math.max(SHIELD_MIN_X, Math.min(SHIELD_MAX_X, shield.x));
}

function resolveShieldCollision(game) {
  const { ball, shield } = game;
  let closestX = Math.max(shield.x, Math.min(ball.x, shield.x + shield.width));
  let closestY = Math.max(shield.y, Math.min(ball.y, shield.y + shield.height));
  const dx = ball.x - closestX;
  const dy = ball.y - closestY;
  if (dx * dx + dy * dy > ball.radius * ball.radius) {
    game.shieldContact = false;
    return;
  }
  const distance = Math.hypot(dx, dy);
  const relativeX = ball.vx - shield.vx;
  let nx;
  let ny;
  if (distance > 0) {
    nx = dx / distance;
    ny = dy / distance;
  } else {
    // Nearest face; ties favor the face most opposed to relative motion.
    // Remaining ties use this stable order, with upward first at zero motion.
    const faces = [
      { depth: ball.y - shield.y, nx: 0, ny: -1 },
      { depth: shield.y + shield.height - ball.y, nx: 0, ny: 1 },
      { depth: ball.x - shield.x, nx: -1, ny: 0 },
      { depth: shield.x + shield.width - ball.x, nx: 1, ny: 0 },
    ];
    let face = faces[0];
    for (const candidate of faces.slice(1)) {
      if (candidate.depth < face.depth || (candidate.depth === face.depth &&
          relativeX * candidate.nx + ball.vy * candidate.ny < relativeX * face.nx + ball.vy * face.ny)) {
        face = candidate;
      }
    }
    ({ nx, ny } = face);
    closestX = ball.x + nx * face.depth;
    closestY = ball.y + ny * face.depth;
  }
  if (!game.shieldContact && relativeX * nx + ball.vy * ny < 0) {
    // Relative motion gates contact; actual ball velocity reflects without momentum transfer.
    const dot = ball.vx * nx + ball.vy * ny;
    ball.vx -= 2 * dot * nx;
    ball.vy -= 2 * dot * ny;
  }
  // A moving end can overtake a slow ball again next step: reflect once per contact.
  game.shieldContact = true;
  ball.x = closestX + nx * (ball.radius + SHIELD_SEPARATION_EPSILON);
  ball.y = closestY + ny * (ball.radius + SHIELD_SEPARATION_EPSILON);
}

export function createGame(config = DEFAULT_GAME_CONFIG) {
  const { lives, brickRows, brickColumns } = validateGameConfig(config);
  const game = { score: 0, lives, status: 'ready', bricks: [], bumpers: createBumpers(), portals: createPortals(), shield: createShield() };
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

function resolvePortalTeleport(game) {
  if (game.portalCooldown > 0) return;
  const { ball, portals } = game;
  for (const portal of portals) {
    // Touching the circle trigger (including exact tangency) activates the portal.
    if (Math.hypot(ball.x - portal.x, ball.y - portal.y) > portal.radius + ball.radius) continue;
    const destination = portals.find((item) => item.id === portal.pairId);
    const speed = Math.hypot(ball.vx, ball.vy);
    const dx = speed > 0 ? ball.vx / speed : 1;
    const dy = speed > 0 ? ball.vy / speed : 0;
    const exitDistance = destination.radius + ball.radius + 1e-6;
    ball.x = destination.x + dx * exitDistance;
    ball.y = destination.y + dy * exitDistance;
    game.portalCooldown = PORTAL_COOLDOWN_SECONDS;
    return; // At most one teleport per physics substep; velocity is untouched.
  }
}

function step(game, direction, dt) {
  const { paddle, ball } = game;
  paddle.x = Math.max(0, Math.min(WIDTH - paddle.width, paddle.x + direction * PADDLE_SPEED * dt));
  if (game.status === 'ready') {
    ball.x = paddle.x + paddle.width / 2;
    return;
  }
  moveShield(game.shield, dt);
  game.portalCooldown = Math.max(0, game.portalCooldown - dt);
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
  resolveShieldCollision(game);
  for (const bumper of game.bumpers) {
    if (resolveBumperCollision(ball, bumper)) break;
  }
  resolvePortalTeleport(game);
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
