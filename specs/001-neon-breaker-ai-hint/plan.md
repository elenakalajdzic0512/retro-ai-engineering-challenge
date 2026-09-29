# Implementation Plan: Neon Breaker AI Hint

**Branch**: `week4/integration` | **Date**: 2026-09-29 | **Spec**: [spec.md](spec.md)

**Input**: `specs/001-neon-breaker-ai-hint/spec.md` and `.specify/memory/constitution.md` v1.0.0, with the user's explicit provider/model and independent-completion instructions.

## Summary

Add exactly one explicitly requested AI Hint to the existing browser game. Capture one four-field snapshot, validate it in our TypeScript backend, invoke Google Gemini API model **`gemini-3.5-flash-lite`** through the existing provider-neutral boundary, validate the untrusted JSON hint, and render hint/category as plain text. Preserve Week 3 gameplay. Failures stay optional to play, bounded and application-owned.

This is a design deliverable only. No implementation, tasks, dependency installation, gameplay changes, or live provider calls occur in this phase. Inspected baseline: `ef4049b4c4e76429e273f3c114d6e7869808da9a`. Existing tests were inspected, not rerun; the reported 77-test baseline is not a new observed result.

## Technical Context

**Language/Version**: Existing browser JavaScript ES modules; backend TypeScript with strict checking, ES2022 target and NodeNext modules/resolution. Target Node 24.x (local inspection: v24.21.0). Resolve and lock compatible stable TypeScript, `@types/node` 24.x, and official `@google/genai` versions during implementation; no speculative package pin here.

**Primary Dependencies**: Preserve Vite 7 and built-in `node:http`, `node:test`, `node:assert/strict`. Add TypeScript and Node types for backend compilation; `@google/genai` for the sole real provider adapter. No framework, database, new validation package, or frontend TS migration needed.

**Storage**: None; request snapshots and hints are ephemeral. `.env` is local backend configuration only.

**Testing**: Existing JavaScript Node tests against compiled server modules; injected fake provider, fake clocks/scheduler, stub SDK transport, and frontend controller tests with injected fetch/render functions. Manual browser regression complements automated checks.

**Target Platform**: Local Node HTTP backend on loopback port 3001; Vite browser frontend on 5173. Production artifacts are static `dist/` and separately compiled `dist-server/`; deployment is out of scope.

**Project Type**: Existing Canvas browser game plus small backend API.

**Performance Goals**: 10,000 ms total provider deadline; at most two actual provider calls, fixed 250 ms retry backoff with 1,250/1,000 ms guards; UI settles by 12,000 ms after activation under controlled timing. Preserve game frame-rate behavior.

**Constraints**: 1,024 UTF-8 request bytes; 2,048 UTF-8 structured provider payload bytes; hint 1–240 Unicode code points after trim. Runtime validation on both boundaries; no browser-controlled provider/model/instructions/tools/reliability settings. No automatic AI calls or fallback.

**Scale/Scope**: One player UI, one pending request, one AI feature, one real provider/model. No persistence, autonomous agents, RAG, auth, multiplayer, deployment, write tools, observability platform, or stretch features.

## Constitution Check

Pre-research and post-design checks use the same gates; these are design assessments, not implementation PASS claims.

| Principle / gate | Before research | After design / evidence required |
| --- | --- | --- |
| I scope, XI small changes | Satisfied by design | One hint; phased changes; gameplay engine stays JavaScript and unchanged |
| II architecture | Existing JS is a known gap | Strict TS migration precedes final integration; browser → backend → orchestration → adapter only |
| III secrets | Existing ignore rules inspected | Server environment only; source, bundle, history, tests, evidence, logs and error checks required |
| IV contracts | Existing question/answer contract superseded | Exact snapshot and hint contracts plus byte/range/code-point tests; zero calls for invalid input |
| V fake-first | Existing deterministic infrastructure reusable | Fake matrix, regression, typecheck, build and security must pass before separate live work |
| VI reliability | Existing 5s/jitter behavior superseded | Shared 10s deadline, two-call cap including SDK transport, precise retry guards, 12s UI bound |
| VII provider discipline | Selected before implementation | Gemini `gemini-3.5-flash-lite`; rationale/pricing in research; no fallback |
| VIII regression | Preserve baseline | Full automated suite, build, typecheck, manual play and conditional frame-rate verification |
| IX evidence | No fabricated results | Expectations before execution; actual command/revision/result and fake/live labels |
| X pair workflow; FR-015/A13/SC-006 | **Unmet process requirement** | Explicit user direction: Elena completes independently; do not claim later Isidora review or role swap |

