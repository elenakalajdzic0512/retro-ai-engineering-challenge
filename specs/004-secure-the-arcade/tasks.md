---
description: "Executable Week 8 security tasks; planned work, not completed evidence"
---

# Tasks: Secure the Arcade

**Input**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/security-boundaries.md`, `quickstart.md` in `specs/004-secure-the-arcade/`.

**Status**: Planning only. An unchecked item is future work, including every test and implementation item. No real Gemini call or real key is part of T00–T17.

**Format**: `[ID] [P?] [US?] [Owner] action in exact path; completion evidence`. `[P]` means the task can run concurrently after its listed prerequisites, uses distinct files or read-only evidence, and has no dependence on the other marked task. Owners are `[Elena]`, `[Isidora]`, and `[Joint]`.

**Ordering**: US2 and US3 establish negative security tests and narrow controls before the final US1 positive/browser acceptance. This dependency order takes precedence over numeric story priority; all four stories retain independent checkpoints.

## Phase 1: Setup — baseline and evidence checkpoint

**Goal**: Preserve the accepted starting facts and define reproducible, fake-first fixtures before changing code.

- [ ] T001 [Joint] Record the confirmed before checkpoint for later transfer to `EVIDENCE_W08.md`: branch `week8/secure-the-arcade`, SHA `e0ef30a1eddc9583a9894b79e10d53424d9f0b2a`, Node `v24.21.0`, npm `11.19.0`, typecheck PASS, 287/287 tests PASS, client build PASS, server build PASS; verify current branch/status first and label these as prior baseline observations, with no invented W08 after result (FR-014).
- [ ] T002 [Joint] Define fixed expected outputs, provider/tool counter names, canonical game-state comparison, fake-only environment, and same-input before/after fixtures P1/P2/P3 in `specs/004-secure-the-arcade/quickstart.md`; completion is a reviewer-readable fixture/command list that cannot invoke live Gemini (FR-004, FR-014; T00–T17).
- [ ] T003 [Elena] Inspect `server/index.ts`, `vite.config.js`, `src/tactical-ui.js`, and `package.json` for actual HTTP/origin/credential/preview behavior; record the conditional CORS/CSRF applicability and local single-process boundary in `specs/004-secure-the-arcade/quickstart.md`, without inventing authentication (FR-010–FR-012).
- [ ] T004 [Isidora] Inspect installed `@google/genai` behavior and existing budgets in `server/tactical/gemini-provider.ts`, `server/tactical/orchestrator.ts`, and `package-lock.json`; record exact output-token/retry API support and earliest application-controlled byte-check point in `specs/004-secure-the-arcade/quickstart.md` (FR-006; no network-stream claim).

**Checkpoint**: Baseline facts and future fixtures are recorded; no W08 result is marked observed.

---

## Phase 2: Foundational — minimal test infrastructure

**Goal**: Give negative tests deterministic clocks, providers, counters, event capture, and a real production-browser harness without expanding product scope.

- [ ] T005 [Elena] Add reusable direct-HTTP fake-provider and fake-clock test helpers in `tests/tactical-api.test.js` (or a focused `tests/tactical-admission.test.js`), exposing provider attempts, executed tool calls, active runs, admitted arrivals, and release; prove helpers can distinguish rejection before provider construction (FR-001, FR-007).
- [ ] T006 [P] [Isidora] Add deterministic provider/tool-call-history helpers in `tests/tactical-orchestrator.test.js` and `tests/tactical-gemini-provider.test.js`; capture proposals, next-step model context, retries, time, and late settlement without a real key (FR-003, FR-006, FR-014).
- [ ] T007 [Elena] Add only minimal dev-only Playwright package/config/script support in `package.json`, `package-lock.json`, and `playwright.config.js`; document browser-binary prerequisite in `specs/004-secure-the-arcade/quickstart.md`, then inspect both package files and rerun existing `npm test` and `npm run build`; no runtime dependency or broad browser suite (FR-012; prerequisite for T04/T05/T16).
- [ ] T008 [Elena] Add controlled local production-profile launch fixture in `playwright.config.js` and `tests/browser/tactical-security.spec.js`: production-built Vite preview plus loopback API using `TACTICAL_AI_PROVIDER=fake`, relative `/api`, predictable teardown, and separate controlled script origin with HTTP 200 probe; completion is a reproducible launch/stop command, not a CSP pass claim (FR-012; depends on T007).

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
- [ ] T031 [US3] [Elena] Implement server-instance active-run admission in `server/index.ts` (or focused `server/tactical/admission.ts`): `activeRuns` integer 0–2, reserve only after exact request validation and before provider construction, reject excess safely with zero provider work; never trust client identity/counters; rerun T13 concurrency (FR-007).
- [ ] T032 [US3] [Elena] Add per-process rolling 60-second admission timestamps in `server/index.ts` or `server/tactical/admission.ts`: at most five newly admitted valid runs per window, server-owned injectable clock, invalid/rejected requests excluded, fixed safe excess response; rerun T13 rate/expiry (FR-007).
- [ ] T033 [US3] [Elena] Complete admission lifecycle in `server/index.ts` or `server/tactical/admission.ts`: release each active slot once in `finally` on success/error/timeout/cancel/disconnect, reject late completion as success, and prove both slot and rate-window recovery with T12/T13; document single-process/local limitation (FR-006, FR-007).
- [ ] T034 [US3] [Elena] Add generated correlation ID and allowlisted admission/rejection/completion event representation/sink in `server/index.ts` or `server/tactical/security-events.ts`; include only fixed event/reason/outcome, timestamp, generated ID, bounded numeric provider/tool counters; exclude raw goal, game state/stats, provider text, secrets, cookies/tokens, CoT, stack, and untrusted newline; rerun T14 (FR-008).

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

- [ ] T042 [US4] [Isidora] Add official T17 combined fake integration in `tests/tactical-api.test.js`: schema-valid forged client snapshot plus malicious goal reaches fake provider, fake proposes forbidden tool, application refuses with `executedForbiddenToolCalls = 0`, canonical game state unchanged, minimal safe event; explicitly distinguish this cross-boundary case from T09 (FR-002–FR-004, FR-008, FR-010).
- [ ] T043 [US4] [Elena] Inspect actual `package-lock.json`; run read-only `npm audit --package-lock-only --json` and `npm audit --package-lock-only --omit=dev --json`; record runtime versus dev findings in `EVIDENCE_W08.md` with package, locked/installed version, advisory, actual exposure, disposition (`fixed`, `mitigated`, `demonstrated not applicable`, `open risk`), residual risk or exact audit obstacle; do not run `npm audit fix --force` or treat clean audit as application-security proof (FR-015).
- [ ] T044 [US4] [Elena] Only if T043 demonstrates relevant remediable exposure, make a minimal justified dependency change in `package.json`/`package-lock.json`, then rerun typecheck, full test, client/server builds, W08 tests, browser tests, and audit; otherwise explicitly close this conditional task as not applicable in `EVIDENCE_W08.md` without changing dependency versions (FR-015).

### Comparable pre/post evidence and full matrix

- [ ] T045 [US4] [Joint] Capture P1 aggregate-concurrency comparison in `EVIDENCE_W08.md`: run the same parallel HTTP fixture against before checkpoint `e0ef30a1eddc9583a9894b79e10d53424d9f0b2a` and W08 after state, recording actual active/provider counts, admission outcomes, commands, and local single-process limit; do not insert vulnerable code to manufacture a difference (FR-007, FR-013, FR-014).
- [ ] T046 [US4] [Joint] Capture P2 production CSP/header comparison in `EVIDENCE_W08.md`: same built-browser/script fixture before checkpoint and after, including resource HTTP 200/no-CSP control, delivered headers, named CSP violation, DOM/game outcome, and any baseline serving limitation; no 404-based success claim (FR-012–FR-014).
- [ ] T047 [US4] [Joint] Capture P3 existing tool-authority comparison in `EVIDENCE_W08.md`: same forbidden/prototype fake fixture before and after with zero/actual dispatch counts and state; state that W05 may already reject safely and the point is regression proof, not a required vulnerable “before” result (FR-003, FR-013, FR-014).
- [ ] T048 [US4] [Joint] Run and record the complete official T00–T17 matrix from `tests/tactical-api.test.js`, `tests/tactical-admission.test.js` if created, focused Tactical tests, and `tests/browser/tactical-security.spec.js`: for every ID record applicability, fixture/input, expectation written before run, exact command, observed result, provider/tool counts, game state before/after where relevant, conclusion, and proof limit; zero real Gemini calls (FR-013, FR-014).
- [ ] T049 [US4] [Joint] Build `EVIDENCE_W08.md` with scope/checkpoint, architecture/trust-boundary diagram, data inventory, ≥6 concrete risks (direct HTTP/authority, forbidden tools, model/browser text, parallel/frequent exhaustion, secret/log leakage, forged state), top 3, I1–I8 mapping, and explicit 4096-byte request, 240-code-point goal, 8192-byte provider/tool, 4096-byte final, 3-step/2-tool/4-attempt/1-retry, 5000 ms call/22000 ms total, 2-active/5-per-60s limits (FR-006, FR-007, FR-013).
- [ ] T050 [US4] [Joint] Finish `EVIDENCE_W08.md` with T00–T17 observations from T048, P1/P2/P3 from T045–T047, conditional CORS/CSRF origin/credential reasoning, dependency table, synthetic sentinel/event proof, typecheck/test/build/browser results, limits/open risks, and actual Elena/Isidora/AI contributions; mark planned, executed, observed, and inferred separately and never backfill unrun results (FR-011, FR-013–FR-015).

### Pair review and final runbook/demo

- [ ] T051 [US4] [Elena] Cross-review at least one Isidora-owned T06–T12/T17 negative test and its `server/tactical/` enforcement location; record finding, forbidden effect, assertion, and proof limitation in `EVIDENCE_W08.md`, then explain complete browser → HTTP → provider → tool → validated UI path (FR-014).
- [ ] T052 [US4] [Isidora] Cross-review at least one Elena-owned T01–T05/T13–T16 HTTP/browser negative test and its `server/index.ts` or `vite.config.js` enforcement location; record finding, forbidden effect, assertion, and proof limitation in `EVIDENCE_W08.md`, then explain complete Tactical path (FR-014).
- [ ] T053 [US4] [Joint] Review final `git diff` and `git status`, confirm no real key/sentinel leak in source/build/source maps/logs/HTTP/model, no unnecessary dependency or broad refactor, safe public errors, conditional CORS/CSRF decision, six-risk threat model, I1–I8 and T00–T17 completeness in `EVIDENCE_W08.md` (FR-008, FR-011, FR-013–FR-015).
- [ ] T054 [US4] [Joint] Run final `npm run typecheck`, full `npm test`, `npm run build`, `npm run build:server`, the actual W08 security/browser commands added during implementation, deterministic fake-only suite, production header/CSP check, sentinel search, and dependency audit; record exact commands, exit codes, pass/fail/skipped counts, and failures in `EVIDENCE_W08.md` and `specs/004-secure-the-arcade/quickstart.md`; do not claim a nonexistent script currently exists (FR-009, FR-014, FR-015).
- [ ] T055 [US4] [Joint] Prepare and rehearse an exactly 8-minute runbook in `specs/004-secure-the-arcade/quickstart.md`: 0:00–1:00 game/AI/risk; 1:00–2:30 normal W05 ≥2 steps and actual allowed tool; 2:30–5:00 browser/API abuse and agent/tool abuse; 5:00–6:30 counters/state/automated tests; 6:30–8:00 P1/P2/P3 before/after, production build, limitations; both Elena and Isidora must explain decision/enforcement location, forbidden effect, test, and what proof does not establish (FR-009, FR-013, FR-014).

**Checkpoint**: Reproducible evidence and actual pair review support a final decision; no claimed result precedes its run.

---

## Dependencies & execution order

1. T001–T004 preserve the real checkpoint and define fixtures. T003 and T004 may inspect separate code concurrently but must serialize their shared `quickstart.md` edit; T002 is completed before T005–T008.
2. T005–T008 provide fake counters and browser infrastructure. T006 may run beside T005; T007 precedes T008 and all real-browser tests.
3. US2 negative tests T009–T016 precede conditional fixes T017–T018. Isidora's T012/T013 share `tests/tactical-tools.test.js` and run sequentially; they can run beside Elena's HTTP tests after T006.
4. US3 negative tests T019–T026 precede T027–T034. Provider work T027–T030 and HTTP admission work T031–T034 can proceed in parallel after their separate tests, but T033 needs T031/T032 and T034 needs the event-sink fixtures from T026.
5. T035 positive proof follows US2/US3 controls. T036/T037 depend on T008; T039 depends on T038; T040 depends on T039. T041 integrates after those tests and any narrow UI correction.
6. T042 depends on tool/admission/event controls and T17 fixture. T043 is read-only and may run once the lockfile settles after T007; T044 is conditional on T043 and blocks final regression if performed.
7. T045–T047 use fixed same-input before/after environments only after corresponding tests/controls exist. T048 follows all official tests, T049/T050 follow observations, T051/T052 review completed work, and T053–T055 finish after the review and any dependency remediation.

### Safe parallel examples

- After T002, Elena's T003 and Isidora's T004 may inspect separate code surfaces concurrently; serialize their `quickstart.md` edits.
- After T005/T006, Elena's HTTP T009–T011/T016 and Isidora's focused tool T012–T015 can be developed in parallel when they edit distinct files; sequence T012/T013 within the shared tool test file.
- After T019–T026, Isidora's adapter/orchestrator controls T027–T030 and Elena's admission/event controls T031–T034 can proceed separately; integration tests wait until both complete.
- T043 dependency audit can run alongside browser test design after T007 locks dependency versions, but remediation T044 serializes all final regression.

### Critical chain

`T001 → T002 → T005/T006 → T009–T026 negative fixtures → T027–T034 minimal controls → T035 + T038–T040 positive/browser proof → T042/T048 complete matrix → T049/T050 evidence → T051/T052 cross-review → T053/T054 quality gates → T055 demo`.

## Implementation strategy and proof limits

- **Security MVP**: US2's direct-request and closed-tool proof plus US3's bounded admission/output/event controls, followed by US1 T00 positive path. A reject-all implementation fails T00, T01 valid edge, T08 positive tool, T13 recovery, and T16 Coach smoke.
- **Incremental delivery**: Write deterministic negatives before narrow fixes; preserve W05 protections already proven. Keep browser/production delivery separate from server/provider changes. Use only fake/stub providers for official suite.
- **Boundary of evidence**: Client snapshot is validated but unverified; fake-provider tests prove application execution policy, not universal real-Gemini behavior; provider byte check is post-SDK, not network-stream; admission is one-process/local; CSRF non-applicability requires the observed no-ambient-credential profile.
- **Task-level choices**: Final safe 429/503 error code names, event representation/sink, exact output-token value, browser script name/port, and whether focused tests live in existing or new named files are selected from measured local behavior during the corresponding tasks. None requires a new auth model, dependency upgrade without audit evidence, or live key.
