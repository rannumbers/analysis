# 14 — Pi from dropped matches

## The question

Could I work out pi by dropping matches on my floorboards?

Asked by anyone with a box of matches and a wooden floor. Yes, but slowly. A
box of a thousand gets you "about 3.1", two correct decimals take tens of
thousands of drops, and every extra digit costs a hundred times more.

## How we ran it

1. **What a practitioner adds:** the estimate is 2/p̂, so by the delta method
   its error is (π²/2)·√(p(1−p)/N) with p = 2/π: about ±0.075 at 1,000 drops
   and ±0.0075 at 100,000. In 1901 Mario Lazzarini reported 3,408 drops giving
   3.1415929, which is 355/113. At 3,408 drops the typical error is about
   0.04, so a result within 0.0000003 of π is too good to be true: he very
   likely stopped at a convenient moment. This script does not use it, to keep
   to one question, but the numbers are in `buffon.test.ts`.
2. **Raw material:** one person's 100,000 drops (the first hundred kept as
   geometry), and 200 other people's boxes of 1,000.
3. **Methods:** a drop is a centre and an angle; it crosses when a crack lies
   between the match's two ends. Log-spaced running estimates draw the funnel
   of ±1 standard error.
4. **Done-check (outside the model):** `buffon.test.ts` asserts 2/π by
   integrating over the angle, the error 0.0751 and 0.00751, that 2,000 boxes
   of 1,000 spread within 7% of the formula, and that 300 runs of 100,000 spread
   within 15% of it.

## Every number in the video

| Claim | Value | Source |
| --- | --- | --- |
| Chance a match crosses | 63.66% (2/π) | `P_CROSS` |
| Ten drops | 5 cross, pi estimate 4.0 | `runPerson`, person 0 |
| A hundred drops | 65 cross, 3.08 | `runPerson`, person 0 |
| A thousand drops, you | 637 cross, 3.14 | `runPerson`, person 0 |
| Spread at 1,000 drops, exact | 0.0751 | `standardError(1000)` |
| Spread at 100,000 drops, exact | 0.00751 | `standardError(100000)` |
| A hundred thousand drops, you | 63,470 cross, 3.151 | `runPerson`, person 0 |

## Reproduce it

The simulation is seeded, so it gives the same result every run. The tests
assert the exact answers and that the simulation converges on them.

```bash
npm install
npx vitest run src/sim/sims/buffon.test.ts
```

General information only, not financial advice.
