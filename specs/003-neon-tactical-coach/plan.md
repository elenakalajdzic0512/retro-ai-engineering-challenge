# Implementation Plan: Neon Tactical Coach

**Branch**: `week5/neon-tactical-coach` | **Date**: 2026-10-06 | **Spec**: [spec.md](spec.md)

## Summary

Add a separate, advisory Week 5 Tactical Coach to the accepted Hazard Arena game. A player enters a goal; the application validates a bounded browser-reported tactical state, directs exactly three successful model steps through two allowlisted tools, evaluates one candidate deterministically, validates a structured final plan and displays it without changing the game. This document designs the work only; nothing is implemented here.

## Technical Context

- **Language/platform**: Existing browser JavaScript/Canvas/Vite and server TypeScript/Node. The game state lives in the browser.
- **Dependencies**: Existing `@google/genai` stack; Week 5 needs a separate `createTacticalCoachGeminiProvider` (or equivalent) adapter. The Week 4 adapter stays behaviorally unchanged. No new dependency is selected in this design.
- **Storage**: None. One request-scoped state machine; no conversation persistence or game mutation.
- **Testing**: Existing `node:test` suite with fake provider and injected clock/sleeper. Week 4/Hazard Arena baseline is 133 passing tests at `8e0aa82`; future Week 5 results are NOT RUN.
- **Scale**: One goal, one bounded snapshot, one candidate, one evaluation, one final plan. No batch, multi-agent, open-ended tool loop or long-horizon simulator.
- **Performance/bounds**: 5 s per provider attempt, 22 s total, three logical steps, two tool calls, four provider attempts including one global retry. Tool result ≤8192 bytes.

## Constitution Check

The repository constitution explicitly governs the historical Week 4 Hint feature and prohibits autonomous agents *within that Week 4 scope*. This new, separately authorized Week 5 feature does not amend Week 4 history or its public contract. It carries forward the security, server-only key, strict runtime validation, fake-first, bounded reliability, regression and evidence principles. The user explicitly authorizes only this design stage. No secret, provider call, new endpoint or gameplay change occurs now. Before implementation, the team must review provider/model suitability and record real pair roles and security checks; historical Week 4 role-swap gaps are not silently closed by Week 5 documentation.

## Project Structure

```text
specs/003-neon-tactical-coach/
  spec.md plan.md research.md data-model.md quickstart.md tasks.md
  contracts/agent-api.md contracts/tools.md contracts/final-plan.md
  checklists/requirements.md

# Later implementation targets; none changed in this task:
src/main.js                 # separate Coach UI and bounded snapshot derivation
server/tactical/            # new contracts, evaluator, tools, orchestrator, dedicated Gemini provider adapter
server/index.ts             # separate Week 5 endpoint registration
server/ai/                  # existing Week 4 implementation stays stable
tests/                     # Week 5 fake/contract/API tests and full regression
```

The new SpecKit folder is the design source of truth. Later `docs/AGENT_EVALS.md` and `docs/EVIDENCE_W05.md` record actual results, while `docs/AI_USAGE_LOG.md` receives dated pair contributions during implementation. Do not copy the same contract into `docs/`. Existing Week 3/4 and Hazard Arena documents remain historical baselines. `.specify/feature.json` points to this new feature so later SpecKit commands resolve it directly.

## Request and authority boundary

The new route is `POST /api/tactical-coach` with exact `{goal,state}`. The browser derives coarse counts/zones and categorical motion from the current game, then the server validates and copies it. It is client-reported evidence; a server cannot prove the physical board without owning game state. No raw all-brick array, arbitrary coordinates, provider/model selection or secrets cross the boundary. Invalid local input yields zero provider/tool calls. The Week 4 `/api/ai` request, endpoint, read-only tool and Hint UI remain separate and unchanged.

The Core tool allowlist is exactly `get_tactical_snapshot` and `evaluate_tactical_strategy`, specified in [tools.md](contracts/tools.md). Tool 1 has exact `{}` arguments and returns a validated immutable copy of client-reported request state. Tool 2 accepts exactly targetZone/style/paddleContact/route, reads only the stored validated snapshot and computes one bounded local evaluation. Neither tool receives the mutable browser game, writes to files, runs shell, uses network, calls another model or changes entities. Provider keys, model ID and tool declarations are fixed server-side. Reject arbitrary proposals before dispatch. A dedicated Week 5 adapter must send Gemini function declarations, normalize one tool proposal or structured final output for the orchestrator, and return validated tool results as model context on the next call. The existing Week 4 Gemini provider accepts declaration/result parameters but ignores them and emits only `{hint,category}` final JSON; it must not be repurposed or changed.

