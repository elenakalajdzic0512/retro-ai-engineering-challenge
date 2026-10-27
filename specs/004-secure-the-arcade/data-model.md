# Data Model: Secure the Arcade

**Scope**: Security state around an existing request-scoped Tactical Coach run. This is not a persisted game database or an authentication model. Existing game/request/tool/final schemas remain defined by `server/tactical/contracts.ts` and the Week 5 contracts.

## Existing functional entities (preserved)

| Entity | Fields / owner | Validation and relationship |
| --- | --- | --- |
| Tactical request | Exact `goal`, `state`; browser supplied | `goal` 1–240 Unicode code points. `state` is a validated but unverified client-reported snapshot. No provider/model/role/owner/resource selector. |
| Tactical snapshot | Version, ready/playing status, score/lives/bricks/zone counts, ball direction, shield, portal; browser derived | Exact fields and bounded count equations in `parseTacticalSnapshot`; copied/frozen into one request context. It proves internal consistency, not actual play. |
| Provider outcome | Tool proposal, final output, or fixed failure; fake/Gemini | Untrusted until outcome shape/size and phase are checked. W08 cap: normalized serialized output ≤8192 UTF-8 bytes before tool dispatch/final success. |
| Tool action | Name and exact args from model | Only snapshot/evaluator, correct phase, exact own fields, one request context. No arbitrary URL/file/shell/game mutation. |
| Tool result | Snapshot or deterministic evaluation | Exact envelope/shape, ≤8192 bytes, evaluator recomputed; only validated result may enter next provider context. |
| Final plan/evidence | Model plan references; application values | Plan matches accepted candidate; bounded final/success body ≤4096 bytes; app materializes evidence values from validated tool results. Browser renders text-only. |

## W08 server admission state

**Owner**: one `createApiServer` instance, not a browser or client-supplied identity. No disk persistence.

| Field | Meaning | Rule |
| --- | --- | --- |
| `activeRuns` | Number of accepted Tactical runs not yet completed/released | Integer 0–2; increment before provider creation, decrement exactly once in `finally`. |
| `admittedAt` | Server-clock timestamps for newly admitted runs in rolling window | Retain only timestamps within last 60 s; at most five accepted entries in that window. Invalid/rejected requests do not count as admitted. |
| `now` | Server-controlled time source | Monotonic or suitable clock for admission; injected fake clock in deterministic tests. Never read from request body. |
| `correlationId` | Generated opaque request/event join key | Bounded application-generated value; not authentication or client-provided authority. |
| `decision` | `admitted` or fixed rejection reason | Made after input validation and before provider/tool work; safe public response for excess. |

### Admission transitions

```text
UNVALIDATED --invalid--> REJECTED (0 provider, 0 tool)
UNVALIDATED --valid--> ELIGIBLE
ELIGIBLE --rate/active full--> REJECTED (0 provider, 0 tool)
ELIGIBLE --capacity available--> ADMITTED (activeRuns +1, timestamp recorded)
ADMITTED --success/error/timeout/cancel/disconnect--> COMPLETED (activeRuns -1 once)
```

A provider result arriving after completion cannot re-enter ADMITTED or produce a second completion. Rate-window expiry removes old timestamps on a later check; it does not resurrect a rejected request. The 2/5 policy is local one-process protection, not a distributed quota.

## W08 security event

**Proposed allowlisted metadata**, subject to final task-level design: event category (`admitted`, `rejected`, `completed`), timestamp, application-generated correlation ID, fixed reason code, fixed outcome, provider attempt count, executed tool call count. Numeric active/admitted counts may be included if bounded. Events are not a player/game ledger.

**Forbidden contents**: raw goal/prompt, score/lives/bricks or complete state, raw provider response, key/token/cookie, chain-of-thought, stack trace, untrusted newline text. A log-injection fixture must not create an additional event or change an event category. Synthetic secret sentinel exists only in test configuration and must not cross into events, model context, HTTP, or browser artifacts.

## Evidence case

Each later case records `riskId`, entry point, trust boundary, expected behavior, exact command/fixture, before/after checkpoint, observed counts/status/DOM/header result, conclusion, and residual limitation. The evidence labels **planned**, **executed**, **observed**, and **inferred** separately. At least three cases reuse equivalent before/after inputs; no deliberately vulnerable implementation is introduced.

## Non-entities

There is no W08 user account, owner authorization row, persisted game resource, private session, leaderboard, or server-authoritative match record. `gameId`, `sessionId`, and `scenarioId` are forbidden extra selectors in this local/demo request contract; they are not keys into an invented store.
