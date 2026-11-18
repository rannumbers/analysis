# 08 — When the bad years come

## The question

I'm about to retire. Does it matter when the bad years come?

Asked by anyone close to living off savings. The average return is the same whichever order the years arrive in, but with yearly withdrawals the order decides who runs out: 41.3% of all orderings do.

## How we ran it

1. **What a practitioner adds:** sequence-of-returns risk. The order of returns
   is irrelevant to a lump sum, since the product of the growth factors is the
   same, but it decides the outcome once money leaves each year, because early
   losses are taken from a pot that never gets the chance to recover.
2. **Raw material:** 15 up years (+15%) and 10 down years (−10%) over 25 years,
   a $500,000 pot and $30,000 withdrawn at the start of each year. The worst
   order (all ten down years first) is empty in year 10. The reverse ends with
   $670,388. Both would end at $1,418,609 with no withdrawals.
3. **Methods:** exact enumeration of all C(25,10) = 3,268,760 orderings, with
   the pruned walk checked against the full walk; 1,000 seeded shuffles.
4. **Done-check (outside the model):** `sequenceRisk.test.ts` asserts the
   closed form for the no-withdrawal case, the 3,268,760 orderings, the exact
   1,351,158 that run out (41.3%), and that the seeded 1,000 land within a few
   points of it.

## Every number in the video

| Claim | Value | Source |
| --- | --- | --- |
| Pot, withdrawal | $500,000, $30,000 a year | `RETIRE.nest`, `RETIRE.withdrawal` |
| Returns | +15% up, −10% down | `RETIRE.up`, `RETIRE.down` |
| Years | 25, with 15 up and 10 down | `RETIRE.years`, `RETIRE.upYears` |
| No withdrawals, either order | $1,418,609 | `finalBalance(..., false)` |
| Bad years first | broke in year 10 | `ruinYear(badFirst)` |
| Good years first | $670,388 left | `finalBalance(goodFirst)` |
| Orderings | 3,268,760 | `orderingsCount(RETIRE)` |
| Exact share who run out | 41.3% (1,351,158 orderings) | `exactRuinShare(RETIRE)` |
| Simulated share of 1,000 | 39.8% | `runRetirees("sequence-risk")` |

## Reproduce it

The simulation is seeded, so it gives the same result every run. The tests
assert the exact answers and that the simulation converges on them.

```bash
npm install
npx vitest run src/sim/sims/sequenceRisk.test.ts
```

General information only, not financial advice.
