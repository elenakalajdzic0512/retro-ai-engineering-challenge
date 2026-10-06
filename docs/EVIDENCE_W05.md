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
