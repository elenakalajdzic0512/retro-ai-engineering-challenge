# AI Hint data model

Authority: [spec.md](spec.md); exact wire rules: [contracts/api.md](contracts/api.md).

## GameSnapshot / AiHintRequest

A request-scoped immutable copy with exactly `status`, `score`, `lives`, `bricksRemaining`. Status is ready/playing/won/lost; score is finite 0–400 (fractions allowed), lives integer 0–3, bricksRemaining integer 0–40. No wrapper, defaults, coercion or cross-field consistency rule. `ready` can follow a lost life. A valid zero boundary is accepted independently of other fields. API input begins as `unknown` and is narrowed only by runtime validation; raw HTTP bytes are checked separately.

One UI activation captures one snapshot. The backend constructs a fresh validated copy; the same values are used across retry attempts. No ball/paddle coordinates, brick layout, velocity, identity, question, provider settings or history are attached. No persistence or database entity.

## AiHintResponse

Exactly `hint: string` and `category: movement | timing | strategy | general`. Trim only surrounding hint whitespace; count Unicode code points after trimming, 1–240 inclusive. Validate raw JSON payload bytes before parsing (≤2,048 UTF-8 bytes). No normalization of category, extraction from prose, truncation or repair. A response belongs to one captured snapshot, not the changing live game state. No provider metadata reaches the application response.

## PublicHintFailure

Exactly one fixed `code` and matching application-owned `message`, as specified in the API contract. No success fields. Distinct from internal exceptions/provider failures; internal errors are never serialized. Transport and UI deadline failures use the same safe message table.

## Provider boundary

Internal invocation: validated snapshot, fixed operation/instructions, remaining deadline and AbortSignal supplied by server code only. Success carries raw structured JSON text for application validation. Failure is a discriminated internal class: transient unavailability, transient attempt timeout, non-retryable unavailable/unknown, configuration, refusal or invalid output. Retryability is explicitly established by the adapter, not inferred from arbitrary thrown exception names/text. Public failure codes need not expose these internal distinctions.

No tool result or tool continuation is an accepted Hint outcome. Unexpected tools are INVALID_OUTPUT. The isolated historical helper still accepts empty arguments and returns a copy of the exact validated snapshot; it has no path from Hint execution.

## Interaction lifecycle

UI state: `idle → loading → success | failure`; settled states allow another deliberate request. Activation clears previous content and allocates `{requestToken, roundGeneration, snapshot, controller, deadline}`, where `deadline` is absolute monotonic activation time plus 12,000 ms. Before publishing success, including after body parsing, require current monotonic time strictly less than that deadline; at or after it, settle the still-current request as fixed TIMEOUT even if the watchdog callback has not run. Token/generation guards also apply to this timeout settlement so obsolete handlers cannot overwrite newer state. Duplicate activation during loading does nothing. Clear/reset increments generation/token, aborts pending work, clears timers/content and returns idle. Only current token and generation may update any state, including final cleanup. Stale success, failure or finally handlers are ignored. A new round clears existing result/error even if no request is pending.

Game states remain owned by `src/game.js`: ready → playing, playing → ready after nonfinal life loss, playing → won/lost, terminal launch → fresh playing round. Hint state never mutates these. Initial launch and fresh terminal restart invalidate obsolete hints; relaunch after life loss is within the same round. A completed hint is labelled as advice for the captured moment.

Backend lifecycle: invalid input → zero-call INVALID_INPUT; valid input plus locally invalid/missing configuration → zero-call NOT_CONFIGURED; otherwise start deadline → call → validate or classify → eligible guarded backoff/retry → validate or safe failure. Attempt count is 0–2, monotonic, never reset; deadline is shared and never extended. Terminal results cannot be replaced by late work.

## EvaluationRecord

Fields: scenario/acceptance ID, expectation captured before execution, command/test, relevant revision and working-tree status, fake/live classification, non-secret configuration/snapshot, actual observation, PASS/FAIL or NOT RUN, call count/latency as relevant, known limitation and evaluator identity. Live records additionally contain exact provider/model, response, contract validity, usefulness/status relevance and exposed cost/token information (or unavailable). Planned records are not evidence of completed execution. Actual contribution/review records identify the person and performed action without inventing role swaps.
