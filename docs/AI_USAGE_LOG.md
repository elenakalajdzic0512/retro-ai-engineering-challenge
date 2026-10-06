# AI Usage Log

Ovaj dokument beleži značajne AI pozive i odluke tokom razvoja projekta.

Ne beležimo privatni chain-of-thought. Beležimo cilj poziva, očekivanje, rezultat i ljudsku odluku koja je usledila.

| # | Faza | AI alat | Zašto je AI pozvan | Šta se očekivalo | Rezultat | Sledeća odluka |
|---:|---|---|---|---|---|---|
| 1 | Specification | ChatGPT | Pomoć pri strukturisanju početnog scope-a igre prema zahtevima zadatka | Mali i proverljiv `GAME_SPEC.md` sa jasnim out-of-scope granicama i Definition of Done | Napravljen i ručno pregledan `GAME_SPEC.md`; zatim commitovan pre implementacije | Zaključati način rada coding agenta |
| 2 | Prompt design | ChatGPT | Pomoć pri strukturisanju prvog build prompta za coding agenta | Prompt koji ograničava scope, definiše autoritativni kontekst, verifikaciju i zahteva plan pre implementacije | Napravljen i ručno pregledan `BUILD_PROMPT_V1.md`; zatim commitovan pre implementacije | Pozvati Codex samo za analizu i plan, bez izmene fajlova |
| 3 | Baseline plan | Codex | Analiza repozitorijuma i predlog minimalne baseline implementacije bez izmene fajlova | Ispravno razumevanje scope-a, minimalan plan, potrebni fajlovi i način verifikacije | Codex je predložio vanilla JS + Canvas + CSS, Vite i Node test runner; plan je pregledan i prihvaćen uz ljudsku kontrolu | Odobriti samo baseline implementaciju i zadržati Week 3 eval/runtime-validation blok za narednu fazu |
| 4 | Baseline implementation | Codex | Implementacija minimalne Neon Breaker baseline verzije i verifikacija bez naknadnog popravljanja pronađenih problema | Runnable baseline, passing tests/build i stvarni problemi koje možemo kasnije evaluirati | Kreirano 7 odobrenih source/setup/test fajlova; 8/8 testova prolazi; build i local start uspešni; otkriven frame-rate problem i viewport ograničenje | Sačuvati baseline bez FPS fix-a, zatim napraviti eval slučajeve i kontrolisanu promenu |
| 5 | Context engineering i eval plan | ChatGPT | Pomoć pri definisanju `CONTEXT_MANIFEST.md`, prioriteta izvora i formalnog Week 3 eval procesa | Kuriran kontekst, jasna pravila konflikta izvora i unapred definisani E1–E4 scenariji | Napravljen i pregledan `CONTEXT_MANIFEST.md`; E3 je preciziran unapred sa tačnim invalid inputom i očekivanim `TypeError` rezultatom | Verzionisati E3 očekivanje pre implementacije runtime contracta |
| 6 | Runtime contract analiza | Codex | Analysis-only pregled postojećeg koda radi uvođenja najmanjeg strukturisanog runtime ugovora | Predlog malog `GameConfig` contracta, validnog/invalidnog primera, očekivanog ponašanja i minimalnog file-change plana | Codex je pronašao hard-coded `lives=3`, grid `5x8` i renderer pretpostavku od 8 kolona; predložio fiksni baseline `GameConfig` i eksplicitno odbacivanje invalid inputa | Prihvatiti plan, ali prvo commitovati tačan E3 input i očekivanje |
| 7 | Runtime contract implementation | Codex | Implementacija odobrenog `GameConfig` runtime validatora i fokusiranih testova | Runtime validacija bez coercion-a i bez menjanja FPS/timing logike | Promenjeni samo `src/game.js` i `tests/game.test.js`; dodat `DEFAULT_GAME_CONFIG`, `validateGameConfig()` i 6 contract testova; Codex prijavio 14/14 testova i uspešan build | Ljudski pregledati diff i nezavisno ponoviti testove/build pre commita |
| 8 | Runtime contract review i formalni E3 | ChatGPT | Pomoć pri pregledu Codex diff-a, definisanju nezavisne verifikacije i formalnom izvršavanju E3 | Potvrda da je scope ostao mali i da formalni E3 koristi unapred definisan input | Diff je pregledan; Elena je nezavisno dobila 14/14 testova, uspešan build i isti očekivani `TypeError`; formalni E3 označen kao PASS | Verzionisati runtime-contract rezultat i preći na formalni E4 baseline |
| 9 | E4 baseline i controlled-change hypothesis | ChatGPT | Pomoć pri formiranju reproducibilnog 60/120 FPS testa i dokumentovanju hipoteze pre bilo kakvog fixa | Merenje stvarnog baseline problema i unapred definisan Claim/Signal/Hypothesis/Minimum change/Check/Limitation | Elena je formalno izmerila 115.000 px na 60 FPS i 230.000 px na 120 FPS; E4 baseline = FAIL; zatim je `EVIDENCE_003.md` sa hipotezom commitovan pre promene koda | Dozvoliti Codex-u samo jednu minimalnu FPS controlled change izmenu |
| 10 | FPS controlled change | Codex | Testiranje unapred dokumentovane hipoteze minimalnom izmenom update-loop logike | Ukloniti frame-rate zavisnost bez promene `PADDLE_SPEED`, `STEP`, `GameConfig`, renderinga ili collision pravila | Codex je promenio stop condition tako da prati status na ulazu u `update()` i dodao 2 fokusirana regression testa; prijavio 16/16 testova, uspešan build i 0 px razlike u E4 | Ljudski pregledati diff i nezavisno ponoviti testove, build i E4 merenje pre commita |
| 11 | Controlled-change review i after-change evals | ChatGPT | Pomoć pri proveri minimalnosti diff-a i preciznom ponavljanju istih eval scenarija posle promene | Human-verified before/after dokaz bez oslanjanja samo na AI izveštaj | Elena je nezavisno dobila 16/16 testova, uspešan build i `git diff --check`; E1 PASS, E2 PASS, E3 PASS; E4 je prešao sa 115/230 px na 345/345 px za 1 s, uz supporting 0.5 s rezultat 230/230 px pre boundary clamp-a | Commitovati controlled change i upisati finalne after-change rezultate |
| 12 | Final evidence documentation | ChatGPT | Pomoć pri sređivanju finalnog `EVALS.md`, `EVIDENCE_003.md` i ovog AI usage loga na osnovu stvarno izvršenih koraka | Konzistentan evidence trail koji jasno odvaja baseline, AI pomoć, human review, formalne rezultate i poznata ograničenja | Finalni E1–E4 before/after rezultati i commit reference objedinjeni su u dokumentaciji bez retroaktivnog menjanja baseline dokaza | Završiti finalni test/build, otvoriti PR, merge-ovati u `main` i uraditi post-merge verifikaciju |

