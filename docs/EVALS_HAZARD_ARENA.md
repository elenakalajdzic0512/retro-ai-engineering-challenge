# Neon Breaker: Hazard Arena — Evaluation Matrix

**Created**: 2026-10-06
**Branch**: `week5/neon-hazard-arena`
**Specification**: [spec.md](../specs/002-neon-hazard-arena/spec.md)
**Implementation sequence**: [tasks.md](../specs/002-neon-hazard-arena/tasks.md)

## Evidence Scope

Armored Bricks is implemented at `0f88c3e6b50fa2160b283754413b3ee8e2ba9015` (`feat: add armored bricks to Neon Breaker`). Before that commit, Codex observed `npm test`: **92 tests passed, 0 failed**, `npm run typecheck`: **PASS**, `npm run build`: **PASS**, and `git diff --check`: **PASS**. The initial sandboxed suite hit localhost `EPERM`; the permitted rerun passed. This is not a gameplay failure. All 86 prior tests were retained, with six focused armor tests added.

Elena + Isidora, working together on one development environment, report **manual browser smoke PASS** and **Week 4 Ask AI for Hint functional**. These human-reported observations are distinct from Codex's automated results. No new browser session or provider request was performed during this documentation task, and detailed new per-request Hint evidence is not inferred.

The armor entries below formalize previously executed verification; they are not claims that this document preceded the armor implementation. At the armor checkpoint, expectations for mechanics 2–5 were prospective. At the armor checkpoint, bumpers, portals and shield had no observed PASS; checkpoint 2 and 3 results are recorded separately below. The final column is a separate future full-arena evaluation, so an armor-stage PASS cannot imply the complete Hazard Arena already passes.

## Evaluation Matrix

