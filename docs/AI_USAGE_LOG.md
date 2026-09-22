# AI Usage Log

Ovaj dokument beleži značajne AI pozive i odluke tokom razvoja projekta.

Ne beležimo privatni chain-of-thought. Beležimo cilj poziva, očekivanje, rezultat i odluku koja je usledila.

| # | Faza | AI alat | Zašto je AI pozvan | Šta se očekivalo | Rezultat | Sledeća odluka |
|---:|---|---|---|---|---|---|
| 1 | Specification | ChatGPT | Pomoć pri strukturisanju početnog scope-a igre prema zahtevima zadatka | Mali i proverljiv `GAME_SPEC.md` sa jasnim out-of-scope granicama i Definition of Done | Napravljen i ručno pregledan `GAME_SPEC.md`; zatim commitovan pre implementacije | Zaključati način rada coding agenta |
| 2 | Prompt design | ChatGPT | Pomoć pri strukturisanju prvog build prompta za coding agenta | Prompt koji ograničava scope, definiše autoritativni kontekst, verifikaciju i zahteva plan pre implementacije | Napravljen i ručno pregledan `BUILD_PROMPT_V1.md`; zatim commitovan pre implementacije | Pozvati Codex samo za analizu i plan, bez izmene fajlova |

## Usage Notes

- Tačna token/cost potrošnja za ChatGPT pozive nije dostupna u ovom radnom toku.
- Veće coding-agent iteracije biće evidentirane pojedinačno.
- Rezultati se ne prihvataju samo zato što ih je AI generisao; svaki relevantan rezultat prolazi ljudsku proveru i/ili lokalnu verifikaciju.
