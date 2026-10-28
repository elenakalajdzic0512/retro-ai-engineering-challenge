# Feature Specification: Secure the Arcade — Neon Tactical Coach Security Hardening

**Feature Branch**: `week8/secure-the-arcade`
**Created**: 2026-10-27
**Status**: Draft for review; no Week 8 implementation or security tests performed
**Input**: Harden the existing Neon Tactical Coach request-to-browser flow while preserving Week 5 coaching and Neon Breaker gameplay.

## User Scenarios & Testing

### User Story 1 - Receive safe, useful advice (Priority: P1)

A player enters a goal and receives a readable, evidence-grounded Tactical plan without losing control of the game.

**Why this priority**: A security change that rejects all coaching or changes gameplay fails the feature's purpose.

**Independent Test**: With a deterministic fake Tactical provider and valid client-reported state, receive a plan with validated evidence, inspect inert browser text, and compare complete game state before and after.

**Acceptance Scenarios**:

1. **Given** a valid goal and coachable state, **when** the player requests Tactical Coach, **then** the existing snapshot → evaluation → final-plan flow returns readable advice with application-materialized evidence and no game mutation.
2. **Given** ordinary text with Serbian letters, an apostrophe, or `a < b`, **when** it appears in the goal or validated plan, **then** it remains readable and cannot execute as browser markup or script.
3. **Given** a Tactical failure, **when** the request stops, **then** the player sees a safe status and can continue playing; Week 4 Hint and basic gameplay still work.

### User Story 2 - Reject untrusted authority and tools (Priority: P1)

A direct HTTP caller or hostile model cannot alter server policy, invoke an unapproved Tactical tool, or turn browser-reported game state into verified authority.

**Why this priority**: Browser requests and model proposals cross the server's trust boundary.

**Independent Test**: Submit malformed and privilege-bearing HTTP requests, then script malicious fake-provider proposals; inspect provider/tool counters and sanitized responses.

**Acceptance Scenarios**:

1. **Given** an invalid initial HTTP request, **when** it reaches `POST /api/tactical-coach`, **then** it is rejected before any provider attempt or business/tool execution.
2. **Given** extra `provider`, `maxSteps`, `ownerId`, or `role` fields, **when** they are submitted directly, **then** they neither set server policy nor confer identity or authority.
3. **Given** an unknown/forbidden tool, `constructor`, `toString`, or a known tool with invalid arguments, **when** the model proposes it, **then** it executes no unauthorized business behavior and stops safely.
4. **Given** an internally consistent but forged client state, **when** it is validated, **then** it remains unverified functional input for advisory coaching, never a privileged or confirmed game result.
5. **Given** a caller-supplied `gameId`, `sessionId`, or `scenarioId`, **when** a run starts, **then** no other game/session resource becomes readable and each Tactical tool remains bound to that run's validated snapshot; this demonstrates local/demo scope, not authentication.

### User Story 3 - Bound work and protect secrets (Priority: P2)

Repeated or parallel requests cannot consume unbounded provider capacity, and security diagnostics do not reveal private content.

**Why this priority**: Per-run limits alone do not bound aggregate HTTP work or operational leakage.

**Independent Test**: Use deterministic fake requests at and beyond concurrent/rate admission boundaries; inspect active counts, attempts, responses, model context, browser artifacts, and logs with a synthetic secret sentinel.

**Acceptance Scenarios**:

1. **Given** more valid requests than server admission allows, **when** excess requests arrive, **then** they are rejected before provider/tool work while accepted runs remain bounded.
2. **Given** retries, repeated actions, timeouts, or oversized provider/tool data, **when** a limit is reached, **then** the run cannot extend its budget, forward invalid content, or turn a late value into success.
3. **Given** a synthetic server secret sentinel, **when** relevant outputs are inspected, **then** it is absent outside permitted server-side configuration.

### User Story 4 - Reproduce the security case (Priority: P3)

A reviewer can trace each architecture-specific threat from expected behavior to observed result and conclusion without a live provider.

**Why this priority**: A passing assertion alone does not show which boundary was exercised or whether a risk was reduced.

**Independent Test**: Re-run the fake-first T00–T17 matrix from a recorded checkpoint and compare at least three like-for-like pre/post scenarios in the later `EVIDENCE_W08.md`.

**Acceptance Scenarios**:

1. **Given** completed W08 evidence, **when** a reviewer reads it, **then** at least six concrete risks and three comparable pre/post scenarios distinguish planned, executed, observed, and inferred statements.
2. **Given** no Gemini key, **when** the adversarial suite runs, **then** it makes no live Gemini call, uses no real secret, and produces reproducible results.

### Edge Cases

- Benign Unicode and comparison text resembles markup or an instruction; it stays usable but inert.
- A valid tool is proposed in the wrong phase, repeated, or receives inherited/extra argument properties; it does not execute.
- A tool result has an extra secret field, exceeds its size bound, or disagrees with deterministic recomputation; it is not forwarded to the model.
- A provider settles after cancellation, per-call timeout, or total deadline; its late result cannot become success.
- A transient retry occurs after earlier provider attempts; it shares the same global attempt count and deadline.
- Several callers start together or one caller starts many sequential requests; both aggregate server limits hold with browser controls disabled.
- A forged state passes schema/range equations; the server still cannot prove gameplay provenance.
- A newline or fake security-event fragment in untrusted text cannot create an operational event or inject raw content into one.
- No cookie or ambient credential grants privileged access; CSRF applicability is assessed from this real boundary, while resource protection still applies.

## Requirements

### Existing Week 5 controls and candidate Week 8 gaps

The baseline at `e0ef30a1eddc9583a9894b79e10d53424d9f0b2a` contains the advisory Tactical route, exact request/result contracts, two named tools, runtime argument/result checks, deterministic evaluator recomputation, candidate-matching final-plan validation, application-materialized evidence, server-selected provider, stale-response handling, and per-run orchestration bounds. These are **existing controls to prove and regress**, not new W08 features. The W08 audit must verify implementation behavior against the Week 5 spec and contracts.

The code review for this specification did not establish server-wide Tactical concurrency/rate admission, an active production browser CSP/security-header profile, minimal security-event logging, or the W08 normalized-provider-output bound. These are **candidate W08 gaps to confirm during planning/audit**, not claims of completed fixes. Dependency audit is also future verification work. No W08 test, mitigation, or live-provider result has been performed in this specification step.

### Functional Requirements

- **FR-001 (I1 — admission)**: A valid top-level JSON body for `POST /api/tactical-coach` MUST contain exactly the required fields `goal` and `state`, with no other top-level field. Unknown/additional fields, a missing `goal` or `state`, `null` for either, a wrong type, or an invalid nested shape/domain value MUST be rejected. The Tactical HTTP boundary MUST also reject requests failing method, media type, body size, JSON/schema, goal, state, or any applicable access check before a Tactical provider attempt and before business/tool execution. Its 4096-byte body limit MUST be enforced while receiving the body or before complete JSON parsing; an oversized request MUST NOT have to be fully accepted and parsed as a valid JSON object before rejection. This is a local Node HTTP boundary requirement, not a claim about a network proxy or load balancer. Direct HTTP tests MUST observe zero provider attempts and zero tool executions for each invalid or oversized initial request. Public errors MUST not contain raw private input.
- **FR-002 (I2 — policy authority)**: Server policy alone MUST determine provider/model configuration, agent budgets, security limits, and any identity/authorization rule that genuinely exists. Browser/model input MUST NOT change these. The local/demo project has no login, owner model, private-resource session, or confirmed leaderboard; W08 MUST NOT invent them. `provider`, `maxSteps`, `ownerId`, and `role` are server-owned concepts, not optional fields in the public Tactical request contract; if submitted as extra fields they MUST be rejected and confer no authority.
- **FR-003 (I3 — closed tool authority)**: Only `get_tactical_snapshot` and `evaluate_tactical_strategy` MAY execute, with exact allowlisted names, valid own arguments, permitted agent phase, and request-scoped validated data. Unknown, forbidden, prototype/inherited names, specifically `constructor` and `toString`, MUST never dispatch. Invalid known-tool arguments MUST stop before business behavior. A schema-valid proposal attempting to use a different request's context MUST also fail; a positive proposal for the same tool and current context MUST work. A malicious goal plus malicious fake-provider proposal MUST not widen capability. Fake-provider proof establishes the application execution boundary, not universal prompt-injection resistance of real Gemini.
- **FR-004 (I4 — gameplay integrity)**: Tactical success, rejection, timeout, cancellation, and malicious-input paths MUST leave canonical gameplay state unchanged, including score, lives, bricks, ball, paddle, bumpers, portals, shield, status, and other game fields. No write-capable AI capability MAY be added.
- **FR-005 (I5 — inert text)**: Goal, provider/model output, validated plan text, and materialized evidence MUST remain untrusted data through the browser boundary. The Tactical UI has a text-only contract: AI/user HTML stays inert text or is rejected; raw HTML MUST NOT execute; Markdown markup MUST NOT be automatically converted to active HTML; untrusted model text MUST NOT be automatically linkified; `javascript:` and other disallowed URL-scheme strings MUST remain inert text or be rejected. No rich-text renderer is added solely to test its security. Neither success nor error rendering MAY create executable HTML/JavaScript. Benign Serbian letters, apostrophes, and `a < b` MUST remain usable. Production browser verification MUST demonstrate inert DOM behavior and an active CSP that blocks unauthorized script execution without breaking play.
- **FR-006 (I6 — per-run bounds)**: The Tactical boundary MUST retain or tighten the existing 4096-byte request body, 240-code-point goal, 4096-byte final plan/success response, 8192-byte tool result, three logical steps, two tool executions, four total provider attempts, 5000 ms per-call timeout, 22000 ms total deadline, and one transient retry. Provider/model output MUST have a server-owned bounded-size policy; the local project policy is at most 8192 serialized UTF-8 bytes for the normalized outcome presented to application orchestration. Where the provider adapter/SDK supports generation, token, or output-size limits, the server MUST set an appropriate limit. The application MUST check size at the earliest point under its control before tool dispatch or final success. If an SDK has already received/processed the whole remote response before exposing it, evidence MUST identify the check as a post-receive/post-SDK bound, not claim a network-stream bound. Repeated actions MUST stop. Retry MUST NOT reset provider budget or total deadline; per-call timeout and total deadline MUST be independently observable. Invalid/oversized provider output MUST NOT become success; invalid/oversized tool output or an extra secret field MUST NOT be forwarded to the model. Late results MUST NOT become success.
  **FR-006 metadata/context clarification (2026-10-28):** The server MUST cap a retained Gemini `thoughtSignature` at 8192 UTF-8 bytes without truncating an accepted signature, and reject an oversized one before retaining it or continuing. Before every SDK call, the serialized model-facing request (model, `contents`, system instruction and generation config, including tool declarations or final response schema; excluding transport `AbortSignal` and retry options) MUST be at most 16384 UTF-8 bytes. A sum of individually valid elements exceeding this total MUST stop before the next SDK call with a sanitized error. These are application-side bounds, not limits on bytes already received or processed by the SDK/network.