| ID | Scenario / method | Expected result | Planned checkpoint | Observed at armor checkpoint | Full arena status |
| --- | --- | --- | --- | --- | --- |
| H1 | Initial brick layout; automated layout test | 40 bricks; 8 armored at indices 2, 5, 10, 13, 18, 21, 26, 29; 32 normal including index 32; all alive, durability 2/1 | 1, repeat 6 | PASS — focused test in 92/92 suite | PLANNED / NOT RUN |
| H2 | First hit on armored index 2 | Alive, hits 2→1, score unchanged, ball reflected | 1, repeat 6 | PASS — lifecycle test | PLANNED / NOT RUN |
| H3 | Second hit on armored index 2 | Dead, hits 1→0, exactly 10 points total; dead brick cannot reward again | 1, repeat 6 | PASS — lifecycle/repeat-hit test | PLANNED / NOT RUN |
| H4 | Normal brick collision, including preserved index 32 regression | One hit destroys; exactly 10 points and normal reflection | 1, repeat 6 | PASS — existing and added normal tests | PLANNED / NOT RUN |
| H5 | Clear all 40 bricks with 48 damaging hits and retry dead-brick contacts | Exactly 400 maximum points; no armor bonus or repeat scoring | 1, repeat 6 | PASS — full-grid score test | PLANNED / NOT RUN |
| H6 | Restart after damaged/destroyed armor and won/lost states | All original kinds, durability 2/1 and alive flags restored; score/lives reset | 1, repeat 6 | PASS — restart tests; human smoke reported | PLANNED / NOT RUN |
| H7 | Left paddle zone contact and boundary fixture | Deterministic upward-left reflection | 2, repeat 6 | PLANNED / NOT RUN | PLANNED / NOT RUN |
| H8 | Center paddle zone contact and boundary fixtures | Deterministic upward neutral/vertical reflection per documented zone rule | 2, repeat 6 | PLANNED / NOT RUN | PLANNED / NOT RUN |
| H9 | Right paddle zone contact and boundary fixture | Deterministic upward-right reflection | 2, repeat 6 | PLANNED / NOT RUN | PLANNED / NOT RUN |
| H10 | Repeated paddle contacts; equal-time 60/120 FPS movement; side limits | Paddle speed unchanged at 460 px/s with clamping; finite bounded ball speed, nonzero upward component, no cumulative acceleration | 2, repeat 6 | PLANNED / NOT RUN — prior FPS tests pass but new bounce safety is untested | PLANNED / NOT RUN |
| H11 | Bumper head-on, tangent and repeated overlap collisions | Deterministic finite reflection/separation, no trapping or speed growth | 3, repeat 6 | PLANNED / NOT RUN | PLANNED / NOT RUN |
| H12 | Repeated bumper impacts | Fixed bumper remains indestructible and unchanged | 3, repeat 6 | PLANNED / NOT RUN | PLANNED / NOT RUN |
| H13 | Isolated bumper contact, inspect score/lives | No direct score or life change | 3, repeat 6 | PLANNED / NOT RUN | PLANNED / NOT RUN |
| H14 | Bumper contacts, inspect brick state/win predicate | Total grid remains 40; alive count/durability unchanged by bumper; no contribution to win | 3, repeat 6 | PLANNED / NOT RUN | PLANNED / NOT RUN |
| H15 | Enter unlocked portal A | Exit safely through B using documented deterministic placement | 4, repeat 6 | PLANNED / NOT RUN | PLANNED / NOT RUN |
| H16 | Enter unlocked portal B | Exit safely through A using the same rule | 4, repeat 6 | PLANNED / NOT RUN | PLANNED / NOT RUN |
| H17 | Destination overlap across substeps, cooldown expiry and later re-entry | No immediate A/B loop; finite lockout plus separation permits later valid entry | 4, repeat 6 | PLANNED / NOT RUN | PLANNED / NOT RUN |
| H18 | Both transfers with representative valid velocities | Deterministic finite nonzero bounded velocity and safe exit, no cumulative acceleration | 4, repeat 6 | PLANNED / NOT RUN | PLANNED / NOT RUN |
| H19 | Compare game counters/brick state before and after isolated transfer | Score, lives, total/alive brick count and durability unchanged; portals excluded from win | 4, repeat 6 | PLANNED / NOT RUN | PLANNED / NOT RUN |
| H20 | Repeated shield travel cycles, endpoints and capped large elapsed frame | Entire shield stays inside fixed bounds and arena, including overshoot | 5, repeat 6 | PLANNED / NOT RUN | PLANNED / NOT RUN |
| H21 | Repeat identical initial state and input/time-step sequence | Identical shield positions/directions and collision outcomes; no wall-clock/random dependency | 5, repeat 6 | PLANNED / NOT RUN | PLANNED / NOT RUN |
| H22 | Ball contact at shield's current position and travel endpoints | Deterministic reflection without overlap jitter or unbounded speed | 5, repeat 6 | PLANNED / NOT RUN | PLANNED / NOT RUN |
| H23 | Isolated shield movement/contact, compare counters/brick state | No direct score/life/brick count/durability change; shield excluded from win | 5, repeat 6 | PLANNED / NOT RUN | PLANNED / NOT RUN |
| H24 | Last normal and last armored brick; repeat with all hazards present | Win only on final destruction, score 400, terminal state frozen | 1–6 | PASS for armor stage — existing win and last-armored tests | PLANNED / NOT RUN |
| H25 | Ordinary miss and final-life miss, then update terminal state | Exactly one life lost; ready if lives remain, lost at zero; lost state frozen | 1–6 | PASS for armor stage — preserved life/loss tests | PLANNED / NOT RUN |
| H26 | Restart from won/lost after damage and altered hazard state | Fresh bricks, hazards, portal lockout, score/lives, ball/paddle; Space launches as before | 1–6 | PASS for existing/armor state; future hazard state NOT RUN | PLANNED / NOT RUN |
| H27 | Explicit Ask AI for Hint and failure-path gameplay regression | Existing Hint available/functional; same request/response contract; no AI-controlled gameplay; failure does not prevent play | 1–6 | PASS — human report of functioning Hint and preserved automated W04 tests; no new detailed live-request record | PLANNED / NOT RUN |
| H28 | Run `npm test` | All focused and prior tests pass; no live-provider dependency | Every checkpoint | PASS — 92 tests passed, 0 failed, 0 skipped | PLANNED / NOT RUN |
| H29 | Run `npm run typecheck` | Exit 0, no TypeScript errors | Every checkpoint | PASS — exit 0; server TypeScript scope only | PLANNED / NOT RUN |
| H30 | Run `npm run build` | Exit 0, production frontend build succeeds | Every checkpoint | PASS — exit 0; 5 modules transformed | PLANNED / NOT RUN |
| H31 | Human browser smoke of current checkpoint and final combined arena | Correct visual states, controls, contacts, reachable bricks, no permanent trap, lifecycle/restart and Hint remain usable | Every checkpoint | PASS — armor-stage manual smoke reported by Elena + Isidora | PLANNED / NOT RUN |

