# Tasks: Neon Breaker: Hazard Arena

**Input**: [spec.md](spec.md), [plan.md](plan.md), [eval matrix](../../docs/EVALS_HAZARD_ARENA.md).
**Branch**: `week5/neon-hazard-arena`
**Status**: COMPLETE — all six Hazard Arena checkpoints are verified. Checkpoint 2 is `0b235f8`; checkpoint 3 is `1999735`; checkpoint 4 is `dcdf6f1`; checkpoint 5 is `75cbb97`; checkpoint 6 final acceptance is the documentation commit containing this record.

## Setup and Foundation

No new application, dependencies or backend foundations are needed. Existing `src/game.js`, `src/main.js`, `tests/game.test.js` and `package.json` were inspected. Before each future checkpoint, check the branch/status and prior commit, review the current relevant code/tests, and record concrete expected fixtures in `docs/EVALS_HAZARD_ARENA.md` before implementing.

Every verification task below requires focused automated tests, **all prior tests green**, `npm test`, `npm run typecheck`, `npm run build`, `git diff --check`, applicable human manual smoke and a recorded revision/result. Every commit task requires a reviewed intended diff and clean working tree after one checkpoint commit before proceeding. No pushes. All checkpoint tasks are closed; this commit contains only final acceptance documentation.

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
- [x] T010 [US2] Review `src/game.js`, `tests/game.test.js` and related evidence; checkpoint commit: `0b235f8`, `feat: add directional paddle bounce`. At that checkpoint no bumpers had started and no push occurred.

## Checkpoint 3 — Neon Bumpers (US3, P3)

**Depends on**: T010. **Goal/independent test**: Fixed indestructible deflection without scoring; H11–H14. **Status**: COMPLETE — 108/108 tests, typecheck/build/diff check PASS and Elena + Isidora report manual smoke PASS.

- [x] T011 [US3] Implement the explicitly approved three circles: left (210,310), right (590,310), center (400,405), radius 24. Record exact layout, normal reflection, separation, collision order and H11–H14/brick-access evidence in `docs/EVALS_HAZARD_ARENA.md`; existing spec/plan behavior needs no rewrite.
- [x] T012 [US3] Add collision, tangent/repeated-contact, indestructibility, speed-bound, no score/life/durability/count changes and restart tests in `tests/game.test.js`.
- [x] T013 [US3] Add separate fixed bumper state/reflection in `src/game.js` and distinct rendering in `src/main.js`; exclude bumpers from scoring and win logic.
- [x] T014 [US3] Run all checkpoint gates and manual bumper/layout/Hint smoke, including brick reachability; record actual results in `docs/EVALS_HAZARD_ARENA.md`.
- [x] T015 [US3] Review `src/game.js`, `src/main.js`, `tests/game.test.js` and related evidence; checkpoint commit is the commit containing this record, `feat: add neon bumpers`. No portals started and no push.

## Checkpoint 4 — Portal Pair (US4, P4)

**Depends on**: T015. **Goal/independent test**: Exactly one bidirectional pair without loops; H15–H19. **Status**: COMPLETE — 120/120 tests, typecheck/build/diff check PASS and Elena + Isidora report manual smoke PASS.

- [x] T016 [US4] Record approved A (100,390) ↔ B (700,390), radius 20, inclusive circle trigger, exact velocity preservation, normalized exit with `1e-6` pixel clearance (+X at zero speed), 0.15-second simulation-time cooldown without a leave-overlap latch, miss/reset clearing, fresh restart objects and after-bumper/before-miss priority in `specs/002-neon-hazard-arena/plan.md`; record H15–H19 expectations in `docs/EVALS_HAZARD_ARENA.md`.
- [x] T017 [US4] Add both-direction, immediate/repeated-overlap, lockout-expiry/re-entry, safe-exit/bounded-velocity, no score/life/brick mutation, miss/reset and restart tests in `tests/game.test.js`.
- [x] T018 [US4] Implement exactly one linked pair and simulation-time lockout in `src/game.js`; render distinct linked portals in `src/main.js`; add no backend or AI fields.
- [x] T019 [US4] Run all checkpoint gates and manual both-direction/anti-loop/layout/Hint smoke; record actual results in `docs/EVALS_HAZARD_ARENA.md`.
- [x] T020 [US4] Review `src/game.js`, `src/main.js`, `tests/game.test.js` and related evidence; checkpoint commit is the commit containing this record, `feat: add portal pair`. No shield implementation or push.

