# AI Usage Log

Ovaj dokument beleži značajne AI pozive i odluke tokom razvoja projekta.

Ne beležimo privatni chain-of-thought. Beležimo cilj poziva, očekivanje, rezultat i odluku koja je usledila.

| # | Faza | AI alat | Zašto je AI pozvan | Šta se očekivalo | Rezultat | Sledeća odluka |
|---:|---|---|---|---|---|---|
| 1 | Specification | ChatGPT | Pomoć pri strukturisanju početnog scope-a igre prema zahtevima zadatka | Mali i proverljiv `GAME_SPEC.md` sa jasnim out-of-scope granicama i Definition of Done | Napravljen i ručno pregledan `GAME_SPEC.md`; zatim commitovan pre implementacije | Zaključati način rada coding agenta |
| 2 | Prompt design | ChatGPT | Pomoć pri strukturisanju prvog build prompta za coding agenta | Prompt koji ograničava scope, definiše autoritativni kontekst, verifikaciju i zahteva plan pre implementacije | Napravljen i ručno pregledan `BUILD_PROMPT_V1.md`; zatim commitovan pre implementacije | Pozvati Codex samo za analizu i plan, bez izmene fajlova |
| 3 | Plan | Codex | Analiza repozitorijuma i predlog minimalne baseline implementacije bez izmene fajlova | Ispravno razumevanje scope-a, minimalan plan, potrebni fajlovi i način verifikacije | Plan prihvaćen uz human review; odobriti samo baseline implementaciju i zadržati Week 3 eval/runtime-validation blok za narednu fazu |
| 4 | Baseline implementation | Codex | Implementacija minimalne Neon Breaker baseline verzije i verifikacija bez naknadnog popravljanja pronađenih problema | Runnable baseline, passing tests/build i stvarni problemi koje možemo kasnije evaluirati | Kreirano 7 odobrenih fajlova; 8/8 testova prolazi; build i local start uspešni; otkriven frame-rate problem i viewport ograničenje | Sačuvati baseline bez fix-a, zatim napraviti eval slučajeve i kontrolisanu promenu |

## Usage Notes

- Tačna token/cost potrošnja za ChatGPT pozive nije dostupna u ovom radnom toku.
- Veće coding-agent iteracije biće evidentirane pojedinačno.
- Rezultati se ne prihvataju samo zato što ih je AI generisao; svaki relevantan rezultat prolazi ljudsku proveru i/ili lokalnu verifikaciju.