## Recording Future Runs

Before implementing each checkpoint, add exact constants and fixtures for its rows. After execution, append a dated run with commit or base revision/dirty state, expected versus observed behavior, commands/test names, result, and human verification attribution. Keep this armor baseline intact. Record deterministic fake tests separately from actual browser/provider observations. Do not record keys or private payloads.

Every checkpoint also requires `git diff --check` PASS, reviewed scope, and one clean checkpoint commit before advancing. Mark failures FAIL and unexecuted work NOT RUN; never carry a prior stage's PASS into the final arena column without rerunning it. H1–H31 must all pass for final completion. The historical Week 3 viewport limitation remains a known limitation unless separately addressed; no viewport fix is claimed here.


## 2026-10-06 — Checkpoint 2: Directional Paddle Bounce

**Revision scope**: Base `668d39fe7baca4fddd1b95fbf3ac961d7b7af056` plus the reviewed `src/game.js` / `tests/game.test.js` diff and this checkpoint's documentation. The resulting checkpoint is the commit containing this record, with message `feat: add directional paddle bounce`. The armor matrix above remains historical; its full-arena column still requires checkpoint 6.

**Approved rule**: Left/center/right thirds set `vx = -240 / 0 / +240`; exact 1/3 and 2/3 boundaries belong to center. Every valid descending contact uses `vy = -abs(previous vy)`. Each contact replaces horizontal velocity; it does not accumulate spin or preserve total speed across zones.

| ID | Observed checkpoint 2 evidence | Status |
| --- | --- | --- |
| H7 | Left-third test yields vx=-240, vy=-280; safe separation, lives/status/score/bricks preserved. Humans verified left aiming. | PASS |
| H8 | Center-third test yields vx=0, vy=-280. Both exact boundaries and adjacent contacts are tested at paddle x=0, 345 and 690. Humans verified vertical center aiming. | PASS |
| H9 | Right-third test yields vx=+240, vy=-280; incoming opposite horizontal velocity is replaced. Humans verified right aiming. | PASS |
| H10 | 60 repeated contacts at each of vertical speeds 280 and 360 preserve vertical magnitude and keep horizontal magnitude ≤240; existing 60/120 FPS paddle movement tests pass. Edge overlap, ascending-contact rejection and moving clear after reflection pass. Humans report no sticking or uncontrolled acceleration. | PASS |
| H24–H26 | Existing armor/normal win, miss/loss and restart regressions pass; humans verified bricks, scoring, lives, restart and win/loss. Future hazard state remains untested. | PASS for checkpoint 2 |
| H27 | Existing W04 automated tests pass; Elena + Isidora report Ask AI for Hint remains functional. No new live-provider request was made by Codex. | PASS for checkpoint 2 |
| H28 | `npm test`: 99 total, 99 passed, 0 failed, 0 skipped. | PASS |
| H29 | `npm run typecheck`: exit 0. Existing server TypeScript scope only. | PASS |
| H30 | `npm run build`: exit 0, production frontend build successful. | PASS |
| H31 | Elena + Isidora report manual browser smoke PASS on the directional-paddle checkpoint. | PASS for checkpoint 2 |

`git diff --check`: PASS. The pre-commit rerun passed: `npm test` 99/99 (0 failed, 0 skipped), typecheck exit 0, build exit 0 (5 modules, 47 ms); no runtime edits were made during evidence alignment. The old no-spin test was intentionally replaced by eight focused tests, a net increase of seven from the 92-test armor baseline. Unrelated tests remain intact.

**Human verification attribution**: Elena + Isidora working together on one development environment reviewed behavior, tested left/center/right aiming, no sticking or uncontrolled acceleration, normal/armored bricks, scoring/lives/restart/win/loss and W04 Hint. These are user-reported human observations, distinct from Codex's automated checks.

**Not executed**: H11–H23 (Bumpers/Portals/Shield) remain PLANNED / NOT RUN. Combined full-arena acceptance remains PLANNED / NOT RUN; checkpoint 2 PASS does not imply future mechanics exist.