## Checkpoint 5 — Moving Shield Gate (US5, P5)

**Depends on**: T020. **Goal/independent test**: One predictable bounded moving reflector; H20–H23. **Status**: COMPLETE — 133/133 tests, typecheck/build/diff check PASS; Elena + Isidora report manual smoke PASS.

- [x] T021 [US5] Record the approved shield geometry, initial state, 110 px/s simulation-time movement, [170,450] bounds, overshoot reversal, collision order and continuous-contact latch in `specs/002-neon-hazard-arena/plan.md`; record H20–H23 expectations in `docs/EVALS_HAZARD_ARENA.md`.
- [x] T022 [US5] Add bounds/overshoot, identical-state/time-step determinism, current-position reflection, bounded ball speed, no direct score/life/brick changes, lifecycle freeze and restart tests in `tests/game.test.js`.
- [x] T023 [US5] Implement one shield's state/time-step movement and collision in `src/game.js`; render its current position in `src/main.js`; preserve portal exit clearance across the entire sweep.
- [x] T024 [US5] Run all checkpoint gates and manual gate/bounds/combined-layout/Hint smoke; record actual results in `docs/EVALS_HAZARD_ARENA.md`.
- [x] T025 [US5] Review `src/game.js`, `src/main.js`, `tests/game.test.js` and related evidence; checkpoint commit is `75cbb97`, `feat: add moving shield gate`. No push.

## Checkpoint 6 — Full Hazard Arena Regression and Manual Smoke

**Depends on**: T025. **Independent acceptance**: H1–H31 on the combined arena, not just individual checkpoints. **Status**: COMPLETE — 133 total/passed, 0 failed/skipped; typecheck/build/diff check PASS; Elena + Isidora report final full-arena playthrough PASS.

- [x] T026 Audit existing `tests/game.test.js` coverage for score ≤400, final-armored win, misses/loss, freezing and complete restart with all hazards present. Existing coverage was sufficient; no redundant tests were added. Combined hazard rallies were verified in the final human playthrough. Existing W03/W04 tests remain unchanged.
- [x] T027 Run all focused tests and the full `npm test`, `npm run typecheck`, `npm run build`, `git diff --check`; record exact revision/results and any failures against H1–H30 in `docs/EVALS_HAZARD_ARENA.md`.
- [x] T028 Record Elena + Isidora’s final full-arena playthrough: five mechanics together, reachable bricks, lifecycle/relaunch/restart and functional Hint. Distinguish automated Hint error-path coverage from human success confirmation; do not infer a manual failure-path run or separate driver/reviewer roles. Record actual H27/H31 evidence and limitations in `docs/EVALS_HAZARD_ARENA.md` and `docs/AI_USAGE_LOG.md`.
- [x] T029 Reconcile completion states and requirements in `specs/002-neon-hazard-arena/spec.md`, `specs/002-neon-hazard-arena/tasks.md`, `docs/GAME_SPEC.md` and `docs/EVALS_HAZARD_ARENA.md`; preserve historical armor results and do not mark unexecuted evaluations PASS.
- [x] T030 Review final intended regression/evidence diff including `tests/game.test.js` and `docs/EVALS_HAZARD_ARENA.md`; final documentation checkpoint is the commit containing this record, `docs: finalize Hazard Arena acceptance`. No runtime/test changes or push.

## Dependencies and Execution Strategy

`T001–T005 → T006–T010 → T011–T015 → T016–T020 → T021–T025 → T026–T030`.

US1 is the completed smallest playable increment; US2 is now also implemented and verified. Each later story has isolated fixtures but follows the preceding verified commit. All five are required for final Core Hazard Arena. Tasks execute serially because mechanics share the same engine, renderer and test file; there are no safe independent implementation tracks here, so no `[P]` tasks are assigned. A partner may review a fixed diff while the driver prepares observations, but join before edits, gate runs or commits.

Never infer PASS from generated code. Document old/new expectations before any intentional test adjustment. Any failed gate blocks advancing to the next checkpoint; preserve the failure record. This checkpoint finalizes acceptance documentation only under explicit user authorization; no push is authorized.
