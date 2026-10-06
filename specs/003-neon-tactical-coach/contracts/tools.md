# Week 5 tool and evaluator contracts (design)

Core allowlist contains **exactly two** names. The application validates name, state-specific permission, exact arguments and result before execution/forwarding. Neither tool receives a mutable game reference. Each validated serialized tool result is ≤8192 UTF-8 bytes.

## 1. `get_tactical_snapshot`

Arguments: exact plain `{}`. Executable only in `NEED_SNAPSHOT`. Returns a fresh, frozen copy of the validated client-reported request `state` from `agent-api.md`; no raw brick array, arbitrary coordinates, secrets, provider internals or browser object reference. Server has no independent game-state authority. Result validation repeats exact shape, count consistency and byte bound. Repeat tracking is scoped to the current run, outside model-visible data.

## 2. `evaluate_tactical_strategy`

Arguments: exact plain object:

```json
{
  "targetZone": "right",
  "style": "safe",
  "paddleContact": "right",
  "route": "direct"
}
```

Each field is required. `targetZone` and `paddleContact`: `left|center|right`; `style`: `safe|balanced|aggressive`; `route`: `direct|portal`. Executable once, only in `NEED_EVALUATION` after a valid snapshot. Target selects a live brick zone; style selects the bounded risk rule; paddle contact represents left/center/right directional bounce; route selects direct travel or the fixed left/right portal pair. It receives the stored validated snapshot by application context, not through model arguments. No model/network/filesystem/shell/clock/random use.

Result exact fields:

| Field | Type / meaning |
| --- | --- |
| `candidateAccepted` | Boolean. |
| `rejectionReason` | `none|empty_target|portal_cooldown|portal_center_target`. |
| `targetOpportunity` | Integer: alive bricks in target zone. |
| `armoredTargets` | Integer: armored bricks in target zone. |
| `riskLevel` | `low|medium|high` from the fixed lives/style table. |
| `paddleAligned` | Boolean: chosen contact equals target zone; a directional cue only. |
| `shieldInTargetZone` | Boolean: shield center zone equals target zone; possible interference only. |
| `portalAvailable` | Boolean from portal state. |
| `routeUsable` | Boolean: direct always; portal only if available and target left/right. |
| `evidenceCodes` | Exact ordered list of seven codes: `target_count`, `armored_count`, `lives`, `paddle_alignment`, `shield_zone`, `portal_state`, `risk_rule`. |

Rejection precedence is `empty_target`, then `portal_cooldown`, then `portal_center_target`; otherwise `none`. Rejecting a candidate ends the run safely after the evaluation; it does not invite an extra proposal. A portal route is never claimed to guarantee reaching a brick. The fixed pair joins left/right arena sides, so center targeting via portal is rejected as an unsupported tactic. No percentages or exact future trajectory.

Risk table:

| Lives | safe | balanced | aggressive |
| --- | --- | --- | --- |
| 1 | high | high | high |
| 2 | low | medium | high |
| 3 | low | low | medium |

The evaluator never writes to game state or the snapshot. `candidateAccepted` is true exactly when reason is `none`. Its output is runtime-validated against a fresh deterministic recomputation before being sent to the model. It never adjusts the candidate's four choice fields: the accepted validated tool arguments are authoritative for the final plan. Risk and alignment are evidence, not replacement choices. Free-form strategy substitution is prohibited.