## 2026-10-06 — Checkpoint 3: Neon Bumpers

**Revision scope**: Base `0b235f827382b820ba4a96d4039c35cbd3d0dc71` plus the reviewed bumper changes in `src/game.js`, `src/main.js`, `tests/game.test.js` and this checkpoint's documentation. The resulting checkpoint is the commit containing this record, `feat: add neon bumpers`. Earlier armor/directional-paddle results above remain historical; the full-arena column still awaits checkpoint 6.

**Exact layout**: Three fresh state objects per game/restart: `{ id: "left", x: 210, y: 310, radius: 24 }`, `{ id: "right", x: 590, y: 310, radius: 24 }`, `{ id: "center", x: 400, y: 405, radius: 24 }`. Coordinates are centers. Canvas draws cyan `#00f5ff` rings with dark `#081b33` cores.

**Collision evidence**: Circle-circle contact uses distance ≤ combined radii; inward velocity reflects by `v - 2 * dot(v,n) * n`. Tests verify a non-axis-aligned normal (0.6,0.8) maps incoming (-200,100) to (-152,164). Speed/vector comparisons use absolute tolerance `1e-9` for floating-point rounding. Separation places the ball at combined radii plus `1e-6` pixels; outward motion is not reflected. Coincident centers use opposite velocity, or a rightward normal for a stationary ball, without NaN/Infinity. At most one bumper contact is resolved per substep, after brick/win handling and before miss handling. No counters, bricks, paddle or lifecycle are directly changed by the resolver.

| ID | Observed checkpoint 3 evidence | Status |
| --- | --- | --- |
| H11 | Direct contacts on all three bumpers, angled reflection/speed preservation, finite separation, moving-away rejection, tangent/near-miss and zero-distance fallback tests pass. Humans verified natural direct/glancing rebounds with no observed sticking/jitter. | PASS |
| H12 | 60 controlled contacts leave every bumper unchanged; fresh-game and won/lost restart tests restore independent objects and exact layout. Humans confirmed indestructibility and restart restoration. | PASS |
| H13 | Contact after existing brick progress leaves score and lives unchanged. Humans observed no bumper score or life side effects. | PASS |
| H14 | Collision leaves all brick states/durability and total count unchanged (40); surviving count remains 39 in the progress fixture. Existing all-brick win/400-point tests pass with bumpers present. | PASS |
| H24–H26 | Existing armor/normal/directional-paddle, miss/life, win/loss and restart regressions pass; humans confirmed these behaviors and bumper restoration. Portal/shield state remains untested. | PASS for checkpoint 3 |
| H27 | Existing W04 automated tests pass; humans report Ask AI for Hint remains functional. Codex made no new live-provider call. | PASS for checkpoint 3 |
| H28 | `npm test`: 108 total, 108 passed, 0 failed, 0 skipped. Nine bumper tests added; existing tests unchanged. | PASS |
| H29 | `npm run typecheck`: PASS, exit 0; existing server TypeScript scope. | PASS |
| H30 | `npm run build`: PASS, exit 0. | PASS |
| H31 | Elena + Isidora report manual browser smoke PASS: all three bumpers render correctly and the layout remains playable with access to bricks. | PASS for checkpoint 3 |

`git diff --check`: PASS. The pre-commit rerun passed: 108 total, 108 passed, 0 failed, 0 skipped; typecheck exit 0; build exit 0 (5 modules, 49 ms). The first test invocation was not executed because automatic approval review hit a usage limit; the authorized retry succeeded. No new runtime edits were made during evidence alignment.

**Human attribution**: Elena + Isidora working together on one development environment reviewed the implementation and manually verified all three bumpers, direct/glancing rebounds, no sticking/jitter, playable layout, no score/life side effects, indestructibility, directional paddle, armored/normal bricks, scoring/misses/win/loss/restart and continued W04 Hint functionality. These are user-reported human observations, separate from Codex's implementation and automated tests.

**Remaining scope/limitations**: H15–H23 (Portal Pair / Moving Shield Gate) remain PLANNED / NOT RUN. Tactical Coach is unimplemented. Full-arena acceptance is not claimed. Bumpers use existing discrete physics substeps, not swept collision detection; manual playability evidence is not a proof for every possible trajectory.
