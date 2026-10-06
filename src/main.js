import './style.css';
import { createGame, launch, update, WIDTH, HEIGHT } from './game.js';

const canvas = document.querySelector('#game');
const context = canvas.getContext('2d');
const score = document.querySelector('#score');
const lives = document.querySelector('#lives');
const status = document.querySelector('#status');
const aiHintButton = document.querySelector('#ai-hint-button');
const aiHintStatus = document.querySelector('#ai-hint-status');
const aiHintResult = document.querySelector('#ai-hint-result');
const game = createGame();
const keys = new Set();
const controls = ['ArrowLeft', 'ArrowRight', 'a', 'd', ' '];
const messages = {
  ready: 'Press Space to launch',
  playing: 'Break every brick. Keep the ball in play.',
  won: 'You win! Press Space for a fresh game.',
  lost: 'Game over. Press Space for a fresh game.',
};

const aiHintCategories = new Set(['movement', 'timing', 'strategy', 'general']);

function isValidAiHintResponse(value) {
  return value !== null
    && typeof value === 'object'
    && Object.getPrototypeOf(value) === Object.prototype
    && typeof value.hint === 'string'
    && value.hint.trim().length > 0
    && aiHintCategories.has(value.category);
}

aiHintButton.addEventListener('click', async () => {
  const snapshot = {
    status: game.status,
    score: game.score,
    lives: game.lives,
    bricksRemaining: game.bricks.filter((brick) => brick.alive).length,
  };
  aiHintButton.disabled = true;
  aiHintStatus.textContent = 'Getting AI hint...';
  aiHintResult.textContent = '';
  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshot),
    });
    if (!response.ok) throw new Error('AI hint request failed.');
    const result = await response.json();
    if (!isValidAiHintResponse(result)) throw new Error('AI hint response was invalid.');
    aiHintStatus.textContent = 'AI hint ready.';
    aiHintResult.textContent = `${result.category}: ${result.hint.trim()}`;
  } catch {
    aiHintStatus.textContent = 'AI hint is unavailable. Please try again.';
    aiHintResult.textContent = '';
  } finally {
    aiHintButton.disabled = false;
  }
});

window.addEventListener('keydown', (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (!controls.includes(key)) return;
  event.preventDefault();
  keys.add(key);
  if (key === ' ' && !event.repeat) launch(game);
});
window.addEventListener('keyup', (event) => {
  keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key);
});
window.addEventListener('blur', () => keys.clear());

function draw() {
  context.fillStyle = '#080d1b';
  context.fillRect(0, 0, WIDTH, HEIGHT);
  const colors = ['#ff5c9d', '#ff9270', '#ffe275', '#6de3b5', '#63cdff'];
  game.bricks.forEach((brick, index) => {
    if (!brick.alive) return;
    context.fillStyle = brick.kind === 'armored'
      ? (brick.hitsRemaining === 2 ? '#b8c4d9' : '#78859d')
      : colors[Math.floor(index / 8)];
    context.fillRect(brick.x, brick.y, brick.width, brick.height);
  });
  for (const bumper of game.bumpers) {
    context.fillStyle = '#00f5ff';
    context.beginPath();
    context.arc(bumper.x, bumper.y, bumper.radius, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#081b33';
    context.beginPath();
    context.arc(bumper.x, bumper.y, bumper.radius - 5, 0, Math.PI * 2);
    context.fill();
  }
  for (const portal of game.portals) {
    for (const [inset, color] of [[0, '#ff4dff'], [4, '#7a1cff'], [8, '#120024']]) {
      context.fillStyle = color;
      context.beginPath();
      context.arc(portal.x, portal.y, portal.radius - inset, 0, Math.PI * 2);
      context.fill();
    }
  }
  context.fillStyle = '#70f6ff';
  context.fillRect(game.paddle.x, game.paddle.y, game.paddle.width, game.paddle.height);
  context.fillStyle = '#ffffff';
  context.beginPath();
  context.arc(game.ball.x, game.ball.y, game.ball.radius, 0, Math.PI * 2);
  context.fill();
  score.textContent = `Score: ${game.score}`;
  lives.textContent = `Lives: ${game.lives}`;
  if (status.textContent !== messages[game.status]) status.textContent = messages[game.status];
  if (game.status === 'won' || game.status === 'lost') {
    context.fillStyle = '#080d1bcc';
    context.fillRect(0, 240, WIDTH, 100);
    context.fillStyle = '#ffffff';
    context.font = 'bold 36px monospace';
    context.textAlign = 'center';
    context.fillText(game.status === 'won' ? 'YOU WIN' : 'GAME OVER', WIDTH / 2, 300);
  }
}

let previousTime;
function frame(time) {
  const elapsed = previousTime === undefined ? 0 : (time - previousTime) / 1000;
  previousTime = time;
  const direction = Number(keys.has('ArrowRight') || keys.has('d')) - Number(keys.has('ArrowLeft') || keys.has('a'));
  update(game, direction, elapsed);
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