## Human Verification Summary

AI rezultat nije prihvatan kao dokaz sam po sebi.

Elena je tokom Week 3 rada nezavisno:

- pregledala Codex planove pre odobravanja implementacije;
- pregledala stvarne Git diffove pre commita;
- pokretala `npm test`;
- pokretala `npm run build`;
- koristila `git diff --check`;
- formalno izvršila E3;
- formalno izvršila E4 pre FPS promene;
- commitovala hipotezu pre controlled change-a;
- ponovila E1–E4 posle controlled change-a;
- proverila da originalni gameplay i runtime-validation scenariji nisu regresirali.

## Key AI-Assisted Decisions

AI je korišćen za ubrzavanje analize, strukturisanje dokumentacije i predlaganje minimalnih implementacija, ali sledeće odluke nisu prepuštene AI-u:

- prihvatanje project scope-a;
- izbor autoritativnog konteksta;
- odobravanje Codex planova;
- odluka da se originalni baseline ne popravlja pre formalnog merenja;
- izbor E3 invalid inputa;
- odluka da se FPS problem formalno meri pre fixa;
- prihvatanje controlled-change hipoteze;
- odobravanje i commit implementacije;
- konačna procena PASS/FAIL na osnovu lokalno izvršenih provera.

## Usage Notes

