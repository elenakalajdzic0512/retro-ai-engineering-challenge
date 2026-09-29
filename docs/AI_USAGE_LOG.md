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

Human decisions controlled the scope: no autonomous calls, no frame-loop integration, no fallback provider, no extra tools, no live Gemini call during this work, and no acceptance of unverified AI output as evidence. Elena reviewed the implementation changes, preserved the Week 3 game, ran the documented local gates, manually verified the browser/gameplay flow, and performed the secret-boundary checks.

The contract work followed a test-first sequence: the focused final-contract tests first produced the recorded RED result, then passed in the recorded GREEN result. Fake-provider, backend, frontend-build, security-sentinel, and manual-browser results are kept distinct from live-provider evidence.

Current limitations remain: limited live Gemini validation has not been run, and the planned final Isidora review/role swap, secret-boundary review, and joint confirmation that both members can explain the final flow are not evidenced. These are recorded as limitations rather than inferred from AI output or fabricated participation.
