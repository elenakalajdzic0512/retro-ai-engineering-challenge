# Planned implementation validation guide

This guide describes commands and scenarios **after implementation**. New scripts/files below do not exist yet. No tests, live requests or security gates are claimed passed by this planning artifact. Run from repository root with Node 24.x. Never put a real key in commands, test fixtures, screenshots or evidence.

## Baseline and proposed commands

Before migrating, record `git rev-parse HEAD` as the implementation baseline SHA (T001), working-tree status, `node --version`, `npm test` and `npm run build` results. These currently exercise the old contract, not final AI Hint acceptance. Install the planned dependencies only during implementation and commit lockfile changes. Subsequent clean installations use `npm ci`.

| Planned script | Definition / purpose |
| --- | --- |
| `build:server` | `tsc -p tsconfig.server.json` |
| `typecheck` | `tsc -p tsconfig.server.json --noEmit` |
| `test` | `npm run build:server && node --test tests/*.test.js` |
| `dev:api` | `node --env-file-if-exists=.env --watch dist-server/index.js` |
| `start:api` | `node --env-file-if-exists=.env dist-server/index.js` |
| existing `dev` / `build` / `preview` | Vite frontend development / production build / local built-frontend preview |

For offline evaluation run `npm run build:server -- --watch` in one terminal, `AI_PROVIDER=fake npm run dev:api` in another, and `npm run dev` in a third. The shell mode selects only deterministic fake behavior; fake mode does not use credentials or network. The browser sends relative `/api/ai`, proxied to loopback 3001. Avoid mixing fake and live processes. Default real mode with no configured key must yield NOT_CONFIGURED, not a fake success.

For manual browser checks, keep compile-watch and Vite running, and start exactly one of these backend processes at a time. Stop the previous backend before switching scenarios; no source edits or browser settings are needed:

```sh
AI_PROVIDER=fake AI_FAKE_SCENARIO=success npm run dev:api
AI_PROVIDER=fake AI_FAKE_SCENARIO=delay npm run dev:api
AI_PROVIDER=fake AI_FAKE_SCENARIO=failure npm run dev:api
```

The scenarios return, respectively, immediate fixed valid success, the same success after a fixed 2,000 ms cancellable delay, and non-retryable safe UNAVAILABLE. Each request starts the same scenario afresh. This non-secret setting is meaningful only in fake mode; omitted means success, unknown fake scenarios yield local NOT_CONFIGURED before provider creation, and real Gemini mode ignores it. It is never browser input, never a frontend selector and never automatic fallback. `.env.example` still contains only `GEMINI_API_KEY=`.

For compiled local execution run `npm run build:server`, then select one backend command:

```sh
AI_PROVIDER=fake AI_FAKE_SCENARIO=success npm run start:api
AI_PROVIDER=fake AI_FAKE_SCENARIO=delay npm run start:api
AI_PROVIDER=fake AI_FAKE_SCENARIO=failure npm run start:api
```

Run only one at a time; run `npm run build` and `npm run preview` for the built frontend. Preview has the same local API proxy. This verifies production artifacts locally, not deployment. Real `.env` creation belongs to the later, separately invoked live phase; `.env.example` remains an empty key placeholder.

## Deterministic acceptance matrix

Record expectations before running. For every row record actual result, PASS/FAIL or NOT RUN, command/test name, revision/dirty state, fake vs live, and limitations in `docs/EVALS_W04.md`. `providerCallCount` counts generation invocations; stub adapter tests additionally count SDK transport attempts to catch hidden retry behavior.

