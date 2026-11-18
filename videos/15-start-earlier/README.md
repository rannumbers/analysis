# 15 — Ten years earlier

## The question

Is starting to invest ten years earlier really worth it?

Asked by anyone in their twenties deciding whether to start now or wait until
they earn more. At a steady 10% a year the early starter ends with $2,035,820
and the late starter with $1,222,383, on a third of the deposits. But the
market is a coin, so luck can flip it: in the simulation it did in about one
lifetime in five.

## How we ran it

1. **What a practitioner adds:** each deposit's growth is a product of distinct
   independent flips, so its expectation is $5,000 × 1.1^years, and the
   expected final is exact for both savers: $2,035,820 and $1,222,383, equal to
   the final at a steady 10%. The chance the early saver is ahead has no
   closed form here (it depends on the order of the flips), so it is simulated,
   and shown with its standard error.
2. **Raw material:** 500 seeded lifetimes of 43 shared flips each, plus a
   200,000-lifetime run in the tests for a tight estimate (about 79%).
3. **Methods:** closed-form expected values; the same simulation checked
   against full enumeration on a short life (2^14 flip sequences); a log-ratio
   pile of the 500 outcomes.
4. **Done-check (outside the model):** `startEarlier.test.ts`.

## Every number in the video

| Claim | Value | Source |
| --- | --- | --- |
| Yearly deposit | $5,000 | `CLASSIC.yearly` |
| Coin | +25% or −5%, average +10% | `CLASSIC.up`, `CLASSIC.down`, `meanReturn` |
| Early deposits | ages 22 to 31, $50,000 | `totalPut(CLASSIC, "early")` |
| Late deposits | ages 32 to 64, $165,000 | `totalPut(CLASSIC, "late")` |
| Early, steady 10% | $2,035,820 (exact, equals the expected final) | `expectedFinal(CLASSIC, "early")` |
| Late, steady 10% | $1,222,383 (exact, equals the expected final) | `expectedFinal(CLASSIC, "late")` |
| Example life, early | $1,404,910 | `finalOf(EXAMPLE.early)` |
| Example life, late | $655,304 | `finalOf(EXAMPLE.late)` |
| Early ahead, 500 lives | 378 of 500 (simulated, SE ±1.9 points) | `run.earlyAhead` |
| Late ahead, 500 lives | 122 of 500 | `500 − run.earlyAhead` |
| Early ahead, 200,000 lives | 79.1% (simulated, SE ±0.1 points) | `earlyAheadShare` |

## Reproduce it

The simulation is seeded, so it gives the same result every run. The tests
assert the exact answers and that the simulation converges on them.

```bash
npm install
npx vitest run src/sim/sims/startEarlier.test.ts
```

General information only, not financial advice.
