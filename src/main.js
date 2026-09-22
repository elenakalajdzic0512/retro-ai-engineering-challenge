import './style.css';
import { createGame, launch, update, WIDTH, HEIGHT } from './game.js';

const canvas = document.querySelector('#game');
const context = canvas.getContext('2d');
const score = document.querySelector('#score');
const lives = document.querySelector('#lives');
const status = document.querySelector('#status');
const game = createGame();
const keys = new Set();
const controls = ['ArrowLeft', 'ArrowRight', 'a', 'd', ' '];
const messages = {
  ready: 'Press Space to launch',
  playing: 'Break every brick. Keep the ball in play.',
  won: 'You win! Press Space for a fresh game.',
  lost: 'Game over. Press Space for a fresh game.',
};

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
    context.fillStyle = colors[Math.floor(index / 8)];
    context.fillRect(brick.x, brick.y, brick.width, brick.height);
  });
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
