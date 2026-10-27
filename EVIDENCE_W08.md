# Secure the Arcade — Week 8 evidence

## Scope and execution record

Wave C started on `week8/secure-the-arcade` at `e41f8ca85dcb8b51e873a87b6c5deb114ff9215e` on 2026-10-27 (Europe/Budapest). The immutable W05 comparison baseline is `e0ef30a1eddc9583a9894b79e10d53424d9f0b2a`. Elena's pushed Wave A handoff is `caf46ef6cf198ff31e659d939f96ca0a00638357`; the starting Wave C revision is also the pushed Wave B handoff. Codex executes the technical work on Isidora's behalf. The user confirmed that Elena's reciprocal review and the joint eight-minute rehearsal have **not** happened; T051 and the human rehearsal portion of T055 must remain open.

The later evidence checkpoints are now concrete: Wave C integration/report `ace48bfc8179365cd48625662e59f2d2f2e699a1`, first T055 helper/result `fd7c58f3b52cfb8e1f93a7f57a93ef236757dc76`, and repeat result `b166651d492ddf516d70b4e0b3fd63b8040c4b9e`. The [commit-based report](docs/W08_COMMIT_REPORT.md) maps each revision to changed files, observed checks, actual AI contribution and remaining human work; Git history was inspected before preparing that report. The documentation update adds no new full-suite PASS claim.

## Expectations written before Wave C evaluations

- T00: normal gameplay moves, then a fake Tactical request succeeds with at least two provider steps and one real allowlisted tool execution, both evidence sources and no complete canonical game mutation; Week 4 Hint also succeeds and gameplay can resume.
- P1: identical valid HTTP bytes and three held fake-provider requests on each revision. Measure, rather than assume, the baseline's third provider entry; after hardening expect peak two, rejection before provider/tool work, then successful capacity recovery. A separate rolling-window fixture checks rate expiry.
- P2: build both revisions from their source, use the same reachable control-script URL and no-CSP control, inspect actual delivered preview headers, execute the same injection and normal game/fake Coach smoke. Expect baseline header absence/resource execution if confirmed, and W08 script-src blocking with normal operation. Any proxy or harness adaptation must be identified.
- P3: same forged-valid snapshot, malicious goal, fixed fake `constructor`, `toString`, and `set_score` proposals, plus a positive allowed-tool control. Expect zero forbidden execution on both revisions; W05 need not be vulnerable. Compare complete canonical local game objects.
- Full matrix: execute existing T00–T17 checks without live Gemini or real keys, record actual command results/counters and applicability. Final typecheck, all Node tests, client/server builds, Chromium checks, sentinel scan and runtime/full dependency audit must be observed before declaring a technical pass.

This initial record contains expectations, not future PASS claims. Executed results, limitations, risk/data inventories and the task report are appended as checks finish. Human review/rehearsal will not be inferred from automated checks.

## Observed integration failure before correction

The first full Wave C suite passed 332/332. Its required repeat ran 332 tests with 331 passed and 1 failed: `T13 lifecycle`, disconnect subcase, observed `providerAbort=0` rather than 1 after the fixture's fixed 20 ms delay (`tests/tactical-admission.test.js`). Prior focused/matrix runs had passed. The test's client disconnect can precede server-side delivery of the close/abort event; a 20 ms wall-clock sleep is not a completion barrier. Expected correction: wait for the actual fake-provider abort and completion-event promises, preserve the exact one-abort/one-release assertions, then settle the late value and verify no extra completion. This is a narrow test-fixture correction justified by an observed integration failure, not a change to server policy. Its results are recorded below after execution.

**Observed correction result:** the fixture now waits for actual abort/completion gates rather than 20/10 ms sleeps. Focused admission checks passed 3/3. Two subsequent full runs each passed **332/332**, 0 failed/cancelled/skipped/TODO. The final selected Node security matrix passed **41/41**. No runtime protection, timeout value or assertion was relaxed. This is the only integration correction; the other Wave C changes add evidence, a positive integration test and test-only browser counters.

## Reproduction and verification results

Run from the repository root in Windows PowerShell. Use the locked installed toolchain (Node v24.21.0, npm 11.19.0, TypeScript 7.0.2, Vite 7.3.6, Gemini SDK 2.24.0, Playwright 1.64.1). `npm.cmd` avoids this machine's PowerShell restriction on `npm.ps1`. Chromium v1248 was installed during Wave B. No real key is needed; fixture-only sentinels are synthetic.

```powershell
$env:TACTICAL_AI_PROVIDER = 'fake'
$env:AI_PROVIDER = 'fake'
$env:GEMINI_API_KEY = ''
npm.cmd ci --no-audit --no-fund  # prerequisite if dependencies are absent
npm.cmd run build:server
git archive --format=zip --output=node_modules/.cache/w08-before.zip e0ef30a1eddc9583a9894b79e10d53424d9f0b2a
Expand-Archive -LiteralPath node_modules/.cache/w08-before.zip -DestinationPath node_modules/.cache/w08-before -Force
node node_modules/typescript/bin/tsc -p node_modules/.cache/w08-before/tsconfig.server.json
node tests/helpers/w08-compare.mjs node_modules/.cache/w08-before . docs/evidence/w08-comparison.json
node --test --test-reporter=tap --test-name-pattern='^T(?:0[0-9]|1[0-7])(?: |/)' tests/tactical-api.test.js tests/tactical-orchestrator.test.js tests/tactical-tools.test.js tests/tactical-gemini-provider.test.js tests/tactical-admission.test.js tests/tactical-security-events.test.js tests/tactical-snapshot.test.js
npm.cmd run typecheck
npm.cmd test
npm.cmd test  # required repeat for reproducibility, after the correction
npm.cmd run test:browser:w08  # includes client/server builds
npm.cmd audit --package-lock-only --json
npm.cmd audit --package-lock-only --omit=dev --json
git diff --check
git status --short
```

