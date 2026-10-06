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

## Hazard Arena — Later Scoped Extension (2026-10-06)

**Project**: Neon Breaker: Hazard Arena. Extend the same W03/W04 application with deterministic tactical complexity before the Week 5 bounded Tactical Planner. The planner itself is not implemented by this gameplay scope.

The sections above retain the historical Week 3 baseline, including its Out of Scope list and Definition of Done. They are not retroactively rewritten. Week 4 separately introduced the existing backend and Ask AI for Hint. Hazard Arena is a later scoped extension: only the five mechanics below are approved additions. The earlier single-hit brick rules are now specialized by Armored Bricks; the former paddle bounce is intentionally extended by Directional Paddle Bounce when that checkpoint is implemented. This does not authorize other old exclusions or arbitrary gameplay redesign.

### Approved Mechanics and Current Status

| Mechanic | Active requirement | Implementation status |
| --- | --- | --- |
| Armored Bricks | Exactly 8 armored bricks at zero-based indices 2, 5, 10, 13, 18, 21, 26, 29 within the original 40; 32 normals including index 32. Normal hits start at 1, armor at 2. First armor hit damages without scoring; second destroys for exactly 10 total points. Both reflect normally. Fresh armor is `#b8c4d9`, damaged armor `#78859d`; normal row colors are unchanged. | Implemented/verified at `0f88c3e` |
| Directional Paddle Bounce | Left/center/right contact zones give intentional, deterministic horizontal trajectory control. Valid contact always sends the ball upward with bounded speed; paddle speed/controls remain unchanged. Center-neutral vertical bounce is the planning default; thresholds/angles are specified before implementation. | PLANNED / NOT RUN |
| Neon Bumpers | Fixed circular or clearly bumper-like, indestructible obstacles; deterministic reflection; visually distinct from bricks. Placement must preserve access to every brick and avoid permanent traps. | PLANNED / NOT RUN |
| Portal Pair | Exactly one linked pair, usable in both directions, with a safe deterministic velocity/exit rule and cooldown/lockout preventing immediate teleport loops. | PLANNED / NOT RUN |
| Moving Shield Gate | Exactly one defensive barrier moving predictably from game state/time step within fixed arena bounds. It reflects the ball at its current position. | PLANNED / NOT RUN |

### Preserved Invariants

- Same application and 800×600 arena; exactly 40 total bricks, 3 initial lives, maximum score exactly 400.
- Every destroyed brick awards exactly 10 points, once. Armor never adds scoring opportunities.
- Existing ready/playing/won/lost lifecycle, Arrow/A/D controls, Space launch/restart, frame-rate-independent paddle movement and strict game configuration validation remain.
- Win only when all bricks are destroyed; lose when no lives remain. A miss removes one life and resets the ball/paddle while preserving progress as before.
- Full restart restores original brick kinds/durability/alive state, score/lives, ball/paddle and all future hazard/transient state. Terminal games remain frozen until restart.
- Bumpers, portals and shield are separate from bricks, never award score, never directly change lives or destroy bricks, and never count toward winning. Later ordinary ball collisions/misses retain their normal consequences.
- Existing Week 4 Ask AI for Hint stays available and functional with its unchanged request/response contract and backend. No automatic AI calls or AI-controlled gameplay.
- Deterministic behavior, independently testable mechanics, smallest coherent changes, no hidden score changes and no arbitrary physics randomness.

Out of scope remains: multi-ball, weapons, enemies, bosses, power-ups, score multipliers, extra levels, procedural generation, AI-controlled paddle, automatic AI gameplay, and new authentication/backend requirements.

Implementation order is Armored Bricks → Directional Paddle → Neon Bumpers → Portal Pair → Moving Shield Gate → full regression/manual smoke. Every checkpoint requires focused tests, prior tests green, typecheck, production build, applicable manual smoke and a clean checkpoint commit before proceeding.

See the [feature specification](../specs/002-neon-hazard-arena/spec.md), [implementation plan](../specs/002-neon-hazard-arena/plan.md), [tasks](../specs/002-neon-hazard-arena/tasks.md) and separate [Hazard Arena eval matrix](EVALS_HAZARD_ARENA.md). Historical Week 3 `EVALS.md` is unchanged. Only armor is complete: 92/92 tests, typecheck/build and human-reported manual smoke PASS; no future mechanic is claimed implemented.
