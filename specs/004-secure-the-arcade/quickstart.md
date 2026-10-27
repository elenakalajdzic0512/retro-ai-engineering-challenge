# Validation Quickstart: Secure the Arcade

**Status**: Planned run guide. Commands below describe later validation after implementation/tasks; this planning step has not run W08 tests, dependency audit, browser checks, or live Gemini.

## Prerequisites and checkpoint

1. Record the W05 before checkpoint `e0ef30a1eddc9583a9894b79e10d53424d9f0b2a` and the actual W08 after checkpoint when one exists. Keep before/after fixtures and environment equivalent; do not introduce an intentionally vulnerable build.
2. Use the repository's supported Node/npm and locked dependencies. Baseline was Node v24.21.0/npm 11.19.0 with 287 passing Node tests. Any future browser harness dependency/binary must be added and documented in the implementation phase, not silently assumed here.
3. Use deterministic Tactical fake/stub provider and a synthetic sentinel only. Never set a real Gemini key for T00–T17. `TACTICAL_AI_PROVIDER=fake` is the existing offline mode for local API tests/demos.
4. Run commands from the repository root. If local sandbox policy blocks loopback listeners, use the approved local test environment and record that constraint; do not reinterpret an `EPERM` listener error as an application failure.

### T001 — confirmed W05 before checkpoint

These are **prior baseline observations**, confirmed before the Week 8 specification work. They are recorded here for later transfer to `EVIDENCE_W08.md`; T001 does not rerun the checks or claim any Week 8 after result.

| Baseline item | Confirmed before observation |
| --- | --- |
| Repository / Week 8 branch | `retro-ai-engineering-challenge` / `week8/secure-the-arcade` |
| W05 before/security baseline commit | `e0ef30a1eddc9583a9894b79e10d53424d9f0b2a` |
| Baseline remote and working tree | `origin/main` matched that SHA when checked; working tree was clean before Week 8 specification work |
| Node / npm | `v24.21.0` / `11.19.0` |
| `npm run typecheck` | PASS |
| `npm test` | PASS — 287 passed, 0 failed, 0 skipped |
| `npm run build` | PASS — client build |
| `npm run build:server` | PASS — server build |

The first `npm test` attempt in the Codex sandbox encountered `EPERM` because it could not open a local `127.0.0.1` listener. The same command then passed after approved execution outside that sandbox restriction. This was an environment limitation, not an application test failure. At T001 start, `git branch --show-current` returned `week8/secure-the-arcade`, `git status --short` was empty, and the W05 baseline SHA was verified as an ancestor of the current planning commit. No T00–T17 scenario or Week 8 after check is marked as executed or passing here.

## Existing baseline commands

```sh
npm run typecheck
npm test
npm run build
npm run build:server
```

After changes, record exit codes and passed/failed/skipped counts. Preserve normal W05 Tactical, Week 4 Hint, and gameplay tests. These commands existed at planning time; W08 additions will enter the existing suite or clearly named new scripts in a later tasks/implementation phase.

## Planned direct HTTP and agent verification

- Use `tests/tactical-api.test.js` and focused Tactical contract/tool/orchestrator/provider tests for T00–T03 and T06–T15/T17. Inject fake providers, fake time, and event sink as appropriate; count provider attempts, authorized/forbidden tool executions, active slots, and admission timestamps.
- T01 separates invalid JSON, wrong type, domain-invalid value, and a valid boundary value. T02 separates body-size rejection from each privilege field. T03 uses arbitrary selector rejection and a schema-valid wrong-context tool case without pretending the system has authenticated resources.
- T11 separates repeated-action and total budget exhaustion. T12 separates per-call timeout, aggregate deadline, late result, and slot release. T13 has separate concurrency and rolling-rate scenarios plus both recovery cases.
- T14 uses one synthetic secret in an internal failure/extra tool field and a separate newline/fake-event string; inspect fixed HTTP responses, next provider call, event records, and browser artifacts. T17 combines forged-valid snapshot, malicious goal reaching fake provider, forbidden proposal, zero forbidden execution, unchanged canonical game, and minimal event.
- No real provider call is needed. A fake-provider result proves application execution policy, not general real-Gemini prompt-injection resistance.

## Planned local production browser profile

After Vite preview proxy/headers and the minimal browser harness are implemented:

1. Build the client/server using the commands above. Run the loopback API with explicit fake Tactical mode and run Vite production preview on a documented loopback port. Check that `/api/tactical-coach` is reached via the preview origin, rather than assuming the development proxy also applies to preview.
2. Use the future browser-test command documented in the implementation PR/task output. T04/T05 assert actual DOM content, no script-execution marker, no active untrusted link, and preserved Serbian letters/apostrophe/`a < b`.
3. For T16 inspect delivered CSP, `X-Content-Type-Options`, and `Referrer-Policy`. Serve a controlled script from a second loopback origin; prove it returns 200 and executes on a no-CSP control page, then prove the production page records a `script-src` CSP violation and leaves the marker unset. A 404 or inaccessible URL is invalid evidence.
4. Verify game play and valid fake Tactical Coach still work under the same production browser profile. Inspect build artifacts and source maps, if present, for a synthetic server-only sentinel.

No browser-test command or dependency is claimed to exist yet. The plan proposes a small Playwright dev-only harness because the existing DOM stub cannot prove browser CSP behavior; later tasks must define the exact script and installation/binary steps.

## Planned dependency audit

Record `package-lock.json` checkpoint and run a supported read-only audit command, for example:

```sh
npm audit --package-lock-only --json
npm audit --package-lock-only --omit=dev --json
```

Classify runtime and dev advisories separately. For each relevant item record package, actual locked/installed version, advisory, project exposure, decision (`fixed`, `mitigated`, `demonstrated not applicable`, or `open risk`), and residual risk. If audit cannot reach registry, record the exact obstacle and unresolved uncertainty. Do not run `npm audit fix --force` as an automatic step. After any approved dependency change, repeat relevant tests/build/browser checks. A zero-advisory result does not prove application logic secure.

## Evidence and review exit criteria

Populate `EVIDENCE_W08.md` later with six risk cases, official T00–T17 results, three same-fixture pre/post comparisons, commands/checkpoints, actual counts/headers/DOM observations, and residual limitations. Clearly distinguish planned, executed, observed, and inferred statements. Elena and Isidora cross-review each other's protection and negative tests, record actual work rather than planned ownership, and complete a final local demo only after these gates pass.
