# Feature Specification: Neon Breaker AI Hint

**Feature Branch**: `week4/integration`

**Created**: 2026-09-29

**Status**: Draft — specification quality validated; pair review pending

**Input**: SITA AI Bootcamp 2026 Week 4: Reliable AI Integration. Add exactly one explicitly requested AI hint to the completed Neon Breaker game, with bounded contracts, server-only provider access, deterministic testing, and safe failure behavior. This specification is authoritative over prior implementation.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Request one useful game hint (Priority: P1)

As a player, I can select **AI Hint** (or **Ask AI for Hint**) to receive brief advice about what to focus on in my current or just-finished game, without changing how the game plays.

**Why this priority**: This is the sole user-visible AI benefit for Week 4.

**Independent Test**: Use a deterministic fake provider, request a hint from the game UI, and verify the captured snapshot, returned hint/category, and unchanged gameplay.

**Acceptance Scenarios**:

1. **A1 — Valid bounded snapshot**: **Given** a game in each of `ready`, `playing`, `won`, and `lost` with valid field values, **when** the player requests a hint, **then** the frontend sends exactly the bounded snapshot to our backend, the backend validates it, invokes the configured provider, validates its structured output, and returns only `AiHintResponse`; the UI displays its hint and category as text.
2. **A5 — Explicit interaction**: **Given** no player request, **when** the game starts, advances frames, loses a life, wins, loses, or restarts, **then** no AI request occurs. One deliberate activation starts one hint request. While pending, the control prevents duplicate requests and shows a loading state without pausing gameplay.
3. **A6 — Snapshot lifetime**: **Given** a request is pending, **when** gameplay advances, **then** the response refers to the captured snapshot and the UI identifies it as advice for the game when requested. If a new round starts before completion, its old result is discarded. Starting a new round clears the previous hint/error; late results never replace a newer request's state.

### User Story 2 - Continue playing when hints fail (Priority: P1)

As a player, I receive a short, understandable message if a hint cannot be obtained, and I can continue playing or restarting normally.

**Why this priority**: An optional AI feature must not undermine the completed game.

**Independent Test**: Exercise invalid requests and each deterministic failure fixture; verify provider-call counts, bounded completion, safe messages, and working controls.

**Acceptance Scenarios**:

1. **A2 — Invalid local input**: **Given** any request that violates the request contract, **when** it reaches our backend, **then** backend runtime validation rejects it before provider invocation, returns the fixed invalid-input failure, and the acceptance evidence explicitly asserts `providerCallCount === 0`. Frontend-only validation is insufficient.
2. **A3 — Provider failure / timeout**: **Given** an unavailable/transiently failing provider or a provider that never completes, **when** a valid hint is requested, **then** only an explicitly classified transient/retryable failure may receive one retry within the shared two-call budget and 10-second total provider deadline. A successful retry returns a validated hint; exhausted attempts or insufficient remaining time produce the appropriate fixed failure. Game controls and restart remain usable. The UI ends its pending state within 12 seconds of activation even if our backend is unreachable.
3. **A4 — Malformed provider output**: **Given** a provider returns malformed or schema-invalid output, **when** the backend evaluates it, **then** it rejects the output and displays only the fixed malformed-output failure. No partial, raw, coerced, or invalid hint is presented as success.
4. **A7 — Configuration and refusal**: **Given** missing or locally detectable invalid provider configuration (including structurally invalid local configuration), **when** a valid request arrives, **then** the backend returns `NOT_CONFIGURED` with zero provider calls. **Given** a syntactically plausible credential that the provider rejects remotely for authentication/configuration reasons, **then** the backend returns `NOT_CONFIGURED` after one observed provider call, with no retry. **Given** a provider refusal/policy failure, **when** it is received, **then** the fixed refusal failure is returned. None of these failures is retried or replaced with a fabricated success.
5. **A8 — Safe rendering and recovery**: **Given** any failure or provider text containing markup, **when** the UI updates, **then** it exposes no private diagnostic data and executes no provider text as markup or code. A failed new request does not leave an old hint looking like its successful result. Once pending ends, a new deliberate activation is allowed.

### Edge Cases

