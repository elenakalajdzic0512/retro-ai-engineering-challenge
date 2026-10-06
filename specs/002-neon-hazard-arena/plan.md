# Implementation Plan: Neon Breaker: Hazard Arena

**Branch**: `week5/neon-hazard-arena` | **Date**: 2026-10-06 | **Spec**: [spec.md](spec.md)

## Summary

Extend the existing Canvas game in six serial checkpoints, preserving W03 regressions and W04 Hint. Armor is complete at `0f88c3e`; Directional Paddle Bounce is implemented and verified in checkpoint 2. Neon Bumpers is verified at `1999735`; Portal Pair is implemented and verified at checkpoint 4. Moving Shield Gate and full-arena regression remain planned. Checkpoint 2 includes only the approved engine/test changes and their documentation; no dependency, backend or AI contract changes.

## Technical Context

- **Language/platform**: Existing browser JavaScript ES modules and Canvas; existing TypeScript backend remains untouched.
- **Dependencies/storage**: Existing Vite and Node test runner; no new dependencies, persistence or APIs.
- **Testing**: `node:test` / `node:assert/strict` gameplay fixtures in `tests/game.test.js`; full `npm test` also compiles and tests the existing server using deterministic provider fixtures.
- **Verification**: `npm test`, `npm run typecheck`, `npm run build`, `git diff --check`, and human browser smoke. The existing typecheck covers server TypeScript, not browser JavaScript; gameplay tests and browser checks are essential.
- **Timing**: Preserve `update()`'s 0.1-second elapsed cap, at-most-1/240-second substeps, and stop-on-status-change behavior. No wall clock, random source, asynchronous work or AI calls in physics.
- **Scale**: One 800×600 playfield, 40 bricks, one ball/paddle, small fixed bumper layout, two portals, one gate.

## Constitution Check

The current constitution explicitly governs Week 4. Its no-gameplay-redesign scope describes that historical delivery; the user's later Hazard Arena authorization defines this pre-Week-5 extension. No constitutional amendment or retroactive W04 compliance is claimed.

| Principle | Design disposition |
| --- | --- |
| Small scope / change discipline (I, XI) | Only five locked mechanics; reuse existing application and files; serial checkpoints. |
| Architecture, secrets, contracts, reliability/provider discipline (II–VII) | Existing W04 boundary retained; no backend/provider/contract changes or new live calls in this documentation task. |
| Regression safety (VIII) | Preserve full suite; explicitly document the planned replacement of the old no-spin paddle expectation before adjusting that test. |
| Evidence (IX) | Armor results are historical observed/user-reported evidence; future evaluations remain NOT RUN. |
| Human accountability (X) | Elena + Isidora report working together in one environment now. Do not infer past W04 role swaps or claim unresolved historical pair-review gates are closed. Record actual future reviewer/driver roles when performed. |

Pre-design and post-design assessment: the documentation respects these boundaries. Checkpoint 2 automated gates pass and Elena + Isidora report manual smoke PASS. Checkpoint 3 evidence is recorded in the eval matrix; checkpoint 4 automated and human manual gates pass. Checkpoints 5–6 remain unexecuted.

## Project Structure

```text
specs/002-neon-hazard-arena/
  spec.md
  plan.md
  tasks.md
  checklists/requirements.md
docs/
  GAME_SPEC.md              # append active extension; retain baseline
  EVALS_HAZARD_ARENA.md     # new H1–H31 evidence matrix
  AI_USAGE_LOG.md           # append dated pair entry
src/game.js                 # future mechanics and state
src/main.js                 # future hazard rendering only
tests/game.test.js          # focused and combined regressions
```

No new `contracts/` is needed. Research, state design and validation guidance are kept here to avoid redundant documents. Existing W04 specs, docs/EVALS.md and backend contracts remain untouched. The local `.specify/feature.json` currently points to feature 001; this documentation task leaves it unchanged. Future SpecKit invocations must explicitly select `SPECIFY_FEATURE_DIRECTORY=specs/002-neon-hazard-arena` rather than relying on that pointer.

## Design Decisions and State