`node_modules/.cache/` must exist before using it for the archive/output (`New-Item -ItemType Directory -Force node_modules/.cache`). Archiving preserves the actual committed W05 source without switching branches or introducing vulnerable code. The same installed W08 toolchain builds both snapshots; the old lockfile is archived but its separate dependency graph is **not** installed. Therefore these are source/config comparisons under one controlled toolchain, not comparisons between two independently restored historical machines. The runner gives **both** Vite previews an explicit OS-assigned loopback fake-API proxy, since the original W05 config targets fixed port 3001. This test-only serving adaptation does not change either revision's headers or source. Script/control servers, previews, APIs and Chromium close in `finally`.

| Executed check | Actual result |
| --- | --- |
| SpecKit prerequisites / requirements checklist | Existing feature resolved; requirements.md 30/30, 0 unchecked. No extension hooks configured. |
| Initial focused T00 command (`^T00`, also matching two T005 helpers) | Exit 0; 3 passed. The official T00 itself passed with 3 Tactical attempts, 2 allowed tools, 0 forbidden, 1 Hint call. |
| Affected game/Hint/UI/API/provider integration selection | Exit 0; 236 passed, 0 failed/skipped/TODO. |
| Selected official Node matrix, before and after fixture correction | Exit 0; 41 passed on both selections. Browser-only IDs are executed separately below. |
| P1/P2/P3 comparison runner, two local executions | Exit 0 on both, same policy outcomes. The retained JSON is the second execution; ephemeral ports vary across runs, while each execution uses one identical script URL for both revisions. |
| Full Node suite after correction, run 1 / run 2 | Exit 0 / 0; **332 passed / 332 passed**, 0 failures/cancellations/skips/TODO. |
| Typecheck / server build / client build | Exit 0 for each; the final browser command also rebuilt client/server. |
| Final Chromium browser suite with explicit work/admission counters | Exit 0; **10 passed** in 11.1 s. Intended external-script CSP violation only; normal game/Coach and inert-text assertions pass. |
| Runtime audit | Exit 0; 0 vulnerability entries. See [raw snapshot](docs/evidence/w08-audit-runtime.json). |
| Full audit | Audit exit 1 **with findings**, not a clean pass: 2 affected development-package entries, high 2; see [raw snapshot](docs/evidence/w08-audit-full.json) and dispositions below. |
| Sentinel/artifact/source-map inspection | Synthetic server sentinel absent from fresh client artifacts; no client source maps present. T10/T14/T16 separately verify model/public/event surfaces. |
| Diff / dependency changes | `git diff --check` passes. No runtime, package, lockfile or application UI change in Wave C. Pre-existing untracked `.agents/skills/student-weekly-report/` is outside this task and excluded. |

Both initial sandboxed audit requests failed at registry access; the identical read-only commands completed with approved network access. Local esbuild/preview/browser work used approved access where the sandbox restricts parent-directory discovery. These environment restrictions are not recorded as application vulnerabilities. Logs used for this run remain ignored in `node_modules/.cache/w08-*`; durable observations are in this report and the committed JSON snapshots. The final documentation/test commit identifies the reproducible Wave C candidate; its SHA is reported after commit rather than fabricated inside its own contents.

## Architecture and actual policy

```mermaid
flowchart LR
  B[Browser game and goal] -->|untrusted goal and client snapshot| H[Exact HTTP/body/runtime validation]
  H --> A[Server-instance admission]
  A --> O[Phase, retry, count and deadline guards]
  C[Server provider config and key] --> P[Fake or Gemini adapter]
  O --> P
  P -->|untrusted bounded normalized outcome| O
  O --> D[Exact name, own arguments, request capability]
  D --> T[Read-only snapshot and deterministic evaluator]
  T --> V[Exact result, byte and recomputation checks]
  V --> O
  O --> F[Candidate-matching final and materialized evidence]
  F --> U[Validated response and textContent DOM]
  A --> L[Allowlisted lifecycle metadata]
  O --> L
```

The model proposes; the application decides and executes. Neither client state nor model text grants authority. The two tools are `get_tactical_snapshot` and `evaluate_tactical_strategy`; there is no game mutation tool, authentication, private resource database, confirmed ranking or trusted match ledger.

Effective compiled exports and the checked non-exported boundaries are recorded in [w08-policy.json](docs/evidence/w08-policy.json). Values below are **observed in source/config and exercised by the named boundary tests**, not merely copied targets.

| Boundary | Effective value | Enforcement and observed proof |
| --- | ---: | --- |
| Tactical request body | 4096 UTF-8 bytes | `server/index.ts` body reader; oversized T02 rejection plus existing padded-4096 positive HTTP case. Week 4 separately retains 1024. |
| Goal | 240 Unicode code points | `parseTacticalRequest`; T01 240-point positive and existing contract length negatives. |
| Normalized provider outcome | 8192 UTF-8 bytes | Adapter and common orchestration check; T06 accepts 8192 at semantic boundary and refuses 8193/multibyte oversize. **Post-SDK**, not a network/SDK allocation cap. |
| Tool result | 8192 UTF-8 bytes | `parseTacticalToolResult` and byte checker; T10 size edge and corrupt/secret results stop before next provider call. |
| Final plan / materialized success | 4096 UTF-8 bytes each | Contract and orchestration checks; existing plan/success oversized tests run in the full suite. |
| Logical steps / tool executions / provider attempts | 3 / 2 / 4 | Phase machine, tool check and reservation guard; T11 plus full retry regressions. No fifth call or third tool. |
| Transient retries / requested backoff | 1 / 100 ms | Shared `retryUsed` and bounded sleep; full retry tests and T11. |
| Provider per-call / total deadline | 5000 / 22000 ms | T12 manually fires both separate limits and settles late promises; total deadline is never reset. |
| Local synchronous tool budget | 100 ms | Existing tool-timeout test; total deadline checked around execution too. |
| Active / rolling admissions | 2 / 5 per 60000 ms | Compiled admission exports; P1/T13 held-run, separate rate/staggered expiry and lifecycle recovery checks. |
| Gemini maximum output tokens / SDK HTTP attempts | 2048 / 1 | Every stage's SDK config and actual installed-SDK mocked-fetch test; 4 app attempts equal 4 mocked HTTP calls. |

