# 10 — Doubling down wins most nights and still loses

## The question

My mate says doubling after every loss means you can't lose. Does it work?

Asked by anyone who has heard a confident friend explain a betting system, or
who has wondered whether a losing streak can be fixed by betting more. The
real-world consequence is that a system can win most of the time and still lose
on average, because the rare loss is 63 times the usual win. The maths says it
wins most nights and loses on average.

## How we ran it

1. **What a practitioner adds:** the martingale's two facts. It is a
   bounded-bankroll system, so it has a finite ladder (six bets, $630), and by
   Wald's identity the average profit is the average amount staked times the
   per-bet house edge, 1/37, no matter how the bets are sized. A practitioner
   also separates how often it wins (83% of nights) from what it is worth
   (average night -$16).
2. **Raw material:** 1,000 seeded players, each with their own stream, playing
   twenty nights bet by bet, every night kept, so every staircase is real.
3. **Methods:** the exact distribution of a night (win at +$100, or lose in
   run k for 10(k-1) - 630), the closed form (19/37)^6 for a lost run, and
   linearity of expectation across independent nights.
4. **Done-check (outside the model):** `doubling.test.ts`. The ladder is 10 to
   320 and totals 630, a seventh bet is 640; a run loses with chance
   (19/37)^6 = 1.83%; a night reaches +$100 with chance (1 - (19/37)^6)^10 =
   83.1%; the average night is -$15.99 two ways (the exact distribution, and
   Wald: average runs per night times average profit per run); the simulated
   night-success rate, average night and average after twenty nights sit on the
   exact values.

## Every number in the video

| Claim | Value | Source |
| --- | --- | --- |
| Chance a bet wins | 18 in 37 | `pWinBet()` |
| Bet ladder, total | $10 to $320, $630 | `ladder()`, `ladderTotal()` |
| Seventh bet | $640, more than $1,000 left | `nextBet()` |
| Chance a run loses (spoken under two percent) | (19/37)^6 = 1.83% | `pLoseRun()` |
| A lost run against a win (spoken sixty-three times) | $630 / $10 = 63 | `ladderTotal() / base` |
| Night reaches +$100 (spoken eighty-three in a hundred) | 83.1% | `pNightSuccess()` |
| Average night (spoken sixteen dollars) | -$15.99 | `nightExpectedValue()` |
| Average after twenty nights | -$319.76 | `expectedAfter(20)` |
| Simulated night success, average night, average after twenty | within the test tolerance | `shareOfNightsUp()`, `meanNight()`, `meanPath()` |

## Reproduce it

The simulation is seeded, so it gives the same result every run. The tests
assert the exact answers and that the simulation converges on them.

```bash
npm install
npx vitest run src/sim/sims/doubling.test.ts
```

General information only, not financial advice.
