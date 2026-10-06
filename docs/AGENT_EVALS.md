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

## 2026-10-06 — W05 Checkpoint 2: Tool Boundary + Scriptable Fake Provider

**Observed implementation**: The Core exposes exactly two fixed declarations, `get_tactical_snapshot` and `evaluate_tactical_strategy`. A request-scoped `TacticalToolContext` copies, validates and freezes the client-reported TacticalSnapshot. The snapshot tool returns a fresh validated copy; the evaluator tool accepts only the four CandidateStrategy fields and reads state from the context. The exact `{toolName, result}` union is runtime-validated, and each serialized result is limited to 8192 UTF-8 bytes without truncation. Unknown or forbidden names and invalid arguments fail before evaluator execution. Evaluation output is validated, compared field-for-field (including ordered evidence codes) with a fresh canonical deterministic recomputation, and rejected as `invalid_tool_result` on any mismatch.

**Fake-provider boundary**: Week 5 provider-neutral types cover tool proposals, final proposals and the three scripted transient failures. The zero-key, zero-network fake consumes copied scripted outcomes in order without deciding agent state, retry or final-plan validity. It records copied validated inputs, declarations and prior tool results; retained history is capped at 16 while total call count remains accurate. Exhaustion raises `FakeProviderExhaustedError` deterministically. A read-only boundary check observed 15/15, 16/16 and 17/16 total/retained calls.

**Review and test-first record**: The first Checkpoint 2 review found that schema-valid evaluation output was not compared with trusted recomputation. Two regression tests, added before the correction, produced **15 passed, 2 failed** with missing expected `invalid_tool_result` exceptions for wrong opportunity and risk values. The correction recomputes independently through the canonical evaluator and rejects mismatches rather than replacing the execution result. Earlier tests for the new tool and fake-provider modules were also written first; their initial failures were module-resolution errors, not separately observed failures for every assertion.

**Automated evidence**: The final focused suites passed **17 tactical tool tests** and **11 fake-provider primitive tests**. The final full `npm test` run reported **206 total, 206 passed, 0 failed, 0 skipped**. `npm run typecheck`, `npm run build` and `git diff --check` passed. Existing HTTP tests ran with permitted local-loopback access. These results are automated and do not claim a live-provider or manual Tactical Coach run. Checkpoint 1, Week 4 and Hazard Arena runtime files were unchanged.

**Pending**: The active three-state orchestrator, retry/deadline/call-budget enforcement, final evidence materialization, Gemini adapter, Tactical Coach endpoint and UI, and live-provider validation remain unimplemented or not run. No future scenario is marked PASS by this checkpoint.