The normal controlled envelope remains 3 steps/2 tools, outcomes 70/157/331 bytes and materialized success 450 bytes (Wave B measurements rerun in the full suite). A 2048-token limit provides headroom over that compact example, without claiming a token-to-byte equivalence or universal live-model quality. Thought signatures and the SDK's received response can already occupy memory before the normalized-outcome check.

## Same-input before/after observations

[w08-comparison.json](docs/evidence/w08-comparison.json) retains the actual counters, states and delivered headers. Both revisions received identical serialized normal input SHA-256 `1136905d7611d460da1c8aaf898ebcc61cbcaaffaed77dfcdcfeb37f21b43347` and identical forged-valid/malicious input SHA-256 `62eca91f445015d38fcc986e2ac7b6611c66e14ca5b9b0e42e7e8b4cd3e2dbe9`. The runner asserts those byte strings are equal, not just logically similar.

| Comparison | W05 baseline observed | W08 observed | Conclusion and limit |
| --- | --- | --- | --- |
| **P1 / T045 — three held valid requests, then recovery** | Peak held provider runs **3**; third enters provider (1 initial attempt, 0 tools while held); statuses including recovery **200/200/200/200**; completed totals **12 attempts / 8 tools**. No server admission ledger: N/A. | Peak **2**; third starts **0 attempts / 0 tools**, HTTP **429**; statuses **200/200/429/200**; totals **9 attempts / 6 tools**. Actual held admission `{activeRuns:2,admittedRuns:2,releasedRuns:0}`; after recovery `{0,3,3}`. | New server gate reduces local simultaneous work and recovers after a slot releases. Counts distinguish held provider entry from server-owned slots. Single process only; separate rate proof below. |
| **P2 / T046 — same reachable script URL and normal built app** | Delivered CSP/nosniff/referrer headers absent. Script marker **true**, no CSP violations. Normal Coach **3 attempts / 2 tools**, game launches. | CSP/nosniff/no-referrer present. Script marker **false**, named **script-src-elem** violation for the same URL. Normal Coach **3/2**, game launches. | New delivered policy blocks an otherwise executable resource without breaking the tested app. Identical HTTP-200 control script executes on the separate no-CSP page on both runs. Test-only proxy adaptation described above; no deployment-host claim. |
| **P3 / T047 — constructor, toString, set_score and positive control** | Each hostile case HTTP **502**, **1 attempt / 0 tools / 0 forbidden**. Unknown names map to `unknown_tool`, `set_score` to `forbidden_tool`. Positive **200, 3/2/0**. | Identical safe outcomes and counts. | Existing W05 exact dispatch remains effective. This is regression proof, not a newly fixed exploit or evidence about universal Gemini prompt immunity. |