- Tačna token/cost potrošnja za ChatGPT pozive nije dostupna u ovom radnom toku.
- Evidentirani su značajni AI pozivi i veće coding-agent iteracije, a ne svaka kratka pomoćna poruka.
- Privatni chain-of-thought nije beležen.
- Rezultati se nisu prihvatali samo zato što ih je AI generisao; svaki relevantan rezultat prolazio je ljudsku proveru i/ili lokalnu verifikaciju.
- Codex nije commitovao niti pushovao odobrene implementacione promene; commit/push koraci su ostali pod ljudskom kontrolom.

## Week 4 — AI Hint integration and evidence reconciliation (2026-09-29)

AI assistance was used for SpecKit analysis and planning, controlled TypeScript migration, final-contract test-first work, deterministic fake-provider integration, Gemini adapter scaffolding with an injected stub client, frontend AI Hint integration, and evidence reconciliation. The intended result was a small explicit AI Hint flow with a browser/backend boundary and a server-controlled Gemini provider.

Human decisions controlled the scope: no autonomous calls, no frame-loop integration, no fallback provider, no extra tools, and no live Gemini call at that earlier implementation checkpoint. Elena reviewed the implementation changes, preserved the Week 3 game, ran the documented local gates, manually verified the browser/gameplay flow, and performed the secret-boundary checks.

The contract work followed a test-first sequence: the focused final-contract tests first produced the recorded RED result, then passed in the recorded GREEN result. Fake-provider, backend, frontend-build, security-sentinel, and manual-browser results are kept distinct from live-provider evidence.

At that earlier checkpoint, limited live Gemini validation had not been run. The planned final Isidora review/role swap, secret-boundary review, and joint confirmation that both members can explain the final flow remain unevidenced. These are recorded as limitations rather than inferred from AI output or fabricated participation.

### Week 4 live-provider follow-up (2026-09-30)

The live-provider troubleshooting and final validation were human-controlled. The initial 403 responses, unavailable billing tier, adapter schema correction, auth/access classification fix, local gates, and successful Gemini validations were recorded from observed results. AI assistance helped organize the evidence, while Elena controlled the provider/project decision, secret handling, request limit, browser verification, and PASS interpretation.

The successful request used the fixed Gemini model and was followed by manual browser confirmation of the end-to-end flow. No API key or private provider payload was recorded. Live validation is now evidenced, while the final pair-review, role swap, and joint-understanding requirements remain unresolved.

## 2026-10-06 — Hazard Arena scope and Armored Bricks

**Pair context**: Elena + Isidora working together on one development environment. This records the team's current reported pair work; it is not attributed only to Elena and does not retroactively close the unresolved Week 4 role-swap or final pair-review evidence.

**Team decision**: The pair returned to Neon Breaker as the continuing W03/W04 project for Week 5. They selected the locked Hazard Arena scope: Armored Bricks, Directional Paddle, Neon Bumpers, Portal Pair, and Moving Shield Gate.

**Reason**: The original basic Breakout state was considered too simple to support a meaningful tactical bounded agent. The team chose deterministic gameplay complexity that preserves the original game while providing useful tactical state for the later Week 5 agent. This decision does not add an agent, AI-controlled gameplay, or a new AI contract now.

