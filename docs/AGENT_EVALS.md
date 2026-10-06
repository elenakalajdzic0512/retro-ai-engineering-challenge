# Week 5 Tactical Coach — observed evaluations

## 2026-10-06 — W05 Deterministic Core (Checkpoint 1)

**Scope implemented**: Separate Tactical Coach runtime contracts/validators, client-side tactical snapshot derivation, deterministic local strategy evaluator, and focused tests. No Tactical Coach tools, fake provider, agent orchestration, Gemini adapter, HTTP endpoint or UI exists yet; no live provider was tested.

**Automated evidence**: 23 new contract tests, 10 snapshot tests and 12 evaluator tests passed. The final full `npm test` rerun reported **178 total, 178 passed, 0 failed, 0 skipped**. `npm run typecheck`, `npm run build` and `git diff --check` passed. The existing HTTP tests required permitted local-loopback access after a sandboxed attempt failed with `listen EPERM`; the permitted rerun was green. These are automated results, not a live-provider or manual gameplay acceptance result.

**Verified fixtures and invariants**:

- Fresh brick centers per column are 85, 175, 265, 355, 445, 535, 625 and 715. Alive brick zoning is **15 / 10 / 15** (left/center/right); armored zoning is **4 / 0 / 4**. The fresh game has 32 normal and 8 armored bricks, right/up ball direction, center/right shield state and an available portal.
- Only alive bricks count; a damaged, alive armored brick remains armored. Exact arena-third boundaries belong to center. Snapshot derivation returns independent data and does not mutate the game.
- Risk by safe/balanced/aggressive style is **high/high/high** at one life, **low/medium/high** at two lives, and **low/low/medium** at three lives. Rejection precedence is **empty_target → portal_cooldown → portal_center_target → none**, including overlapping cases.
- Final-plan foundation rejects mismatches on each of targetZone, strategy/style, paddleContact and route; it requires both evidence sources and rejects model-authored success fields. References are checked against allowed fact names here; matching them to the actual two tool results remains later orchestration work.
- Week 4 contracts/provider/endpoint and Hazard Arena gameplay files were unchanged; the full existing regression suite passed.

**Test-first record**: Tests were authored before their corresponding new modules. Initial focused failures were module-resolution failures because the modules did not yet exist; this is not proof that every individual behavioral assertion was observed failing before implementation.

**Pending**: Tool allowlist/execution, fake-provider fixtures, bounded agent state machine, provider integration, API/UI, cross-result evidence materialization, raw HTTP/provider byte boundaries, limited live-provider validation and manual acceptance have not been evaluated as PASS.
