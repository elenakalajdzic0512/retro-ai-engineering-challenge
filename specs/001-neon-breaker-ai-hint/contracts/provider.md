# AI Hint provider contract and fixed instructions

**Selected**: 2026-09-29. **Provider**: Google Gemini API. **Model**: `gemini-3.5-flash-lite`. See [research](../research.md) for official references, structured-output suitability and dated cost rationale.

## Boundary

Browser → our TypeScript HTTP API → provider-neutral orchestrator → server-only Gemini adapter → model. Input is only the validated four-field snapshot plus the fixed application instructions below. Output is raw structured JSON text that must pass [AiHintResponse runtime validation](api.md) before success. No provider metadata is returned to the browser.

Server configuration reads `GEMINI_API_KEY` from backend environment. Local `.env` is untracked; committed `.env.example` contains only `GEMINI_API_KEY=` and a newline. Backend selects Gemini and the exact model; browser input cannot set provider/model/tool/instructions/security/retry/timeout. An explicit backend-only `AI_PROVIDER=fake` process setting may select deterministic local evaluation; default is Gemini and unknown mode is NOT_CONFIGURED. Fake mode is never entered in response to a Gemini failure. Tests inject providers and do not read `.env`.

**Timeout**: 10,000 ms shared provider deadline, including all attempts, waiting and validation. **Retry**: one transient-only retry maximum, fixed 250 ms backoff, ≥1,250 ms before waiting and ≥1,000 ms before retry. **Fallback**: none for Week 4 Core. **User-facing failure**: the fixed application code/message table in the API contract. **Validation**: application runtime validation remains mandatory regardless of provider schema guarantees.

## Planned adapter responsibilities

- Import `@google/genai` only under `server/`; pass the backend key explicitly. One `models.generateContent` call per orchestration attempt, one candidate, non-streaming, no tools/history/grounding.
- Send the exact validated snapshot serialized as user content and fixed application-owned `systemInstruction`. Provider request schema/settings are server constants, never browser data. Keep API key in SDK authentication configuration, not prompt content.
- Request `responseMimeType: application/json` with `responseJsonSchema` defining object, required `hint`/`category`, string hint, category enum and `additionalProperties: false`. Use the SDK-supported schema subset; byte/code-point constraints remain application checks. Do not specify competing `responseSchema` at the same time.
- Set SDK `httpOptions.retryOptions.attempts: 1`; application owns all retry calls. Set per-call HTTP timeout to current remaining allowance, forward AbortSignal, and keep independent orchestrator deadline checks. A conservative server-owned output token ceiling (initially 512) bounds generation effort; it is not a replacement for the 2,048-byte cap. Token exhaustion/incomplete output is INVALID_OUTPUT, never repaired/retried into success.
- Inspect the SDK envelope for refusal/policy blocks before accepting text; refusal wins even if text resembles valid JSON. Require one complete normal textual candidate. Reject missing, non-text, unexpected function/tool content, abnormal/incomplete termination and truncated output. No fragment extraction or concatenation that reconstructs a partial candidate into success.
- Pass the candidate's raw structured text to application byte/JSON/exact-field validation. Model-specific envelopes and internal metadata stay private. Output validation and final deadline check occur before returning a fresh `{hint, category}`.
- Map known provider/network conditions to explicitly transient failures, known auth/config to non-retryable configuration, policy to refusal, malformed output to invalid output, and unknown exceptions to non-retryable unavailable. Never forward raw SDK errors, stack, private payloads or telemetry, and do not log them by default.
- Stub-SDK tests verify model, instructions, schema, exact snapshot, no tools, timeout/signal propagation, SDK retry disabling and actual transport count. Abort is best effort: stopping client waiting does not prove remote computation stopped or cost is zero.

Provider-neutral internal result shape may carry raw JSON text or a typed failure; it must not couple the orchestrator to Gemini classes/status envelopes. Rename existing functions only where needed for the final Hint semantics.

## Fixed application-owned instruction text

This is the planned source text for `server/ai/prompt.ts`; keep this contract and implementation aligned when changing it. Browser supplies no free-text question or system instruction.

> You give brief English Neon Breaker gameplay advice. Use only the supplied status, score, lives and bricksRemaining values and the fixed rules below. The snapshot describes the game when the player requested advice, not the continuously changing game.
>
> Neon Breaker uses a horizontally moving paddle. Left/Right arrows or A/D move it. Space launches the ball or starts a fresh game after a win or loss. A missed ball costs one life; if lives remain the game returns to ready and progress is preserved. The default game starts with 3 lives and 40 bricks; each destroyed brick scores 10 points. Clearing every brick wins; losing all lives loses. Ready may occur after a lost life and does not imply a fresh game.
>
> Give one concise actionable focus suited to the supplied status: preparation or relaunch advice for ready, a useful general playing focus for playing, or a future-round focus for won/lost. Do not claim unseen ball, paddle or brick positions. Do not predict exact trajectories, invent game details, or promise outcomes. Do not infer that a ready snapshot has zero score or a full grid.
>
> Return only one JSON object matching AiHintResponse: exactly a nonempty hint string of at most 240 Unicode code points and a category of movement, timing, strategy or general. No extra fields, Markdown, code fences, commentary, tools or conversation. Keep the advice brief and useful.

## Limited live validation contract

Not executed during planning. After deterministic matrix, full regression suite, TypeScript typecheck, frontend production build, backend build and security checks are green, separately invoke at most **four deliberate live hint requests**, one for each status. Human reviewer gate status must be recorded accurately under the process limitation in the plan. No automatic live suite or large loop.

Use ready `{status: ready, score: 0, lives: 3, bricksRemaining: 40}`, playing `{status: playing, score: 120, lives: 2, bricksRemaining: 28}`, won `{status: won, score: 400, lives: 2, bricksRemaining: 0}`, lost `{status: lost, score: 120, lives: 0, bricksRemaining: 28}` as non-secret fixtures (serialize as proper JSON when sent).

Before each request record expected valid/brief/status-relevant advice. After it record actual public response, model/provider, snapshot, contract validity, usefulness and status relevance, measured latency, success/failure, limitation, and tokens/cost if tooling exposes them (otherwise unavailable, not zero). Keep usage metadata private to sanitized evidence, never add it to public API responses. Count actual underlying provider calls too: normal retry policy can yield up to eight calls for four deliberate interactions, but never initiate additional deliberate requests automatically. No subsequent round without documented reason and the same gates/four-request cap. All four successes and advice criteria are required to claim technical live readiness; any failure blocks that claim. Missing pair participation separately blocks full assignment compliance.
