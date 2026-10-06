# Tasks: Neon Tactical Coach

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts](contracts/), [quickstart.md](quickstart.md).
**Branch**: `week5/neon-tactical-coach`
**Status**: W05 Checkpoints 1–4, regression gate T024, separate Gemini adapter T025, bounded live evidence T026, dated pair review T027 and manual browser acceptance T028 are complete. Deployed outer-timeout verification and final reconciliation T029 remain pending. Hazard Arena at `8e0aa82` is the frozen gameplay baseline.
**Tests**: Required by FR-012 and the user; fake-first and regression are gates, not optional examples.

## Phase 1 — Contract foundation

- [x] T001 [US1] Review `contracts/agent-api.md`, `contracts/tools.md`, `contracts/final-plan.md` and freeze exact field names, bounds, error mapping and data ownership before code. Record any approved contract changes in SpecKit before implementation.
- [x] T002 [US1] Add failing exact-key request, snapshot, candidate, evaluation and final-plan validation tests in new `tests/tactical-contracts.test.js`, including inconsistent counts, `snapshotVersion: 1`, goal Unicode length, one required reference from each evidence source, candidate equality, no model success field and zero provider/tool calls for invalid input.
- [x] T003 [US1] Implement runtime validators/types in new `server/tactical/contracts.ts`; preserve `server/contracts.ts` and `server/ai/contracts.ts` for Week 4.
- [x] T004 [US1] Verify contract tests pass and the old `tests/contracts.test.js` remains green; record results in future `docs/AGENT_EVALS.md`.

## Phase 2 — Evidence and deterministic evaluation

- [x] T005 [US1] Add failing snapshot-derivation tests for all 40 brick centers, armor totals, ball neutral direction, shield zone/direction, portal cooldown and no game mutation in new `tests/tactical-snapshot.test.js`.
- [x] T006 [US1] Implement a separate bounded snapshot derivation module for browser use (planned `src/tactical-snapshot.js`) and server validation/copying in `server/tactical/contracts.ts`; no edits to `src/game.js`.
- [x] T007 [US1] Add failing deterministic evaluator fixtures in new `tests/tactical-evaluator.test.js`: 1/2/3-life risk table, empty zone, portal cooldown/center target, armor count, paddle alignment and shield-zone cue.
- [x] T008 [US1] Implement pure local evaluator in `server/tactical/evaluator.ts`; no network, model, file access, probability or game mutation.
- [x] T009 [US1] Verify fixed fixtures, byte bounds and repeated identical-state equality; record actual results and caveats.

## Phase 3 — Tools and fake provider

- [x] T010 [US1] Add failing allowlist tests in new `tests/tactical-tools.test.js` for exact two names, `{}` snapshot arguments, bounded candidate arguments, frozen/copy results, forbidden/unknown rejection and invalid-result rejection before forwarding.
- [x] T011 [US1] Implement `server/tactical/tools.ts` with only the two specified tools and request-scoped validated context; no ability to mutate canonical gameplay.
- [x] T012 [US3] Add a scriptable fake provider in new `server/tactical/fake-provider.ts` and fixtures in `tests/tactical-orchestrator.test.js`; prove zero key and zero network calls.

## Phase 4 — Bounded state machine and final plan

- [x] T013 [US3] Add failing `NEED_SNAPSHOT → NEED_EVALUATION → NEED_FINAL` success tests (3 steps/3 provider attempts/2 tools), plus premature-final, tool-in-final, out-of-order and repeated-action tests in `tests/tactical-orchestrator.test.js`.
- [x] T014 [US3] Implement those three exact states in `server/tactical/orchestrator.ts`; accept only the state-specific output, validate both tool results before transitions, and use state-scoped canonical repeat keys as defense in depth. Reject stale results without adding a client snapshot ID.
- [x] T015 [US3] Add failing step/tool/provider-call-budget, `min(5000 ms, remaining deadline)` attempt timeout, 22 s absolute deadline across attempts/backoff/tools/overhead, single transient retry (3 steps/4 attempts/2 tools), cancellation, malformed-model and safe-stop fixtures using injected clock/sleeper in `tests/tactical-orchestrator.test.js`.
- [x] T016 [US3] Implement counters, deadline, abort, one global retry/backoff, fixed error taxonomy and public sanitizer in `server/tactical/orchestrator.ts`. Ensure a retry stays in the same logical step.
- [x] T017 [US1] Add failing final-output fixtures in `tests/tactical-contracts.test.js` for each of the four candidate-choice mismatches (`strategy` maps to `style`), invented/duplicate facts, either missing evidence source, model-authored success field, extra keys, bad lengths and oversized result.
- [x] T018 [US1] Implement final runtime validation against accepted evaluator arguments and server-materialized public evidence from both tool results; only the application decides success, never raw model/provider output.
- [x] T019 [US1] Verify all fake success/failure cases and whole-game before/after equality; update only future observed eval evidence.