1. **Reuse current engine**: Keep geometry and physics in `src/game.js`, rendering in `src/main.js`. A new physics library or app adds unnecessary change surface.
2. **Completed armor**: Each brick has `kind` and `hitsRemaining`; collision decrements durability, awarding 10 only at zero. Restart already recreates the grid. Colors are `#b8c4d9` fresh and `#78859d` damaged; normal row colors are unchanged.
3. **Implemented directional paddle**: For every valid descending paddle contact, the left third sets `vx = -240`, the center third sets `vx = 0`, and the right third sets `vx = +240`; `vy = -abs(previous vy)` in all zones. Exact 1/3 and 2/3 boundaries belong to center. Each contact replaces horizontal velocity from its current zone, with no accumulated spin. Vertical magnitude is preserved; total ball speed is not preserved across zones. The engine compares world-space contact x directly with `paddle.x + paddle.width / 3` and `paddle.x + 2 * paddle.width / 3` to avoid normalization rounding at exact boundaries. Small valid edge overlaps take the nearest side zone. Preserve paddle movement at 460 px/s and existing descending-contact/separation guards. These fixed values intentionally provide deterministic behavior, bounded speed, simple player control and testability, and a tactical aiming action a later Week 5 coach can recommend; no coach or AI contract change is implemented here.
4. **Planned bumpers**: Store fixed geometry separately from bricks. Prefer a small circle layout with normal-vector reflection and separation after contact. Define radius/count/coordinates and tangent/overlap policy before tests. Reflect only valid incoming contacts and maintain bounded velocity. Layout must leave brick access and return paths open.
5. **Implemented portals**: Fresh `game.portals` objects are A `{ id: "a", pairId: "b", x: 100, y: 390, radius: 20 }` and B `{ id: "b", pairId: "a", x: 700, y: 390, radius: 20 }`. Trigger when center distance ≤ combined radii, including exact tangency. Preserve `vx`/`vy` exactly; place the ball at destination center + normalized current velocity × (combined radii + `1e-6` pixels), using +X for zero speed. `portalCooldown` starts at zero, becomes 0.15 seconds on teleport, and decreases by each playing substep’s simulation `dt` before movement, clamped at zero. Positive cooldown blocks both portals; no wall-clock timer or leave-overlap latch is used. Exit separation plus cooldown prevent immediate loops. Resolve at most one teleport after walls/paddle/bricks/win check/bumpers and before miss handling. Miss/ball reset clears cooldown; full restart recreates both objects and zero cooldown. Purple layered circles use `#ff4dff`, `#7a1cff`, `#120024` without labels. Current exits clear the arena and existing colliders; the future shield must preserve that clearance.
6. **Planned shield**: Store one rectangle with travel bounds, position and direction or phase. Prefer horizontal constant-speed movement with reflected endpoints; account for overshoot. Reflect the ball at the current position without adding shield speed to ball speed. Define the movement/collision order before tests.
7. **Shared lifecycle**: Initialize hazard state in `createGame()`. Update movement/timers only in playing; freeze other states. Preserve positions/progress after a miss, clear lockout for the reset ball; full restart reconstructs all state. No hazard can write score, brick durability or lives directly.
8. **Collision integration**: Retain existing walls/paddle/bricks behavior except the approved paddle change. Define deterministic priority for mixed portal/solid contacts before integrating each mechanic, and resolve overlap without repeat-hit loops. Add combined fixtures instead of relying solely on isolated tests.

Paddle tuning is resolved above. Remaining hazard layout/tuning choices are deliberately not represented as approved implementation facts. Each checkpoint starts by recording constants, expected outcomes, contact ordering and edge cases in this plan and the eval matrix before writing runtime changes. These are bounded implementation decisions, not an expansion of the locked scope.

## Checkpoint Order and Gates

| Checkpoint | Scope / evaluations | Current state |
| --- | --- | --- |
| 1 | Armored Bricks; H1–H6 plus regression | Implemented/verified, committed `0f88c3e` |
| 2 | Directional Paddle; H7–H10 | Implemented/verified — 99/99 tests; typecheck/build/manual smoke PASS |
| 3 | Neon Bumpers; H11–H14 | PLANNED / NOT RUN |
| 4 | Portal Pair; H15–H19 | COMPLETE — 120/120 tests; typecheck/build/diff check/manual smoke PASS |
| 5 | Moving Shield Gate; H20–H23 | PLANNED / NOT RUN |
| 6 | Full Hazard Arena regression; H1–H31 | PLANNED / NOT RUN |

For every checkpoint: define expectations, add/run focused automated tests, keep all previous tests green, run `npm test`, `npm run typecheck`, `npm run build`, and `git diff --check`; manually smoke-test visual/interactive behavior and Hint. Record exact revision, command results and human observations in the matrix. Review the diff and create one clean checkpoint commit before proceeding. For checkpoint 6, commit the final verified regression/evidence work before any later feature. No push is part of this plan.

Do not delete or weaken tests. The former test `descending ball reflects from paddle without spin` asserted unchanged horizontal speed at center contact. FR-004 intentionally supersedes that expectation: center now sets horizontal velocity to zero. It was replaced with eight focused tests retaining valid-contact, upward reflection and life-preservation coverage and adding zones, boundaries, velocity replacement, repeated-hit bounds, edge overlaps and ascending-contact rejection. Existing normal-brick index 32 and win tests remain valid.

## Validation Guide

- Use `npm run dev` and the existing configured API setup when checking Hint; follow existing W04 setup without changing provider settings or secrets. No live request is needed for this Markdown task.
- Reproduce H1–H6 at the armor checkpoint. At later checkpoints, verify zone aiming, bumper deflection, both portal directions and anti-loop behavior, and shield motion/contacts with fixed fixtures.
- At each stage, check Arrow/A/D, Space launch, one-life misses, ready state, zero-life loss, all-brick win, full restart and preserved Hint success/failure behavior. Do not equate an automated fake-provider result with a live request.
- For motion changes, compare equal simulated time at 60/120 FPS as appropriate and retain existing non-boundary paddle checks. Test terminal-state freezing, repeated contacts and large elapsed frames.
- Final manual smoke must confirm the combined layout is playable and every brick remains reachable; record observed limitations instead of asserting mathematical reachability from a screenshot.

## Risks and Complexity

Primary risks are overlap double-hits, teleport re-entry, gate overshoot, inaccessible bricks and velocity growth. Focused fixtures plus combined simulation and human smoke address them. The historical 1280×720 viewport limitation remains outside scope. No new architectural layers are needed. The later Week 5 Tactical Planner and any expanded AI snapshot require their own specification and authorization.
