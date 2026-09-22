# Neon Breaker — Game Specification

## Project Name

Neon Breaker

## Game Description

Neon Breaker is a small retro-inspired browser game based on the core brick-breaking gameplay mechanic. The player controls a paddle at the bottom of the screen and uses it to keep a moving ball in play. The ball destroys bricks when it collides with them and increases the player's score. The objective is to destroy all bricks before all available lives are lost.

## Player Goal and Controls

### Goal

Destroy all bricks while preventing the ball from falling below the paddle.

### Controls

- Left Arrow or `A` — move paddle left
- Right Arrow or `D` — move paddle right
- `Space` — start or restart the round when applicable

## Core Game Loop

1. The game starts with the paddle, ball and brick grid visible.
2. The ball moves continuously.
3. The player moves the paddle horizontally.
4. The ball bounces from walls and the paddle.
5. When the ball hits a brick, that brick is removed and the score increases.
6. If the ball falls below the paddle, the player loses one life and the ball is reset.
7. The loop continues until the player wins or loses.

## Win Condition

The player wins when all bricks have been destroyed.

## Lose Condition

The player loses when the ball is missed and no lives remain.

## Key Gameplay Rules

1. The paddle can move only horizontally.
2. The paddle must remain inside the game area.
3. The ball must bounce from the left, right and top boundaries.
4. The ball must bounce when it collides with the paddle.
5. A brick is removed after a valid collision with the ball.
6. Destroying a brick increases the score.
7. Missing the ball removes exactly one life and resets the ball.
8. The game ends immediately when either the win or lose condition is reached.

## Minimum Visual Requirement

The game must run in the browser and display:

- a clearly visible game area;
- player paddle;
- moving ball;
- brick grid;
- current score;
- remaining lives;
- win or lose state.

The visual style should be simple and retro-inspired. Gameplay clarity is more important than advanced visual effects.

## Out of Scope

The following features are explicitly outside the Week 3 scope:

- multiplayer;
- login or user accounts;
- online leaderboard;
- database or backend service;
- procedural level generation;
- custom audio or music;
- AI-controlled gameplay;
- power-ups;
- multiple levels;
- advanced animations or particle systems;
- deployment infrastructure.

## Definition of Done

The Week 3 game baseline is considered complete when all of the following can be demonstrated:

- the game opens and runs in a browser;
- the paddle responds to the defined controls;
- the paddle cannot leave the game area;
- the ball moves and correctly interacts with walls and the paddle;
- brick collisions remove bricks and update the score;
- missing the ball removes one life and resets the ball;
- reaching zero lives produces a lose state;
- destroying all bricks produces a win state;
- the game can be restarted;
- no functionality listed as out of scope has been added.