## Normal three-step state machine

| State | Accepted model output | Application action | Next state |
| --- | --- | --- | --- |
| `NEED_SNAPSHOT` (step 1) | Only `get_tactical_snapshot` proposal with exact `{}` | Validate allowlist, arguments, budgets and repeat key; run/validate tool 1; give result to provider | `NEED_EVALUATION` |
| `NEED_EVALUATION` (step 2) | Only `evaluate_tactical_strategy` proposal with exact candidate | Validate against schema; reject repeats/out-of-order; run/validate deterministic tool 2. If `candidateAccepted=false`, stop safely. | `NEED_FINAL` only if accepted |
| `NEED_FINAL` (step 3) | Only structured final JSON object | Validate exact schema, accepted candidate match and both evidence sources; materialize cited facts; return bounded success | terminal |

The application owns state transitions; there is no open-ended model-driven tool loop. A final in `NEED_SNAPSHOT` or `NEED_EVALUATION` is `missing_required_evidence`; any tool proposal in `NEED_FINAL` is `step_limit` (or `tool_call_limit` if it attempts a third tool); an out-of-order tool stops before execution. No fourth logical model step. A provider retry repeats the *same* logical state and does not add an agent step. State permission is the primary loop control. Defense-in-depth repeat tracking uses `state + validated tool name + canonical validated arguments`, scoped to this request's immutable snapshot; duplicate keys/names stop with `repeated_action` before execution. No extra client snapshot ID or digest is needed. Tool outputs are validated and byte-bounded before becoming provider context; responses from a stale state/call are rejected. A failure never falls back to an unvalidated plan.

## Deterministic evaluator and final contract

The candidate uses all four bounded fields because each has tactical meaning. [Research](research.md) explains the decision and [tools.md](contracts/tools.md) fixes the rules: count target/armored opportunity, reject empty target or unusable portal, calculate a lives/style risk tier, expose paddle alignment and possible shield interference, and return fixed evidence codes. These are coarse heuristics, not physics forecasts or probabilities. Evaluation runs once. A rejected candidate ends the request with a safe error; it does not open a new proposal loop.

The final schema in [final-plan.md](contracts/final-plan.md) contains a summary, the exact accepted candidate fields, one to three short actions and two to six fact references with at least one from each tool. The evaluator does not adjust style or paddle contact: final `targetZone`, `strategy`, `paddleContact`, `route` must equal accepted candidate `targetZone`, `style`, `paddleContact`, `route` respectively. Risk/alignment facts are evidence, not substitute choices. Runtime validation checks exact shape, lengths, candidate equality, source/fact membership and availability. The server, not the model, adds evidence values to the public response and decides success. Invalid or unsupported output never reaches the UI. No `completed`, chain-of-thought, provider diagnostics or free-form confidence score.

## Limits, retries and cancellation

| Limit | Chosen value | Reason |
| --- | --- | --- |
| `MAX_AGENT_STEPS` | 3 | One snapshot proposal, one candidate evaluation proposal, one final plan. |
| `MAX_TOOL_CALLS` | 2 | Exactly one call for each allowed tool on success. |
| `MAX_PROVIDER_CALLS` | 4 | Three normal attempts plus at most one transient retry globally. |
| `MAX_GOAL_CODE_POINTS` | 240 | One short player objective, counted as Unicode code points. |
| Request / final body | 4096 UTF-8 bytes each | Prevent oversized input/output. |
| `MAX_TOOL_RESULT_BYTES` | 8192 UTF-8 bytes per tool result | Upper bound even though the designed outputs are much smaller. |
| `PER_CALL_TIMEOUT_MS` | 5000 | Bound each provider attempt. |
| Local tool budget | 100 ms elapsed check | Tools are synchronous/constant-time; elapsed check flags abnormal execution. |
| `TOTAL_AGENT_DEADLINE_MS` | 22000 | Fits four worst-case attempts of 5 s, one ≤250 ms backoff and bounded overhead. |

