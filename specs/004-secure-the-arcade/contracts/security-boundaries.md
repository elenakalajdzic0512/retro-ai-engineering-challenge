# Security Boundary Contracts: Secure the Arcade

**Status**: Phase 1 design, not implemented. Existing Week 5 `POST /api/tactical-coach` request/plan/tool contracts remain authoritative; see `specs/003-neon-tactical-coach/contracts/` and `server/tactical/contracts.ts`.

## Public Tactical HTTP request

- Method/path: `POST /api/tactical-coach`, JSON body of at most 4096 UTF-8 bytes.
- Exact top-level fields: `goal`, `state`. Goal is nonblank and ≤240 Unicode code points after trimming. State is the existing exact, internally consistent, client-reported snapshot schema.
- Unknown fields, including `provider`, `maxSteps`, `ownerId`, `role`, `gameId`, `sessionId`, and `scenarioId`, are invalid. They do not select provider, security policy, identity, another resource, or a tool context.
- Invalid method/media/body/JSON/schema and any applicable origin/access check stop before provider creation/attempt or tool execution. Separate tests must observe zero attempts/executions and a valid boundary value.

## Admission response and run lifecycle

- After validation, one process may have at most **2 active Tactical runs** and admit at most **5 new valid runs per rolling 60 seconds**. Both limits use server-owned time/counters; rejected excess starts zero provider/tool work.
- Proposed safe public statuses: HTTP 429 for rate-window excess and HTTP 503 for active-capacity excess, with a fixed `{ "error": { "code": "...", "message": "..." } }` shape. Final status/code names should be selected with existing Tactical error taxonomy during implementation and tested without exposing internal counts, raw request, stack, or provider data.
- A completed, errored, timed-out, cancelled, or disconnected accepted run releases its active slot once. A later valid request succeeds when a slot is free and when the rate window permits it. A late provider value cannot turn an ended run into success.
- Existing successful HTTP response remains `{plan,evidence}` with application-materialized fact values. Existing Week 4 Hint endpoint/contract remains separate.

## Provider/tool/final boundaries

- Existing tool declarations stay exactly `get_tactical_snapshot` and `evaluate_tactical_strategy`. Each proposal must match current phase and exact argument schema. Prototype/inherited names (`constructor`, `toString`), unknown/forbidden names, cross-request context, repeat actions, and model-supplied authority fail before business execution.
- Only validated result envelopes with allowed fields/size and evaluator recomputation may enter the next model call. Extra synthetic-secret fields never pass through as raw data.
- The normalized provider outcome presented to orchestration has a local policy cap of **8192 serialized UTF-8 bytes**. The check occurs at the earliest application-controlled point before tool dispatch or final success. The installed SDK may already have received/parsed the network response; this contract does not assert a network-stream cap. Server-owned output-token configuration is a separate generation bound, not a byte substitute.
- Existing final plan validation still requires accepted-candidate match, bounded actions, references to both evidence sources, and ≤4096-byte final/success response. Natural-language content is rendered as text, never HTML/Markdown or active links.

## Security event contract (internal)

An event is an allowlisted metadata object. Proposed fields: `event` (`admitted|rejected|completed`), server timestamp, generated correlation ID, fixed reason code, fixed outcome, providerAttempts, executedToolCalls, and optionally bounded capacity counters. The representation and sink remain an implementation choice. It must be possible to observe rejection, completion, and useful admission decisions without raw payload logging.

No event may contain raw goal/prompt, game statistics or complete state, raw provider response, API/provider secret, cookie/bearer token, chain-of-thought, stack trace, or untrusted newline/fake-event content. T14 proves both sentinel exclusion and that one malicious string cannot manufacture an extra event. Correlation ID is not a user/session identity.

## Browser delivery contract

- Tactical result rendering is **text-only**: HTML is inert text or rejected, Markdown is not converted to active HTML, untrusted text is not linkified, and `javascript:` remains inert or rejected. Normal Serbian text, apostrophes, and `a < b` remain readable.
- The local production-built preview must deliver an active CSP and `X-Content-Type-Options: nosniff` plus a privacy-preserving `Referrer-Policy`. A candidate CSP based on audited assets is documented in `plan.md`; final directives must be verified with the built app.
- T16 must use a controlled script/resource that returns HTTP 200 and executes without the CSP restriction, then demonstrate a specific CSP directive blocks it in the production profile while normal game/Coach continue. Missing resource or wrong path is not evidence.
- The browser's relative `/api` request is same-origin through explicit local preview proxy. No broad CORS policy or authentication is added. If hosting topology or ambient credentials change, origin/CSRF applicability must be reassessed.
