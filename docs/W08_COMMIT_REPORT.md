# Week 8 — Secure the Arcade: izvještaj prema commitovima

**Datum:** 2026-10-27, Europe/Budapest. **Grana:** `week8/secure-the-arcade`. Izvještaj prati stvarne Git commitove, njihove fajlove i već zabilježene provjere. Ne predstavlja novi puni test run ili završen ljudski pregled.

**Status:** tehnički rad i automatizovani dokazi su završeni; **53/55 zadataka** je označeno. Otvoreni su **T051 — Elenin pregled** i **T055 — zajednička usmena proba/objašnjenja**. Dvije automatizovane, programatski tempirane probe T055 su uspješne i sačuvane odvojeno.

## Izvori i istorija

Podaci o autoru, vremenu, opisu i fajlovima provjereni su pomoću `git log`, `git show` i `git diff`. Vremena u tabeli su lokalna, UTC+01:00 na navedeni datum. Git autor/committer četiri Isidorina commita je **Isidora Popovic**. Implementaciju, provjere i pisanje dokumenata izvršio je **Codex na Isidorin zahtjev**; Git identitet nije dokaz zasebnog ljudskog pregleda.

W05 osnova za poređenje: `e0ef30a1eddc9583a9894b79e10d53424d9f0b2a`. Elenin handoff je početak Isidorinog dijela; raniji W03–W05 zapisi ostaju istorijski sačuvani.

