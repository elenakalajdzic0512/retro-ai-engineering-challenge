# Week 5 final tactical plan contract (design)

The model's step-3 output is one JSON object, ≤4096 UTF-8 bytes, with **exactly** these keys:

```json
{
  "summary": "Protect the last life while clearing the right side.",
  "strategy": "safe",
  "targetZone": "right",
  "paddleContact": "right",
  "route": "direct",
  "actions": ["Aim with the right paddle third when a controlled bounce is available."],
  "evidence": [
    {"source": "tactical_snapshot", "fact": "bricksByZone.right"},
    {"source": "strategy_evaluation", "fact": "riskLevel"}
  ]
}
```

- `summary`: trimmed 1–240 Unicode code points.
- `strategy`: `safe|balanced|aggressive`; `targetZone`, `paddleContact`: `left|center|right`; `route`: `direct|portal`. The application retains the accepted, validated `evaluate_tactical_strategy` arguments. Final `targetZone`, `strategy`, `paddleContact` and `route` must respectively equal candidate `targetZone`, `style`, `paddleContact` and `route`; the evaluator does not normalize or replace these choices.
- `actions`: 1–3 nonempty strings, each ≤160 Unicode code points; no hidden tool call or command field.
- `evidence`: 2–6 unique exact `{source,fact}` references, with at least one `tactical_snapshot` fact **and** at least one `strategy_evaluation` fact. Snapshot facts are `lives`, `bricksRemaining`, `bricksByZone.left|center|right`, `armoredByZone.left|center|right`, `ballDirection.horizontal`, `ballDirection.vertical`, `shield.zone`, `shield.direction`, `portalState`. Evaluation facts are `targetOpportunity`, `armoredTargets`, `riskLevel`, `paddleAligned`, `shieldInTargetZone`, `portalAvailable`, `routeUsable`.
- The server rejects any fact absent from the two validated tool results, duplicate reference, extra field, non-plain object, string coercion or candidate mismatch. It materializes each cited value from evidence, so the model cannot invent values in user-visible citations. The plan cannot be accepted before both required tools succeed and the candidate is accepted.
- The model may refine only `summary`, action wording and its choice of valid evidence references; it cannot author fact values or switch to an unevaluated candidate. Natural-language summary/actions are advice, not exact physics predictions. `confidence` is intentionally omitted because a deterministic score is not calibrated confidence. There is no model-authored `completed` or success field: application orchestration alone decides success. Raw provider metadata and chain-of-thought are never present.