- **FR-007 (I6 — aggregate bounds)**: For this small local, single-process demo, the Tactical server MUST allow at most two active Tactical runs and at most five newly admitted Tactical runs per rolling 60 seconds per process. These are project-specific teaching/demo limits, not industry-standard or distributed-production rate limits. Excess MUST be rejected before provider/tool work with a safe response. After an active slot frees and after the rate window expires, a legitimate request MUST be admitted again. Policy MUST use server-owned counters/time, never client-supplied identity or an UI-disabled button. Tests MUST deterministically measure active runs, admitted arrivals, provider/tool attempts, slot release, and window expiry with a fake provider/clock.
- **FR-008 (I7 — secret scope)**: Server credentials and unnecessary internal data MUST be absent from browser bundles, source maps if present, HTTP bodies, model-visible context, and operational security logs. Minimal events MUST make admitted decisions where useful, rejected decisions, and Tactical completion observable. Event metadata MUST be explicitly allowlisted, for example event/category, timestamp, application-generated correlation ID, reason/outcome, providerAttempts, and executedToolCalls; the exact representation remains a planning choice. Events MUST exclude raw goal/prompt, game statistics or complete state, raw provider output, provider/API secret, cookie/bearer token, chain-of-thought, and stack trace. Newline/fake-event text from untrusted input MUST neither be copied raw nor create a forged event. Synthetic sentinels, never real keys, MUST verify these boundaries. Model context may contain only bounded, validated state/tool information needed for coaching.
- **FR-009 (I8 — regression)**: Normal Week 5 fake Tactical flow MUST still yield a validated readable plan with evidence, while basic Neon Breaker gameplay and Week 4 Hint remain functional. Hardening MUST NOT pass by rejecting all requests or silently switching Gemini failure to fake.
- **FR-010 (trust model)**: Tactical `state` MUST be treated as **validated but unverified client-reported functional input**. The server MAY validate shape, ranges, and internal consistency but MUST NOT call it a server-authoritative game ledger or use it for privileges, confirmed rankings, leaderboard results, or anti-cheat conclusions. Arbitrary `gameId`, `sessionId`, `scenarioId`, or other resource selectors MUST NOT create access to another game/session; the two Tactical tools remain bound to the current validated request context. This is a local/demo scope boundary, not an authentication claim. Coach output remains advisory.
- **FR-011 (CORS/CSRF applicability)**: Planning MUST first assess the actual serving/origin/credential boundary of the local/demo architecture. If no cookie or other ambient browser credential grants privileged access, evidence MAY conclude with reasons that a CSRF mechanism is inapplicable; no login or cookie is added solely for the test. If frontend and API are cross-origin, an appropriate origin/credentials policy MUST be defined and enforced where applicable before provider work. CORS is not authentication. A justified CSRF non-applicability finding does not waive aggregate rate/resource protection.
- **FR-012 (browser profile)**: The supported production browser profile MUST deliver an active CSP and appropriate response security headers, including content-type sniffing protection and a privacy-preserving referrer policy. Acceptance MUST inspect delivered headers and show that a controlled script/resource which would otherwise be available and executable is blocked by the specific CSP directive; a 404, wrong path, or inherently unavailable resource is not proof of CSP enforcement. Hostile returned text MUST remain inert while normal Tactical/gameplay assets work. The plan chooses how to serve that profile.
- **FR-013 (threat evidence)**: A later `EVIDENCE_W08.md` MUST document at least six concrete architecture risks: direct HTTP/privilege-field attempts; forbidden tool proposals; malicious provider output to browser; parallel/frequent resource exhaustion; secret/log leakage; and forged client-reported state. Each risk record MUST identify the scenario/attack path, prerequisite, entry point and trust boundary, protected asset/user/resource, qualitative likelihood with a short rationale, qualitative impact with a short rationale, existing W05 control, W08 gap, planned or enforced control, executable proof/test, observed result when executed, and residual limitation/risk. Evidence MUST select and justify the top three priority risks from those records. Evidence MUST distinguish planned, executed, observed, and inferred claims; unrun tests MUST NOT be described as observed. The same document MUST include a data inventory for each relevant datum: name, controller/source, trust boundary crossed, validation point, whether it reaches the model, where/how long it is stored or retained, and security rationale/necessity. The inventory MUST address `goal`, Tactical `state` including score/lives/bricks and other snapshot fields, provider configuration, API key or synthetic sentinel, provider/model output, tool name, tool arguments, tool result, final plan, application-materialized evidence, public error, correlation ID, and security event. It MUST assess localStorage and URL data only if present or relevant in the actual architecture; if absent, it MUST say they were not observed rather than inventing storage.
- **FR-014 (verification discipline)**: W08 adversarial verification MUST be deterministic and fake-first, use no live Gemini call or real API key, include a reproducible checkpoint/commands, keep changes small and targeted, and avoid a broad refactor. It MUST include three comparable pre/post scenarios and a T00–T17 coverage matrix. Any later authorized live observation MUST be separately labeled and cannot replace fake tests.
- **FR-015 (dependency audit)**: W08 verification MUST inspect the actual lockfile and run an appropriate npm dependency audit, distinguishing runtime from development dependencies. For each relevant advisory, evidence MUST record the package, installed/locked version, advisory, runtime or development classification, exposure/applicability in this project, disposition (`fixed`, `mitigated`, `demonstrated not applicable`, or `accepted/open`), and residual risk after that decision. It MUST NOT apply `npm audit fix --force` blindly. After any relevant dependency change, affected regression checks MUST be repeated. If audit cannot run, evidence MUST record why and the remaining uncertainty. A clean dependency audit MUST NOT be presented as proof that application/business logic is secure.

