---
description: "Executable Week 8 security tasks; planned work, not completed evidence"
---

# Tasks: Secure the Arcade

**Input**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/security-boundaries.md`, `quickstart.md` in `specs/004-secure-the-arcade/`.

**Status**: Planning only. An unchecked item is future work, including every test and implementation item. No real Gemini call or real key is part of T00–T17.

**Format**: `[ID] [US?] [Owner] action in exact path; completion evidence`. Owners are `[Elena]`, `[Isidora]`, and `[Joint]`; ownership and sequential handoff are defined by the waves, not by the order in which story-labeled task IDs appear.

**Ordering**: Execute the three sequential waves below. Task IDs and story phases identify coverage, not a requirement to interleave owners. Within each lane, negative security tests precede the corresponding narrow control. Elena completes and commits/pushes her technical half before Isidora begins hers; joint integration follows both handoffs.

## Sequential execution waves and handoff gates

### Wave A — Elena technical half

T001 is already complete. Elena prepares shared T002 as a handoff fixture while its `[Joint]` ownership remains shared; Isidora uses and reviews it in Wave B, and final evidence reports actual contributions. Elena then completes T003, T005, T007, T008, T009, T010, T011, T016, conditional T018, T023, T024, T025, T026, T031, T032, T033, T034, T036, T037, T038, T039, T040, T043, and conditional T044. This lane uses existing W05 agent/provider behavior and deterministic fake/stub providers; it does not wait for Isidora's W08 tests or implementation.

- **US2**: `T005 → T009/T010/T011/T016 → conditional T018`. T018 changes code only if Elena's cases reveal a real gap.
- **Browser**: `T007 → T008 → T036/T037 → T038 → T039 → T040`. The real-browser cases use the existing W05 fake/stub path, without requiring Isidora's W08 provider changes.
- **Admission/events**: `T005 → T023/T024/T025/T026`; T031 depends on T023, T032 on T024, T033 on T025 plus implemented T031/T032, and T034 on T026. T033's own recovery proof uses Elena's T13 fixtures; Isidora's T12 is a later independent deadline proof.
- **Dependencies**: Once the T007 package lock settles, run T043; T044 is conditional on a demonstrated relevant finding and is closed as not applicable otherwise.

**Elena handoff gate — `ELENA HALF COMPLETE — READY FOR ISIDORA HANDOFF`**: Run relevant Elena HTTP/admission/event/browser security tests and affected regressions, `npm run typecheck`, full `npm test`, `npm run build`, `npm run build:server`, and the browser suite that actually exists. Review `git diff --check` and `git status`; confirm no live Gemini call and no real key. Resolve observed failures within Elena's scope, then make a stable non-force commit and push the branch. Record the actual handoff SHA for later `EVIDENCE_W08.md`; do not invent it in this plan. No Isidora technical task starts before this gate succeeds.

### Wave B — Isidora technical half

Starting only from the pushed Elena handoff commit, Isidora reviews/uses T002 and completes T004, T006, T012, T013, T014, T015, conditional T017, T019, T020, T021, T022, T027, T028, T029, conditional T030, T042, and T052 as review of an already completed Elena test. Elena does not need to resume work between these steps.

- **Setup**: `Elena handoff → T004/T006`; T004 and T006 use the committed shared fixture and existing W05 behavior as the starting state.
- **US2**: `T006 → T012/T013/T014/T015 → conditional T017`. T017 depends only on Isidora's tool/agent negatives, not on a new Elena edit.
- **Provider/agent**: `T006 → T019/T020/T021/T022 → T027/T028/T029/conditional T030` according to the relevant negative case: T027 measures a normal envelope after T019, T028 follows T019, T029 follows T021/T022, and T030 follows T020–T022 if they expose a gap. Elena's completed handoff state is the only cross-lane prerequisite.
- **Combined T17**: T042 follows Elena's committed admission/event controls T031–T034 and Isidora's completed T012–T017/T019–T030 relevant tool/provider controls. T052 reviews a real finished Elena HTTP/browser test and leaves a review note for later joint evidence.

**Isidora handoff gate — `ISIDORA HALF COMPLETE — READY FOR JOINT INTEGRATION`**: Run relevant Isidora tool/provider/agent/T17 tests and affected regressions, `npm run typecheck`, full `npm test`, `npm run build`, and `npm run build:server`. Review `git diff --check` and `git status`, confirm fake-only testing/no real key, resolve observed failures within Isidora's scope, then make a stable non-force commit and push. Record the actual SHA for later `EVIDENCE_W08.md`. Joint integration starts only after this gate succeeds.

### Wave C — joint integration and evidence

After both handoffs, complete T035, T041, T045, T046, T047, T048, T049, T050, T051, T053, T054, and T055. T051 is Elena's cross-review of completed Isidora work; T052 is Isidora's Wave B review of completed Elena work. Transfer the two real handoff SHAs and actual T002/review contributions into `EVIDENCE_W08.md`. This wave permits only a minimal integration correction demonstrated by an actual regression, not a new large implementation lane.

## Phase 1: Setup — baseline and evidence checkpoint

**Goal**: Preserve the accepted starting facts and define reproducible, fake-first fixtures before changing code.

- [x] T001 [Joint] Record the confirmed before checkpoint for later transfer to `EVIDENCE_W08.md`: branch `week8/secure-the-arcade`, SHA `e0ef30a1eddc9583a9894b79e10d53424d9f0b2a`, Node `v24.21.0`, npm `11.19.0`, typecheck PASS, 287/287 tests PASS, client build PASS, server build PASS; verify current branch/status first and label these as prior baseline observations, with no invented W08 after result (FR-014).
- [x] T002 [Joint] Define fixed expected outputs, provider/tool counter names, canonical game-state comparison, fake-only environment, and same-input before/after fixtures P1/P2/P3 in `specs/004-secure-the-arcade/quickstart.md`; completion is a reviewer-readable fixture/command list that cannot invoke live Gemini (FR-004, FR-014; T00–T17).
- [x] T003 [Elena] Inspect `server/index.ts`, `vite.config.js`, `src/tactical-ui.js`, and `package.json` for actual HTTP/origin/credential/preview behavior; record the conditional CORS/CSRF applicability and local single-process boundary in `specs/004-secure-the-arcade/quickstart.md`, without inventing authentication (FR-010–FR-012).
- [ ] T004 [Isidora] Inspect installed `@google/genai` behavior and existing budgets in `server/tactical/gemini-provider.ts`, `server/tactical/orchestrator.ts`, and `package-lock.json`; record exact output-token/retry API support and earliest application-controlled byte-check point in `specs/004-secure-the-arcade/quickstart.md` (FR-006; no network-stream claim).

**Checkpoint**: Baseline facts and future fixtures are recorded; no W08 result is marked observed.

---

## Phase 2: Foundational — minimal test infrastructure

**Goal**: Give negative tests deterministic clocks, providers, counters, event capture, and a real production-browser harness without expanding product scope.

- [x] T005 [Elena] Add reusable direct-HTTP fake-provider and fake-clock test helpers in `tests/tactical-api.test.js` (or a focused `tests/tactical-admission.test.js`), exposing provider attempts, executed tool calls, active runs, admitted arrivals, and release; prove helpers can distinguish rejection before provider construction (FR-001, FR-007).
- [ ] T006 [Isidora] Add deterministic provider/tool-call-history helpers in `tests/tactical-orchestrator.test.js` and `tests/tactical-gemini-provider.test.js`; capture proposals, next-step model context, retries, time, and late settlement without a real key (FR-003, FR-006, FR-014; after Elena handoff).
- [x] T007 [Elena] Add only minimal dev-only Playwright package/config/script support in `package.json`, `package-lock.json`, and `playwright.config.js`; document browser-binary prerequisite in `specs/004-secure-the-arcade/quickstart.md`, then inspect both package files and rerun existing `npm test` and `npm run build`; no runtime dependency or broad browser suite (FR-012; prerequisite for T04/T05/T16).
- [x] T008 [Elena] Add controlled local production-profile launch fixture in `playwright.config.js` and `tests/browser/tactical-security.spec.js`: production-built Vite preview plus loopback API using `TACTICAL_AI_PROVIDER=fake`, relative `/api`, predictable teardown, and separate controlled script origin with HTTP 200 probe; completion is a reproducible launch/stop command, not a CSP pass claim (FR-012; depends on T007).

**Checkpoint**: Tests can observe boundaries; Playwright installation and browser checks happen only when these future tasks are executed.

---

## Phase 3: US2 — Reject untrusted authority and tools (Priority: P1)

**Goal**: Reject hostile HTTP authority and model tool proposals while keeping the request-scoped, local/demo trust model.

**Independent test**: Direct invalid requests cause zero provider/tool work; forbidden tool proposals have zero forbidden executions; valid current-context calls still work.

### Negative tests before any conditional fix

- [ ] T009 [US2] [Elena] Add T01 in `tests/tactical-api.test.js`: separate invalid JSON, wrong type, domain-invalid snapshot/goal, and valid boundary-value cases; assert each rejection has `providerAttempts = 0`, `executedToolCalls = 0`, sanitized response, while the legitimate edge request reaches the fake flow (FR-001).
- [ ] T010 [US2] [Elena] Add T02 in `tests/tactical-api.test.js`: separate >4096-byte body from individually well-sized `provider`, `maxSteps`, `ownerId`, and `role` fields, plus a normal request; prove size does not mask field validation and no client field changes provider or budgets (FR-001, FR-002, FR-006).
- [ ] T011 [US2] [Elena] Add T03 HTTP selector cases in `tests/tactical-api.test.js` for `gameId`, `sessionId`, `scenarioId`, and equivalent extra resource fields; assert rejection before provider work and no foreign-resource lookup or authentication claim (FR-002, FR-010).
- [ ] T012 [US2] [Isidora] Add T03 tool-context cases in `tests/tactical-tools.test.js`: the two read-only tools receive only the copied/frozen current validated snapshot, reject a schema-valid cross-request context proposal, and cannot read another run; include a positive current-context call (FR-003, FR-010).
- [ ] T013 [US2] [Isidora] Add T07 in `tests/tactical-tools.test.js` and `tests/tactical-orchestrator.test.js`: unknown/forbidden name, `constructor`, and `toString` each dispatch zero forbidden calls and produce no side effect; include a known allowlisted name to exclude reject-all behavior (FR-003).
- [ ] T014 [US2] [Isidora] Add T08 in `tests/tactical-tools.test.js`: invalid/extra/inherited own arguments stop before tool work; a separately schema-valid cross-context attempt fails; the same allowed tool with valid arguments and current request context succeeds (FR-003).
- [ ] T015 [US2] [Isidora] Add T09 in `tests/tactical-orchestrator.test.js`: malicious `goal` reaches deterministic fake provider scripted to propose a forbidden capability, then application rejects it with zero forbidden executions and unchanged canonical game state; label proof as application policy, not real-Gemini prompt immunity (FR-003, FR-004).
- [ ] T016 [US2] [Elena] Add T15 in `tests/tactical-api.test.js` and `tests/tactical-snapshot.test.js`: internally consistent but forged score/state remains unverified advisory input, changes no provider/tool/security budget or confirmed server score, and leaves canonical browser game state unchanged (FR-002, FR-004, FR-010).

### Conditional minimal control

- [ ] T017 [US2] [Isidora] If T012–T015 expose a real dispatch/phase/context gap, make the smallest exact-name/own-argument/request-context correction in `server/tactical/tools.ts` or `server/tactical/orchestrator.ts`, then rerun T03/T07/T08/T09 and a positive allowed-tool case; otherwise record existing W05 control as verified without source change (FR-003).
- [ ] T018 [US2] [Elena] If T009–T011/T016 expose an initial validation or false-authority gap, make the smallest correction in `server/index.ts` or `server/tactical/contracts.ts`, then rerun T01/T02/T03/T15 and valid request; retain exact `goal,state` contract and do not add login or server game ledger (FR-001, FR-002, FR-010).

**Checkpoint**: US2 rejects untrusted authority and tools; a legitimate current-context proposal remains accepted.

---

## Phase 4: US3 — Bound work and protect secrets (Priority: P2)

**Goal**: Bound one run and aggregate admission, validate provider/tool data, and keep security events free of raw content.

**Independent test**: Fake time/provider runs prove separate budgets and recovery, while synthetic-secret and newline fixtures remain absent from exposed surfaces.

### Negative tests before narrow implementation

- [ ] T019 [US3] [Isidora] Add T06 in `tests/tactical-orchestrator.test.js` and `tests/tactical-gemini-provider.test.js`: invalid decision, invalid final, and >8192-byte normalized serialized UTF-8 outcome each fail safely before tool dispatch/final success, with attempts/deadline preserved and no raw output in public error (FR-006).
- [ ] T020 [US3] [Isidora] Add T10 in `tests/tactical-orchestrator.test.js` and `tests/tactical-tools.test.js`: independently inject invalid shape, >8192-byte result, and extra synthetic-secret field; next model call must receive no raw invalid object/secret, while valid bounded tool result remains usable (FR-006, FR-008).
- [ ] T021 [US3] [Isidora] Add T11 in `tests/tactical-orchestrator.test.js`: separate repeated-action case and exhaustion cases for three logical steps, two tool executions, four total provider attempts, and one transient retry; assert retry never resets counters or total deadline and no over-limit call occurs (FR-006).
- [ ] T022 [US3] [Isidora] Add T12 in `tests/tactical-orchestrator.test.js`: separately exercise 5000 ms per-call timeout, 22000 ms aggregate deadline across individually allowed steps, no new work after deadline, and late fake-provider settlement that cannot become success (FR-006).
- [ ] T023 [US3] [Elena] Add T13 concurrency subtest in `tests/tactical-admission.test.js` (or `tests/tactical-api.test.js`): hold two valid HTTP runs active, send a third, assert at most two active and zero provider/tool work for excess, then prove a valid request starts after a slot frees (FR-001, FR-007).
- [ ] T024 [US3] [Elena] Add T13 rolling-rate subtest in `tests/tactical-admission.test.js`: inject server clock, admit five valid arrivals within rolling 60 s, reject sixth before provider work, assert invalid/rejected arrivals do not count, and admit a new valid request only after window expiry (FR-007).
- [ ] T025 [US3] [Elena] Add T13 lifecycle subtest in `tests/tactical-admission.test.js`: success, error, timeout, cancellation, disconnect, and late result each release an active slot exactly once without allowing late success; verify capacity recovery separately from rate-window recovery (FR-006, FR-007).
- [ ] T026 [US3] [Elena] Add T14 in `tests/tactical-api.test.js` and focused event-sink tests: separate synthetic sentinel in internal provider failure/forbidden tool field from newline/fake-event untrusted input; assert sentinel absent from HTTP, next model context, browser-bound result, and security events; assert one input cannot forge an extra event (FR-008).

### Minimal protection, driven by these tests

- [ ] T027 [US3] [Isidora] Measure a normal valid fake/controlled Tactical response envelope with at least two steps and one allowed tool in `tests/tactical-gemini-provider.test.js`; choose and document a server-owned `maxOutputTokens` value in `server/tactical/gemini-provider.ts` and `specs/004-secure-the-arcade/quickstart.md` that preserves legitimate plans, with rationale rather than an arbitrary number (FR-006, FR-009).
- [ ] T028 [US3] [Isidora] Enforce ≤8192 serialized UTF-8 bytes for normalized provider outcome at earliest application-controlled point in `server/tactical/gemini-provider.ts` and shared orchestration boundary if needed; fail before proposal dispatch/final success and explicitly document post-SDK, not network-stream, protection in `specs/004-secure-the-arcade/quickstart.md`; rerun T06 (FR-006).
- [ ] T029 [US3] [Isidora] Confirm local SDK retry semantics, then explicitly keep SDK retry absent or cap it to one HTTP attempt in `server/tactical/gemini-provider.ts` using only supported API; keep app-owned one transient retry inside four total provider attempts/22000 ms in `server/tactical/orchestrator.ts`; document any unavailable control and rerun T11/T12 (FR-006).
- [ ] T030 [US3] [Isidora] If T020–T022 reveal a real tool-result, repeat, budget, timeout, or late-settlement gap, apply only the necessary correction in `server/tactical/tools.ts` and/or `server/tactical/orchestrator.ts`; rerun T10/T11/T12 and normal final-plan case; otherwise record verified W05 protection without changing source (FR-003, FR-006, FR-008).
- [ ] T031 [US3] [Elena] Implement server-instance active-run admission in `server/index.ts` (or focused `server/tactical/admission.ts`): `activeRuns` integer 0–2, reserve only after exact request validation and before provider construction, reject excess safely with zero provider work; never trust client identity/counters; rerun T13 concurrency (FR-007; depends on T023).
- [ ] T032 [US3] [Elena] Add per-process rolling 60-second admission timestamps in `server/index.ts` or `server/tactical/admission.ts`: at most five newly admitted valid runs per window, server-owned injectable clock, invalid/rejected requests excluded, fixed safe excess response; rerun T13 rate/expiry (FR-007; depends on T024).
- [ ] T033 [US3] [Elena] Complete admission lifecycle in `server/index.ts` or `server/tactical/admission.ts`: release each active slot once in `finally` on success/error/timeout/cancel/disconnect, reject late completion as success, and prove both slot and rate-window recovery with Elena's T023–T025 admission fixtures; document single-process/local limitation (FR-006, FR-007; depends on T025, T031, T032; Isidora's T12 later proves aggregate deadline separately).
- [ ] T034 [US3] [Elena] Add generated correlation ID and allowlisted admission/rejection/completion event representation/sink in `server/index.ts` or `server/tactical/security-events.ts`; include only fixed event/reason/outcome, timestamp, generated ID, bounded numeric provider/tool counters; exclude raw goal, game state/stats, provider text, secrets, cookies/tokens, CoT, stack, and untrusted newline; rerun T14 (FR-008; depends on T026).

**Checkpoint**: US3 has deterministic per-run and 2-active/5-per-rolling-minute proof, safe recovery, and minimal events; no distributed-rate claim.

---

## Phase 5: US1 — Receive safe, useful advice (Priority: P1)

**Goal**: Show the hardened path still provides useful read-only coaching, inert text, and working gameplay in the production browser profile.

**Independent test**: Normal fake flow has at least two provider steps and one actual allowed tool, materialized evidence, unchanged game, and safe browser display.

### Positive and browser security tests

- [ ] T035 [US1] [Joint] Add official T00 positive fake integration in `tests/tactical-api.test.js` and affected `tests/game.test.js`/`tests/api.test.js`: normal game, ≥2 provider/model steps, ≥1 actually executed allowlisted tool, validated readable final plan with both evidence sources, full canonical game-state equality, Week 4 Hint and basic gameplay regression (FR-004, FR-009).
- [ ] T036 [US1] [Elena] Add T04 real-browser test in `tests/browser/tactical-security.spec.js`: inject XSS marker via malicious fake model/final text and separate real user goal path; assert no script execution, inert DOM, and readable Serbian letters, apostrophe, `a < b` (FR-005; depends on T008).
- [ ] T037 [US1] [Elena] Add T05 real-browser test in `tests/browser/tactical-security.spec.js`: raw HTML, Markdown syntax, and `javascript:` content/link attempt stay inert text or are rejected; assert no HTML execution, Markdown-to-HTML conversion, active linkification, or unsafe link; do not add a rich-text renderer (FR-005; depends on T008).
- [ ] T038 [US1] [Elena] Configure the documented production-built Vite preview in `vite.config.js` with relative `/api` proxy and delivered CSP (`default-src`, `script-src`, `style-src`, `img-src`, `connect-src`, `object-src`, `base-uri`, `frame-ancestors`) plus `X-Content-Type-Options: nosniff` and privacy-preserving `Referrer-Policy`; verify exact built-asset compatibility, avoid unnecessary `unsafe-eval`, and keep same-origin fake Coach/game working (FR-011, FR-012).
- [ ] T039 [US1] [Elena] Add T16 header/CSP proof in `tests/browser/tactical-security.spec.js`: inspect delivered production headers; show controlled second-origin script returns HTTP 200 and executes on no-CSP control, then named `script-src` directive blocks it with browser violation and no execution marker; 404/wrong path cannot count (FR-012; depends on T038).
- [ ] T040 [US1] [Elena] Complete T16 production sentinel and smoke check in `tests/browser/tactical-security.spec.js` and `specs/004-secure-the-arcade/quickstart.md`: synthetic server sentinel absent from `dist/` artifacts/source maps if present, game and normal fake Coach work through preview `/api`, hostile returned text remains inert (FR-005, FR-008, FR-009; depends on T039).
- [ ] T041 [US1] [Joint] Rerun T00/T04/T05/T16 and existing UI/game/Hint tests after browser/header work; if a regression is observed, make only the directly necessary correction in `src/tactical-ui.js`, `vite.config.js`, or corresponding focused tests, preserving text-only rendering and canonical game state; record exact before/after result in `EVIDENCE_W08.md` later (FR-004, FR-005, FR-009).

**Checkpoint**: US1 is independently useful; all tested untrusted strings stay inert in a real browser and production CSP blocks an available script.

---

## Phase 6: US4 — Reproduce the security case (Priority: P3)

**Goal**: Complete cross-boundary coverage, audit dependencies, and give reviewers reproducible observations rather than future-tense claims.

**Independent test**: Run T00–T17 fake-first from recorded checkpoints and reproduce three identical-fixture before/after comparisons without a live key.

### Combined scenario and dependency verification

- [ ] T042 [US4] [Isidora] Add official T17 combined fake integration in `tests/tactical-api.test.js`: schema-valid forged client snapshot plus malicious goal reaches fake provider, fake proposes forbidden tool, application refuses with `executedForbiddenToolCalls = 0`, canonical game state unchanged, minimal safe event; explicitly distinguish this cross-boundary case from T09 (FR-002–FR-004, FR-008, FR-010; depends on Elena's committed admission/event controls and Isidora's relevant tool/provider controls).
- [ ] T043 [US4] [Elena] After T007 settles `package-lock.json`, inspect that actual lockfile; run read-only `npm audit --package-lock-only --json` and `npm audit --package-lock-only --omit=dev --json`; record runtime versus dev findings for the Elena handoff in `specs/004-secure-the-arcade/quickstart.md` for later transfer to `EVIDENCE_W08.md`, including package, locked/installed version, advisory, actual exposure, disposition (`fixed`, `mitigated`, `demonstrated not applicable`, `open risk`), residual risk or exact audit obstacle; do not run `npm audit fix --force` or treat clean audit as application-security proof (FR-015).
- [ ] T044 [US4] [Elena] Only if T043 demonstrates relevant remediable exposure, make a minimal justified dependency change in `package.json`/`package-lock.json`, then rerun typecheck, full test, client/server builds, W08 tests, browser tests, and audit; otherwise close this conditional task as not applicable in the Elena handoff notes in `specs/004-secure-the-arcade/quickstart.md` for later `EVIDENCE_W08.md` transfer, without changing dependency versions (FR-015).

### Comparable pre/post evidence and full matrix

- [ ] T045 [US4] [Joint] Capture P1 aggregate-concurrency comparison in `EVIDENCE_W08.md`: run the same parallel HTTP fixture against before checkpoint `e0ef30a1eddc9583a9894b79e10d53424d9f0b2a` and W08 after state, recording actual active/provider counts, admission outcomes, commands, and local single-process limit; do not insert vulnerable code to manufacture a difference (FR-007, FR-013, FR-014).
- [ ] T046 [US4] [Joint] Capture P2 production CSP/header comparison in `EVIDENCE_W08.md`: same built-browser/script fixture before checkpoint and after, including resource HTTP 200/no-CSP control, delivered headers, named CSP violation, DOM/game outcome, and any baseline serving limitation; no 404-based success claim (FR-012–FR-014).
- [ ] T047 [US4] [Joint] Capture P3 existing tool-authority comparison in `EVIDENCE_W08.md`: same forbidden/prototype fake fixture before and after with zero/actual dispatch counts and state; state that W05 may already reject safely and the point is regression proof, not a required vulnerable “before” result (FR-003, FR-013, FR-014).
- [ ] T048 [US4] [Joint] Run and record the complete official T00–T17 matrix from `tests/tactical-api.test.js`, `tests/tactical-admission.test.js` if created, focused Tactical tests, and `tests/browser/tactical-security.spec.js`: for every ID record applicability, fixture/input, expectation written before run, exact command, observed result, provider/tool counts, game state before/after where relevant, conclusion, and proof limit; zero real Gemini calls (FR-013, FR-014).
- [ ] T049 [US4] [Joint] Build `EVIDENCE_W08.md` with scope/checkpoint, architecture/trust-boundary diagram, data inventory, ≥6 concrete risks (direct HTTP/authority, forbidden tools, model/browser text, parallel/frequent exhaustion, secret/log leakage, forged state), top 3, I1–I8 mapping, and explicit 4096-byte request, 240-code-point goal, 8192-byte provider/tool, 4096-byte final, 3-step/2-tool/4-attempt/1-retry, 5000 ms call/22000 ms total, 2-active/5-per-60s limits (FR-006, FR-007, FR-013).
- [ ] T050 [US4] [Joint] Finish `EVIDENCE_W08.md` with T00–T17 observations from T048, P1/P2/P3 from T045–T047, conditional CORS/CSRF origin/credential reasoning, dependency table, synthetic sentinel/event proof, typecheck/test/build/browser results, limits/open risks, and actual Elena/Isidora/AI contributions; mark planned, executed, observed, and inferred separately and never backfill unrun results (FR-011, FR-013–FR-015).

### Pair review and final runbook/demo

- [ ] T051 [US4] [Elena] Cross-review at least one Isidora-owned T06–T12/T17 negative test and its `server/tactical/` enforcement location; record finding, forbidden effect, assertion, and proof limitation in `EVIDENCE_W08.md`, then explain complete browser → HTTP → provider → tool → validated UI path (FR-014).
- [ ] T052 [US4] [Isidora] After Elena handoff, cross-review at least one completed Elena-owned T01–T05/T13–T16 HTTP/browser negative test and its `server/index.ts` or `vite.config.js` enforcement location; record finding, forbidden effect, assertion, and proof limitation in `specs/004-secure-the-arcade/quickstart.md` for later transfer to `EVIDENCE_W08.md`, then explain complete Tactical path (FR-014).
- [ ] T053 [US4] [Joint] Review final `git diff` and `git status`, confirm no real key/sentinel leak in source/build/source maps/logs/HTTP/model, no unnecessary dependency or broad refactor, safe public errors, conditional CORS/CSRF decision, six-risk threat model, I1–I8 and T00–T17 completeness in `EVIDENCE_W08.md` (FR-008, FR-011, FR-013–FR-015).
- [ ] T054 [US4] [Joint] Run final `npm run typecheck`, full `npm test`, `npm run build`, `npm run build:server`, the actual W08 security/browser commands added during implementation, deterministic fake-only suite, production header/CSP check, sentinel search, and dependency audit; record exact commands, exit codes, pass/fail/skipped counts, and failures in `EVIDENCE_W08.md` and `specs/004-secure-the-arcade/quickstart.md`; do not claim a nonexistent script currently exists (FR-009, FR-014, FR-015).
- [ ] T055 [US4] [Joint] Prepare and rehearse an exactly 8-minute runbook in `specs/004-secure-the-arcade/quickstart.md`: 0:00–1:00 game/AI/risk; 1:00–2:30 normal W05 ≥2 steps and actual allowed tool; 2:30–5:00 browser/API abuse and agent/tool abuse; 5:00–6:30 counters/state/automated tests; 6:30–8:00 P1/P2/P3 before/after, production build, limitations; both Elena and Isidora must explain decision/enforcement location, forbidden effect, test, and what proof does not establish (FR-009, FR-013, FR-014).

**Checkpoint**: Reproducible evidence and actual pair review support a final decision; no claimed result precedes its run.

---

## Dependencies & execution order

1. **Wave A / Elena**: T001 is a completed baseline record. Elena prepares shared T002 before her T003/T005/T007/T008 and all Elena-owned negatives/controls. The HTTP, browser, admission, and dependency chains in the Wave A section are lane-specific; T018 and T044 remain conditional. No Isidora task is a prerequisite for Elena's handoff gate.
2. **Elena handoff**: The named test/build/diff/status/secret gate must pass; Elena commits and pushes her complete technical half and captures its real SHA. This is the prerequisite for every Wave B task.
3. **Wave B / Isidora**: T004/T006 begin only after Elena's pushed handoff. Isidora runs her US2 and US3 negatives before T017/T027–T030, then combined T042 against committed Elena admission/events and her own tool/provider controls. T052 reviews completed Elena work. No Elena implementation resumes between Isidora tasks.
4. **Isidora handoff**: The second named test/build/diff/status/secret gate must pass; Isidora commits and pushes her complete technical half and captures its real SHA. This is the prerequisite for Wave C.
5. **Wave C / Joint**: T035/T041 integrate and prove useful normal behavior; T045–T047 compare the same before/after fixtures, T048 runs the official matrix, T049/T050 records evidence and both real handoff SHAs, T051 completes reciprocal review, and T053–T055 perform final quality gates/demo. A minimal integration fix is allowed only if an actual regression requires it; repeat affected checks afterward.

### Critical chain

`T001 [done] → Wave A: T002 → Elena HTTP/browser/admission negatives → Elena narrow controls + audit → ELENA HALF COMPLETE handoff commit/push → Wave B: T004/T006 → Isidora tool/provider negatives → Isidora narrow controls + T042/T052 → ISIDORA HALF COMPLETE handoff commit/push → Wave C: T035/T041 → T045–T050 evidence/matrix → T051/T053/T054 review/gates → T055 demo`.

## Implementation strategy and proof limits

- **Security MVP**: Elena's direct-request, admission, browser, and event proof is the first stable half; Isidora's closed-tool/provider proof is the second. Joint T00 positive path follows both. A reject-all implementation fails T00, T01 valid edge, T08 positive tool, T13 recovery, and T16 Coach smoke.
- **Incremental delivery**: Within each sequential lane, write deterministic negatives before narrow fixes and preserve W05 protections already proven. Elena's complete half is committed/pushed before Isidora starts; joint evidence follows both. Use only fake/stub providers for the official suite.
- **Boundary of evidence**: Client snapshot is validated but unverified; fake-provider tests prove application execution policy, not universal real-Gemini behavior; provider byte check is post-SDK, not network-stream; admission is one-process/local; CSRF non-applicability requires the observed no-ambient-credential profile.
- **Task-level choices**: Final safe 429/503 error code names, event representation/sink, exact output-token value, browser script name/port, and whether focused tests live in existing or new named files are selected from measured local behavior during the corresponding tasks. None requires a new auth model, dependency upgrade without audit evidence, or live key.
