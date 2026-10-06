# Feature Specification: Neon Tactical Coach

**Feature Branch**: `week5/neon-tactical-coach`
**Created**: 2026-10-06
**Status**: Design draft; no Week 5 runtime implementation
**Input**: Build a bounded, advisory tactical planner for the completed Neon Breaker: Hazard Arena without changing gameplay or Week 4 Hint.

## User Scenarios & Testing

### User Story 1 — Get a grounded tactical plan (Priority: P1)

A player states a goal, such as protecting their last life or clearing the right side, and receives a short plan grounded in the current brick distribution and hazard state.

**Why this priority**: The five completed arena mechanics create choices that a single generic hint cannot explain.

**Independent Test**: With a fake model and a valid game summary, the player receives a plan only after one tactical snapshot and one local strategy evaluation have succeeded.

**Acceptance Scenarios**:

1. Given a playable arena and a valid goal, when the player requests coaching, then the result names a target zone, play style, paddle contact and route, provides one to three actions, and cites both snapshot and evaluation evidence.
2. Given one life and remaining armored bricks, when the player requests a safe finish, then the recommendation is evaluated against those facts and makes no unsupported probability or exact-trajectory claim.
3. Given a target zone with no bricks, when the model proposes that zone, then the application rejects the candidate and returns a safe failure rather than presenting it as a validated plan.

### User Story 2 — Stay in control (Priority: P2)

The player can read advice while continuing to control the paddle and launch; coaching never changes game state.

**Independent Test**: Compare a complete game snapshot before and after every fake-provider success/failure path and confirm that the Week 4 Hint still works.

**Acceptance Scenarios**:

1. Given any coaching request, when it completes or fails, then ball, paddle, bricks, bumpers, portals, shield, score, lives and status are unchanged by the coach.
2. Given a malformed request, tool proposal, evaluation or final plan, when validation fails, then no invalid plan is shown and a sanitized error is displayed.
3. Given the existing Ask AI for Hint control, when it is used, then its Week 4 request/response behavior remains unchanged.

### User Story 3 — Receive a bounded answer or clear stop (Priority: P3)

The player receives a plan within a finite deadline or a clear, safe failure message. The application cannot follow unlimited model proposals.

**Independent Test**: Script repeated actions, premature answers, timeouts, unavailable provider and malformed output with a fake provider; each stops within the published bounds.

**Acceptance Scenarios**:

1. Given a valid request, the model requests tactical evidence, proposes one candidate for deterministic evaluation, then supplies one structured final answer; the application validates each transition.
2. Given an early final answer, a repeated or forbidden tool, or an extra tool after evaluation, the application stops safely.
3. Given provider timeout, cancellation or exhausted budgets, the request ends with a sanitized error and the game remains playable.

### Edge Cases

- Empty, overlong or non-string goal; extra request fields; malformed or inconsistent client-reported state.
- Ready state is coachable as pre-launch advice; won/lost or no remaining bricks is not a planning request.
- A stationary ball has neutral horizontal and vertical direction. No exact path is inferred from coarse zones.
- Candidate targets an empty zone or requests a portal while cooldown is active.
- Tool result is mutated, oversized or fails validation; model cites evidence not produced by the two tools.
- Total deadline or caller cancellation occurs between model steps or during retry.

## Requirements

### Functional Requirements