**Gate disposition**: Technical design proceeds with the explicitly justified process deviation below, under the user's instruction to produce the plan. This is not a constitutional amendment or a claim that all gates pass. The constitution/spec remain unchanged. Full pair-work compliance and its reviewer-dependent live/completion gates remain unmet unless actual participation occurs; technical local gates may still be evaluated independently. Any future live record must state whether the human-review gate was satisfied and must not claim full A11/A13 compliance if it was not. No unresolved technical clarification remains after research.

## Project Structure

### Documentation (this feature)

```text
specs/001-neon-breaker-ai-hint/
├── spec.md                     # authoritative existing feature specification
├── plan.md                     # architecture, migration, traceability and gates
├── research.md                 # decisions, official sources and limitations
├── data-model.md               # entities and lifecycle
├── quickstart.md               # future execution/validation guide
└── contracts/
    ├── api.md                  # HTTP and runtime contracts
    └── provider.md             # provider boundary and fixed prompt
```

No `tasks.md` is created. Later implementation will add `docs/EVALS_W04.md`, `docs/EVIDENCE_W04.md` and explicitly labelled Week 4 entries in `docs/AI_USAGE_LOG.md`. Link these design artifacts instead of duplicating an AI feature specification or provider contract.

### Source Code (planned changes, not created now)

```text
server/
├── index.ts                    # migrate HTTP boundary/composition from index.js
├── contracts.ts                # migrate exact validators, replace public contract
├── config.ts                   # backend-only configuration and fixed selection
├── tools.ts                    # migrated isolated historical helper, not Hint path
└── ai/
    ├── contracts.ts            # typed provider-neutral results/failures
    ├── orchestrator.ts         # adapt existing shared budget/deadline handling
    ├── fake-provider.ts        # adapt deterministic sequences and call recording
    ├── gemini-provider.ts      # sole real SDK adapter
    └── prompt.ts               # fixed application-owned instructions/schema
src/
├── game.js                     # preserve gameplay and runtime config validation
├── main.js                     # minimal activation/restart wiring only
├── ai-hint.js                  # isolated request lifecycle and safe rendering
└── style.css                   # small loading/success/failure UI styling
index.html                      # one hint control and status/output region
vite.config.js                  # local /api proxy, also local preview proxy
tsconfig.server.json           # strict server-only compile configuration
package.json / package-lock.json # commands and pinned dependency resolution
.env.example / .gitignore       # empty key placeholder and ignored server output
tests/*.test.js                # existing suites retained/adapted; new UI/adapter checks
```

**Structure Decision**: Rename server `.js` files in place to `.ts`, preserving functions where applicable. Keep JavaScript tests and browser source. Keep compiled backend output out of Vite's `dist/` to avoid serving backend code. Historical tool helper remains isolated and tested, with zero tool declarations/imports/execution in the Hint path (option B).

## Reuse and required changes

| Existing component | Reuse | Required adaptation |
| --- | --- | --- |
| `server/contracts.js` | Exact-object and finite/range validation | Four fields at root; remove public question/answer path; response categories, Unicode limits, raw byte limits |
| `server/index.js` | HTTP server, dependency injection, route and stream accounting | TS; 16 KiB → 1,024 bytes; safe top-level failures; configured adapter; no silent fake fallback |
| `server/ai/contracts.js` | Provider-neutral result discipline | Raw JSON success payload; explicit transient classification; no generic-unavailable-always-retry rule; no Hint tools |
| `server/ai/orchestrator.js` | Clock/sleep injection, cancellation and finite attempt count | 5,000 → 10,000 ms; randomized 100–199 → fixed 250 ms; guards, validation deadline checks, reject late results |
| `server/ai/fake-provider.js` | Scripted sequence, recorded calls and snapshots | Raw malformed output must reach application validator; success/refusal/timeout/deferred sequences; no tool requirement |
| `server/tools.js`, `tests/tools.test.js` | Empty arguments, validated snapshot copy, denied authority expansion | Keep standalone historical helper/coverage; not imported into live composition or advertised to provider |
| `tests/contracts.test.js`, `api.test.js`, `fake-provider.test.js`, `orchestration.test.js` | Assertions on boundaries, counts, safe errors | Replace superseded question/answer and tool-continuation expectations; record changed coverage, not just test counts |
| `src/game.js`, `tests/game.test.js` | Entire Week 3 behavior and tests | No planned changes |
| `src/main.js`, `index.html`, `src/style.css` | Existing game UI and input behavior | Minimal isolated hint UI; preserve launch/restart semantics and game control focus |