A normal success consumes **3 logical agent steps, 3 provider attempts and 2 tool calls**. One transient retry still consumes **3 logical steps and 2 tool calls**, but **4 provider attempts**; retry is not an agent step. The absolute 22 s deadline bounds every attempt, backoff, tool and orchestration overhead. At each operation check cancellation and remaining deadline. Each provider attempt timeout is `min(PER_CALL_TIMEOUT_MS, remaining global deadline)`; abort the active attempt on timeout/cancel. One retry globally applies only to transient timeout/unavailable/rate-limited results; do not retry invalid input, invalid tools/results, malformed output, policy/configuration failure or invalid final. Use an injected monotonic clock/sleeper in fake tests and a single ≤250 ms backoff. A retry stops if attempt/deadline budget cannot accommodate it. Step, tool and provider counters are separate and observable in fake tests only, never public success payloads. The local Node API has no known application timeout shorter than 22 s, and the existing provider request contract permits `timeoutMs` up to 30 s. The actual deployed HTTP/proxy timeout is unverified; the final Coach deadline must remain below that outer boundary.

## Failure and stop taxonomy

| Code | Trigger |
| --- | --- |
| `invalid_input` | Malformed goal, state, media type or request size; zero provider/tool calls. |
| `unknown_tool` | Name is not an allowlisted or recognized forbidden action. |
| `forbidden_tool` | Explicit gameplay/write/network/shell action proposal (for example `move_paddle`, `launch_game`, `fetch_url`). |
| `invalid_tool_arguments` | Known tool with extra/missing/wrong-type fields. |
| `invalid_tool_result` | Tool output fails exact schema, consistency or 8192-byte limit. |
| `tool_failure` | Local tool throws, after safe normalization. |
| `tool_timeout` | Local elapsed budget exceeded. |
| `provider_timeout` | Provider attempt times out after bounded retry. |
| `provider_unavailable` | Provider unavailable after bounded retry. |
| `rate_limited` | Provider rate limit after bounded retry. |
| `malformed_model_output` | Provider envelope, tool proposal or JSON cannot be parsed safely. |
| `missing_required_evidence` | Premature final or absent successful snapshot/evaluation. |
| `repeated_action` | Repeated tool name/key before execution. |
| `step_limit` | Extra/out-of-order model step or post-evaluation tool proposal. |
| `tool_call_limit` | More than two tool proposals/calls. |
| `provider_call_budget` | Would require a fifth provider attempt. |
| `deadline` | Total request deadline exhausted before success. |
| `invalid_final_output` | Final shape, length, candidate/evidence mismatch or unsupported fact. |
| `candidate_rejected` | Valid deterministic evaluation rejects an empty target or unusable portal route. |
| `cancelled` | Caller aborts run. |

A fixed public code/message map yields sanitized errors; logs must not include raw provider payloads, stack traces, secrets or private prompts. Provider refusal/not configured may use additional fixed codes, without retry. A valid rejected candidate stops with `candidate_rejected` after tool 2. `invalid_tool_result` applies only to malformed evaluation output.

## UI and evaluation

Add a separate **AI Tactical Coach** region with a goal text field, **Run Tactical Coach** button, progress stages (“Analyzing arena…”, “Evaluating strategy…”, “Preparing tactical plan…”), validated summary/strategy/zone/contact/route/actions and server-materialized evidence. Disable duplicate submission while a run is active; support cancellation when leaving/restarting the view. On error show one fixed safe message and leave gameplay usable. Retain the Week 4 Hint section and request contract. No raw tool calls, hidden prompts, provider messages or chain-of-thought in UI.

The [quickstart](quickstart.md) defines the fake-first matrix. Record expected outcomes before tests; run focused contract/evaluator/orchestrator/API/UI checks, then full `npm test`, typecheck and production build. Include game-state equality before/after coaching and Week 4/Hazard Arena regression. Only after local gates pass, confirm the selected server-controlled model/SDK's tool/final capabilities with official documentation, conduct a limited live check, then a pair-reviewed manual demo. Never make live provider checks part of the deterministic suite.

## Implementation sequence and decision gates

Proceed in the exact dependency order in [tasks.md](tasks.md): contracts → snapshot → evaluator → tools → fake provider → state machine/repeat/budgets → final validation → endpoint → UI → evaluations → old-feature regression → limited live validation → evidence and pair review → manual acceptance. No implementation task is performed in this design pass. No provider capability or cost claim is accepted before the later research gate.