**AI/Codex assistance**: Codex inspected `src/game.js`, `src/main.js`, `tests/game.test.js` and `package.json` before editing. The armor implementation was generated with AI assistance: exactly eight deterministic two-hit bricks in the existing grid, score only on destruction, reset restoration and two visual damage states. Six focused regression tests were added; no existing tests were weakened or removed. Codex observed 92/92 tests PASS (0 failed), typecheck PASS, production build PASS and `git diff --check` PASS. The API tests required a permitted localhost run after sandbox `EPERM`; this did not require backend changes.

**Team/human verification**: Elena + Isidora report manually verifying browser behavior together, with manual smoke PASS and existing Week 4 Ask AI for Hint remaining functional. The team supplied the verified checkpoint state and authorized the commit after verification. Human browser observations are distinguished from Codex's automated command results; no additional live-provider details, role assignments or role swap are invented.

**Checkpoint**: `0f88c3e6b50fa2160b283754413b3ee8e2ba9015` — `feat: add armored bricks to Neon Breaker`. Codex created this one commit following explicit user authorization and a clean review of only the three intended gameplay/test files; no push occurred. The earlier Usage Notes statement that Codex did not commit applies to that historical workflow, not to this later authorized action.

**Documentation assistance and next decision**: Codex formalized the five-mechanic scope in `specs/002-neon-hazard-arena/`, appended the active extension to `docs/GAME_SPEC.md`, and created `docs/EVALS_HAZARD_ARENA.md` with observed armor results separated from PLANNED / NOT RUN future evaluations. Only Armored Bricks is implemented. Directional Paddle, Neon Bumpers, Portal Pair and Moving Shield Gate remain planned, followed by full regression/manual smoke. No runtime code or W04 AI contract is changed by this documentation task, and its documentation changes are not committed or pushed.


## 2026-10-06 — Checkpoint 2: Directional Paddle Bounce

**Pair context**: Elena + Isidora working together on one development environment.

**AI/Codex contribution**: Inspected the Hazard Arena spec, existing physics and tests; implemented deterministic left/center/right paddle thirds; replaced the intentionally superseded Week 3 no-spin expectation with focused Hazard Arena tests. Coverage includes zone behavior, exact/adjacent boundaries, velocity replacement, repeated-hit bounds, edge overlap and invalid ascending contact. Codex executed automated verification and aligned the relevant spec/plan/tasks and gameplay/eval documentation with the approved fixed `vx = -240 / 0 / +240` and `vy = -abs(previous vy)` rule. Vertical magnitude is preserved, while total speed varies by zone. No spin accumulates.

**Human/team contribution**: Elena + Isidora report reviewing the resulting behavior and manually testing left, center and right aiming; no sticking or uncontrolled acceleration; existing armored/normal bricks; scoring, lives, restart and win/loss; and continued Week 4 Ask AI for Hint functionality. This is human verification reported by the team, not inferred from AI output.

**Observed evidence**: 99 total / 99 passed / 0 failed / 0 skipped; typecheck PASS; build PASS; `git diff --check` PASS; human manual smoke PASS. Codex reran the required automated gates before the combined runtime/documentation checkpoint commit; all passed with the same 99/99 result. See `docs/EVALS_HAZARD_ARENA.md` for scope and test details.

**Decision**: Fixed horizontal velocities provide deterministic, bounded, testable aiming that a later Week 5 coach can recommend. The team authorized one checkpoint commit, `feat: add directional paddle bounce`, containing these verified changes and this record. No push, new AI contract, Bumper, Portal or Shield implementation is included. Earlier Week 3/4 and armor entries remain historical records.


## 2026-10-06 — Checkpoint 3: Neon Bumpers

**Pair context**: Elena + Isidora working together on one development environment.

**AI/Codex contribution**: Inspected the approved Hazard Arena specification and current physics implementation; implemented three deterministic circular bumpers, circle-circle detection, normal-vector reflection and anti-sticking separation. Added nine focused automated tests for layout/object independence, direct/angled reflection and speed preservation, state invariants, indestructibility, moving-away rejection, tangent/near-miss behavior, zero-distance fallback and restart. Existing tests were preserved unchanged. Codex executed automated verification and updated checkpoint evidence/status without adding further gameplay mechanics.

