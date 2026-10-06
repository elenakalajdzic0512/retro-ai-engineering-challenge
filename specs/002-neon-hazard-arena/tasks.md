# Tasks: Neon Breaker: Hazard Arena

**Input**: [spec.md](spec.md), [plan.md](plan.md), [eval matrix](../../docs/EVALS_HAZARD_ARENA.md).
**Branch**: `week5/neon-hazard-arena`
**Status**: Checkpoints 1 and 2 are implemented and verified; checkpoints 3–6 are not executed. Checkpoint 2 commit is the commit containing this updated record.

## Setup and Foundation

No new application, dependencies or backend foundations are needed. Existing `src/game.js`, `src/main.js`, `tests/game.test.js` and `package.json` were inspected. Before each future checkpoint, check the branch/status and prior commit, review the current relevant code/tests, and record concrete expected fixtures in `docs/EVALS_HAZARD_ARENA.md` before implementing.

Every verification task below requires focused automated tests, **all prior tests green**, `npm test`, `npm run typecheck`, `npm run build`, `git diff --check`, applicable human manual smoke and a recorded revision/result. Every commit task requires a reviewed intended diff and clean working tree after one checkpoint commit before proceeding. No pushes. Unchecked tasks remain future implementation work; only the verified checkpoint 2 is included in this commit.

## Checkpoint 1 — Armored Bricks (US1, P1)

**Goal/independent test**: Exactly eight two-hit bricks within the original grid; H1–H6. **Status**: implemented and verified.

- [x] T001 [US1] Add deterministic kinds/durability and destruction-only scoring in `src/game.js`.
- [x] T002 [US1] Render fresh/damaged armor in `src/main.js` without changing normal row colors.
- [x] T003 [US1] Add six focused tests in `tests/game.test.js` for layout, two-hit lifecycle/reflection, normal collision, score ceiling, last-armored win/restart and lost-game restoration; preserve all existing tests.
- [x] T004 [US1] Verify `src/game.js`, `src/main.js` and `tests/game.test.js`: 92 passed/0 failed, typecheck/build/diff check PASS; humans report manual smoke PASS and Hint functional. Historical results are now recorded in `docs/EVALS_HAZARD_ARENA.md`, not rerun for this Markdown task.
- [x] T005 [US1] Review and commit only `src/game.js`, `src/main.js`, `tests/game.test.js` as `0f88c3e6b50fa2160b283754413b3ee8e2ba9015`, message `feat: add armored bricks to Neon Breaker`; clean working tree confirmed after commit; no push.

## Checkpoint 2 — Directional Paddle (US2, P2)

**Depends on**: T005. **Goal/independent test**: Aim left/center/right with fixed horizontal velocity and unchanged vertical magnitude; H7–H10. **Status**: implemented and verified.

For every valid descending paddle contact, the left third sets `vx = -240`, the center third sets `vx = 0`, and the right third sets `vx = +240`; `vy = -abs(previous vy)` in all zones. Exact 1/3 and 2/3 boundaries belong to center. Each contact replaces horizontal velocity from its current zone, with no accumulated spin. Vertical magnitude is preserved; total ball speed is not preserved across zones. These fixed values intentionally provide deterministic behavior, bounded speed, simple player control and testability, and a tactical aiming action a later Week 5 coach can recommend; no coach or AI contract change is implemented here.

- [x] T006 [US2] Record the approved equal thirds, center-inclusive boundaries, fixed -240/0/+240 horizontal velocities and preserved vertical magnitude in `specs/002-neon-hazard-arena/plan.md`; record H7–H10 fixtures in `docs/EVALS_HAZARD_ARENA.md`.
- [x] T007 [US2] Add focused zone/boundary/repeated-contact tests in `tests/game.test.js`; explain why the old no-spin horizontal-velocity assertion is intentionally superseded before adjusting it, preserving all unrelated assertions and tests.
- [x] T008 [US2] Implement contact-position bounce in `src/game.js`, retaining valid descending contact, paddle speed, controls, time stepping and life handling. Add no unrequested zone UI.
- [x] T009 [US2] Run all checkpoint gates, 60/120 FPS movement regression and manual trajectory/Hint smoke; record observed results in `docs/EVALS_HAZARD_ARENA.md`.
- [x] T010 [US2] Review `src/game.js`, `tests/game.test.js` and related evidence; checkpoint commit: the commit containing this record, `feat: add directional paddle bounce`. No bumpers started and no push.

## Checkpoint 3 — Neon Bumpers (US3, P3)

**Depends on**: T010. **Goal/independent test**: Fixed indestructible deflection without scoring; H11–H14.

- [ ] T011 [US3] Define fixed bumper count/geometry/coordinates, visual distinction, reflection/separation rules and collision priority in `specs/002-neon-hazard-arena/plan.md`; record H11–H14 and brick-access fixtures in `docs/EVALS_HAZARD_ARENA.md`.
- [ ] T012 [US3] Add collision, tangent/repeated-contact, indestructibility, speed-bound, no score/life/durability/count changes and restart tests in `tests/game.test.js`.
- [ ] T013 [US3] Add separate fixed bumper state/reflection in `src/game.js` and distinct rendering in `src/main.js`; exclude bumpers from scoring and win logic.
- [ ] T014 [US3] Run all checkpoint gates and manual bumper/layout/Hint smoke, including brick reachability; record actual results in `docs/EVALS_HAZARD_ARENA.md`.
- [ ] T015 [US3] Review `src/game.js`, `src/main.js`, `tests/game.test.js` and related evidence; create one clean Neon Bumpers checkpoint commit before portals.