## Phase 5 — Separate endpoint and UI

- [x] T020 [US1] Add failing HTTP tests in new `tests/tactical-api.test.js` for request shape/media/size, success, sanitized errors, cancellation and no Week 4 route regression.
- [x] T021 [US1] Register separate `POST /api/tactical-coach` in `server/index.ts` through new Week 5 modules; retain `/api/ai` behavior and server-only provider/model selection. Check the deployed outer HTTP/proxy timeout exceeds the Coach deadline before live use.
- [x] T022 [US2] Add separate goal input, Coach control, bounded progress/error/result rendering in `src/main.js` and necessary markup/style; preserve Ask AI for Hint and all gameplay controls. Add focused UI tests only if they verify user-observable behavior, not implementation mirrors.
- [x] T023 [US2] Verify advice never changes canonical game state and no raw tool/provider/chain-of-thought content enters UI.

## Phase 6 — Regression, provider and evidence gates

- [x] T024 [US1] Record expected Week 5 fake scenarios in `docs/AGENT_EVALS.md`, then run all new focused tests, `npm test`, `npm run typecheck`, `npm run build`, `git diff --check`; report exact totals/failures and rerun Week 4 Hint plus Hazard Arena regressions.
- [x] T025 [US3] Build a separate `createTacticalCoachGeminiProvider` (or equivalent) that sends function declarations, returns validated tool results as context, parses structured final output and normalizes outputs for W5 orchestration; do not change Week 4 provider behavior. Review current official documentation for `gemini-3.5-flash-lite`/`@google/genai`, then verify exact integration in the limited live phase. Keep fake suite provider-independent.
- [x] T026 [US3] After local contract/security gates pass and team authorizes a bounded live probe, run limited provider validation without recording keys/private payloads; document actual outcome and cost/config assumptions in `docs/EVIDENCE_W05.md`.
- [x] T027 [US2] Elena + Isidora jointly review authority boundary, two tools, three steps, budgets, repeat/stops, fake path, no mutation, UI and exact diff. Record actual driver/reviewer roles and each person's understanding in dated `docs/AI_USAGE_LOG.md`; do not infer a role swap.
- [x] T028 [US1] Perform and record a manual successful Coach goal and unavailable-provider recovery while gameplay and Week 4 Hint remain usable; preserve fake/live/manual attribution in `docs/EVIDENCE_W05.md`.
- [ ] T029 [US1] Reconcile SpecKit/eval/usage evidence, unresolved risks and final acceptance; do not mark Week 5 complete or create implementation commits before actual gates and human review pass.

## Dependencies and execution strategy

`T001–T004 → T005–T009 → T010–T012 → T013–T019 → T020–T023 → T024–T029`. T001–T028 are complete after the reviewed deterministic Core, tool/fake-provider boundary, bounded provider-neutral orchestrator, fake-first API/UI checkpoints, regression gate, documented corrected-adapter live verification, dated Elena + Isidora pair review and manual browser acceptance; T029 remains pending. The deployed outer HTTP/proxy timeout in T021 still requires verification before final acceptance. Work is serial because all pieces share one request protocol and reviewer gates. A pair may review prepared expectations in parallel, but final contract and evidence decisions must be joint. This task list does not itself authorize future commits or pushes.