- Reject missing/extra fields, nulls, arrays, invalid JSON, wrong primitive types, numeric strings, non-finite scores, fractional lives/bricks, negative values, and values above the bounds. Test exact minima/maxima and just-outside values.
- Reject bodies over 1,024 UTF-8 bytes, including excess whitespace, before provider invocation. Reject browser-supplied question, provider, model, tools, timeout, retry, or security fields rather than ignoring them.
- `ready` also occurs after losing a life; it does not imply score zero or a full brick grid. Zero score, zero lives, and zero remaining bricks are valid field boundaries. Validation enforces field contracts, not undocumented cross-field rules.
- Reject whitespace-only or overlong hints, unknown categories, missing/extra response fields, wrong types, invalid JSON, and oversized output. Do not recover a JSON fragment from prose or repair malformed output into success.
- A refusal reported by the provider remains a failure even if accompanying content resembles a hint. Unknown provider failures map to the generic unavailable failure.
- Results arriving after a deadline or round restart must not become visible hints. A stopped or unreachable backend must not leave the UI loading indefinitely.
- The snapshot has no ball position, velocity, paddle position, or brick layout; hints cannot promise precise aiming, predict trajectories, or claim knowledge of unseen positions.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 — Single feature**: Provide one explicit AI Hint control available in ready, playing, won, and lost states. Return one hint per completed request; no chat, conversation history, automatic suggestions, or additional AI feature. Acceptance: A1, A5.
- **FR-002 — Minimal input**: Capture exactly the four fields in the request contract at activation; send no full application state, free-text question, player identity, or unrelated context. Acceptance: A1, A2.
- **FR-003 — Local runtime validation**: Our backend must enforce body size, exact fields, types, enumerations, and numeric limits before any provider call. Static TypeScript types alone do not satisfy validation. Acceptance: A2 and contract boundary fixtures.
- **FR-004 — Validated output**: Treat all provider/model output as untrusted. Only output passing the response runtime contract may be returned as success or displayed. Provider success status alone is insufficient. Acceptance: A1, A4, A8.
- **FR-005 — Advice scope**: Request concise English advice based only on the captured snapshot and fixed Neon Breaker rules. Advice must suit the status, offer a focus for play or a future round, and avoid invented game details or promised outcomes. Acceptance: reviewer assesses one successful hint for each status against these criteria; schema validity alone does not prove usefulness.
- **FR-006 — Architecture**: The required AI path is **browser frontend → our TypeScript backend API → configured AI provider**. Browser code must never directly call Gemini, OpenAI, or another AI provider. Acceptance: A9.
- **FR-007 — Secrets and configuration**: Secrets exist only in server-side environment configuration. The repository may contain `.env.example` with an empty key placeholder, never a real key. Provider/model/tool selection, deadlines, retries, and security configuration are exclusively server-controlled. Acceptance: A2, A7, A9.
- **FR-008 — Safe failures**: Every failure terminates with the applicable fixed public response below. Never expose keys, raw provider errors, stack traces, internal request payloads, provider internals, or private telemetry details in browser responses or UI. Secrets must also be absent from logs, tests, prompts, screenshots, and evidence. Acceptance: A2–A4, A7–A9.
- **FR-009 — Bounded reliability**: Use one total provider deadline of **10,000 ms**, starting immediately before the first provider invocation and covering both attempts, bounded backoff, optional tool continuation/handling, and output validation. Permit at most **2 provider attempts total: 1 initial attempt plus at most 1 retry**, only for explicitly classified transient/retryable failures such as temporary provider/network unavailability or transient provider service failures. Use a fixed **250 ms backoff** before a permitted retry. Start that backoff only if at least **1,250 ms** remains, and recheck that at least **1,000 ms** remains before starting the retry; this remaining allowance includes the retry and validation and never extends the total deadline. An attempt-level timeout is retryable only under this classification and remaining-time rule; expiration of the total deadline is never retryable. Every provider invocation, including an optional tool continuation, consumes the same two-call budget, so `providerCallCount` never exceeds 2 per hint request. Never retry invalid local input, malformed/schema-invalid provider output, configuration errors, policy/refusal failures, or unknown non-retryable failures. No infinite retry loop is permitted. Stop waiting and reject late results at deadline; cancel outstanding work where supported. A tool continuation, if preserved, does not reset the deadline. The UI must settle within **12,000 ms** of activation, including browser/backend transport failure. Acceptance: A3, A6, A10.
- **FR-010 — Interaction isolation**: Permit at most one pending hint request per game UI. Hint requests, responses, and failures must not mutate game score, lives, bricks, status, movement, collision behavior, or timing. Clear obsolete UI state and discard stale results as defined in A6 and A8. Acceptance: A5, A6, A8, A12.
- **FR-011 — Provider discipline**: During the planning phase, before implementation and live integration, document one selected provider and exact model identifier, selection date, available cost information, structured-output suitability, and why it is the smallest/cheapest candidate expected to satisfy this scenario. A larger/more expensive choice requires an evaluation-based reason. Confirm reliability through the limited live check and record limitations; do not add browser selection or automatic provider/model fallback. Acceptance: A11.
- **FR-012 — Fake-first evaluation**: Support a deterministic fake/mock provider for success, unavailability, non-completion, malformed output, refusal, and deterministic retry sequences (transient failure followed by success or another transient failure). All automated tests must run without live keys, network access, provider credits, or nondeterministic live output. Acceptance: A1–A4, A7, A10–A12.
- **FR-013 — Optional existing tool only**: The existing read-only `get_current_game_snapshot` may be retained but is not required. If retained, it accepts exactly an empty argument object and returns only this request's validated four-field snapshot. Allow at most one execution and at most two provider calls per hint, sharing the FR-009 budget and deadline. A continuation consumes the second call when the initial call requests the tool; it does not grant an extra retry. If a retry has already consumed the second call, no further provider continuation is allowed; a result requiring another exchange fails safely as invalid provider output. Reject unknown tools, nonempty arguments, or repeated tool calls as invalid provider output without executing them. No new tools, writes, or autonomous tool loop. Acceptance: A10.
- **FR-014 — Regression protection**: Preserve all completed Week 3 gameplay and runtime validation, the existing gameplay tests, and historical evidence. The existing local backend/fake-provider/orchestration is useful prior work, not the final contract. Update superseded Week 4 expectations during later implementation while preserving applicable coverage. Acceptance: A12.
- **FR-015 — Pair accountability**: Elena is driver and Isidora reviewer/observer for this specification/integration block. Isidora checks expected outcomes, architecture, security, diff, tests, and evidence. Swap roles in a later major Week 4 block and record both contributions and the swap. Both members must explain the entire final success/failure flow. Acceptance: A13.
- **FR-016 — Evidence**: Leave reproducible Week 4 evidence of the user scenario, architecture, contracts, provider/model rationale, secret boundary, success/failure outcomes, test results, limited live check, known limitation, and both members' contributions. Record expected versus actual results, actual commands, revision references, and non-secret configuration; distinguish fake from live results and preserve Week 3 history. Acceptance: A11–A13.