### Required acceptance matrix for later tests (not yet executed)

| ID | Required observation | Invariants |
| --- | --- | --- |
| T00 | Normal game and existing W05 Tactical Coach flow work: at least two model steps, at least one real allowlisted tool call, valid result, and no canonical game mutation | I4, I8 |
| T01 | Direct HTTP invalid JSON, wrong type, and domain-invalid value fail separately with `providerAttempts = 0` and `executedToolCalls = 0`; a legitimate boundary value passes | I1 |
| T02 | Oversized request is rejected; separate size and privilege-field cases show `maxSteps`, `ownerId`, `role`, `provider` cannot alter server policy | I1, I2, I6 |
| T03 | Local/demo scope boundary: arbitrary `gameId`, `sessionId`, `scenarioId`, or another resource selector opens no other data; Tactical tools use only this run's validated request-scoped snapshot, without claiming authentication proof | I2, I3 |
| T04 | XSS marker through actual browser render path in malicious model/final text and another real user-text channel such as goal causes no execution; DOM stays safe while Serbian letters, apostrophe, and `a < b` remain usable | I5 |
| T05 | Dangerous HTML, Markdown, link, and `javascript:` strings stay inert text or are rejected; no raw HTML execution, automatic Markdown-to-HTML, or active linkification | I5 |
| T06 | Invalid decision/final provider output, oversized normalized outcome, oversized retained `thoughtSignature`, or oversized total model-facing context yields controlled sanitized failure, no success display or continuation with the invalid step, and preserved budget; valid signature/normal flow remains usable | I6 |
| T07 | Unknown/forbidden tool and inherited/prototype names `constructor` and `toString` execute zero forbidden tools and have zero unwanted effects | I3 |
| T08 | Allowed tool with invalid args fails before work; a separate schema-valid cross-context scope attempt fails; a positive call to the same allowed tool in the current request succeeds | I3 |
| T09 | Malicious Tactical goal reaches a fake provider scripted to propose a forbidden capability; application policy rejects it with zero forbidden execution and unchanged game. This proves application execution boundaries, not universal real-Gemini prompt-injection resistance | I3, I4 |
| T10 | Oversized or invalid tool result, or extra synthetic-secret field, is rejected or explicitly normalized; raw object, extra field, and secret do not enter the next model call | I6, I7 |
| T11 | Separately prove repeated-action detection and exhaustion of total agent/provider/tool budgets; retry resets none of them and no calls exceed the limits | I3, I6 |
| T12 | Separately prove one per-call timeout, aggregate total-deadline expiry across individually allowed steps, no new step after deadline, no late success, and safe cleanup/capacity release; unresolved local provider work that ignores abort remains counted | I6 |
| T13 | Parallel HTTP requests prove the server-owned concurrency cap, including abort-ignoring in-flight work; a separate arrival sequence proves rate limit. Excess starts no provider work; a valid request succeeds after actual work settles and a slot frees, and after the rate window expires | I1, I6, I8 |
| T14 | Separately inject a synthetic secret in internal provider failure/forbidden tool field and newline/fake-event text in untrusted input; no token in HTTP/model/frontend/log, no raw text in security event, no forged event | I7 |
| T15 | Forged but schema-valid browser Tactical snapshot/score/game state changes no authority, provider/tool/security limits, or confirmed server result; Coach stays advisory | I2, I4 |
| T16 | Production build loads synthetic server sentinel without putting it in client artifacts/source maps; delivered CSP/security headers are inspected; a controlled otherwise-available script/resource is blocked by a named CSP directive (not a 404/wrong path); game and Coach still work | I5, I7, I8 |
| T17 | Combined Neon Breaker boundary case: forged-valid client state remains unverified; malicious goal reaches fake provider, which proposes forbidden tool; application refuses it, `executedForbiddenToolCalls = 0`, canonical game stays unchanged, security event stays minimal. Together these cross-boundary observations exceed the isolated T09/T14/T15 proofs | I2, I3, I4, I7 |

