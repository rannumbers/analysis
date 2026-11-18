# 04 — Reset your mix every year, or leave it alone?

## The question

Should I reset my mix of shares and cash every year, or leave it alone?

Asked by anyone holding shares alongside cash, for example in retirement savings. Resetting sells some shares after they rise and buys after they fall. With the same luck, the reset mix turns $10,000 into $32,473 while the mix left alone ends at $10,000, and nearly three in four people do better resetting.

## How we ran it

1. **What a practitioner adds:** rebalancing as a volatility harvest (the idea
   behind Shannon's demon). Selling some of what just doubled and buying some of
   what just halved turns a +100% / −50% coin into a ×1.5 / ×0.75 coin on the
   whole portfolio. The geometric mean, √1.125 = 1.0607, is above 1 even though
   the stock's geometric mean is exactly 1. The twist is mean versus typical:
   the mix left alone has the higher average ($438,681 against $105,451) and
   the lower typical result.
2. **Raw material:** the 500 seeded flip sequences, each replayed on both
   people, and the actual year-by-year trades (flip, then sell or buy), not just
   the multipliers.
3. **Methods:** exact binomial over heads; the closed forms
   10,000 × 1.5^h × 0.75^(20−h) for resetting and 5,000 × 2^(2h−20) + 5,000 for
   leaving alone; a step-by-step trade simulation checked against the closed
   form; a sort of the 500 people by who is ahead, then by heads.
4. **Done-check (outside the model):** closed forms asserted in
   `rebalancing.test.ts`: ten heads gives $10,000 left alone and $32,473
   reset; the yearly multiplier is √1.125; resetting wins on 8 to 12 heads and
   only there (left alone wins on 7 or fewer because its cash is a floor, and on
   13 or more because luck compounds), so the exact chance is
   772,616 / 1,048,576 = 73.7%; a 100,000-person run converges to it; the trades
   for one up year then one down year are $2,500 sold and $1,875 bought, ending
   at ×1.125 against ×1 left alone.

## Every number in the video

| Claim | Value | Source |
| --- | --- | --- |
| Stock payoff | heads +100%, tails −50% | `STOCK_ALONE.up`, `STOCK_ALONE.down` |
| Cash return | 0% | no growth term in `rebalanceYear` |
| Left alone, 10 heads of 20 | $10,000 | `leftAloneFinal(STOCK_ALONE, 10)` |
| Mix after heads, after tails | ×1.5, ×0.75 | `1 + REBALANCED.up`, `1 − REBALANCED.down` |
| Reset, 10 heads of 20 | $32,473 | `rebalancedFinal(STOCK_ALONE, 10)` |
| Yearly growth of the reset mix | +6.1% (√1.125 = 1.0607) | `rebalancedYearlyMultiplier` |
| Up year then down year | left alone ×1, reset ×1.125 | `rebalanceSteps` |
| Year one trade | sell $2,500 | `rebalanceSteps(...)[0].sold` |
| Year two trade | buy $1,875 | `rebalanceSteps(...)[1].sold` |
| Reset mix after the two years | $11,250 | `rebalanceSteps(...)[1].after` |
| People | 500 | `STOCK_ALONE.count` |
| Reset ahead, simulated | 344 of 500 | `countRebalancedAhead` |
| Reset ahead, exact | 73.7% | `exactRebalancedWinProbability` |
| Left alone ahead at | 7 or fewer, or 13 or more heads | `headsRebalancedWins` = 8 to 12 |
| Average, left alone, exact | $438,681 | `expectedLeftAlone(STOCK_ALONE)` |
| Average, reset, exact | $105,451 | `expectedFinal(REBALANCED)` |
| Starting stake | $10,000 | `start` |

## Reproduce it

The simulation is seeded, so it gives the same result every run. The tests
assert the exact answers and that the simulation converges on them.

```bash
npm install
npx vitest run src/sim/sims/randomWalkers.test.ts
npx vitest run src/sim/sims/rebalancing.test.ts
```

General information only, not financial advice.
