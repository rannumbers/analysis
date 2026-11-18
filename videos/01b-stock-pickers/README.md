# 01b — Same average, half the money

## The question

Should I pick my own stocks, or buy the top 100?

Asked by anyone putting savings away for twenty years. Same average return either way, but the typical stock picker ends up with about half as much, and three in four end up behind the index.

## How we ran it

1. **What a practitioner adds:** volatility drag. Both coins average +10%
   (arithmetic), so both have the same expected final, $67,275. Their
   geometric means differ, 9.0% a year for the index and 5.8% for the stock,
   so the typical stock picker ends with about half. The twist is mean versus
   median: a few huge winners hold up the stock pickers' average.
2. **Raw material:** the 500 seeded stock paths, and one picker's exact flips
   replayed on the index fund's coin. Same luck, different swings.
3. **Methods:** exact binomial over heads, lattice values, the expected value
   (1 + 10%)^20, and a log scale that zooms out from one pair of lines to the
   whole crowd.
4. **Done-check (outside the model):** closed forms asserted in
   `randomWalkers.test.ts`: the expected final is $67,275 for both coins, and a
   100,000-picker run converges to it; the typical finals are $55,762 and
   $31,058; the exact chance of beating the index is 263,950 / 1,048,576.
   Every narrated number equals what the seeded run returns.

## Every number in the video

| Claim | Value | Source |
| --- | --- | --- |
| Top 100 payoff | heads +25%, tails −5% | `INDEX_FUND.up`, `INDEX_FUND.down` |
| Stock payoff | heads +40%, tails −20% | `STOCK_PICK.up`, `STOCK_PICK.down` |
| Average return, both | +10% a year | `meanReturn(...)` |
| Top 100, 10 heads of 20 | $55,762 | `typicalFinal(INDEX_FUND)` |
| Stock, 10 heads of 20 | $31,058 | `typicalFinal(STOCK_PICK)` |
| One heads plus one tails | top 100 +18.75%, stock +12% | `(1 + up) × (1 − down)` |
| Expected final, both | $67,275 | `expectedFinal(...)` |
| Simulated average of 500 | $67,248 | mean of `finals` |
| Luckiest stock picker | $509,766 (15 heads) | `finals[bestIndex]` |
| Behind the index | 371 of 500 | `count − countAbove(run, typicalFinal(INDEX_FUND))` |
| Exact chance of beating the index | 25.2%, one in four | `exactBeatProbability(STOCK_PICK, typicalFinal(INDEX_FUND))` |
| Starting stake | $10,000 | `start` |

## Reproduce it

The simulation is seeded, so it gives the same result every run. The tests
assert the exact answers and that the simulation converges on them.

```bash
npm install
npx vitest run src/sim/sims/randomWalkers.test.ts
```

General information only, not financial advice.