### Invariant coverage map

| Invariant | Requirements | Later acceptance |
| --- | --- | --- |
| I1 — initial rejection before work | FR-001, FR-011 | T01, T02, T13 admission |
| I2 — server-owned policy/authority | FR-002, FR-010 | T02, T03, T15, T17 |
| I3 — closed, phase-safe tools | FR-003 | T03, T07, T08, T09, T11, T17 |
| I4 — no game mutation | FR-004, FR-010 | T00, T09, T15, T17 |
| I5 — inert untrusted text | FR-005, FR-012 | T04, T05, T16 |
| I6 — per-run and aggregate bounds | FR-006, FR-007 | T02, T06, T10, T11, T12, T13 |
| I7 — secret/data minimization | FR-008 | T10, T14, T16, T17 |
| I8 — useful regression | FR-009, FR-012 | T00, T13 recovery, T16, existing regression suite |

### Key Entities

- **Tactical request**: Player goal and bounded client-reported game summary; no identity or policy fields.
- **Request-scoped Tactical run**: Validated state, server-owned phase, counters, deadline, and stop outcome.
- **Tool proposal/result**: Model-suggested action checked against the closed registry and phase; validated output from application-controlled read-only work.
- **Admitted run**: Valid Tactical request counted against server-owned active and rolling arrival limits.
- **Final plan and evidence**: Bounded advice plus references whose values the application materializes from validated tool results.
- **Security event record**: Minimal status/category and non-sensitive counters needed to explain admission or stop, without raw content or credentials.
- **Evidence case**: Expected boundary, executed scenario, observed outcome, inference, and residual limitation tied to one risk.