## Migration and integration sequence

1. Capture current revision as the implementation baseline SHA (T001), complete test/build baseline and non-secret commands before implementation; distinguish observed results from the reported 77 tests. Preserve Week 3 evidence. During implementation compare with `git diff <baseline-sha> -- src/main.js src/game.js tests/game.test.js`; review the final committed candidate with `git diff --stat <baseline-sha> HEAD` and targeted baseline-to-HEAD diffs. Substitute the recorded SHA for `<baseline-sha>`. Inspect unstaged/staged changes separately with `git diff`, `git diff --cached` and `git status --short`; an empty working-tree diff alone is not evidence of preservation.
2. Migrate only server modules to TS with the old verified behavior first. Use `tsconfig.server.json`: `target: ES2022`, `module/moduleResolution: NodeNext`, `strict: true`, `rootDir: server`, `outDir: dist-server`, `types: [node]`, `noEmitOnError: true`, include `server/**/*.ts`, exclude frontend/tests/build output. Treat external values and caught errors as `unknown`; narrow them through runtime checks. Keep `.js` specifiers in TS imports for emitted ESM. Delete migrated JS sources only after equivalent tests pass; do not leave competing server entry points.
3. Keep tests in JavaScript and update their server imports to `../dist-server/...js`. Make `npm test` compile first then explicitly run `tests/*.test.js`; this avoids stale JS or accidental double discovery. Add `typecheck`, `build:server`, and production/local `start:api` scripts. Development can use `npm run build:server -- --watch` plus `node --watch` on emitted backend in another terminal; no additional TS runner needed. Tests do not load `.env` and always inject fakes/stub SDK transport.
4. Replace public and internal contracts, fake fixtures, error mapping and bounded orchestration together as a deliberate boundary change. This is the one phase that necessarily changes several related backend files; keep the frontend untouched. Run contract/API/fake/orchestration tests and regression suite. Remove all tools from Hint execution and assert unexpected tool proposals fail without executing anything.
5. Add the backend-only Gemini adapter and fixed prompt. Unit-test SDK request construction, retry disabling, refusal/error mapping and output extraction with stub transport, never real network. Add `.env.example` containing exactly `GEMINI_API_KEY=` plus newline; preserve existing env ignore rules and ignore `dist-server/`. Default real mode uses configured Gemini and fails safely when key is absent; explicit server process fake mode is for local evaluation only, never an automatic failure fallback. Configure `AI_FAKE_SCENARIO=success|delay|failure` only in `AI_PROVIDER=fake` mode, following the deterministic scenario definitions in `contracts/provider.md`; use immediate success, fixed 2,000 ms delayed success, or non-retryable safe UNAVAILABLE per request. Default an omitted scenario to success, reject unknown fake scenarios before provider creation, and ignore the setting in real Gemini mode. Selection is backend-only, never browser input or a frontend selector; keep `.env.example` limited to the empty key placeholder.
6. Add frontend controller and minimal DOM/wiring, then Vite `/api` loopback proxy. Test request isolation and safe rendering. No fetch in `frame`, `draw`, `update` or game events other than deliberate hint activation. Run whole suite, typecheck and both builds.
7. Execute manual gameplay/security evaluation and write actual fake results/evidence. Only after all local gates are green, a separately invoked limited live check may be considered, respecting the recorded human-review limitation. Complete actual evidence and usage log; no claim of compliance based on planned work.