**Human/team contribution**: Elena + Isidora report reviewing the implementation; manually verifying all three bumpers and direct/glancing bounce behavior; observing no sticking/jitter; confirming playable layout and brick access, indestructibility, no score/life side effects, armored/normal bricks and directional paddle, scoring/misses/restart/win/loss, and functioning Week 4 Ask AI for Hint. These human observations are distinct from AI-assisted implementation/testing.

**Observed evidence**: 108/108 tests PASS (108 total, 0 failed, 0 skipped), typecheck PASS, build PASS, `git diff --check` PASS, human manual smoke PASS. Required automated gates were rerun before the checkpoint commit and passed; detailed evidence, including a resolved approval-service interruption, is in `docs/EVALS_HAZARD_ARENA.md`.

**Decision**: Mark checkpoint 3 complete and create exactly one user-authorized commit, `feat: add neon bumpers`, containing this record and the verified runtime/tests/evidence. Portal Pair, Moving Shield Gate and Tactical Coach remain unimplemented. W04 contracts remain unchanged. No push is authorized or performed.

## 2026-10-06 — Checkpoint 4: Portal Pair

**Pair context**: Elena + Isidora working together on one development environment.

**AI/Codex contribution**: Inspected the approved Hazard Arena specification and existing physics; implemented the linked portal pair, deterministic inclusive circle trigger, exact velocity-preserving teleportation, normalized exit separation with a deterministic +X zero-speed fallback, and 0.15-second simulation-time cooldown. Added twelve focused tests covering both directions, cooldown blocking/expiry, tangency/near misses, exit direction, invariants, fallback behavior, miss reset and restart restoration. Existing tests were retained unchanged. Codex executed automated verification and aligned portal documentation with the approved exit separation plus cooldown rule, replacing the earlier leave-overlap planning requirement.

**Human/team contribution**: Elena + Isidora report reviewing the resulting behavior and manually verifying A → B and B → A teleportation, preserved apparent direction/speed, no ping-pong/sticking/jitter, later re-entry, unchanged score/lives/bricks, previous armored-brick/directional-paddle/bumper mechanics, miss/restart/win/loss, portal restoration and continued Week 4 Ask AI for Hint functionality. Human manual verification is distinct from AI/Codex-assisted implementation and automated testing.

**Observed evidence**: 120/120 tests PASS (120 total, 0 failed, 0 skipped), typecheck PASS, build PASS, `git diff --check` PASS; human manual browser smoke PASS. See the checkpoint 4 record in `docs/EVALS_HAZARD_ARENA.md` for exact rules and evidence.

**Decision**: Mark checkpoint 4 complete and create exactly one user-authorized commit, `feat: add portal pair`, containing the verified runtime/tests and documentation/evidence. Moving Shield Gate and Tactical Coach remain unimplemented; checkpoint 6 full-arena regression remains pending. Week 4 AI contracts/specs remain unchanged. No push is authorized or performed.

## 2026-10-06 — Checkpoint 5: Moving Shield Gate

**Pair context**: Elena + Isidora working together on one development environment.

**AI/Codex contribution**: Inspected the approved Hazard Arena specification and current physics; implemented deterministic shield movement, bounded overshoot reversal, circle-versus-rectangle collision handling, relative-motion approach detection, speed-preserving reflection and separation. Testing exposed repeated velocity flipping during persistent contact with a moving shield end. Codex introduced the bounded `shieldContact` latch to prevent repeated reflections until separation or ball reset, and added thirteen focused automated tests for movement, bounds, frame-rate equivalence, collision/fallback/tangency, continuous contact, invariants, miss/relaunch and restart. Codex executed automated verification and aligned the shield documentation, including the latch's anti-jitter purpose.

