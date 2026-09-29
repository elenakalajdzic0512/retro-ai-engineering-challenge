# Week 4 Evidence — Initial Planning Checkpoint

This document records the initial Week 4 evidence context at the T005 checkpoint. It is planning and baseline context only. Week 4 implementation has not started.

## Week 4 scope and planned architecture

Week 4 continues the existing Neon Breaker Week 3 game and will add exactly one controlled, explicitly requested AI Hint feature. The planned high-level path is:

```text
Browser frontend
    → our TypeScript backend
    → provider-neutral orchestration
    → Google Gemini adapter
```

This architecture is planned, not implemented at this checkpoint. No TypeScript backend migration, Gemini adapter, AI Hint UI, final request/response contract, or provider integration has been written yet.

## Existing contribution before Elena's integration work

Read-only Git history attributes the initial Week 4 JavaScript foundation to Isidora Popovic:

| Revision | Commit | Evidence supported by history |
| --- | --- | --- |
| `e9ab344` | `feat: add runtime request contracts` | Runtime request/response contract foundation |
| `3229c62` | `feat: add local AI API endpoint` | Local `/api/ai` endpoint foundation |
| `3918d0f` | `feat: integrate local AI orchestration API` | Fake provider, provider-neutral orchestration/reliability integration and associated backend tests |

The existing JavaScript foundation includes runtime contracts, the local endpoint, deterministic fake-provider infrastructure, provider-neutral orchestration/reliability behavior, associated tests, and the read-only tool helper where supported by the existing code. This attribution is limited to what the history and existing foundation support. It does not attribute later SpecKit, planning or integration work to Isidora, and contains no claim that she reviewed or approved Elena's later work.

## Elena's work before implementation

Read-only Git history attributes the Week 4 integration and planning work below to Elena Kalajdžić:

| Revision | Commit |
| --- | --- |
| `94f4bcd` | `chore: initialize SpecKit for Week 4` |
| `4dbb1cd` | `docs: adopt Neon Breaker Week 4 constitution v1.0.0` |
| `ef4049b` | `docs: specify Neon Breaker Week 4 AI Hint` |
| `f4585c5` | `docs: plan Week 4 AI Hint implementation` |
| `14fe69b` | `docs: define Week 4 AI Hint implementation tasks` |
| `48d4ad5` | `style: remove trailing whitespace from Week 4 tasks` |
| `76f5030` | `docs: refine Week 4 AI Hint execution details` |

Elena independently continued on `week4/integration`, reviewed the existing foundation, initialized SpecKit, established the constitution, specified the AI Hint feature, defined the API/provider/data/reliability/security/evaluation design, generated and reviewed the implementation task sequence, ran consistency analysis, incorporated the four technical planning clarifications, and established the Phase 1 baseline evidence.

No implementation code has been written as part of this checkpoint.

## Phase 1 observed baseline so far

Detailed baseline records are in [docs/EVALS_W04.md](EVALS_W04.md). The observed pre-implementation status is:

| Evidence | Observed result |
| --- | --- |
| Implementation baseline SHA | `76f50304a9372b3c497692970975d99c2acea3a3` |
| Local `npm test` | 77/77 passed, exit status 0 |
| Constrained Codex execution attempt | Recorded separately as an `EPERM` loopback-listener execution-environment limitation; not treated as demonstrated application regression |
| `npm run build` | PASS; Vite 7.3.6; exit status 0 |
| Manual Week 3 gameplay baseline | All recorded T004 scenarios PASS |

These records establish the pre-implementation baseline only. They do not establish final Week 4 AI Hint acceptance, Gemini reliability, final contracts, security readiness, or live-provider readiness.

## Process compliance and pair-work limitation

The constitution and feature specification planned actual pair review, reviewer/observer participation and a later role swap. No later Isidora review, approval or role swap has been observed or evidenced at this checkpoint. Elena is continuing independently.

Therefore, the planned pair-work process requirement remains unmet at this checkpoint and must not be represented as completed. Technical implementation/evaluation status and process-compliance status remain separate. No constitution change is made here, and no participation is fabricated.

## Evidence rules going forward

Future Week 4 evidence must:

- record actual commands and observed results rather than planned PASS;
- keep fake-provider and live-provider results clearly distinct;
- contain no API keys or private provider payloads;
- preserve Week 3 evidence;
- link technical claims to actual observed tests, builds and manual checks;
- keep contribution attribution factual and revision-backed.

The following historical artifacts remain preserved and unchanged: `docs/EVIDENCE_003.md`, `docs/EVALS.md`, and existing Week 3 AI usage history. All SpecKit authoritative documents remain unchanged by this T005 evidence initialization.

No `npm test`, `npm run build`, `npm run dev`, provider call or Gemini call was performed for T005. T006 was subsequently completed as the Phase 1 gate; T008 and all later tasks remain NOT STARTED / NOT RUN.

## Current Week 4 implementation evidence

The initial planning checkpoint above remains historical evidence and is preserved. The implementation now has the following verified shape:

- Week 3 gameplay remains preserved through baseline regression and manual verification.
- The browser communicates with the TypeScript backend through `POST /api/ai`; the browser never calls Gemini directly.
- The backend validates the four-field request and the `{ hint, category }` response at runtime.
- The single visible AI feature is the explicitly triggered Neon Breaker AI Hint.
- The configured real provider is Google Gemini with fixed model `gemini-3.5-flash-lite`; the deterministic fake provider remains available for offline evaluation.
- `GEMINI_API_KEY` is backend-only. `.env` variants are ignored, `.env.example` contains no secret, frontend calls remain relative, and the production bundle contained no `GEMINI_API_KEY`, `@google/genai`, or `gemini-3.5-flash-lite` reference. A non-secret sentinel build and scan passed.
- TypeScript migration, contract tests, fake-provider integration, frontend integration, strict typecheck, server build, the final 86-test local regression suite, frontend build, and manual fake-provider browser flow have observed PASS evidence. The earlier 85-test result remains a historical checkpoint only.

The real Gemini adapter was initially exercised with an injected stub client; the later limited live validation is recorded below. The planned pair-review, role-swap, secret-boundary review, and joint understanding confirmation remain unresolved process requirements. These limitations are separate from the technical local gates and are not represented as complete.

## Limited live Gemini validation

The first Gemini project/key permitted metadata lookup but returned HTTP 403 for direct minimal `generateContent`; a fresh key in the same context also returned 403, and Google AI Studio showed Billing Tier `Unavailable`. This was treated as external provider/project access troubleshooting. A new local project/key then produced `MINIMAL_GENERATION=PASS` and `HAS_TEXT=true`; no secret value was printed or committed.

The adapter correction from `responseSchema` to `responseJsonSchema` was recorded in commit `e131b3c`. The corresponding stub assertion changed with it. The final auth/access correction is `c56f96c`: 401/403 SDK status/code values map to non-retryable `NOT_CONFIGURED`, without exposing raw details or changing public contracts. On Elena's Mac after `c56f96c`, `npm test` passed with 86/86 tests, 0 failures, and 0 skipped; that command runs `build:server` first, so backend TypeScript compilation also passed as part of the same command. Separately, the Codex sandbox recorded typecheck PASS, server build PASS, Gemini stub tests 5/5 PASS, frontend build PASS, and clean `git diff --check`; its full HTTP suite remained environment-limited by `127.0.0.1` `EPERM` listener failures.

Troubleshooting included failed HTTP 403 `generateContent` attempts and a successful minimal SDK probe after switching project/key. One deliberate backend validation request used Google Gemini `gemini-3.5-flash-lite` with `status=ready`, `score=0`, `lives=3`, and `bricksRemaining=40`; it returned HTTP 200 and the runtime-validated response `{"hint":"Launch the ball to begin breaking the remaining forty bricks.","category":"general"}`. Separately, Elena manually confirmed **Ask AI for Hint** in the browser with the real Gemini backend. This is user-observed manual browser evidence, not an automated browser test. No exact transport-level total is asserted because application retry behavior may make it unavailable. The limited live provider demonstration is now PASS.

The final Isidora review, role swap, secret-boundary review, and joint-understanding confirmation remain unresolved process requirements. The technical readiness result and process-compliance result remain separate.

### Week 4 contribution history

Isidora's earlier Week 4 JavaScript/runtime/backend work remains attributed to the history documented above. Elena continued independently with SpecKit, the TypeScript migration, final contract, fake-provider integration, Gemini adapter, frontend integration, tests, manual verification, and security checks. No later Isidora review, approval, role swap, or joint sign-off is claimed.

## T007 — TypeScript dependency installation evidence

The observed T007 installation was:

```text
npm install --save-dev typescript @types/node@24
```

Npm reported 4 packages added, 19 packages audited, and 0 vulnerabilities. The resolved versions recorded in `package-lock.json` are:

| Package | Resolved version |
| --- | --- |
| `typescript` | `7.0.2` |
| `@types/node` | `24.19.0` |
| existing `vite` | `7.3.6` |

`package.json` records `@types/node: ^24.19.0`, `typescript: ^7.0.2`, and preserves Vite at `^7.0.0`. The project Node baseline is `v24.21.0`; the Node types major version matches Node 24, and the installed TypeScript package metadata supports Node `>=16.20.0`. The installed TypeScript executable is therefore compatible with the current Node runtime. No new runner or framework was introduced.

Npm also reported that the `esbuild@0.28.2` postinstall script and `fsevents@2.3.3` install script were not yet covered by `allowScripts`. No scripts were manually approved during T007. This warning will be observed through later build and test gates and is not treated as a failure unless a later gate demonstrates one.

**T007 documentation/evidence: COMPLETE.** T008 and all later tasks remain NOT STARTED / NOT RUN. No tests, builds or provider calls were performed as part of this evidence update.

## T008 — Backend TypeScript compiler configuration

Created `tsconfig.server.json` for the planned backend migration with strict NodeNext/ES2022 settings, Node types, `server/` as the source root, `dist-server/` as the emitted output, and server-only TypeScript inclusion. Added `dist-server/` to `.gitignore` while preserving the existing environment-file rules.

