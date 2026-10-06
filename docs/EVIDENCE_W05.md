# Week 5 Evidence — Neon Tactical Coach

## Feature and authority

Neon Tactical Coach is a bounded advisory tactical agent for Neon Breaker: Hazard Arena. The model proposes; the application validates, executes only `get_tactical_snapshot` and `evaluate_tactical_strategy` locally, and runtime-validates the final result before returning it. The snapshot is read-only and the evaluator is deterministic. Neither tool mutates gameplay. No arbitrary shell, filesystem or network tool is available to the model. The application remains authoritative over tool execution, candidate acceptance, evidence values and success.

## Bounded runtime

| Limit | Value |
| --- | ---: |
| `MAX_AGENT_STEPS` | 3 |
| `MAX_TOOL_CALLS` | 2 |
| `MAX_PROVIDER_CALLS` | 4 |
| `PER_CALL_TIMEOUT_MS` | 5000 |
| `TOTAL_AGENT_DEADLINE_MS` | 22000 |

The orchestrator permits one global transient retry for `provider_timeout`, `provider_unavailable` or `rate_limited`. `provider_rejected` and `provider_not_configured` are nonretryable. Neither live probe used a transient retry.

## Provider configuration and pre-live gates

The separate Week 5 Gemini adapter uses installed `@google/genai` 2.24.0 and the server-fixed model `gemini-3.5-flash-lite`. The Week 4 provider and the normal application's fake-first default remained unchanged. The user ran each explicitly authorized one-run Terminal harness with `GEMINI_API_KEY` supplied from the local `.env`; the key was not sent to the browser, printed, recorded here or committed.

Before live validation, T024's fake-first regression gate, provider-neutral contracts, nonretryable failure distinction, Gemini adapter stub/static audit, initial `request.state` isolation, exact phase sequence, and stubbed function-call/function-response continuity had passed. Automatic SDK tool execution was disabled; history was request-scoped. Application runtime final validation remained in force. Week 4 and Hazard Arena gameplay regressions remained green.

## First authorized live probe — bounded failure

One outer `runTacticalCoach` invocation used `gemini-3.5-flash-lite`. It elapsed **3974 ms** and made **three provider attempts**: `tool_call → tool_call → final`. The approved local tools executed in order: `get_tactical_snapshot`, then `evaluate_tactical_strategy`. Live Gemini accepted the snapshot function response and continued to the evaluation call; the deterministic evaluator accepted the candidate; Gemini accepted the evaluation function response and returned parseable final JSON. The application rejected that final as **FAIL: `invalid_final_output`**. The exact rejected field cannot be recovered from the sanitized output and is not guessed here. The run established model availability and both function-response continuations, while confirming that runtime validation safely rejected the final.

## Offline diagnosis and correction

The diagnosis was a **final-instruction alignment gap**: the model had sufficient validated context, but the fixed server instruction did not explicitly communicate every authoritative semantic rule. Runtime validators were not weakened. Commit `e41d6498c53465ae7cf6b18ac54575d5b3e87068` (`fix: align Tactical Coach Gemini final instructions`) made the four candidate-equality mappings, exact evidence sources/facts, both-source coverage, uniqueness, `{source,fact}`-only references, summary/action/count bounds and compactness guidance explicit. It added no repair loop or provider attempt, changed no model, and increased no limit.

After correction, the focused Gemini suite passed **16/16** (0 failed, 0 skipped); the full suite passed **265/265** (0 failed, 0 skipped). Typecheck, build and `git diff --check` passed.

## Second authorized live probe — PASS

One outer run through the corrected adapter used `gemini-3.5-flash-lite` and elapsed **3989 ms**, within the accepted bounds. It made **three provider attempts** with **zero observed transient retries**: `tool_call → tool_call → final`. Exactly two approved local tools executed, in order: `get_tactical_snapshot`, then `evaluate_tactical_strategy`.

The accepted candidate was `targetZone=center`, `style=safe`, `paddleContact=center`, `route=direct`. The final plan fields were exactly `actions`, `evidence`, `paddleContact`, `route`, `strategy`, `summary`, `targetZone`. The sanitized, application-materialized evidence references/types were:

| Source | Fact | Value type |
| --- | --- | --- |
| `tactical_snapshot` | `bricksByZone.center` | number |
| `strategy_evaluation` | `targetOpportunity` | number |
| `strategy_evaluation` | `riskLevel` | string |