Each phase requires its focused checks and appropriate complete regression verification before advancing. Commands and expected scenarios are in [quickstart.md](quickstart.md).

## Architecture and reliability

```text
Browser: explicit AI Hint → captured four-field snapshot
    │ POST /api/ai (relative origin); no provider secrets
    ▼
TypeScript HTTP API → byte/content-type/JSON/runtime request checks
    ▼
Provider-neutral orchestration → configuration check → shared deadline/budget
    ▼
Gemini adapter → Google Gemini API / gemini-3.5-flash-lite
    │ untrusted structured text / classified failure
    ▼
Application byte + JSON + exact-schema output validation → deadline recheck
    ▼
Only {hint, category} OR fixed {code, message} → browser plain text
```

Provider API key stays in local ignored `.env`/backend process environment. The browser uses only our backend; Vite never exposes the key through `VITE_*`, `define`, environment spreads, or server-module imports. Development and local built-frontend preview proxy `/api` to `http://127.0.0.1:3001`. No CORS package or extra server framework is required; Vite preview is a local verification tool, not deployment.

One monotonic deadline starts immediately before first provider invocation, after input/config validation. Check it before/after each await and after output validation. Each SDK generation is one counted call; disable SDK internal retries. Use an absolute deadline watchdog in addition to SDK timeout and AbortSignal. Race waits against remaining total time, clear timers/listeners on settlement, abort supported work and ignore non-cooperative late results. No attempt-specific shorter deadline is required in Core, but an adapter-reported attempt timeout is retryable only if explicitly transient and both remaining-time guards pass.

At most two attempts: one initial call and one transient-only retry. Before 250 ms backoff require remaining time ≥1,250 ms; after backoff require ≥1,000 ms before retry. Equality is permitted. Waiting/validation never extend the original deadline. Unknown failures are non-retryable UNAVAILABLE. Invalid output, refusal and configuration never retry. Deadline expiration wins over a late success. Insufficient time preserves the last applicable failure unless deadline has expired; final timeout maps TIMEOUT, two transient unavailability failures map UNAVAILABLE. No tools, continuations, fallback or fabricated successful hint in live mode.

## Frontend integration and request isolation

`src/ai-hint.js` owns idle/loading/success/failure state and a monotonically increasing request token plus round generation. Capture primitive values once at activation, counting alive bricks once; retain the immutable snapshot for that request. Render “Advice for the game when requested” with the result. New activation clears old hint/error, disables duplicate activation while pending, stores an absolute monotonic deadline equal to activation time plus 12,000 ms, and starts an end-to-end watchdog covering fetch and body parsing. Before publishing success, including after response body parsing, check the matching request token/round generation and current monotonic time. If time is at or after the deadline, reject the result and publish only the fixed TIMEOUT state for the still-current request, even if the watchdog callback has not run; obsolete handlers must not alter newer state. Test this with a fake clock advanced beyond 12,000 ms while deliberately withholding the watchdog callback, then resolving fetch/body: the result must be TIMEOUT, never success. The backend shared 10,000 ms deadline is unchanged. Timeout aborts fetch and renders the fixed TIMEOUT message; transport/invalid backend envelope maps safe UNAVAILABLE. Only allowlisted application messages are shown, never `error.message` from fetch/provider.

Only matching request token AND round generation may settle UI, including catch/finally handlers. Reset invalidates tokens, aborts current fetch, clears timers/output and restores idle. In `main.js`, wrap existing launch interaction to reset hint state when a new round starts or terminal-state restart occurs; initial ready launch clears ready-state advice. Relaunch after a life loss preserves the same game round; do not infer new round from every `ready` state. Any future restart entry point must use the same invalidation helper. Newer requests after reset cannot be overwritten by old success/failure/finally. No game state mutation from the hint controller.

Use one button and a polite status/output region; hint and category use `textContent`, never HTML/Markdown execution. Allow all four game statuses. Ensure native button keyboard activation and existing Space-to-launch do not inadvertently trigger each other; preserve paddle controls when focus returns to play. No question field or provider controls.

## Requirements and acceptance traceability