### Request Contract

The request is a single JSON object containing exactly these fields, with no wrapper or additional fields. Maximum serialized request body: **1,024 UTF-8 bytes**. Accept JSON only; malformed JSON or another content type is invalid local input. No type coercion, defaulting of missing fields, or silent field removal.

| Field | Runtime constraint |
| --- | --- |
| `status` | String, exactly `ready`, `playing`, `won`, or `lost` |
| `score` | Finite number, inclusive range 0–400 |
| `lives` | Integer, inclusive range 0–3 |
| `bricksRemaining` | Integer, inclusive range 0–40 |

Example: `{"status":"playing","score":120,"lives":2,"bricksRemaining":28}`.

The bounds match the existing default game: 40 bricks at 10 points each and 3 starting lives. Fractional finite scores within the range are permitted by this numeric contract, although normal gameplay produces multiples of ten. Cross-field consistency is not an additional acceptance condition.

### Response Contract

`AiHintResponse` is a single JSON object containing exactly:

| Field | Runtime constraint |
| --- | --- |
| `hint` | String with 1–240 Unicode code points after trimming surrounding whitespace; whitespace-only content is invalid |
| `category` | String, exactly `movement`, `timing`, `strategy`, or `general` |

Maximum structured hint payload: **2,048 UTF-8 bytes**, checked before parsing provider-generated hint JSON. Provider transport metadata is never part of the application response. Validate the exact object and reject excess fields, wrong types, invalid categories, and overlong strings; do not truncate invalid hints to make them pass. Surrounding whitespace trimming is the only allowed content normalization. Return the validated trimmed hint and category, with no provider/model identifiers, tool traces, diagnostics, or raw provider envelope. Render both fields as plain text.