| ID / spec gate | Fixture and expected observation | Planned test location |
| --- | --- | --- |
| D1 / A1 | Each status valid request → exactly `{hint,category}`, HTTP 200, one call, captured snapshot unchanged | contracts, API, fake-provider |
| D2 / A2 | All invalid local cases → INVALID_INPUT and **providerCallCount === 0** | contracts + API |
| D3 / A3 | Explicit non-retryable unavailable → safe UNAVAILABLE; no leaked raw data | orchestration + API |
| D4 / A3 | Never-completing provider → TIMEOUT by total 10s; supported abort observed; late completion ignored | orchestration fake clock/scheduler |
| D5 / A4 | Each malformed/schema-invalid/oversized output → INVALID_OUTPUT, no retry, never valid display | contracts, orchestration, UI |
| D6 / A10 | Transient failure then success → fixed 250 ms backoff, **providerCallCount === 2**, valid hint | orchestration |
| D7 / A10 | Two transient unavailability failures → **providerCallCount === 2 maximum**, safe UNAVAILABLE | orchestration + API |
| D8 / A10 | 1,249 ms remains: no backoff/retry; 1,250 ms permits backoff; after backoff 999 ms prevents retry and 1,000 ms permits it | orchestration |
| D9 / A7 | Missing/locally invalid configuration → NOT_CONFIGURED, **zero calls**; provider-reported authentication/configuration rejection maps to NOT_CONFIGURED after one observed call, no retry | API/config + adapter |
| D10 / A7 | Refusal/policy, including valid-looking accompanying text → REFUSED, no retry | adapter + orchestration |
| D11 / A8/A9 | Raw error/stack/private payload/key-like non-secret sentinels absent from response and logs | API/adapter security |
| D12 / A10 | Unknown or explicitly non-retryable error → UNAVAILABLE, one call, no retry | orchestration |
| D13 / A12 | Complete preserved Week 3 suite remains green | `tests/game.test.js` + full suite |
| D14 / A10 | Attempt timeout can retry only if classified transient and time sufficient; no retry at total expiry; backoff/validation expiry rejects late success | orchestration |
| D15 / A5/A6/A8 | No automatic calls; one capture; double activation → one request; new round clears output; old success/error/finally cannot overwrite newer state | `tests/ai-hint.test.js` |
| D16 / A3/A8 | Never-settling fetch/body read and unreachable backend → leave loading by 12s; absolute monotonic deadline checked before success and after parsing; with clock beyond 12,000 ms and watchdog callback withheld, resolve fetch/body → TIMEOUT, no success; also cover exact deadline equality and stale timeout settlement after reset/new request; retry activation remains possible and messages stay application-owned | UI fake clock/fetch |
| D17 / A8 | HTML/script-looking hint/category handled through textContent; failed request does not retain old successful hint | UI + manual browser |
| D18 / A9/A10 | Fixed Gemini model/prompt/schema/snapshot; no tools; retries disabled; signal/timeout forwarded; ≤2 total SDK transports | `tests/gemini-provider.test.js` with stub SDK |
| D19 / A10 | Provider proposes tool → INVALID_OUTPUT and **tool execution count 0**; historical empty-argument/read-only tool tests still pass separately | orchestration + tools |

D2 expands to malformed JSON, non-JSON/missing content type, null/arrays, every missing/extra field, wrong types/numeric strings, non-finite numbers (including overflow JSON exponent and direct-validator NaN/Infinity), fractional lives/bricks, all exact minima/maxima and adjacent invalid values. Permit fractional finite score and no extra cross-field restrictions. Test old wrapper/question, provider/model/tools/timeout/retry/security injection individually. Test 1,024/1,025 bytes with excess whitespace, multibyte and chunked bodies; never rely solely on Content-Length. Every invalid HTTP fixture asserts zero calls, not just status.

D5 expands to malformed JSON, prose with recoverable JSON fragment, code fences, partial JSON, missing/extra fields, null/array, wrong primitive types, unknown/whitespace-padded category, whitespace-only hint, exact 240/241 code points including astral characters, and exact 2,048/2,049 UTF-8 byte payloads before parsing/trimming. Surrounding hint trim is permitted; no truncation/repair. Deadlines include validation; use injected monotonic time/scheduler instead of wall-clock sleeps. Include SDK timeout followed by a late successful resolution to prove it cannot change the public result.