The reported **PASS** means TacticalPlan runtime validation, candidate equality, source/fact evidence validation, both-source coverage, application evidence materialization and exact public `{plan,evidence}` validation passed. The probe report states no gameplay mutation occurred. **One bounded live run through the corrected adapter completed successfully.**

## Compiled-artifact provenance — VERIFIED CURRENT

The live harness imported `dist-server/tactical/gemini-provider.js`. `npm run build:server` uses `tsc -p tsconfig.server.json`, and `npm test` regenerated that artifact after the alignment source edit and before commit `e41d649`. An offline comparison found the source and compiled fixed instruction literals identical, including all four candidate mappings, evidence rules and bounds. The successful probe is therefore evidence for the corrected adapter; no additional live run was needed for provenance.

## Cost, configuration and privacy limits

Exactly **two** authorized outer live probes were performed. Each observed **three** provider attempts with no transient retry, for **six observed Gemini provider requests** in total. Local deterministic tool calls were not additional Gemini requests. The model was fixed server-side, the key was supplied locally through `.env`, the fake-first default remained unchanged, and the live path was an explicit one-run Terminal harness. There was no browser-side provider selection, model fallback or persistent live-provider switch.

Exact token usage and monetary cost were not measured, so no currency amount is claimed. Actual cost depends on provider pricing and token usage at execution time. The evidence does not record the API key value, authorization headers, hidden chain-of-thought or thought contents, raw private provider payloads, the full raw model prompt, or unnecessary private data; it retains only bounded technical telemetry.

This live phase demonstrates one successful bounded end-to-end run through the corrected adapter and existing application authority model. It does not establish universal future model reliability, exclude future malformed responses, determine future pricing, or verify production/deployed proxy behavior under every timeout or error condition. Runtime validation remains required. T029 and final Week 5 acceptance remain pending.

## Final Manual Browser Acceptance — T028

**Date and attribution:** 2026-10-06. Elena + Isidora jointly reported **PASS** from one development environment. The browser observations below are human-reported manual evidence, not Codex-observed behavior. They are separate from automated tests/typecheck/build and the two previously authorized LIVE GEMINI Terminal probes.

### Normal fake-first success — MANUAL / FAKE-FIRST / LOCAL BROWSER

The normal fake-first application loaded. Week 4 Ask AI for Hint worked before Coach, and Tactical Coach appeared visually separate. With the goal `Help me clear the center safely`, Coach returned a successful Tactical plan; its plan, actions and evidence were readable, and evidence values rendered correctly. The Coach invocation did not change score, lives, bricks or game status. Gameplay controls, including the paddle and Space key, remained usable, and Week 4 Hint still worked after Coach.

### Unavailable provider — MANUAL / DETERMINISTIC LOCAL FAILURE INJECTION

With the frontend still running, the team stopped the normal fake API and used a temporary API with the existing `createApiServer` provider injection path. The tactical provider deterministically returned `provider_unavailable` through the real Tactical Coach HTTP route, orchestrator and UI. The browser showed exactly: `Tactical Coach is unavailable. Please try again.` The Coach result/error behavior remained bounded, its button re-enabled, and no raw provider internals, stack or debug data appeared. The failed Coach request did not change score, lives, bricks or game state. Gameplay remained usable; Week 4 Hint remained usable and returned its normal fake hint.

### Manual restoration and evidence boundary

The team stopped the temporary unavailable-provider process, restored the normal fake-first API and reloaded the page. Another valid Coach request succeeded and normal Tactical plan rendering returned. This was manual process restoration, **not automatic provider failover**. No Gemini live call or API-key handling was involved in this T028 manual browser test. The automated gates, earlier LIVE GEMINI probes, MANUAL FAKE-FIRST success and MANUAL UNAVAILABLE injection are distinct evidence categories. T029 final reconciliation and final Week 5 acceptance remain pending.

## Revised final T028 acceptance gate

The preceding human-reported PASS remains valid evidence for fake-first browser success and deterministic local `provider_unavailable` recovery. The two earlier live Gemini probes remain Terminal-harness evidence. Neither establishes that the normal game UI reached the real Gemini Tactical provider. T028 is therefore reopened: final acceptance additionally requires a human-observed real-Gemini Coach request from the normal game UI using server-side `TACTICAL_AI_PROVIDER=gemini`, with rendered plan/actions/evidence, no game mutation, and usable gameplay and Week 4 Hint. That browser check has **not yet occurred**; T028 and T029 remain pending.

## Final Real-Gemini Browser Acceptance — T028

