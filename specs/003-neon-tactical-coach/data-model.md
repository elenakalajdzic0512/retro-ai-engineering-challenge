# Data model: Neon Tactical Coach

All objects are plain, exact-key, runtime-validated values. The browser game object is never passed through by reference. Types below describe the design; `contracts/` defines the authoritative wire shapes.

| Entity | Fields and bounds | Owner / lifecycle |
| --- | --- | --- |
| TacticalRequest | `goal` (trimmed, 1–240 Unicode code points), `state` (TacticalSnapshot) | Browser sends one request to Week 5 endpoint; server validates before provider calls. |
| TacticalSnapshot | `snapshotVersion=1`; status ready/playing; score 0–390 in 10-point increments; lives 1–3; brick totals and zones; categorical ball, shield and portal state | Browser reports it; server validates, copies and freezes it for one run. Version identifies the schema only, not a unique event or server-observed board. |
| CandidateStrategy | Exact four enums: targetZone, style, paddleContact, route | One model proposal in step 2; never grants game authority. |
| StrategyEvaluation | Accepted flag/reason, target/armor counts, risk, directional/route/shield flags, deterministic evidence codes | Local evaluator computes once from validated snapshot/candidate; it does not replace the candidate's choice fields. |
| TacticalPlan | Summary, exact accepted candidate choices (`strategy` = candidate `style`), 1–3 actions, at least one `tactical_snapshot` and one `strategy_evaluation` evidence reference | Model proposes only in `NEED_FINAL`; application validates exact fields, lengths, candidate equality and both evidence sources before deciding success. |
| AgentRun | `NEED_SNAPSHOT → NEED_EVALUATION → NEED_FINAL`, provider attempts ≤4, tool calls ≤2, one retry budget, 22 s deadline, run-scoped repeated-action keys, two validated tool results, cancellation state | Private request scope only; no persistence and no exposure to browser. |

## Snapshot consistency rules

- `bricksRemaining = normalBricksRemaining + armoredBricksRemaining = sum(bricksByZone)`.
- `armoredBricksRemaining = sum(armoredByZone)` and every armored zone count ≤ corresponding brick-zone count.
- `normalBricksRemaining` ≤32, `armoredBricksRemaining` ≤8, `bricksRemaining` in 1–40 for a coachable state.
- `score = 10 × (40 - bricksRemaining)`, reflecting the completed arena's destruction-only scoring contract.
- `status` is `ready` or `playing`, `lives` is 1–3. Won/lost are rejected before provider use rather than pretending to plan unfinished targets.
- All counts are finite nonnegative integers; exact object keys, enums and version are required. The browser may report plausible but false values; the server cannot authenticate a local game state.

## Lifecycle and trust

`Browser game → bounded client-reported state → endpoint validation → immutable request context → snapshot tool → candidate validation → local evaluator → final validation → user plan`. Tools cannot access the mutable browser game. The application owns success/failure; no model `completed` field. No Week 4 request field, tool, provider contract or gameplay state is altered by this design.