| Commit / lokalno vrijeme | Git opis i doprinos | Izmijenjeni dijelovi i dokaz |
| --- | --- | --- |
| [caf46ef](https://github.com/elenakalajdzic0512/retro-ai-engineering-challenge/commit/caf46ef6cf198ff31e659d939f96ca0a00638357), 15:26:16 | `docs: complete W08 Elena security handoff` — Elenin stabilni početni handoff za Wave B. | Prethodno završene HTTP/admission/event/browser zaštite i njihov zapis u quickstart-u. Ovo je izvorni handoff, ne novi Elenin pregled Wave B. |
| [e41f8ca](https://github.com/elenakalajdzic0512/retro-ai-engineering-challenge/commit/e41f8ca85dcb8b51e873a87b6c5deb114ff9215e), 20:32:07 | `feat: complete W08 Wave B tactical security boundaries` — 17 Wave B zadataka. | `provider-contracts.ts`, `gemini-provider.ts`, `orchestrator.ts`, četiri Tactical test fajla, tasks/quickstart. Uvedena granica normalizovanog provider odgovora 8192 UTF-8 bajta, 2048 izlaznih tokena i 1 SDK HTTP pokušaj; dodati adversarial i kombinovani T17 dokazi. |
| [ace48bf](https://github.com/elenakalajdzic0512/retro-ai-engineering-challenge/commit/ace48bfc8179365cd48625662e59f2d2f2e699a1), 20:57:03 | `test: verify W08 integration and record security evidence` — 10 preostalih tehničkih Wave C zadataka. | T00 igra/Coach/Hint integracija; browser brojači; minimalna popravka nestabilnog disconnect fixture-a; `w08-compare.mjs`; kompletan `EVIDENCE_W08.md`, JSON poređenja/policy/audit podaci i runbook. Runtime i paketi nisu mijenjani. |
| [fd7c58f](https://github.com/elenakalajdzic0512/retro-ai-engineering-challenge/commit/fd7c58f3b52cfb8e1f93a7f57a93ef236757dc76), 21:10:57 | `test: add and record timed T055 technical rehearsal` — prva automatizovana tehnička proba. | `w08-rehearse.mjs`, zaseban timing JSON i screenshot, dopuna izvještaja/runbook-a/zadataka. Izmjereno **8:00.015**, od toga **11.895 s aktivnih koraka**; ostalo je namjerno tempiranje. |
| [b166651](https://github.com/elenakalajdzic0512/retro-ai-engineering-challenge/commit/b166651d492ddf516d70b4e0b3fd63b8040c4b9e), 21:21:15 | `docs: record successful repeat of T055 technical rehearsal` — drugo pokretanje identičnog helper-a. | Novi zaseban timing JSON/screenshot i dopuna dokumenata, uz očuvan prvi rezultat. Izmjereno **8:00.009**, od toga **9.240 s aktivnih koraka**. Nema promjene runtime koda, konfiguracije ili zavisnosti između proba. |

## Šta je završeno

### Wave B — zatvorene provider/tool granice

- Pregledan je stvarno instalirani Gemini SDK 2.24.0. Retry `attempts` uključuje prvi HTTP pokušaj; SDK je eksplicitno ograničen na 1, dok aplikacija zadržava svoj jedan transient retry u ukupna 4 provider pokušaja i 22000 ms.
- Normalizovani provider rezultat ograničen je na **8192 UTF-8 bajta**, provjeren u adapteru i zajedničkoj orkestraciji prije dispatch-a/finalnog uspjeha. To je **post-SDK provjera**, ne mrežni streaming limit ili granica ukupne SDK alokacije.
- Negativni testovi pokrivaju nepoznate/zabranjene/prototipske alate, argumente i drugi kontekst, malicious goal koji zaista stiže fake provideru, nevalidne/prevelike/secret-bearing rezultate, ponavljanja, budžete, odvojeni timeout/deadline i zakašnjelo poravnanje.
- T17 spaja validan falsifikovani snapshot, zlonamjerni cilj, zabranjeni prijedlog i minimalni događaj: 1 provider pokušaj, 0 tool izvršavanja, 0 zabranjenih izvršavanja, nepromijenjeno cijelo lokalno stanje igre i bez sirovog sadržaja/tajne u događaju.
- Uslovni T017/T030 zatvoreni su potvrdom postojećih W05 zaštita; nisu uvedene nepotrebne promjene tool/context/retry kontrole.

### Wave C — integracija, poređenja i dokazi

- T00 provjerava kretanje igre, validan plan iz **3 provider koraka / 2 stvarna dozvoljena alata / 0 zabranjenih izvršavanja**, oba evidence izvora, jedan Hint poziv i potpuno jednako stanje igre tokom savjetovanja; igranje se nastavlja poslije.
- P1 koristi identične HTTP bajtove na neizmijenjenom W05 arhiviranom kodu i W08: maksimum paralelnih zadržanih provider tokova **3→2**, treći W08 zahtjev **429 uz 0 rada**, uspješan oporavak; odvojeni test potvrđuje rolling rate/expiry.
- P2 koristi isti dostupan HTTP-200 kontrolni skript i no-CSP kontrolu: izvršava se na W05, a W08 ga blokira uz **script-src-elem** događaj. Normalan Coach i pokretanje igre rade na oba.
- P3 potvrđuje **0 zabranjenih izvršavanja na oba commita**, uz uspješan dozvoljeni kontrolni tok i jednako cijelo lokalno stanje. Nije napravljena namjerno ranjiva verzija W05.
- Prvi puni repeat otkrio je testnu trku sa fiksnim čekanjem od 20 ms na disconnect. Fixture sada čeka stvarni abort i completion događaj, uz iste zaštitne asercije. Pad je sačuvan u evidence istoriji; runtime timeout ili politika nisu oslabljeni.

### T055 — ponovljiv tehnički raspored

Obje probe izvršile su pet segmenata na stvarnom monotonom tajmeru i završile svaki tehnički korak unutar termina. Svaka proba ima **T00 1/1, HTTP/tool 9/9, browser 8/8, budget/admission 7/7** i uspješno novo P1/P2/P3 poređenje. Preview, fake API i Chromium fixture-i se zatvaraju po završetku.

Osam minuta je **namjerno programatski tempirano**. Vrijeme komandi je posebno izmjereno; rezultat ne predstavlja osam minuta govora, ljudsku smjenu uloga ili neprekidno igranje. Zajednička proba Elene i Isidore ostaje otvorena.

## Zabilježene provjere i granice zaključaka

| Checkpoint | Stvarno zabilježen rezultat | Granica |
| --- | --- | --- |
| Wave B, `e41f8ca` | 94/94 fokusiranih; 331/331 Node; 10/10 browser; typecheck i oba builda PASS. | Fake/stub, bez live Gemini i stvarnih ključeva. |
| Wave C, `ace48bf` | 236/236 odabranih integracionih; 41/41 security selekcije; nakon fixture popravke dva puna pokretanja **332/332**; browser **10/10**, typecheck/build/diff PASS. | Početni repeat sa 331 pass/1 fail nije izbrisan iz zapisa. |
| Prva T055 proba, `fd7c58f` | 17 odabranih Node + 8 browser provjera, sva tri poređenja, 8:00.015/11.895 s aktivnog rada. | Automatizovana, ne ljudska govorna proba. |
| Ponovljena T055 proba, `b166651` | Iste provjere, 8:00.009/9.240 s aktivnog rada. | Dva lokalna mjerenja nisu opšti performance benchmark. |
| Dependency snapshot iz Wave C | Runtime audit exit 0/0 nalaza; full audit exit 1 sa **2 razvojna package nalaza** — Vite i source-map-js. | Nije popravljeno niti nadograđivano. Windows developer-tool rizik ostaje otvoren; detaljna procjena u evidence izvještaju. |

Ovo dokumentovanje ne pokreće ponovo cijeli test suite niti mijenja prethodno izmjerene brojeve. Rezultati se vežu za konkretne commitove i sačuvane artefakte.

## Operativni problem poslije commitova: Coach nije dostupan

Korisnica je prijavila da Tactical Coach ne radi tokom lokalne probe. Codex je direktno izmjerio: preview **4173** vraća stranicu HTTP 200, `/api/tactical-coach` kroz preview vraća 500, a port **3001** odbija konekciju. API proces nije bio pokrenut.

Pokretanje postojećeg API-ja sa `TACTICAL_AI_PROVIDER=fake`, `AI_PROVIDER=fake`, praznim `GEMINI_API_KEY` i portom 3001 vratilo je funkcionalnost. Provjera u Chromiumu nad **stvarnim postojećim preview-em**, a ne novim zamjenskim fixture-om, dobila je **HTTP 200**, `Tactical plan ready.`, dva evidence reda, `AI hint ready.` i 0 page grešaka. **Nije bilo izmjene aplikacionog koda niti posebnog fix commita.**

Za lokalnu demonstraciju preview i API moraju oba ostati pokrenuta. Uputstva za eksplicitni fake režim i dva terminala nalaze se u [quickstart-u](../specs/004-secure-the-arcade/quickstart.md). Ovaj zapis ne garantuje da će lokalni proces preživjeti zatvaranje terminala ili restart računara.

## Preostali rad i predaja

1. Elena stvarno pregleda najmanje jedan Wave B negativni test i njegovo enforcement mjesto i zabilježi svoj nalaz za **T051**.
2. Elena i Isidora zajedno usmeno izvedu runbook, izmjere stvarno trajanje i objasne odluku, zabranjeni efekat, kod, test i granicu dokaza za **T055**.
3. Razvojne dependency nalaze voditi kao otvorene uz već zapisane mitigacije; ne predstavljati ih kao popravljene.

Objava je namijenjena grani **`origin/week8/secure-the-arcade`**, bez force push-a, main merge-a ili PR objave. Pri početnom `git fetch` pregledu udaljeni vrh je već sadržao `e41f8ca`, a lokalna grana je bila **0 behind / 3 ahead**. Paket za push obuhvata `ace48bf`, `fd7c58f`, `b166651` i naknadni dokumentacioni commit ovog izvještaja. Završni SHA i uspjeh pusha provjeravaju se poslije commita; ne izmišljaju se unutar samog commita.

Prethodno postojeći neversionisani `.agents/skills/student-weekly-report/` nije dio Week 8 implementacije/dokaza i ostaje netaknut i izvan predaje.

## Povezani izvještaji i artefakti

- [Kompletni Week 8 evidence i T00–T17 matrica](../EVIDENCE_W08.md)
- [SpecKit zadaci i stvarni status](../specs/004-secure-the-arcade/tasks.md)
- [Quickstart, komande i runbook](../specs/004-secure-the-arcade/quickstart.md)
- [P1/P2/P3 sirovi rezultati](evidence/w08-comparison.json) i [efektivna politika](evidence/w08-policy.json)
- [Full audit](evidence/w08-audit-full.json) i [runtime audit](evidence/w08-audit-runtime.json)
- [Prva T055 proba](evidence/w08-t055-rehearsal.json) i [ponovljena proba](evidence/w08-t055-rehearsal-repeat.json)
- [Prvi screenshot](evidence/w08-t055-normal.png) i [ponovljeni screenshot](evidence/w08-t055-normal-repeat.png)
- [AI Usage Log](AI_USAGE_LOG.md)
