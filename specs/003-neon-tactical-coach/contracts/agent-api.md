# Week 5 Tactical Coach API contract (design)

This is a **new** endpoint. The existing Week 4 `/api/ai` request `{status,score,lives,bricksRemaining}` and response `{hint,category}` remain unchanged.

## Request

`POST /api/tactical-coach`, `Content-Type: application/json`, body ≤4096 UTF-8 bytes. Exact top-level keys: `goal`, `state`. No provider/model selector, prompt override, tool list or arbitrary game object.

```json
{
  "goal": "Help me clear the right side while preserving my last life.",
  "state": {
    "snapshotVersion": 1,
    "status": "playing",
    "score": 100,
    "lives": 1,
    "bricksRemaining": 30,
    "normalBricksRemaining": 24,
    "armoredBricksRemaining": 6,
    "bricksByZone": {"left": 8, "center": 10, "right": 12},
    "armoredByZone": {"left": 2, "center": 2, "right": 2},
    "ballDirection": {"horizontal": "right", "vertical": "up"},
    "shield": {"zone": "center", "direction": "left"},
    "portalState": "available"
  }
}
```

The example obeys `score=10×(40-bricksRemaining)` and all sum constraints. Goal is trimmed and 1–240 Unicode code points. State validation follows `data-model.md`; exact keys and plain data objects only, no coercion. `snapshotVersion: 1` is the only version field and identifies the schema, not a replay nonce. Reject malformed JSON, unsupported media type and excess bytes before provider use. Ready/playing with remaining bricks are coachable; won/lost are safely rejected. The browser derives the state from the current local game, but the server only proves bounded internal consistency, not physical truth.

## Success

HTTP 200 with exact `{plan, evidence}` only after the application validates the accepted evaluation and final result. `plan` is the validated final contract in `final-plan.md`. The model authors only exact `{source, fact}` evidence references; the application validates each reference, looks up the fact in the corresponding validated tool result, and returns a server-materialized `evidence` list of exact `{source, fact, value}` items, including at least one `tactical_snapshot` and one `strategy_evaluation` item. `value` retains its source type and is only a string, finite integer, or boolean; for example, `lives` is `1`, `portalState` is `"available"`, and `portalAvailable` is `true`. Null, arrays, objects, fractional or nonfinite numbers, undefined, and model-authored values are not allowed. The UI displays only validated plan and fact values. Combined success body ≤4096 UTF-8 bytes. No model-authored success/completed flag, hidden provider, raw tool result, prompt, stack, key or chain-of-thought is returned.

## Failure

Exact shape `{ "error": { "code": "invalid_input", "message": "Tactical request is invalid." } }`. `code` is from the taxonomy in `../plan.md`; `message` comes from a fixed public map. Proposed HTTP mapping: input/media/size 400/415/413; cancelled 499 if supported by server transport (otherwise close without body); provider unavailable/rate limited 503/429; provider, tool and deadline timeouts 504; malformed/forbidden/model-proposal, missing-evidence, evaluation and final-contract stops 502. Never return raw provider exceptions or tool arguments. Error responses do not mutate the game.

The current local Node API has no known application request boundary shorter than the Coach's proposed 22 s total deadline; the existing provider request contract accepts timeout values up to 30 s. The deployed HTTP/proxy boundary remains unverified and must exceed the final Coach deadline before live use.