**Date and attribution:** 2026-10-06. Elena + Isidora jointly reported **PASS** on one development environment. This is **MANUAL / REAL GEMINI / NORMAL GAME UI** evidence, not a Codex-observed browser run or a repeat of the earlier Terminal probes. They started the backend with `npm run start:api` and the frontend with `npm run dev`, with **no `TACTICAL_AI_PROVIDER` override**. Under the current server default, that normal startup selects a fresh real Gemini Tactical provider for the Coach route. The application and fresh game state loaded; gameplay controls and paddle were usable, and Week 4 Ask AI for Hint worked before Coach.

In the normal game UI they entered `Help me clear the center safely without relying on the portal.` and clicked **Run Tactical Coach**. The Coach panel displayed `Tactical plan ready.` and this readable content:

| Displayed plan field | Human-observed text |
| --- | --- |
| Summary | Executing a safe, direct tactical approach to clear the center zone. |
| Strategy | safe |
| Target | center |
| Paddle | center |
| Route | direct |

The displayed actions were `Position the paddle in the center alignment.` and `Execute a direct route hit toward the center zone.` The pair reported evidence for `bricksByZone.center` with value `10`, `routeUsable` rendered as `yes`, and `paddleAligned` rendered as `yes`. The UI formats dotted fact names with spaces (so `bricksByZone.center` appears as `bricksByZone center`). **“yes” is the browser's rendering of the two boolean evidence values**; this record does not claim to have inspected private provider output.

The pair reported that invoking Coach alone did not mutate score, lives, bricks or game state; gameplay and paddle controls remained usable afterward; Week 4 Hint remained usable afterward; and no raw provider internals, stack trace, debug information or provider payload appeared. They reported the working tree remained clean after the human check. This is the first recorded human browser acceptance of the supported normal game UI → Tactical API → real Gemini provider → bounded local tools and validation → Coach panel path. It demonstrates this observed run, **not universal future Gemini reliability**.

Evidence categories remain separate: **AUTOMATED** deterministic tests/typecheck/build; the two earlier **LIVE GEMINI TERMINAL** probes (first `invalid_final_output`, then corrected PASS); earlier **MANUAL FAKE-FIRST** browser success; **MANUAL UNAVAILABLE** deterministic injection and recovery; and this **MANUAL REAL-GEMINI BROWSER** PASS. The prior findings and T027 pair review remain intact. T028's revised manual acceptance is satisfied; T029 final reconciliation remains pending.

## T021 Outer Timeout Evidence — Local Boundary Only

**Date:** 2026-10-06. T021 was already checked for endpoint implementation; this record closes its previously missing timeout-verification evidence for the accepted local runtime. No external deployed hosting/reverse-proxy timeout is configured or evidenced in the tracked repository. The applicable path is local browser → Vite development `/api` proxy → local Node API. The Coach deadline remains **22,000 ms**.

Static inspection found no explicit HTTP timeout changes in `server/index.ts` and no `timeout` or `proxyTimeout` in `vite.config.js`. Installed Node **v24.21.0** reports `requestTimeout=300000 ms`, `headersTimeout=60000 ms`, `timeout=0 ms` for a fresh HTTP server; the request and header settings concern incoming request receipt, not response duration. Installed Vite **7.3.6** delegates `/api` to bundled `http-proxy-3`; its incoming socket and outgoing proxy-request timeout branches activate only when those options are provided. The repository provides neither.

One deterministic zero-provider local probe loaded the actual Vite config and sent a request to `/api/__outer_timeout_probe` through its `/api` proxy. Because the normal 3001/5173 ports were occupied, the probe used temporary loopback target/port overrides and environment/cache paths outside the repository; the resolved timeout options remained absent. A temporary HTTP server delayed its fixed marker response by **23,500 ms**. The proxied request returned HTTP **200** with exact marker `outer-timeout-probe-ok` after **23,522 ms**, exceeding the Coach deadline without a proxy, client or server timeout. The initial sandboxed bind failed before any request; a permitted rerun produced this one measured HTTP response. The temporary process and environment/cache directory were removed afterward. `GEMINI_API_KEY` was excluded from the probe process without reading it; the project `.env` was not loaded. No Gemini call, API-key inspection or tracked runtime edit occurred.

**Classification B — no deployed outer boundary applies.** The local Vite/Node boundary used for Week 5 acceptance is verified beyond 22 seconds. This does not verify any future production hosting timeout; if deployed later, its actual platform/reverse-proxy request limit must be checked to exceed 22 seconds. T029 and final Week 5 reconciliation remain pending.