After each major phase run appropriate focused test files through Node against freshly compiled backend, then the full `npm test`. Final local gates: `npm test`, `npm run typecheck`, `npm run build:server`, `npm run build`. Automated execution never loads real env credentials or real provider transports; fake mode/provider injection and stub SDK are explicit even when a developer has a local `.env`.

## Security verification

- Verify ignore behavior with `git check-ignore .env .env.local .env.production`; verify `git check-ignore .env.example` finds no ignore match. Inspect tracked paths with `git ls-files`; no local secret env file may be tracked. `.env.example` contains exactly one empty GEMINI_API_KEY assignment.
- Review frontend imports and Vite configuration; no backend SDK imports, provider endpoint fetch, `VITE_GEMINI_API_KEY`, environment spreads or key injection. Browser Network view must show only `/api/ai` for hint work and exactly four request fields.
- Use a redacting secret scanner on working tree (including docs/specs/tests/prompts), frontend `dist/`, and all reachable Git history. Record scanner/version/scope/command and redacted pass/fail only. Pair this with an in-memory exact local-key absence check that never prints the key. Scan captured backend logs and public responses as separate surfaces. Do not paste raw scanner matches.
- Build with a clearly non-secret backend key sentinel and verify neither it nor server-only code reaches frontend output. Test raw private-provider/stack sentinels against every failure mapping and captured logs. Do not use a real key as test data.
- Any positive finding blocks readiness; document affected scope without exposing secrets. No history rewriting is authorized by this plan. Absence checks cannot prove coverage of unavailable/unreachable history or logs; record such limitations explicitly.

## Manual gameplay and UI verification

Using the exact `AI_FAKE_SCENARIO` commands above for deterministic success, delayed success and safe failure, verify game start, terminal restart, arrow/A/D paddle controls and boundaries, wall/paddle collisions, brick destruction, scoring, life loss/relaunch, win and lose states. Verify uninterrupted gameplay while hint loads, after success and after failure. Check AI Hint availability in all four statuses, loading/duplicate protection, plain-text hint/category, old-state clearing, and late response after restart. Stop backend during request to verify recovery within 12 seconds; reload/use a new request after recovery. Ensure keyboard activation of the button does not accidentally launch/restart or break paddle input.

Keep `src/game.js` unchanged. Substitute T001’s recorded SHA into `git diff <baseline-sha> -- src/main.js src/game.js tests/game.test.js` during implementation. For the committed candidate use `git diff --stat <baseline-sha> HEAD` plus targeted baseline-to-HEAD diffs; separately inspect `git diff`, `git diff --cached` and `git status --short` for unstaged, staged and untracked work. A clean working tree does not hide committed changes from these baseline comparisons. If timing/movement code is touched despite this plan, explicitly rerun/record equivalent-duration movement at multiple frame rates and slow-frame clamping/substep checks, in addition to existing regression tests; do not infer frame-rate preservation from test count alone.

## Separate limited live check (not part of automated tests)

Do not execute during planning. Only after all local gates above are green, follow [provider contract](contracts/provider.md#limited-live-validation-contract). Verify and record human-review gate status; missing pair participation remains an unmet assignment process requirement, never implied approval. Supply GEMINI_API_KEY locally in ignored `.env`, run the real backend without fake mode, and initiate at most four deliberate requests, one per ready/playing/won/lost. Record expected behavior before each call, non-secret snapshot, exact provider/model, actual response, contract validity, useful/status-relevant advice, latency, success/failure, limitation and exposed usage/cost. No live request is part of `npm test`, typecheck, build or ordinary security checks. No automatic retry of the evaluation batch; application-level retries retain the same bounded policy and are counted separately.

All four must pass response/advice criteria to claim technical live readiness. Preserve failures and NOT RUN rows; missing key/access or failed check blocks that claim. Complete `docs/EVIDENCE_W04.md` and dated Week 4 AI usage entries with actual commands/revisions and truthful contribution history, preserving Week 3 evidence.