**Human/team contribution**: Elena + Isidora report reviewing the implementation and manually verifying shield movement and boundary reversals, direct/angled collision behavior, specifically checking for sticking, jitter and repeated velocity flipping, and observing no unwanted speed increase. They verified life-loss preservation/relaunch, full restart, unaffected score/lives/bricks, all previous Hazard Arena mechanics, miss/win/loss/restart, and continued Week 4 Ask AI for Hint functionality. These manual observations are distinct from AI-assisted implementation and automated testing.

**Observed evidence**: 133/133 tests PASS (133 total, 0 failed, 0 skipped); typecheck PASS; build PASS; `git diff --check` PASS; human manual browser smoke PASS. Detailed checkpoint evidence is recorded in `docs/EVALS_HAZARD_ARENA.md`.

**Decision**: Mark checkpoint 5 complete and create one user-authorized commit, `feat: add moving shield gate`, with its runtime/tests and documentation/evidence. Checkpoint 6 remains pending; Tactical Coach is unimplemented; Week 4 AI contracts/specs are unchanged. No push is authorized or performed.

## 2026-10-06 — Hazard Arena — Final Full Regression

**Pair context**: Elena + Isidora working together on one development environment.

**AI/Codex contribution**: Performed the final source/test/spec consistency audit; verified all five mechanics' gameplay invariants, final physics processing order, lifecycle behavior and initial geometry; audited separation from the unchanged Week 4 AI contract. Reviewed H24–H30 coverage and determined no additional regression test was necessary. Ran the full automated verification suite and generated the final manual acceptance checklist. Final documentation work reconciled completion/evidence and stale status wording without changing runtime, tests or backend code.

**Human/team contribution**: Elena + Isidora executed the final complete browser playthrough. They verified all five mechanics working together, combined hazard rallies, no visible sticking/jitter/repeated velocity flipping or portal ping-pong, playable arena and reachable bricks, destruction-only scoring and maximum 400, life-loss preservation and shield freeze/relaunch, win/loss/full restart, and continued Week 4 Ask AI for Hint functionality. These are human-reported acceptance observations, distinct from Codex analysis and automated execution.

**Observed final evidence**: 133/133 tests PASS (133 total, 0 failed, 0 skipped); typecheck PASS; build PASS; `git diff --check` PASS; final full-arena manual playthrough PASS. Automated gates were executed in the preceding final regression audit and are not rerun solely for this Markdown finalization.

**Decision**: Neon Breaker: Hazard Arena is COMPLETE across all six checkpoints: Armored Bricks, Directional Paddle, Neon Bumpers, Portal Pair, Moving Shield Gate and final regression. Preserve 40 bricks, maximum 400 points, 3 initial lives, original lifecycle, deterministic mechanics and the unchanged Week 4 public contract. The user authorized exactly one documentation commit, `docs: finalize Hazard Arena acceptance`. Tactical Coach remains unimplemented and requires separate scope. Nothing is pushed.

## 2026-10-06 — Week 5 Tactical Coach: Deterministic Core

**Pair context**: Elena + Isidora working together on one development environment. No driver/reviewer rotation is inferred or claimed.

**AI/Codex contribution**: Reviewed the approved `specs/003-neon-tactical-coach/` contracts; helped implement separate Week 5 runtime validators, tactical snapshot derivation and the deterministic strategy evaluator; authored and ran focused automated tests; ran the full regression verification; and performed the final static audit. Tests were authored before their corresponding new modules. Initial focused failures were module-resolution failures because those modules did not yet exist, not proof that every behavioral assertion was individually observed red before implementation.

**Human/team contribution**: Elena + Isidora jointly reviewed the Tactical Coach design and intended snapshot fields and tactical semantics. The team reports manually reviewing the resulting implementation and evidence before acceptance and approving preservation of Week 4 and Hazard Arena behavior. This is team-reported review, distinct from Codex's automated checks; no role swap is invented.