No backend source migration or TypeScript compilation was performed for T008. T009 and all later tasks remain NOT STARTED / NOT RUN.

## T009 — Contracts module migration

Migrated `server/contracts.js` to `server/contracts.ts` and removed the duplicate JavaScript source. The existing exported `ContractError`, `parseGameSnapshot`, `parseAiRequest`, `parsePublicAiResponse`, and `parseGetCurrentGameSnapshotArguments` APIs retain the old question/snapshot/answer behavior and validation semantics. Untrusted runtime values are modeled as `unknown` and narrowed through explicit runtime checks before use.

The final Neon Breaker AI Hint four-field request and `{ hint, category }` response contract was not introduced in T009. No compilation, tests, builds, provider calls, or Gemini calls were performed. T010 and all later tasks remain NOT STARTED / NOT RUN.

## T010 — Tool and provider-contract module migration

Migrated `server/tools.js` to `server/tools.ts` and `server/ai/contracts.js` to `server/ai/contracts.ts`, removing the duplicate JavaScript sources. The original read-only `get_current_game_snapshot` tool, declarations, argument/context validation, structured cloning, and unsupported-tool behavior remain the only tool flow. The existing provider-neutral contracts, constants, normalized output structures, failure codes, retryability mapping, and legacy question/snapshot/answer semantics are preserved.

Runtime-untrusted values are represented as `unknown` and narrowed through runtime validation. The internal `.js` import specifiers were retained for emitted NodeNext ESM compatibility. No final AI Hint contract was introduced. No compilation, tests, builds, provider calls, or Gemini calls were performed for T010. T011 and all later tasks remain NOT STARTED / NOT RUN.

## T011 — Fake provider and orchestrator migration

Migrated `server/ai/fake-provider.js` to `server/ai/fake-provider.ts` and `server/ai/orchestrator.js` to `server/ai/orchestrator.ts`, removing the duplicate JavaScript sources. Scripted fake outcomes, provider call recording, and injected `now`/`sleep`/`jitter` behavior are preserved. The migration intentionally retains the 5000 ms timeout, maximum two attempts, randomized 100–199 ms backoff, and one-tool-call policy; the later Phase 4 reliability policy is not introduced here.

Runtime-untrusted errors and outcomes are represented as `unknown` and narrowed safely. Internal `.js` ESM import specifiers are preserved. No final AI Hint contract or final Phase 4 reliability policy was introduced. No compilation, tests, builds, provider calls, or Gemini calls were performed for T011. T012 and all later tasks remain NOT STARTED / NOT RUN.

## T012 — HTTP entry-point migration

Migrated `server/index.js` to `server/index.ts` and removed the duplicate JavaScript source. The existing `POST /api/ai` route, 16 KiB body limit, JSON requirement, safe HTTP errors, dependency injection, default local fake provider, and old answer contract are preserved. Node HTTP request/response values and dependency-injection options are strictly typed, while internal `.js` ESM import specifiers and the executable `127.0.0.1` entry-point behavior remain unchanged.

The final AI Hint contract was not introduced. No compilation, tests, builds, dev-server runs, provider calls, or Gemini calls were performed for T012. T013 and all later tasks remain NOT STARTED / NOT RUN.

## T013 — Backend scripts

Added the planned server scripts while preserving the Vite scripts and `"type": "module"` setup:

```text
build:server = tsc -p tsconfig.server.json
typecheck = tsc -p tsconfig.server.json --noEmit
dev:api = node --env-file-if-exists=.env --watch dist-server/index.js
start:api = node --env-file-if-exists=.env dist-server/index.js
```

The intended local backend flow is to run `npx tsc -p tsconfig.server.json --watch` in one terminal/process and `npm run dev:api` in a second. TypeScript watch emits server output into `dist-server/`, and Node `--watch` restarts when emitted files change. `start:api` runs the already-built server without Node watch. No script was executed for T013, so runtime success is not yet claimed. `package-lock.json` was not modified.

T014 and all later tasks remain NOT STARTED / NOT RUN.

## T015 — TypeScript validation, Attempt 1

Command: `npm run typecheck`

Result: **FAIL**, exit status `1`, with 3 compiler errors: two in `server/ai/orchestrator.ts` and one in `server/index.ts`. These were strict migration typing issues discovered before runtime validation, not demonstrated application or runtime regressions.

No build, server test, frontend build, smoke test, provider call, or Gemini call was executed after the failed typecheck. T015 remains **IN PROGRESS / NOT PASS**.

## T014 — Emitted backend test imports

Backend-oriented JavaScript tests now import emitted modules from `dist-server/`. `tests/game.test.js` remains pointed at the unchanged `src/game.js` frontend module. Test bodies, names, fixtures, and assertions were not altered. The `npm test` script now builds the TypeScript backend first and then runs the explicit `tests/*.test.js` files, avoiding accidental or stale generated test discovery. No test, build, typecheck, compiler, or provider command was executed during T014. T015 and all later tasks remain NOT STARTED / NOT RUN.
