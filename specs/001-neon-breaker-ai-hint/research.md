# Phase 0 research: Neon Breaker AI Hint

**Decision date / documentation checked**: 2026-09-29. Read-only repository inspection and official-documentation research only; no Gemini generation, model probe, dependency install or live test. The skill's research-agent step was used for bounded official-provider documentation research, not an application multi-agent architecture.

## Provider and model

**Decision**: Google Gemini API, exact stable model identifier **`gemini-3.5-flash-lite`**, controlled exclusively by backend code. One real provider; no fallback.

**Rationale**: This is a small text-only advice task over four values. Google lists structured output support and describes this model as cost-effective, low latency and suited to high-throughput tasks. It is the user's selected lightweight, cost-conscious candidate instead of a larger reasoning model. Treat it as the smallest/cheapest candidate expected to meet this scenario, not a proven global cheapest model or verified quality claim. The four-status live check must establish suitability. [Official model reference](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite).

**Available cost information**: Standard paid text pricing checked on the decision date: USD **$0.30 per million input tokens**, **$2.50 per million output tokens** (including thinking tokens). Actual cost depends on usage; capture exposed usage/cost in live records and recheck prices before live evaluation. No cost incurred by model calls during planning. [Official pricing](https://ai.google.dev/gemini-api/docs/pricing).

**Alternatives considered**: Larger reasoning models add unjustified capacity/cost for a bounded short hint. Automatic fallback violates Core scope. Fake provider remains deterministic test infrastructure, never a replacement success on live failure.

## Official SDK and provider controls

**Decision**: Official Google GenAI JS/TS SDK `@google/genai`, `GoogleGenAI`, `models.generateContent`; test and lock the compatible version during implementation. Node 24.x is the project runtime choice. Use `systemInstruction`, `responseMimeType: application/json`, `responseJsonSchema`, one candidate, no tools/history. Set `httpOptions.retryOptions.attempts: 1` explicitly (one attempt, no SDK retries). Supply remaining-time `httpOptions.timeout` and `abortSignal` per generation.

**Rationale**: SDK-level retries otherwise undermine the shared two-call budget: official retry documentation reports a default of five attempts. Application orchestration must own retries and cancellation deadlines. Schema support guides generation but is not application validation. Client abort cannot guarantee remote compute/charging stops. [SDK](https://github.com/googleapis/js-genai), [generation config](https://googleapis.github.io/js-genai/release_docs/interfaces/types.GenerateContentConfig.html), [retry options](https://googleapis.github.io/js-genai/release_docs/interfaces/types.HttpRetryOptions.html), [HTTP timeout](https://googleapis.github.io/js-genai/release_docs/interfaces/types.HttpOptions.html).

**Alternatives considered**: Handwritten REST is unnecessary; legacy Google SDK is not selected. SDK-managed retry/backoff is incompatible with the exact assignment policy. Streaming complicates strict complete-output validation and is unnecessary for 240 code points.

## Failure classification

**Decision**: Translate provider errors inside the adapter into allowlisted internal classes. Known temporary service/network failures may retry once; local config, known authentication/configuration rejection, policy/refusal, invalid/incomplete output and unknown errors do not retry. Treat documented 408/429 and selected 5xx as transient only when the specific condition is known to be temporary; known exhausted quota/billing/configuration problems are non-retryable. Never inspect arbitrary message text as the sole retry signal. Unknown status/cause maps non-retryable UNAVAILABLE.

**Rationale**: Provider guidance identifies transient status families, but the feature's one-retry/250 ms policy controls. A local format check cannot prove an API key remains valid remotely. Only locally detectable missing/invalid configuration can guarantee zero calls. [Official troubleshooting](https://ai.google.dev/gemini-api/docs/troubleshooting).

**Alternatives considered**: Existing generic thrown-error → retryable unavailable behavior is too broad. Exponential/random backoff is superseded by the authoritative fixed policy.

## TypeScript migration and tests

**Decision**: Rename backend modules in place, compile strict NodeNext ESM with `tsc` to separate ignored `dist-server/`, test compiled backend using existing JavaScript `node:test` suites. Keep `.js` import specifiers in TS source and preserve `type: module`. Use compile-watch plus Node watch for development; explicit typecheck and build commands. Keep frontend JS.

**Rationale**: Smallest change to the existing zero-framework server and test runner. A separate emitted directory permits the same code to run under tests and normal Node execution, without another TS runtime dependency. NodeNext models native Node modules. [TypeScript module guidance](https://www.typescriptlang.org/tsconfig/module.html). Node supports backend-only env-file loading; no dotenv dependency is necessary for Node 24. [Node CLI](https://nodejs.org/api/cli.html#--env-file-if-existsfile).

**Alternatives considered**: A frontend TS rewrite, new backend framework, monorepo or new test runner adds unrelated migration risk. Direct TS execution alone would not replace static typechecking.

## Local browser/backend connection

**Decision**: Add a small `vite.config.js` proxy mapping `/api` to `http://127.0.0.1:3001`; use relative fetch. Set matching local preview proxy for built frontend checks. Load `.env` only in backend startup, and never expose the key through frontend config or `VITE_*`.

**Rationale**: Two existing local processes need only a proxy; no broad CORS or deployment configuration. [Vite proxy documentation](https://vite.dev/config/server-options.html#server-proxy).

**Alternatives considered**: Direct browser Gemini calls violate architecture/secrets. An absolute browser API URL plus CORS adds unnecessary local complexity.

## Existing tools and gameplay

**Decision**: Option B: omit tools from the final Hint execution path. Migrate the standalone read-only helper to TS and retain its isolated tests as historical applicable coverage. Remove Hint tool declarations/continuation and replace old integration expectations with rejection/no-execution coverage.

**Rationale**: The request already carries the snapshot. Reuse validation, fake scripting, injected clocks, HTTP server and safe-error patterns, but replace superseded contracts and timing. Keeping a disconnected small helper is low risk and preserves useful checks. `src/game.js` remains unchanged; lifecycle wiring belongs beside launch handling, not physics.

**Alternatives considered**: Keeping tool continuation adds call-budget cases without user benefit; deleting all prior backend/tests discards valuable work.

## Evidence and process

**Decision**: SpecKit artifacts carry the feature spec/prompt/provider contract. Add Week 4 evaluation/evidence documents later and append clearly labelled AI usage entries. Preserve Week 3 history. Record independent Elena completion and original Isidora contributions exactly as supplied/observed; do not invent later pair activity.

**Rationale**: The user's current instruction explicitly supersedes treating planned pair-review activity as performed. The constitution and FR-015 still contain pair requirements, so mark the process gate unmet rather than silently rewriting either authority. See plan's gate disposition.

**Alternatives considered**: Duplicate specification documents drift; declaring all constitutional gates passed would be false.

## Resolved questions and remaining validation risks

All technical design choices are resolved: exact provider/model, SDK, server layout/runtime, tests, contract formats, proxy, failure mapping and tool exclusion. Remaining empirical risks are account/model access, useful status-specific advice, real latency/cost and human pair participation. They are explicit future evaluation gates, not evidence from this planning session. If the chosen SDK version lacks a documented control at implementation time, resolve that compatibility problem with mocked transport verification before any live work; never silently relax the call budget or switch model.