Example: `{"hint":"Focus on keeping the ball in play while you clear the remaining bricks.","category":"strategy"}`.

### Failure Contract

Failures are distinguishable from success and contain exactly `code` and `message`, with the fixed application-owned values below. They never include `hint` or `category` and never use provider-authored error text. The frontend uses the same fixed unavailable/timeout messages for backend transport failure or its own waiting limit.

| Failure | Code | Stable user-facing message |
| --- | --- | --- |
| Invalid local input | `INVALID_INPUT` | “Cannot request a hint for this game state.” |
| Provider unavailable, transient failure, or unknown failure | `UNAVAILABLE` | “AI hint is unavailable. Please try again later.” |
| Total deadline exceeded | `TIMEOUT` | “AI hint took too long. Please try again.” |
| Malformed/schema-invalid provider output or invalid tool request | `INVALID_OUTPUT` | “AI hint could not be read. Please try again later.” |
| Provider not configured or invalid server configuration | `NOT_CONFIGURED` | “AI hints are not available right now.” |
| Provider refusal/policy failure | `REFUSED` | “AI could not provide a hint for this request.” |

Only explicitly classified transient/retryable failures may receive at most one retry, with FR-009 bounded backoff, remaining-time checks, and the same 10,000 ms total deadline. Temporary provider/network unavailability and transient provider service failures are examples. An attempt-level timeout may be retried only if sufficient time remains under FR-009; total deadline expiration cannot be retried. Invalid local input, malformed/schema-invalid provider output, configuration errors, policy/refusal failures, and unknown non-retryable failures are never retried. Invalid local input always requires zero provider calls. Missing or locally detectable invalid provider configuration also requires zero provider calls; remote authentication/configuration rejection of a syntactically plausible credential returns `NOT_CONFIGURED` after one observed provider call, without retry. After two transient failures, return the fixed `UNAVAILABLE` failure, or `TIMEOUT` if the total deadline has expired or the final failure is a timeout. If a retry cannot start because time is insufficient, return the applicable fixed failure for the last failure (or `TIMEOUT` if the total deadline has expired), without another call. Unknown failures use the fixed `UNAVAILABLE` response without implying retryability. A later deliberate player request is a new interaction, not a hidden retry. Never replace failure with a fake hint in live mode.

### Additional Acceptance / Evaluation Gates

- **A9 — Boundary and secret review**: Browser request inspection shows only our backend receives the snapshot; attempts to supply provider/model/tools/timeout/retry/security fields fail with zero provider calls. Review confirms the final backend is TypeScript, provider calls and credentials are server-only, no real keys appear in repository or evidence, and injected sentinel provider errors/private payloads never appear in public failures.
- **A10 — Bounded orchestration**: Deterministic checks prove that an explicitly classified transient first failure can succeed on the second attempt with `providerCallCount === 2`, two transient unavailability/service failures end in the fixed safe `UNAVAILABLE` response, and `providerCallCount <= 2` for every hint request including optional tool continuation. Verify the fixed 250 ms backoff, no retry backoff starts with less than 1,250 ms remaining, and no retry starts with less than 1,000 ms remaining after backoff. Cover an attempt-level timeout with sufficient time for a retry and one without sufficient time; total deadline expiration permits no retry. Verify zero retries for invalid input, malformed/schema-invalid output, configuration errors, policy/refusal failures, and unknown non-retryable failures. Demonstrate deadline enforcement across both attempts, backoff, optional tool continuation, and validation, with rejection of late results and no infinite loop. If the existing tool is retained, verify empty arguments, exact snapshot output, at most one read, at most two provider calls shared with retries, no extra continuation/retry beyond that budget, no writes, and rejection of unknown/repeated tool calls. If omitted, verify provider tool requests cannot execute any tool.
- **A11 — Limited live check**: Only after the deterministic local matrix, regression suite, build, and reviewer secret-boundary review pass, run a separately invoked live check with the documented single provider/model. Limit the check to **four deliberate hint requests**, one per status. Record observed contracts, useful/status-appropriate advice, timing, failures, and cost information if available. All four must satisfy the success contract and advice criteria to accept live readiness; failures remain documented and block that claim. Any subsequent check requires a documented reason and follows the same local gates and four-request limit. No live check belongs to the automated suite.
- **A12 — Regression evidence**: Run the complete existing automated suite and build after implementation, with all Week 3 gameplay tests passing. Verify start/restart, controls, score, collisions, lives, and win/lose behavior with AI pending, succeeding, and failing. Preserve the frame-rate fix and verify it if timing/movement is touched. Record actual commands/results and account explicitly for changes to superseded Week 4 contract tests; a test count alone is not proof of coverage.
- **A13 — Pair and documentation review**: Evidence includes every FR-016 topic, Isidora's review for this block, each member's actual contribution, a later major-block role swap, and confirmation that both can explain validation, provider access, output checks, and failure handling. Do not record unperformed review, role swaps, or checks as completed.

