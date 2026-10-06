# Neon Breaker: Hazard Arena — Evaluation Matrix

**Created**: 2026-10-06
**Branch**: `week5/neon-hazard-arena`
**Specification**: [spec.md](../specs/002-neon-hazard-arena/spec.md)
**Implementation sequence**: [tasks.md](../specs/002-neon-hazard-arena/tasks.md)

## Evidence Scope

Armored Bricks is implemented at `0f88c3e6b50fa2160b283754413b3ee8e2ba9015` (`feat: add armored bricks to Neon Breaker`). Before that commit, Codex observed `npm test`: **92 tests passed, 0 failed**, `npm run typecheck`: **PASS**, `npm run build`: **PASS**, and `git diff --check`: **PASS**. The initial sandboxed suite hit localhost `EPERM`; the permitted rerun passed. This is not a gameplay failure. All 86 prior tests were retained, with six focused armor tests added.

Elena + Isidora, working together on one development environment, report **manual browser smoke PASS** and **Week 4 Ask AI for Hint functional**. These human-reported observations are distinct from Codex's automated results. No new browser session or provider request was performed during this documentation task, and detailed new per-request Hint evidence is not inferred.

The armor entries below formalize previously executed verification; they are not claims that this document preceded the armor implementation. Expectations for mechanics 2–5 are prospective. Future mechanics have no observed PASS. The final column is a separate future full-arena evaluation, so an armor-stage PASS cannot imply the complete Hazard Arena already passes.

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
