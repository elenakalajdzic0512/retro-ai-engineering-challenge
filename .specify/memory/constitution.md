# Neon Breaker Constitution

## Core Principles

### I. Small Controlled Scope

Week 4 MUST add exactly one useful, user-visible AI feature to the existing Neon Breaker
browser game. Work MUST NOT expand into autonomous agents, multi-agent systems, RAG,
vector databases, login, multiplayer, deployment, or unrelated infrastructure. AI MUST NOT
run inside the frame-by-frame real-time game loop.

### II. Architecture Boundary

The browser frontend MUST communicate only with our backend API for AI functionality.
The backend MUST use TypeScript. AI provider calls MUST happen only server-side; provider
secrets MUST never reach the browser or be committed to source control.

### III. Security and Secrets

Provider keys MUST be read only from server-side environment configuration. Real keys
MUST NOT appear in source files, prompts, specs, tests, screenshots, evidence, logs, or
documentation. Public errors MUST NOT expose stack traces, provider internals, raw private
payloads, or secrets.

### IV. Explicit Contracts and Runtime Validation

The AI boundary MUST define bounded request and structured response contracts, including
allowed fields and applicable size, range, and length limits. TypeScript types alone MUST
NOT count as validation. The backend MUST runtime-validate local input before any provider
call; invalid local input MUST result in zero provider calls. Provider/model output MUST be
treated as untrusted input and runtime-validated before it is returned to the UI.

### V. Fake-First Testing

Most automated tests MUST use a deterministic fake/mock provider. Automated tests MUST
NOT depend on network access, provider credits, or non-deterministic live output. A limited,
separately invoked live provider check MUST occur only after local contracts and failure
paths pass; it MUST NOT become a dependency of the automated test suite.

### VI. Bounded Reliability

Each provider interaction MUST have an explicit total timeout/deadline covering all attempts
and waits. Failure handling MUST be bounded. Retries, if used, MUST have a finite limit,
remain within that deadline, and apply only to retryable/transient failures. Infinite retries
are prohibited. Malformed output, invalid input, policy refusal, and configuration errors
MUST NOT be blindly retried. The application MUST remain usable, with existing gameplay
available and a clear UI failure state, when AI is unavailable.

### VII. Provider Discipline

The provider and model MUST be explicitly selected and documented before live use.
The team SHOULD select the smallest/cheapest model that reliably satisfies the defined
scenario; a larger or more expensive choice MUST have a recorded evaluation-based reason.
Browser input MUST NOT select arbitrary providers or models; selection MUST be controlled
server-side.

### VIII. Regression Safety

Completed Week 3 gameplay and runtime validation MUST remain working, and existing tests
MUST continue to pass. Every major Week 4 change MUST be followed by appropriate focused
tests and regression verification. Verification MUST cover the existing automated suite,
build, and affected gameplay/evaluation scenarios, including the preserved frame-rate fix
when timing or movement is touched.

### IX. Evidence and Reproducibility

Expected behavior MUST be recorded before key evaluations. Week 4 evaluation/evidence
artifacts and AI usage documentation MUST preserve actual commands, results, relevant
configuration without secrets, and revision references needed to reproduce checks. Live
checks MUST be distinguishable from fake-provider tests. Known limitations and failures
MUST be documented rather than hidden; AI-generated claims MUST NOT substitute for
observed results.

### X. Pair Workflow and Human Accountability

One team member MUST act as driver while the other acts as reviewer/observer. The reviewer
MUST check expectations, the diff, tests, security boundaries, and evidence. Roles MUST be
swapped during Week 4, and the role assignments and swap MUST be recorded. Both members
MUST understand and be able to explain the complete final flow, from browser request through
backend validation and provider interaction to validated UI response or bounded failure.

### XI. Change Discipline

Each change MUST be the smallest change that satisfies the current requirement. Multiple
architectural layers MUST NOT change at once unless the plan explicitly requires it.
Valid Week 3 evidence MUST NOT be removed or rewritten to make Week 4 appear cleaner.
Corrections MUST be recorded transparently without erasing the original observation.

## Week 4 Scope and Baseline

This constitution governs SITA AI Bootcamp 2026 Week 4: Reliable AI Integration.
`docs/GAME_SPEC.md` remains the Week 3 gameplay baseline: paddle controls, collisions,
brick scoring, lives, win/lose states, and restart behavior MUST be preserved. Its existing
scope exclusions remain in force except for the minimal TypeScript backend and single AI
feature expressly authorized for Week 4. This exception MUST NOT authorize a database,
gameplay redesign, or additional features.

`docs/EVALS.md`, `docs/EVIDENCE_003.md`, and existing entries in `docs/AI_USAGE_LOG.md`
MUST remain preserved as Week 3 history. Week 4 records MUST be clearly separated or
appended with explicit Week 4 labels. The specific AI feature and its contracts MUST be
defined in subsequent specification and planning work; this constitution does not select
or implement that feature.

## Review and Evaluation Gates

Before implementation, the feature specification and plan MUST identify the single user
benefit, bounded contracts, provider/model selection, total deadline, retry policy, safe
failure behavior, and expected evaluation outcomes. Each major change MUST pass focused
fake-provider checks and regression verification before proceeding. Checks MUST demonstrate
zero provider calls for invalid input, rejection of malformed output, and bounded handling
of timeout, refusal, configuration, and transient failures.

Before a limited live check, local contract and failure-path checks MUST be green and the
reviewer MUST verify the server-only secret boundary. Completion MUST include observed
results, limitations, AI usage documentation, and recorded pair-role review and swap.

## Governance

This constitution governs Week 4 specifications, plans, implementation, and reviews.
Every plan and change review MUST verify compliance and identify any conflict before work
proceeds. A conflict MUST be resolved through a documented amendment, not an implicit
scope expansion.

Amendments MUST state the reason, affected principles, and impact on existing artifacts;
both team members MUST review and approve them. Amendments MUST preserve valid Week 3
history and update the version and last-amended date. Versioning MUST use MAJOR for
incompatible principle removals or redefinitions, MINOR for new principles or materially
expanded guidance, and PATCH for non-semantic clarifications. The original ratification
date MUST remain unchanged after adoption.

**Version**: 1.0.0 | **Ratified**: 2026-09-29 | **Last Amended**: 2026-09-29