## Checkpoint 4 — Portal Pair (US4, P4)

**Depends on**: T015. **Goal/independent test**: Exactly one bidirectional pair without loops; H15–H19.

- [ ] T016 [US4] Define two fixed portal geometries, links, safe exits, velocity rule, cooldown duration/separation lockout and contact priority in `specs/002-neon-hazard-arena/plan.md`; record H15–H19 expectations in `docs/EVALS_HAZARD_ARENA.md`.
- [ ] T017 [US4] Add both-direction, immediate/repeated-overlap, lockout-expiry/re-entry, safe-exit/bounded-velocity, no score/life/brick mutation, miss/reset and restart tests in `tests/game.test.js`.
- [ ] T018 [US4] Implement exactly one linked pair and simulation-time lockout in `src/game.js`; render distinct linked portals in `src/main.js`; add no backend or AI fields.
- [ ] T019 [US4] Run all checkpoint gates and manual both-direction/anti-loop/layout/Hint smoke; record actual results in `docs/EVALS_HAZARD_ARENA.md`.
- [ ] T020 [US4] Review `src/game.js`, `src/main.js`, `tests/game.test.js` and related evidence; create one clean Portal Pair checkpoint commit before the shield.

## Checkpoint 5 — Moving Shield Gate (US5, P5)

**Depends on**: T020. **Goal/independent test**: One predictable bounded moving reflector; H20–H23.

- [ ] T021 [US5] Define one shield's geometry, start position/direction, path, speed, travel bounds, overshoot handling and movement/contact order in `specs/002-neon-hazard-arena/plan.md`; record H20–H23 expectations in `docs/EVALS_HAZARD_ARENA.md`.
- [ ] T022 [US5] Add bounds/overshoot, identical-state/time-step determinism, current-position reflection, bounded ball speed, no direct score/life/brick changes, lifecycle freeze and restart tests in `tests/game.test.js`.
- [ ] T023 [US5] Implement one shield's state/time-step movement and collision in `src/game.js`; render its current position in `src/main.js`; preserve portal exit clearance across the entire sweep.
- [ ] T024 [US5] Run all checkpoint gates and manual gate/bounds/combined-layout/Hint smoke; record actual results in `docs/EVALS_HAZARD_ARENA.md`.
- [ ] T025 [US5] Review `src/game.js`, `src/main.js`, `tests/game.test.js` and related evidence; create one clean Moving Shield Gate checkpoint commit before full regression.

## Checkpoint 6 — Full Hazard Arena Regression and Manual Smoke

**Depends on**: T025. **Independent acceptance**: H1–H31 on the combined arena, not just individual checkpoints.

- [ ] T026 Add focused combined fixtures in `tests/game.test.js` for mixed contacts, score ≤400, final-armored win, one-life misses/zero-life loss, ready/terminal freezing and complete restart of all hazard/transient state. Preserve existing W03/W04 tests.
- [ ] T027 Run all focused tests and the full `npm test`, `npm run typecheck`, `npm run build`, `git diff --check`; record exact revision/results and any failures against H1–H30 in `docs/EVALS_HAZARD_ARENA.md`.
- [ ] T028 Perform human full browser smoke: five mechanics together, all-brick access, controls/launch/miss/win/loss/restart, Hint success/failure without gameplay interruption; record actual H27/H31 evidence, reviewer/driver participation and limitations in `docs/EVALS_HAZARD_ARENA.md` and `docs/AI_USAGE_LOG.md`.
- [ ] T029 Reconcile completion states and requirements in `specs/002-neon-hazard-arena/spec.md`, `specs/002-neon-hazard-arena/tasks.md`, `docs/GAME_SPEC.md` and `docs/EVALS_HAZARD_ARENA.md`; preserve historical armor results and do not mark unexecuted evaluations PASS.
- [ ] T030 Review final intended regression/evidence diff including `tests/game.test.js` and `docs/EVALS_HAZARD_ARENA.md`; create one clean full-regression checkpoint commit before any later Tactical Planner work. Do not push.

## Dependencies and Execution Strategy

`T001–T005 → T006–T010 → T011–T015 → T016–T020 → T021–T025 → T026–T030`.

US1 is the completed smallest playable increment; US2 is now also implemented and verified. Each later story has isolated fixtures but follows the preceding verified commit. All five are required for final Core Hazard Arena. Tasks execute serially because mechanics share the same engine, renderer and test file; there are no safe independent implementation tracks here, so no `[P]` tasks are assigned. A partner may review a fixed diff while the driver prepares observations, but join before edits, gate runs or commits.

Never infer PASS from generated code. Document old/new expectations before any intentional test adjustment. Any failed gate blocks advancing to the next checkpoint; preserve the failure record. This checkpoint commits Directional Paddle runtime changes with aligned documentation/evidence under explicit user authorization; no push is authorized.
