export const WIDTH = 800;
export const HEIGHT = 600;
const PADDLE_SPEED = 460;
const STEP = 1 / 240;

function resetBall(game) {
  game.paddle = { x: 345, y: 552, width: 110, height: 14 };
  game.ball = { x: 400, y: 543, radius: 8, vx: 190, vy: -280 };
}

export function createGame() {
  const game = { score: 0, lives: 3, status: 'ready', bricks: [] };
  for (let row = 0; row < 5; row++) {
    for (let column = 0; column < 8; column++) {
      game.bricks.push({ x: 44 + column * 90, y: 64 + row * 30, width: 82, height: 22, alive: true });
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
  }
  for (const brick of game.bricks) {
    if (!brick.alive || !overlaps(ball, brick)) continue;
    brick.alive = false;
    game.score += 10;
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
  if (ball.y - ball.radius > paddle.y + paddle.height) {
    game.lives -= 1;
    resetBall(game);
    game.status = game.lives === 0 ? 'lost' : 'ready';
  }
}

// Bound elapsed time and subdivide movement to avoid large jumps after slow frames.
export function update(game, direction, elapsed) {
  if (game.status === 'won' || game.status === 'lost') return;
  let remaining = Math.max(0, Math.min(elapsed, 0.1));
  while (remaining > 0) {
    const dt = Math.min(remaining, STEP);
    step(game, Math.max(-1, Math.min(1, direction)), dt);
    remaining -= dt;
    if (game.status !== 'playing') break;
  }
}