- **FR-001 — Goal and result**: A player MUST be able to submit a tactical goal of at most 240 Unicode code points and receive a concise, structured strategy with bounded actions and evidence.
- **FR-002 — Frozen baseline**: The completed Hazard Arena mechanics, 40 bricks, maximum score 400, three initial lives, lifecycle, and Week 4 Hint MUST remain unchanged.
- **FR-003 — Advisory authority**: The coach MUST NOT move or launch the ball, alter any game entity, change score/lives/status, write files, run shell commands or choose arbitrary URLs, tools, provider or model.
- **FR-004 — Evidence sequence**: Success MUST require exactly three logical model steps in order: `NEED_SNAPSHOT` accepts only `get_tactical_snapshot`, `NEED_EVALUATION` accepts only `evaluate_tactical_strategy`, and `NEED_FINAL` accepts only a structured final plan. The application MUST validate and control each transition; an early final or late tool proposal fails safely.
- **FR-005 — Tools**: The Core allowlist MUST contain exactly `get_tactical_snapshot` with exact empty arguments and `evaluate_tactical_strategy` with one bounded candidate. Both MUST be read-only with respect to the game; the evaluator MUST be deterministic, local and network-free.
- **FR-006 — Snapshot**: The tactical snapshot MUST contain bounded counts and categorical direction/hazard state sufficient for the five mechanics, without exposing raw brick arrays, arbitrary coordinates, mutable game references, secrets or provider internals.
- **FR-007 — Candidate evaluation**: The evaluator MUST use transparent rules for target opportunity, armor pressure, lives, paddle direction, portal availability and shield interaction. It MUST NOT claim an exact trajectory or invented success probability.
- **FR-008 — Final validation**: The final plan MUST match the accepted evaluated candidate exactly on targetZone, strategy/style, paddleContact and route, contain bounded user-facing text, and cite at least one fact from each of `tactical_snapshot` and `strategy_evaluation`. Missing, invented or contradictory evidence MUST fail closed. Only the application decides success.
- **FR-009 — Bounds**: The design MUST enforce three model steps, two tool calls, four total provider attempts, a per-attempt timeout and one total deadline. Retries MUST be globally limited to one transient retry and MUST NOT count as model steps.
- **FR-010 — Stops**: Invalid input, repeated/unknown/forbidden tool, invalid arguments/result, tool failure/timeout, malformed output, premature final, exceeded budgets, deadline and cancellation MUST lead to safe, sanitized stops.
- **FR-011 — Separate UI**: A distinct Tactical Coach goal input and control MUST coexist with Ask AI for Hint. Only a validated plan or safe status/error may be displayed; no hidden prompts, provider payloads, raw tool calls or chain-of-thought.
- **FR-012 — Evidence and testing**: Deterministic fake-provider tests MUST precede limited live-provider work, require zero API key/network, and cover the success, failure and regression matrix in `quickstart.md`. Live results and human review MUST be recorded separately from fake tests.

### Key Entities

- **Goal**: Player-supplied tactical objective, bounded text.
- **Tactical snapshot**: Validated, immutable summary derived from client-reported arena state for one request.
- **Candidate strategy**: One bounded target/style/paddle-contact/route combination.
- **Strategy evaluation**: Deterministic, request-scoped assessment with evidence and acceptance decision.
- **Final plan**: Validated user-facing actions and references to observed evidence.
- **Agent run**: One bounded request with state, budgets, deadline, tool results and stop outcome.

## Success Criteria

- **SC-001**: All successful fake-provider runs follow exactly three model steps and two validated tool calls; no successful response lacks either evidence source.
- **SC-002**: Every listed invalid or failure fixture stops within four provider attempts and the total deadline, with no uncontrolled tool execution.
- **SC-003**: Every automated success/failure fixture leaves the game state unchanged and all pre-existing Hazard Arena and Week 4 tests pass.
- **SC-004**: In a human demo, a player can enter a goal, receive a readable plan, and continue playing without gameplay interruption; a provider failure gives a safe status.
- **SC-005**: Both team members can explain the two tools, three steps, limits, validation, repeat protection, stops, fake testing and advisory authority using the final evidence record.

## Assumptions and Scope Boundaries

- The browser owns the live game state. It supplies a bounded tactical summary for the request; the server validates shape, ranges and internal consistency but cannot independently prove the physical board state. The coach therefore treats this as player-session evidence, not an authoritative game ledger.
- Week 5 uses a separate provider adapter with tool proposals, validated tool-result context and a structured final result. The Week 4 Gemini provider and `{hint,category}` contract stay behaviorally unchanged.
- Coaching is offered in ready or playing states with at least one brick remaining. Won/lost states receive a safe, non-coaching response.
- The existing Week 4 constitution governs the historical Hint work. This separately authorized Week 5 feature preserves its security, validation, evidence and regression principles without retroactively altering Week 4 scope/history.
- Model/tool protocol, exact schemas, heuristics, budgets and provider adapter decisions are detailed in the plan, research, data model and contracts. No Week 5 runtime work or live provider check is performed in this design task.
