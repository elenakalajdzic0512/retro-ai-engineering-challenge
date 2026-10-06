# Quickstart and evaluation guide: Neon Tactical Coach

The endpoint, UI, bounded orchestrator and separate Gemini adapter have been implemented. The sequence below records the design and verification gates; final real-Gemini browser acceptance remains pending.

## Normal runtime modes

For normal real-Gemini Tactical Coach use, ensure the local backend `.env` has `GEMINI_API_KEY` configured. From the repository root, build the backend when needed and start the API normally:

```bash
npm run build:server
npm run start:api
```

Run the frontend in a second terminal with `npm run dev`, open the game and use **Run Tactical Coach**. Unset `TACTICAL_AI_PROVIDER` selects real Gemini, as does an explicit `gemini`; `npm run dev:api` has the same normal default. Week 4 keeps its independent `AI_PROVIDER` setting, which defaults to fake. The API scripts load `.env` server-side with `--env-file-if-exists=.env`; the key is never sent to the browser. Missing Gemini configuration returns `provider_not_configured`, without falling back to fake.

For deterministic offline/testing use with both features fake, explicitly start the API with:

```bash
AI_PROVIDER=fake TACTICAL_AI_PROVIDER=fake npm run start:api
```

The browser sends only `{goal,state}` and cannot select a provider. Each Gemini Coach request creates a fresh adapter. Automated tests explicitly inject or select fake/stub providers and make no live Gemini request. Do not use the one-off Terminal harness for final browser acceptance: enter `Help me clear the center safely without relying on the portal.` in the game UI, verify the real plan/actions/evidence and no game mutation, and confirm gameplay and Week 4 Hint remain usable. Keep the earlier fake/manual recovery and Terminal live-probe evidence separately attributed.

1. Implement and run exact-key contract tests first. Invalid goal/state must produce zero provider and tool calls.
2. Implement browser snapshot derivation, server revalidation and local deterministic evaluator. Compare against the approved Hazard Arena constants and live game fields, without changing `src/game.js`.
3. Implement exactly the two allowlisted tools and a fake provider. The fake path uses no API key, no network and a controllable clock/sleeper. Keep the Week 4 provider unchanged; a separate Week 5 Gemini adapter will carry function proposals, validated tool results and structured final output.
4. Implement `NEED_SNAPSHOT → NEED_EVALUATION → NEED_FINAL`: each state accepts only its prescribed output, with no open-ended loop. Normal success is 3 logical steps/3 provider attempts/2 tools; one transient retry is 3 steps/4 attempts/2 tools. Each attempt is capped at `min(5000 ms, remaining 22000 ms deadline)`, and the absolute deadline includes backoff, tools and overhead. Validate final four choice fields against the accepted evaluator candidate and require one evidence reference from each actual tool result.
5. Add the separate Week 5 endpoint and UI, then run `npm test`, `npm run typecheck`, `npm run build`, Week 4 Hint regressions and Hazard Arena gameplay regressions. Record actual counts, revision and failures in a dedicated Week 5 eval document.
6. Only after fake/contract/security gates pass, review official provider docs and run a separately invoked, limited live-provider check with server-only credentials. Verify the deployed HTTP/proxy boundary exceeds the Coach deadline; the local Node API has no known shorter application timeout and the existing provider contract allows up to 30 s. Keep live checks outside `npm test`.
7. Elena + Isidora jointly review the two tools, three steps, authority, budgets, repeat and stop rules, fake results, no game mutation, UI and final manual demo. Record actual roles and observations rather than inferring them.

## Minimum fake-provider matrix

| Fixture | Required outcome |
| --- | --- |
| `NEED_SNAPSHOT` tool 1 → `NEED_EVALUATION` tool 2 → `NEED_FINAL` plan | Valid plan; exactly 3 logical steps, 3 provider attempts and 2 tools. |
| Invalid/oversized goal or inconsistent state | `invalid_input`; zero provider/tool calls. |
| Unknown or forbidden tool | Stop before execution with distinct safe code. |
| Malformed tool arguments / invalid tool result | Stop before execution / before forwarding respectively. |
| Provider timeout and unavailable | Bounded attempts, deadline and sanitized response. |
| Transient error then success | At most one global retry; exactly 3 logical steps, 4 provider attempts and 2 tools. |
| Malformed model/provider output | Stop; no raw output reaches UI. |
| Same action repeated / out-of-order action | `repeated_action` or state-specific stop; no extra execution. |
| Final before snapshot / before evaluation | `missing_required_evidence`. |
| Tool after evaluation | `step_limit` or `tool_call_limit`. |
| Invalid final fields, missing either source, invented fact, model success flag or mismatch on any of the four candidate choices | `invalid_final_output`; never success. |
| Step/tool/provider budget and total deadline | Each dedicated stop code, no additional calls. |
| Caller cancellation | `cancelled`; abort pending provider work. |
| Success and every failure path | Canonical game snapshot unchanged. |
| Existing Week 4 Hint and Hazard Arena suite | Remain green; no new Week 5 fields in Week 4 request. |

Keep expected fixture outputs in `docs/AGENT_EVALS.md` before the corresponding checks. Record fake, live and human evidence separately in `docs/EVIDENCE_W05.md`. The Week 5 UI should have a goal field and **Run Tactical Coach** control with bounded stages: “Analyzing arena…”, “Evaluating strategy…”, “Preparing tactical plan…”. Display only validated plan fields and server-materialized fact labels/values. Retain the distinct Week 4 **Ask AI for Hint** control.