## Success Criteria

### Measurable Outcomes

- **SC-001**: All eight I1–I8 invariants have a named acceptance observation and every T00–T17 row is reproducible without a live provider or real secret.
- **SC-002**: Every invalid initial-request fixture records exactly zero Tactical provider attempts and zero tool executions; every forbidden/invalid tool fixture records zero unauthorized business executions.
- **SC-003**: In the local one-process profile, no more than two Tactical runs are active and no more than five new runs are admitted per rolling 60 seconds; rejected excess records zero provider/tool attempts, and a legitimate request succeeds after slot release and rate-window expiry.
- **SC-004**: All normal Week 5 fake Tactical scenarios and existing gameplay/Week 4 Hint regressions pass after hardening; successful coaching still renders a plan with both evidence sources and leaves game state unchanged.
- **SC-005**: Browser checks show zero executed attacker-supplied script/markup or active disallowed links in tested payloads; HTML/Markdown stay text or are rejected, benign text remains usable, and a controlled available resource is blocked by an active production CSP directive with security headers present.
- **SC-006**: A synthetic secret sentinel has zero appearances in inspected browser artifacts, HTTP bodies, model context, and operational security logs; the raw private-content categories in FR-008 have zero appearances in sampled security records, and newline/fake-event input creates zero forged events.
- **SC-007**: At least six specified risks and three like-for-like pre/post scenarios are recorded in `EVIDENCE_W08.md`, with commands, checkpoint SHA, actual counts/results, and clearly separated planned, executed, observed, and inferred statements. Evidence MUST confirm the final candidate's effective policy values for request-body bytes, goal code points, normalized provider/model output bytes, tool-result bytes, maximum agent steps, tool executions, provider attempts, transient retries, per-call timeout, total deadline, maximum active Tactical runs, and rolling admission count/window; listing only the specified targets is insufficient. Each relevant T00–T17 row MUST record applicable provider attempts, executed tool calls, forbidden tool executions, server admission counters, and canonical/game state before and after the test. A non-applicable field MAY say `N/A — reason`; a field central to that test's security claim MUST NOT be omitted. In particular, T01 needs provider/tool counts; T07/T09 need forbidden-execution counts; T13 needs active/admission/provider counts; T15/T17 need state before/after; and T00 needs provider/tool counts plus state before/after.
- **SC-008**: The adversarial suite completes without Gemini credentials or live-provider calls, and a second local run from the recorded checkpoint reproduces documented pass/fail counts.
- **SC-009**: The recorded dependency audit covers the real lockfile and separates runtime from development packages; every relevant advisory has a package, installed/locked version, advisory, runtime/development classification, project exposure assessment, disposition, and residual risk after the decision, or there is a recorded reason the audit could not run and the remaining uncertainty. Any relevant dependency change has renewed regression results.

## Assumptions

- Neon Breaker is a local/demo, single-user-style project. Tactical state originates in the browser, is runtime-validated by the server, and cannot be proven to come from a played match. There is no login, database, owner/private-session model, or trusted game ledger in this scope.
- Week 5 Tactical Coach is advisory and read-only. Its two tools, contracts, budgets, provider selection, and UI behavior are baseline controls for verification; an audit may uncover defects, but this specification does not predeclare outcomes.
- The inspected route has no observed ambient privileged browser credential. CSRF applicability is a boundary finding to document, not a mandate to build authentication or CSRF infrastructure. Public/local request volume still needs server-side protection.
- The production browser profile is the production-built app under a documented local serving path; public internet deployment is outside this feature. Planning chooses the smallest way to deliver and test required headers.
- The two-active/five-per-minute admission policy is scoped to this local one-process teaching demo. It is intentionally conservative and does not claim distributed or public-production rate limiting.
- Existing source and tests form the implementation baseline. W08 changes should be narrow, reproducible, and avoid a broad refactor, new AI feature, or write-capable model tool.
- **Out of scope**: new login/authentication platform, database, leaderboard, complete anti-cheat, public deployment, arbitrary web/shell/file agent tools, new AI functionality, large architectural refactor, and proof that real Gemini is universally immune to prompt injection.
