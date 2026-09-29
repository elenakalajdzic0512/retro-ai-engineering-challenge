# POST /api/ai contract

Authority: [feature specification](../spec.md). This replaces the old question/snapshot → answer contract; there is no compatibility acceptance path.

## Request

`POST /api/ai`, media type `application/json` (optional UTF-8 charset), one JSON object only. Maximum **1,024 UTF-8 bytes of received body**, including whitespace; reject oversize while consuming the stream without buffering beyond the cap. Content-Length may be an early check but actual byte counting is mandatory, including chunked requests. Reject unsupported body encodings; do not inflate a body past the limit.

```json
{"status":"playing","score":120,"lives":2,"bricksRemaining":28}
```

| Field | Required runtime constraint |
| --- | --- |
| status | string: ready, playing, won or lost |
| score | finite number, 0 ≤ value ≤ 400 |
| lives | integer, 0 ≤ value ≤ 3 |
| bricksRemaining | integer, 0 ≤ value ≤ 40 |

Require exactly these own fields; reject malformed JSON, null, arrays, missing/extra fields, wrong primitive types, numeric strings, non-finite/out-of-range values. Fractional score is valid. Fractional lives/bricks are invalid. No cross-field rule. Reject old `question`/`snapshot` wrapper and all provider/model/tool/timeout/retry/security fields. Local runtime validation precedes provider factory invocation and any SDK generation. Every invalid input fixture must assert `providerCallCount === 0`.

## Success

HTTP 200 with `Content-Type: application/json; charset=utf-8` and exactly:

```json
{"hint":"Focus on keeping the ball in play while you clear the remaining bricks.","category":"strategy"}
```

Provider-generated JSON text is limited to **2,048 UTF-8 bytes before parsing**. Parse the entire text as JSON, not a recovered fragment or fenced block. Object has exactly `hint` and `category`; hint must be string, nonempty after surrounding whitespace trim, at most 240 Unicode code points after trim. Category is exactly movement/timing/strategy/general. Do not coerce, truncate, repair, default, or remove extra fields. Refusal takes precedence over accompanying hint-like text. No private envelope, diagnostics, provider/model identifiers or tool traces. Backend constructs a fresh object from validated fields; frontend renders plain text.

## Failures

Body has exactly top-level `code` and `message`; never `{error: ...}`, `hint` or `category`. HTTP status distinguishes protocol outcomes but the logical codes/messages are stable.

| Condition | HTTP | code | message |
| --- | --- | --- | --- |
| JSON/schema invalid | 400 | INVALID_INPUT | Cannot request a hint for this game state. |
| Body over 1,024 bytes | 413 | INVALID_INPUT | Cannot request a hint for this game state. |
| Wrong media type/unsupported encoding | 415 | INVALID_INPUT | Cannot request a hint for this game state. |
| Unavailable/unknown failure | 503 | UNAVAILABLE | AI hint is unavailable. Please try again later. |
| Deadline/final timeout | 504 | TIMEOUT | AI hint took too long. Please try again. |
| Invalid provider output/tool proposal | 502 | INVALID_OUTPUT | AI hint could not be read. Please try again later. |
| Missing/locally invalid configuration | 503 | NOT_CONFIGURED | AI hints are not available right now. |
| Refusal/policy | 422 | REFUSED | AI could not provide a hint for this request. |

Unknown routes/methods remain HTTP 404/405 (`Allow: POST` for method rejection), with a safe top-level INVALID_INPUT body and zero calls; these are protocol failures outside the successful Hint interaction. Never serialize thrown errors or interpolate their messages. A server-detected unavailable condition uses UNAVAILABLE, including unexpected exceptions. Frontend validates known code/message pairs and uses its own fixed messages; malformed/non-JSON backend responses and transport errors produce UNAVAILABLE. The UI's 12s deadline produces TIMEOUT.

Missing or structurally invalid configuration is detectable locally and requires zero calls. A syntactically plausible revoked key can only be discovered remotely; provider authentication/configuration rejection maps NOT_CONFIGURED without retry, but that observed call must not be misreported as zero.

## Reliability and isolation

10,000 ms shared provider deadline starts immediately before call one and covers calls, backoff and output validation. Maximum two actual calls. Explicit transient failure only: fixed 250 ms backoff, ≥1,250 ms required before backoff and ≥1,000 ms required before retry. No retry for invalid input/output, configuration, refusal, unknown failure or expired deadline. Recheck time after validation; reject late success. Two transient unavailability failures yield UNAVAILABLE unless total time expires; last attempt timeout yields TIMEOUT. Insufficient remaining time returns the last applicable failure, with TIMEOUT on total expiration.

Request/round IDs are local frontend state and are not added to the public four-field body. Abort/reset and token checks prevent stale results. No automatic calls, concurrent UI requests, live fallback, or tool execution.