### Security Boundary and Scope

Only the minimal snapshot crosses the browser/backend boundary. Only the validated snapshot and fixed game/hint instructions are supplied as game context to the configured provider. Secrets remain server-side. The application does not require persistent hint history or storage of game snapshots. Any minimal diagnostics remain private and exclude secrets; they are not a user-visible feature.

**Explicitly out of scope**: autonomous agent loop; multi-agent architecture; RAG; vector database; authentication/login; multiplayer; deployment; AI-controlled gameplay; AI in the real-time frame loop; write-capable AI tools; additional AI features; new tools; full observability platform; unrelated gameplay redesign. Existing Week 3 exclusions remain, except for the expressly required minimal TypeScript backend and single hint feature.

### Key Entities

- **Game snapshot**: The four bounded values captured when the player requests advice; represents that moment, not a continuous state feed.
- **AiHintResponse**: One validated player-facing hint and one permitted category, associated with that request.
- **Hint failure**: One fixed public code/message pair, distinct from a successful hint.
- **Evaluation record**: Expected and observed behavior, fake/live distinction, revision and command references, limitations, and pair contributions, without secrets or private provider payloads.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In all four status scenarios, one deliberate request produces exactly one validated hint and visible category when the deterministic provider succeeds; zero hints are requested automatically during gameplay.
- **SC-002**: Every invalid-input test rejects the request before provider work; evidence explicitly demonstrates `providerCallCount === 0`.
- **SC-003**: Every unrecovered failure scenario ends with its fixed safe message, no invalid hint, and usable gameplay. A deterministic transient-first-failure scenario recovers on the second attempt, while two transient failures and insufficient remaining time end safely; no hint request exceeds two provider calls or the 10-second total provider deadline. The player waits no more than 12 seconds for a terminal UI state in controlled timing checks.
- **SC-004**: All request/response boundary cases, A1–A10 deterministic checks, existing Week 3 gameplay regression tests, and the complete applicable automated suite pass without network, live credentials, or credits; the build passes.
- **SC-005**: All four limited live-check hints meet the response contract and reviewer criteria for status relevance, actionable focus, and absence of invented game details; timing and any failures are recorded honestly.
- **SC-006**: All required evidence topics are present, both members' actual contributions and later role swap are recorded, and both can explain the end-to-end success and failure flow.

## Assumptions

- “One AI hint” means one small feature and one hint per explicit activation, not a lifetime or per-round quota. Sequential deliberate requests are allowed; only one may be pending at a time.
- English advice matches the existing English UI. No localization work is required.
- Bounds target the unchanged default Week 3 game. Supporting alternative game configurations is outside this feature.
- A 240-code-point hint, 1,024-byte input limit, 2,048-byte structured output limit, 10-second provider deadline, 12-second UI waiting limit, at most one transient-only retry within a shared two-call budget, fixed 250 ms retry backoff, and minimum 1,000 ms remaining retry/validation allowance are deliberate small-scope defaults.
- The snapshot is a player-supplied context summary, not an authenticated or authoritative game record. No anti-cheat or identity system is implied.
- The existing branch reportedly has 77 passing tests. That is user-provided baseline context, not a new observed test result or proof of compliance with this specification. Existing JavaScript backend code and question/answer contracts are prior work that later implementation must reconcile with the TypeScript and snapshot/hint constraints.
- Provider/model selection will be made and documented during planning, before implementation and live integration; it is not a browser capability. This specification does not claim a model was selected, priced, evaluated, or live-tested. Live work depends on server-side credentials and availability after the local gates pass.
- This deliverable contains specification and quality review only. Implementation, implementation planning, live calls, and claims of completed human review are not part of this block's artifact creation.