| Spec | Planned component / verification |
| --- | --- |
| FR-001/002/005, A1/A5, SC-001 | Button/controller, fixed prompt, all four status fixtures and advice review |
| FR-003, A2, SC-002 | API stream limit + contracts; every invalid fixture asserts zero provider calls |
| FR-004/008, A3/A4/A7/A8 | Runtime output validation, fixed failures, malformed output and leak sentinels |
| FR-006/007, A9 | TS compile, server composition/config, Vite boundary and security review |
| FR-009, A3/A10, SC-003 | Orchestrator, fake time, precise retry counts/guards, SDK transport counts |
| FR-010, A5/A6/A8 | UI isolation, duplicate/late/reset tests, 12s watchdog and manual game controls |
| FR-011, A11, SC-005 | Research/provider contract, gated four-status live evaluation; readiness unproven until observed |
| FR-012/013, A10 | Scripted fake/stub SDK, no tools in Hint path, standalone historical tool coverage |
| FR-014, A12, SC-004 | Complete suite, typecheck/build, manual play; preserve game engine/evidence |
| FR-015/016, A13, SC-006 | Truthful contribution/evaluation records; pair requirement remains unmet if no later participation |

## Testing, security and evidence strategy

Use the complete deterministic matrix in quickstart; specifically prove success, zero-call invalid input/configuration, unavailable/timeout, invalid output, one successful retry, exhausted two calls, insufficient time at both guards, refusal, unknown non-retryable error, late results, private-error exclusion and gameplay regression. Validate Unicode astral characters and UTF-8 byte boundaries separately. A schema-conforming hint still needs human usefulness/status review.

Security evidence must cover frontend source and production bundle, every reachable Git-history revision, tests, prompts/specs/evidence, and logs. Use a redacting secret scanner and record only findings' paths/rules/status, never matches or keys; also perform an in-memory exact-key absence check against the locally configured key without printing it. Validate `.gitignore` and inspect tracked filenames. Stub errors contain obvious non-secret sentinels for key-like/private-stack/telemetry data; assert absence from public responses and captured logs. Build once with a non-secret sentinel backend key and verify it cannot appear in frontend artifacts. Scan results establish checked scope, not an absolute guarantee; document unreachable history or unavailable log sources as limitations. Do not rewrite Git history to hide findings; if any secret is detected, block readiness and handle revocation/remediation separately.

Planned `docs/EVALS_W04.md` contains A1–A4 plus retry/deadline/refusal/configuration/UI/security/regression rows. Each row records expectation before execution, actual observation, PASS/FAIL (or NOT RUN while pending), exact command/test, revision and dirty-state information, fake/live, latency/call counts where applicable, and limitations. Never prefill PASS.

Planned `docs/EVIDENCE_W04.md` links the spec, this plan and contracts; includes architecture diagram, frontend/backend/provider and secret boundaries, exact provider/model, bounded input/output, successful and failure flow evidence, deterministic outcomes, separate limited-live records, TS/typecheck/backend evidence, build, security verification, manual gameplay, known limitations and actual contribution history. `docs/AI_USAGE_LOG.md` gets dated Week 4 entries with actual prompts/assistance, human decisions, validation and limitations. Preserve `docs/EVALS.md`, `docs/EVIDENCE_003.md` and existing usage entries.

Contribution history: Isidora provided initial JavaScript runtime contracts, local API, fake provider, orchestration/reliability and associated tests (visible commits include `e9ab344`, `3229c62`, `3918d0f`). Elena independently verified that branch, created the Week 4 integration branch and SpecKit setup, constitution, final specification and this planning, and will complete remaining implementation/testing/evidence independently. Verification/branch details supplied by the user must not be presented as newly re-observed review evidence. Record future contributions only when performed; no invented later Isidora review, approval, role swap or contribution.

## Complexity Tracking

| Violation / limitation | Why documented | Resolution / rejected alternative |
| --- | --- | --- |
| Constitution X and reviewer-dependent gates; FR-015/A13/SC-006 | User explicitly states independent completion by Elena; existing pair workflow is a plan, not performed evidence | Proceed with requested planning and technical work while reporting unmet process compliance. Do not fabricate participation or silently amend authoritative documents. Actual future pair participation or an explicitly governed amendment would be needed for full compliance. |

No architectural complexity exception is needed. Core is the entire planned scope; no stretch work is scheduled.