In the retained P2 run the shared controlled URL was `http://127.0.0.1:61480/w08-control.js`. It returned HTTP 200 with JavaScript content type and the marker bytes; the no-CSP control executed it. W08 blocked that exact URL under configured `script-src 'self'`, reported as the browser's effective `script-src-elem`. Delivered policy was `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'none'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'`, with `X-Content-Type-Options: nosniff` and `Referrer-Policy: no-referrer`. This is not a 404/MIME/network-failure proxy for CSP.

P3 compares the **entire locally held canonical game** before/after each call, with no changed paths. Its digest on both sides is `ea8a73a12c09c7ef65acc24566dda423964dbd9903081469be940ba7fe0b443c`. The incoming forged snapshot is internally valid (playing, score 10, 39 remaining bricks with corresponding zone/normal count), while the canonical local fixture stays ready, score 0, lives 3, 40 alive bricks. This does not authenticate another caller's game history.

Separate T13 rate results: five valid arrivals at fake time 1000 ms succeed; sixth is 429 with 0 constructions/attempts/tools; an invalid request consumes no admission; at +60001 ms a valid request succeeds. Across the two windows there are **6 admitted, 18 attempts, 12 tools**; final current-window admission is 1. Staggered timestamps prove per-arrival rolling expiry rather than a fixed minute bucket. Success/error/timeout/cancellation/disconnect/late-settlement each release once, and every recovery probe returns 200.

## Official T00–T17 matrix

Executed commands are the selected 41-case Node command and the 10-case Chromium command above, supplemented by the full 332-test suite for prior contract/retry/Hint/game regressions. A table row can cover multiple subcases and some shared tests cover two IDs; it is not a claim of 18 separately numbered test functions. `A/T/F` below means actual provider attempts / executor entries / forbidden executions. Unit-only cases have **N/A admission** because they do not enter HTTP; state N/A means that row does not hold a canonical game. Central counters and state assertions are explicitly retained. All rows passed their **technical** assertions; this is not completion of human review/rehearsal.

| ID / fixture and expected boundary | Observed work, admission and result | State before/after, conclusion and proof limit |
| --- | --- | --- |
| T00 — `T00 normal gameplay...` HTTP integration; legitimate plan and Hint | HTTP 200; **A/T/F 3/2/0**, 1 admission/release, active after 0; Hint provider call 1. Both evidence sources materialized. | Game launches/moves before coaching and resumes after. Complete before/after digest **46d3a31667c08b7145a4520b8260365373a1b8d71cb35659e22055aabc33dbdf**, deep equality and empty changed paths across Coach/Hint. Local canonical fixture, not a remote-history guarantee. |
| T01 — invalid JSON, wrong goal/lives types, domain-invalid count/score; valid 240-point control | Each invalid **0/0/0**, no provider construction/admission, safe 400. Legitimate boundary control **3/2/0**, HTTP 200. | State N/A for invalid HTTP bytes. Runtime request validation protects provider work, not caller authentication. |
| T02 — separate >4096-byte body and well-sized provider/maxSteps/ownerId/role fields; normal control | Oversize 413; field cases 400; each **0/0/0**, no admission/provider construction. Normal **200, 3/2/0**; padded 4096-byte body positive in full suite. | State N/A; extra client fields cannot select server policy. Distinct cases prevent size rejection from masking privilege validation. |
| T03 — gameId/sessionId/scenarioId/resourceId and two-context tool fixtures | HTTP selectors each **0/0/0**, no admission; tools reject copied foreign capability before evaluator entry. Correct current-context call succeeds (1 evaluator entry); foreign schema-valid evaluation fails recomputation. | Two copied/frozen snapshots remain lives 3 and lives 1 respectively; original mutation does not alter context. Tool-only provider/admission N/A. Local capability scope, not auth or real foreign-resource storage. |
| T04 — real browser malicious fake final, actual goal channel, benign Serbian/apostrophe/`a < b` | Each submitted flow measures **3/2/0**, active after 0/current-window admitted 1. Script marker false, no attacker element; benign text readable. | Browser closure's canonical object is not exposed; N/A direct full-state measurement here, supplied by T00/T09/T17. Goal reaches model context but is not itself reflected as a result DOM sink. Actual text-only rendering proof. |
| T05 — raw HTML, Markdown, javascript URL/link | Per fixture **3/2/0**, active after 0/admitted 1; no HTML conversion, active anchor, navigation or script marker. | Full canonical state N/A browser text test. Proves these tested strings remain inert, not every future rendering implementation. |
| T06 — invalid decision/final and byte-bound outcomes in orchestrator/SDK stub | Invalid decision **1/0/0**; invalid final **3/2/0**. At 8192 bytes semantic validation is reached; 8193/multibyte oversize stops first. Tool-name oversize **1/0/0**; final oversize **3/2/0**. Fixed errors exclude raw payload. | Admission/state N/A unit boundary. Adapter rejection occurs post-SDK; accepting a bounded adapter object does not bypass final schema checks. |
| T07 — missing/constructor/toString/set_score, direct tools and orchestrator | Hostile proposals **1/0/0** each; direct evaluator spy 0. Positive control **3/2/0** or 1 direct evaluator entry. | Canonical game from `createGame()` deep-equal before/after hostile run. Unit admission N/A. Exact allowlist, not prototype-based dispatch. |
| T08 — invalid/extra/inherited/accessor args; schema-valid copied foreign context; same allowed tool positive | Invalid args and copied foreign capability cause 0 evaluator calls, getter count 0; current context succeeds with 1. Provider/admission N/A for direct tool tests. | Snapshot remains request-scoped/frozen; same shape alone gives no capability. Does not claim resistance to trusted server code deliberately constructing another context. |
| T09 — malicious goal observed by scripted fake before forbidden proposal | Fake records exact goal, **1/0/0** for each forbidden/prototype proposal; useful positive flow remains **3/2/0**. | Full canonical local game deep-equal before/after. Unit admission N/A. Application execution-policy proof, not real-model prompt immunity. |
| T10 — invalid shape, oversized result, extra envelope/nested synthetic secret | Each negative **1/1/0**, stops before any next model call; no raw invalid object/secret in context. Positive **3/2/0**, prior results 0/1/2. Standalone UTF-8 checker accepts 8192, rejects 8193. | Admission/state N/A unit result boundary. Executor entry is counted even when its output is rejected. Fixed valid schemas cannot naturally reach the byte maximum, so checker and injected-shape tests are separate. |
| T11 — repeats, phase/step/tool limits, total attempts and one transient retry | Useful retry path **4/2/0**, prior contexts 0/1/1/2; one 100 ms sleep. Third tool refused after 3 attempts/2 entries; wrong phase stops before its execution. Duplicate tracker refuses repeat, fifth reservation refused before work; prior retry negatives stop a second retry. | Admission/state N/A budget units. Phase machine makes a fourth logical step unreachable; reservation test does not pretend a fifth actual network request happened. |
| T12 — separate per-call and aggregate timeout; late results | Two 5000 ms expiries: **2/0/0**, both signals abort, late proposals execute no tool. Total test: attempt starts 0/7500/12400/17300 ms; final timeout shrinks to 4700, **4/2/0**, deadline 22000, late final discarded. | Unit admission/state N/A. Explicit 2500 ms backoff scheduling stall exercises independent total deadline; ordinary 4×5000 +100+2×100 work otherwise fits below 22000. T13 separately proves HTTP slot release. |
| T13 — concurrent/rate/lifecycle HTTP subcases | P1 cap/recovery **9/6/0** total, peak active 2, excess **0/0/0**; separate rate **18/12/0** over 6 admissions; invalid/sixth start no work. Six lifecycle modes each free one slot and recover to 200, exactly one completion per run. | Canonical state N/A admission fixture; P3/T00 provide no-mutation proof. Single server instance; no distributed quota/fairness claim. The timing fixture failure and event-barrier correction are preserved above. |
| T14 — synthetic internal error and separate newline/fake-event sink | Internal error uses **2/0/0** (one shared retry); no sentinel in next context/HTTP. Newline/event case **1/0/0**, exactly 2 captured and 2 default operational records, 0 forged events. Completion counts are bounded. | State N/A; each HTTP run admitted once, no tool. Correlation ID is generated and does not equal attacker header. App event/public boundaries only, not third-party infrastructure logs. |
| T15 — forged but valid client snapshot and genuine positive request | Forged **3/2/0** then genuine **3/2/0**, 2 total admissions; no returned confirmed score/privilege or changed budgets. | Canonical initial game score 0/lives 3/40 alive stays fully deep-equal; forged playing score 10/39 bricks differs only in advisory request. Valid schema does not prove actual play. |
| T16 — fresh build, sentinel, exact headers and reachable-script control | HTTP-200 control executes with no CSP; production marker false plus script-src-elem violation. Normal P2 Coach **3/2/0**; final browser hostile helper measures **3/2/0**, active after 0/admitted 1. Sentinel 0 in client/HTTP/UI/events; maps absent. | Game ready state/CSS and launch smoke work. Full canonical object N/A in browser closure. Local built preview only, not a production internet deployment or a raw-SDK byte cap. |
| T17 — forged-valid state plus malicious goal/newline, forbidden fake proposal and minimal event | HTTP 502 `forbidden_tool`; **1/0/0**, one forbidden proposal, 1 admission, active after 0. Exactly admitted/completed events, failed completion with counts 1/0, no raw content/secret or forged event. | Full canonical initial game score 0/lives 3/40 alive deep-equal before/after; caller's forged score 10/39-brick snapshot remains advisory. Connects HTTP/admission/model/dispatch/state/events beyond isolated T09/T14/T15. Local fixture, not authenticated game history. |

Invariant coverage: **I1** T01/T02/T13; **I2** T02/T03/T15/T17; **I3** T03/T07–T11/T17; **I4** T00/T09/T15/T17; **I5** T04/T05/T16; **I6** T02/T06/T10–T13; **I7** T10/T14/T16/T17; **I8** T00, T13 recovery, T16 and existing Hint/game regressions. No official technical row is unrun.

## Threat model: six architecture-specific risks

Likelihood/impact below are **qualitative judgments**, not measured attack frequencies. Priorities are R4, R3, R2: aggregate work was a missing directly reachable control; browser execution has high impact and needed delivered-policy proof; model-to-tool dispatch is the core AI capability boundary. R5 remains high-impact and is explicitly covered by result/event/sentinel work.

### R1 — direct HTTP / client privilege selection

- **Path/prerequisite/boundary:** caller can reach loopback API and bypass the browser with malformed JSON or extra provider/maxSteps/role/owner fields; untrusted HTTP bytes cross into server policy. **Asset:** provider budget and server configuration. **Likelihood high** because direct HTTP is trivial once reachable; **impact medium–high** if validation can start work or select policy.
- **W05 control / W08 gap:** bounded body and exact runtime request parser existed; the zero-work negative/positive matrix needed explicit proof. **Enforcement:** `handleTacticalCoachRequest` parses before admission/provider factory; no new login or authority field.
- **Executable evidence/result:** T01/T02 in `tests/tactical-api.test.js`, selected matrix command above; invalid cases 0/0 provider/tool work, valid boundary reaches 200/3/2. **Conclusion:** existing boundary confirmed, no conditional HTTP correction required.
- **Residual:** valid direct callers are still allowed subject to aggregate quota. Validation and CORS are not authentication.

### R2 — forbidden tool / cross-request context escalation

- **Path/prerequisite/boundary:** malicious goal or provider proposes prototype/unknown/mutation tool, wrong phase, extra args or copied foreign snapshot capability; model-controlled name/arguments cross into execution. **Assets:** canonical game and request-scoped data. **Likelihood medium–high** because proposals are untrusted; **impact high** if arbitrary capabilities execute.
- **W05 control / W08 gap:** exact two-name dispatch, phase/own-argument checks, WeakSet context, immutable snapshot, evaluator recomputation and repetition guards existed; malicious-goal/context/prototype and combined proofs were missing. **Enforcement:** `tools.ts`, `orchestrator.ts`, unchanged for these controls.
- **Executable evidence/result:** T03/T07/T08/T09/T11/T17 plus P3 runner; 0 forbidden executions, full game equality, current-context positive works on both revisions. **Conclusion:** preserved application policy, not a newly invented vulnerable W05 outcome.
- **Residual:** no universal real-Gemini injection-immunity claim, no authenticated private resource model, and trusted server extensions still need review.

### R3 — model/browser content execution

- **Path/prerequisite/boundary:** hostile user/model natural-language strings contain HTML, Markdown or javascript links; response text crosses into DOM/navigation. **Asset:** player browser execution context. **Likelihood medium** because free text reaches display; **impact high** if it becomes executable.
- **W05 control / W08 gap:** exact response parsing and `textContent` existed; delivered production preview CSP/headers and real-browser evidence were absent. **Enforcement:** unchanged `src/tactical-ui.js` text rendering plus W08 `vite.config.js` preview header policy.
- **Executable evidence/result:** T04/T05/T16 and P2; hostile text inert, normal letters readable, reachable second-origin script executes before and is blocked after by script-src-elem, normal game/Coach work. **Conclusion:** text-only control preserved and layered delivered-policy gap closed for the tested profile.
- **Residual:** local Vite preview is not a public production host; future rendering/assets/hosting changes require the same tests and header review.

### R4 — aggregate and per-run resource exhaustion

- **Path/prerequisite/boundary:** reachable caller starts parallel or frequent valid HTTP runs; provider emits oversized data, retries or settles late. Arrivals/model output cross server capacity/deadline boundaries. **Assets:** provider cost, server memory/time and responsive app. **Likelihood high** for reachable port; **impact medium–high** for unbounded aggregate work.
- **W05 control / W08 gap:** 3/2/4 steps/tools/attempts, 5000/22000 ms deadlines, tool/final bounds existed; aggregate admission and normalized-provider/output-token policy were missing. **Enforcement:** `admission.ts`, HTTP lease lifecycle, shared provider byte helper and Gemini generation/retry config.
- **Executable evidence/result:** P1 and T06/T10–T13; peak falls 3→2, excess starts 0 work, separate rate expiry and every lifecycle recover; provider cap rejects oversize; installed SDK performs one fetch per app attempt. **Conclusion:** bounded local admission/output and preserved per-run budgets.
- **Residual:** quotas are per-process, with no distributed coordination or per-user fairness. The SDK can receive/allocate large raw data before post-SDK checks; token count is not bytes. Scheduling stalls count toward absolute deadline.

### R5 — secret / operational log disclosure or forgery

- **Path/prerequisite/boundary:** internal exception, extra tool field, server key sentinel or newline/fake-event string reaches HTTP/model/browser/log. **Assets:** server configuration secrecy and trustworthy event records. **Likelihood medium** since errors/free text occur naturally; **impact high** for a real secret or forged record.
- **W05 control / W08 gap:** server-only key lookup, exact tool/final schemas and fixed public errors existed; minimal lifecycle event boundary and end-to-end sentinel/browser proof were absent. **Enforcement:** exact result parsers, fixed error mapping, allowlisted `security-events.ts`, no request/exception serialization.
- **Executable evidence/result:** T10/T14/T16/T17 and artifact scan; extra secret result stops before next model call, 0 sentinel occurrences outside test-allowed configuration, exactly real lifecycle events and no forged event. **Conclusion:** tested app-owned surfaces exclude unnecessary raw data.
- **Residual:** synthetic values establish tested data flow only; unobserved SDK/provider/host logging and future telemetry are outside this sink. No real key was used or scanned from private local environment files.

### R6 — forged client state promoted to confirmed authority

- **Path/prerequisite/boundary:** caller submits an internally consistent but unplayed snapshot/score; browser-controlled functional input crosses into advice and could be misinterpreted as server truth. **Assets:** game state and future ranking/privilege semantics. **Likelihood high** because client data is editable; **impact low now** for read-only advice, **high if reused as authority later**.
- **W05 control / W08 gap:** exact ranges/count equations, request-frozen snapshot and read-only tools existed; forged-valid/combined evidence was missing. **Enforcement:** request/snapshot contracts; no ledger or privilege use is implemented.
- **Executable evidence/result:** T03/T15/T17/P3; score 10/39-brick advisory input is accepted when valid but changes no server policy/confirmed result, forbidden action executes 0 times, full local game remains score 0/lives 3/40 alive. **Conclusion:** validated input remains unverified and advisory.
- **Residual:** the server cannot prove that a match was played. Authentication/authoritative game simulation would be separate work, not claimed by these tests.

## Data inventory and retention

Retention descriptions concern the inspected application, not guarantees about remote provider policy or the user's terminal history. Temporary test reports are intentionally retained as development evidence; operational events exclude raw functional input.

| Datum / controller | Boundary and validation | Model exposure | Storage/retention and necessity |
| --- | --- | --- | --- |
| Goal / browser user | Browser→HTTP exact `goal,state`; trimmed nonblank ≤240 code points | Yes, as goal text | Request and bounded adapter history; current form/UI until navigation/edit. Needed for coaching; never raw operational log. |
| State / browser game | HTTP snapshot parser→copied/frozen tool context | Validated snapshot via read-only tool result; Gemini initial message excludes raw request.state | Request scope, browser in-memory game. Functional input only, not ledger. |
| Score/lives/bricks/zones/ball/shield/portal / browser | Exact fields, ranges and count/score equations | Necessary bounded tool fields | Request scope; selected fact values materialized into advice. No confirmed ranking or privilege. |
| Provider/mode/model / server configuration | Fixed server factory and model constant; extra browser selectors rejected | No browser-selected provider; tool declarations supplied by app | Process configuration and per-run client. Needed for deterministic server policy. |
| API key / server environment | Server adapter construction only | No prompt/model-visible key | Process environment/client memory; no app persistence or public output. Tests use empty or explicitly synthetic value only. |
| Synthetic sentinel / test harness | Controlled environment/error/extra-field injection | Must not enter next context | Test source/evidence names deliberately retained; not a real credential. Detects boundary leakage. |
| Provider output / fake or remote | Adapter normalization→byte check→orchestration phase/schema | Only validated continuation is retained in adapter history | Per-run history; raw SDK response may already be allocated post-receive. Never raw operational event. |
| Tool name / model | Exact two-name registry and expected phase | App declarations and validated function-call history | Run scope; no arbitrary shell/URL/file/game-write capability. |
| Tool arguments / model | Exact own data fields; enums; no context/resource selector | Validated arguments in SDK history | Run scope; only bounded strategy candidate necessary for evaluation. |
| Tool result / app executor | Envelope/schema/8192-byte/recomputation before forwarding | Yes, only after validation | Run scope and bounded adapter history. Invalid/extra-secret object is not forwarded. |
| Final plan / model | Candidate match, exact schema/prose/reference/4096-byte checks | No next model step | Current HTTP response/UI until replaced or navigated away. Natural language remains untrusted inert text. |
| Materialized evidence / application | Allowed references and values from validated tools | No next model step | Response/current UI. Values are not model-authored assertions. |
| Public error / application | Fixed code/message map | No | HTTP/UI state; terminal tests may retain sanitized result. No raw exception/stack or private payload. |
| Correlation ID / application | Generated UUID; never client header as authority | No | Request + emitted event. Joins lifecycle records, not identity/auth. |
| Security event / application | Explicit event/time/ID/reason/outcome/counter allowlist | No | Default stdout sink; application sets no external retention/deletion policy. No raw goal/state/provider/key/token/CoT/stack. |
| Admission time/counters / server instance | Injectable server clock and atomic synchronous reserve/release | No | Memory until process ends; timestamps pruned after rolling 60000 ms. Capacity policy, not identity. |
| URL / browser/server route | Relative fixed `/api` and loopback upstream; unknown selector fields rejected | No arbitrary URL | Page/request URL only; no model-controlled remote fetch. Test URLs are local controlled resources. |
| localStorage/sessionStorage / browser | No such usage observed by source search in src/server route | No | No Tactical persistent browser storage observed; no invented stored session. |

## Origin/CSRF and dependency assessment

Actual serving profile: browser relative `/api` stays same-origin through explicit preview proxy to loopback Node. Inspected Tactical fetch/route has no login, cookie/session, bearer/Authorization privilege or resource-owner store. Broad CORS is not enabled; it is not authentication. **Privileged CSRF mechanism is not applicable to this observed credential-free advisory route**, a conditional architecture finding, not protection from direct resource abuse. Server admission remains required. Reassess before adding ambient privileged credentials or separate cross-origin deployment.

Runtime-only audit completed with 0 findings. Full lockfile audit completed with **source-map-js@1.2.1** (transitive development via Vite 7.3.6→PostCSS 8.5.28) and **vite@7.3.6** (direct development), aggregating the advisories below. The root runtime dependency is Gemini SDK 2.24.0, with no advisory in this audit. No package or lockfile changed, and no audit fix/update was run. Dispositions below concern this Windows/local-preview run; Elena's earlier macOS assessment is preserved historically and is not silently transferred.

| Advisory / severity | Package/classification and exposure | Disposition and remaining risk |
| --- | --- | --- |
| [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q), high | source-map-js 1.2.1, transitive dev; malicious indexed source-map offsets may consume event loop. Current build consumes trusted repo input, not an exposed map-upload feature. | **Mitigated input boundary; still vulnerable/unfixed.** Developer/CI processing of untrusted maps remains open. Historical available fix 1.2.2; this audit reports a fix available without applying it. |
| [GHSA-698v-4r3x-3vcv](https://github.com/advisories/GHSA-698v-4r3x-3vcv), moderate | Vite 7.3.6 dev, Windows launch-editor escaping; this machine is Windows. Tests run built loopback preview and do not invoke editor launch. | **Accepted/open for Windows development tooling**, not called inapplicable by OS. Separate remediation/reassessment needed before an exposed/editor workflow; historical patch 7.3.7. |
| [GHSA-r825-w8mm-5pxw](https://github.com/advisories/GHSA-r825-w8mm-5pxw), moderate | Vite 7.3.6 dev, editor CLI arguments; this run does not invoke editor/WSL routes. | **Not exercised here; accepted/open if editor/WSL workflow is used.** No broad claim that all Windows setups are safe; historical patch 7.3.7. |
| [GHSA-587h-7wmj-h5pm](https://github.com/advisories/GHSA-587h-7wmj-h5pm), high | Vite 7.3.6 dev, Windows launch-editor existence-check bypass. | **Accepted/open Windows tooling risk**; no exploitability test or fix claimed, preview scope only; historical patch 7.3.7. |
| [GHSA-9jrq-w75r-8gcw](https://github.com/advisories/GHSA-9jrq-w75r-8gcw), low | Vite 7.3.6 dev, custom middleware/transformIndexHtml prerequisites absent from inspected stock SPA/preview config. | **Demonstrated not applicable to the inspected configuration**, not fixed. Adding that middleware requires reassessment; historical patch 7.3.7. |
| [GHSA-rq7h-c2jc-7f22](https://github.com/advisories/GHSA-rq7h-c2jc-7f22), moderate | Vite 7.3.6 dev, non-Windows filesystem/dev-serving prerequisites in returned advisory; current Windows run uses loopback built preview. | **Not applicable to this specific tested serving profile**, not fixed; exposed development topology/path collisions elsewhere require reassessment; historical patch 7.3.7. |

Package audit severity counts describe affected package entries, not the number of advisories or a proof of application security. The full audit is intentionally reported as findings/open risk; runtime cleanliness does not waive developer-machine risk. Wave C permits only demonstrated integration corrections, so this run preserves the locked graph and records the separate tooling work rather than claiming an unperformed upgrade.

## Contributions, reviews and remaining human work

- **Elena, prior Wave A:** pushed admission/event controls, direct HTTP/browser/sentinel fixtures, preview policy and dependency analysis, as recorded by handoff `caf46ef6cf198ff31e659d939f96ca0a00638357` and prior quickstart. This report relies on that history and the rerun assertions, not an invented new Elena session.
- **Isidora's Wave B via Codex:** pushed provider byte/token/retry policy, tool/orchestrator negatives, combined T17 and T052 review note in `e41f8ca85dcb8b51e873a87b6c5deb114ff9215e`. T002 was prepared by Elena and reviewed/reused by Codex on Isidora's behalf. This is AI-assisted execution, not a claim of independent human review.
- **Wave C via Codex, requested by Isidora:** added T00, browser work/admission counters, same-source P1/P2/P3 runner and durable observations; corrected the demonstrated disconnect test race; executed matrix/regressions/build/audit checks; wrote this evidence and the exact eight-minute runbook in quickstart. No runtime feature, new dependency, auth or broad refactor was added.
- **T052 review transferred:** reviewed Elena's T01 malformed-JSON test and HTTP enforcement before admission/provider construction. Invalid input starts zero work and yields a fixed safe error; positive control succeeds. Proof limit: selected parser cases are not authentication or exhaustive input coverage. Full path: browser→HTTP validation→admission→bounded provider→closed read-only tools→validated results/final→materialized evidence→text-only UI, with minimal events and lease release.
- **T051 remains pending:** user explicitly confirmed Elena has not yet reviewed Wave B. Prepared review packet: `T06 normalized provider byte cap...` / `T06 adapter rejects...`, `provider-contracts.ts` helper, adapter checks before continuation/final return, and common `orchestrator.ts` check. Elena should verify zero invalid-step dispatch, positive plan, sanitized failure and post-SDK limitation, then record her own finding and explanation here. Codex self-review is not substituted for Elena's review.
- **T055 remains partially prepared/pending:** eight-minute segment plan and runnable fixtures are prepared; technical demonstrations were automated, but neither a timed two-person rehearsal nor both humans' explanation has occurred. Do not mark that human result PASS. The user confirmed this before execution.

### Step-by-step task report

| Task | Work completed and evidence | State |
| --- | --- | --- |
| T035 | Added official full-game/Coach/Hint positive integration, actual 3/2/0 work and complete state equality. | Complete |
| T041 | Reran affected 236-test selection, T00/full suite and browser checks; repaired only the observed test-fixture race, no UI/runtime correction. | Complete |
| T045 | Same-byte W05/W08 held-request comparison, actual peak/admission/work/status/recovery JSON. | Complete |
| T046 | Same script/control URL on original built configs, actual headers/marker/CSP directive and working game/Coach; proxy adaptation disclosed. | Complete |
| T047 | Same forged-valid malicious input, three forbidden/prototype proposals and allowed positive, complete game comparison on both. | Complete |
| T048 | Executed all T00–T17 technical rows, 41 selected Node checks plus 10 browser checks and full regressions. | Complete |
| T049 | Architecture, actual policy, data inventory, six concrete risks, priority and invariant mapping in this report. | Complete |
| T050 | Recorded real handoffs/contributions, comparisons/matrix, origins, audits, sentinel proof, failures/limitations and results. | Complete |
| T051 | Prepared concrete review packet; awaiting Elena's actual review. | **Open — human** |
| T053 | Reviewed intended test/evidence diff, app-owned secret surfaces, fixed errors, dependency graph unchanged and scope; unrelated local skill excluded. | Complete |
| T054 | Typecheck/builds, two corrected full runs, final matrix/browser checks, artifact scan and current full/runtime audits, with actual exits/findings. | Complete |
| T055 | Exact runbook prepared; follow-up Codex paced technical dry run passed in 8:00.015 with command time separated from pacing (record below). Both-person speech/rehearsal still needed. | **Open — human rehearsal** |

Technical verification is complete with the documented development-tool findings and proof limits. Final pair acceptance/merge/demo readiness is **pending T051 and T055**, not declared complete by this report. No teammate message, force push, `main` merge or PR publication is part of this execution.

## T055 follow-up: paced technical dry run

The user subsequently asked Codex to try T055. On 2026-10-27 at **21:01:28–21:09:28 Europe/Budapest**, `node tests/helpers/w08-rehearse.mjs` completed its five scheduled phases with **technical PASS**. The timer measured **480015 ms**; actual commands/actions used **11895 ms**, with **468120 ms of deliberate pacing/available explanation time**. The server/client preparation builds passed before the timer (638/657 ms). The base revision was `ace48bfc8179365cd48625662e59f2d2f2e699a1`; this follow-up adds the rehearsal helper/evidence, not runtime changes.

Durable observations: [exact timing/commands JSON](docs/evidence/w08-t055-rehearsal.json), [visually inspected normal-flow screenshot](docs/evidence/w08-t055-normal.png), and the per-phase table in [quickstart.md](specs/004-secure-the-arcade/quickstart.md). The live built browser showed a launched game, successful Hint, readable Tactical plan and two evidence rows, 3 provider attempts/2 tool calls and no page errors. T00 passed 1/1; HTTP/forbidden-tool selection passed 9/9; browser security selection passed 8/8; budget/timeout/admission selection passed 7/7; fresh same-input P1/P2/P3 comparison passed. Each phase completed within its slot; start drift was at most 22 ms. No real key/live Gemini was used. All fixture servers/browsers closed; no dependency changed. The existing runtime/full audit snapshots were read for the limitations segment, not rerun.

The eight-minute duration was **programmatically paced**, not an observation of spoken delivery, human role switching, or continuous game play. This demonstrates that the technical demonstrations fit the allocation, and preserves the actual command durations instead of claiming eight minutes of active test work. Elena and Isidora's joint spoken rehearsal/explanations and Elena's T051 review remain pending; their completion has not been inferred or marked PASS.

### T055 requested repeat — 2026-10-27

At the user's request, the **same unchanged helper** was executed again from `fd7c58f3b52cfb8e1f93a7f57a93ef236757dc76`, at **21:11:55–21:19:55 Europe/Budapest**. The repeat passed with **480009 ms (8:00.009)** paced duration, **9240 ms (9.240 s)** active technical work and **470769 ms** scheduled pacing/available explanation time. No runtime/config/dependency change occurred between the two runs. The first observations remain intact; [repeat timing and commands](docs/evidence/w08-t055-rehearsal-repeat.json) and [repeat screenshot](docs/evidence/w08-t055-normal-repeat.png) are separate artifacts.

| Scheduled segment | First active work | Repeat active work | Repeat observation |
| --- | ---: | ---: | --- |
| 0:00–1:00 | 1.096 s | 0.849 s | Game launched; Coach/Hint ready; 3 provider attempts, 2 tool calls, no page errors. |
| 1:00–2:30 | 0.626 s | 0.415 s | T00 1/1; canonical before/after state equal. |
| 2:30–5:00 | 7.443 s | 5.202 s | HTTP/tool 9/9 and browser 8/8, including CSP script-src-elem proof. |
| 5:00–6:30 | 0.562 s | 0.576 s | Budget/timeout/admission/lifecycle 7/7. |
| 6:30–8:00 | 2.168 s | 2.198 s | P1/P2/P3 repeat passed with the same policy outcomes and zero forbidden execution. |

All phase starts were within 16 ms of schedule and every command fit its segment; these are two local observations, not a general performance benchmark. The full eight-minute duration remains deliberately paced rather than measured human speech. All temporary servers/browsers were closed. T051 and the two-person explanation/rehearsal requirement of T055 remain open.