**Observed evidence and boundary**: The reviewed checkpoint passed 23 contract, 10 snapshot and 12 evaluator tests; the full suite passed 178/178 (0 failed, 0 skipped), with typecheck, build and `git diff --check` passing. The new core reads client-reported state and cannot independently prove physical gameplay truth. No Tactical Coach tool, fake provider, agent orchestrator, Gemini adapter, endpoint, UI or live-provider test is claimed complete. See `docs/AGENT_EVALS.md` for the observed checkpoint record.

## 2026-10-06 — Week 5 Tactical Coach: Tool Boundary + Fake Provider

**Pair context**: Elena + Isidora working together on one development environment. No driver/reviewer role swap is inferred or claimed.

**AI/Codex contribution**: Helped implement and test the exact two-tool allowlist, request-scoped evidence context, validated local tool execution, UTF-8 result bound and provider-neutral scripted fake provider. During the static boundary review, Codex identified that a schema-valid evaluator result lacked a trusted semantic comparison. It added two regression tests, corrected the tool path to compare against a fresh canonical recomputation, and reran focused and full automated checks.

**Human/team contribution**: Elena + Isidora report jointly reviewing the authority boundary and requiring a review gate before commit. The team reviewed that model arguments cannot overwrite application-owned snapshot evidence, the fake provider holds no application orchestration authority, the semantic-recomputation defect and its correction, the regression results, and preservation of Week 4 and Hazard Arena behavior. This records reported pair review without inventing individual driver/reviewer assignments.

**Test-first and observed evidence**: Initial tests for the new Checkpoint 2 modules were authored before implementation and first failed because those modules did not exist. The later semantic-recomputation regression tests ran against existing code and produced **15 passed / 2 failed**, both from missing expected `invalid_tool_result` exceptions. After the fix, 17 tactical tool and 11 fake-provider tests passed; the full suite passed **206/206** (0 failed, 0 skipped), with typecheck, build and `git diff --check` passing. See `docs/AGENT_EVALS.md` for the checkpoint evidence. Active agent orchestration, Gemini integration, endpoint, UI and live-provider validation remain pending.

## 2026-10-06 — Week 5 Tactical Coach: Bounded Agent Orchestrator

**Pair context**: Elena + Isidora working together on one development environment. No individual driver/reviewer assignment or role swap is inferred.

**AI/Codex contribution**: Helped implement the fixed three-state orchestration, separate logical-step/provider-attempt/tool-call budgets, one global transient retry, abortable attempt timeout, absolute deadline, local tool budget and cancellation. It implemented candidate-rejection and repeat stops, enforced the final candidate contract, materialized evidence from validated tool results, created and ran fake-first orchestration tests, and performed the final state-machine/security audit. New orchestration tests were authored before the active orchestrator; the observed initial failure was module resolution for the not-yet-implemented compiled module, not independently observed red behavior for every fixture.

**Human/team contribution**: Elena + Isidora jointly reviewed the three-state authority model, including that retries do not count as agent steps, the deadline and tool-call boundaries, evidence materialization, the prohibition on switching the evaluated candidate, and preservation of Week 4 and Hazard Arena. The team retained initial model-prompt isolation as an explicit future Gemini-adapter review gate. This is the team's reported joint review, distinct from Codex's automated checks.

**Observed evidence and next gate**: Checkpoint 3 added 25 orchestration tests and one T017 contract test. The full suite passed **232/232** (0 failed, 0 skipped); typecheck, build and `git diff --check` passed. The provider-neutral interface may hold the validated request as trusted application plumbing, but the future Gemini adapter must not serialize `TacticalRequest.state` to the model before the snapshot tool succeeds. No Gemini adapter, Coach endpoint or UI, live-provider check, deployed-timeout verification or manual Coach demo is claimed complete. See `docs/AGENT_EVALS.md` for the detailed automated record.
