# 07 — With an edge, betting too much makes you poorer

## The question

You've got an edge. How much should you bet each time?

Who asks it: a skilled card player, a confident investor, a small business
owner reinvesting profit. Anyone who is right more often than wrong, and who
chooses what share of their money rides on each decision. The real-world
consequence is that people with a genuine edge still go broke by betting too
big. The maths puts the best share at the edge itself, 20% here, and a share
twice that turns the same edge into a slow loss.

## How we ran it

1. **What a practitioner adds:** the log-growth view (Kelly 1956; Thorp). What
   compounds is the typical result, so the number to maximise is the growth per
   round g(f) = 0.6·ln(1+f) + 0.4·ln(1−f), not the expected value. It peaks at
   f = 0.6 − 0.4 = 20% and returns to zero at 38.9%. A practitioner also
   separates the mean, which is carried by vanishingly rare runs, from the
   median, which is what happens to you.
2. **Raw material:** 5,000 bettors, each with their own seeded stream of 100
   flips, replayed at every bet size, with every bankroll path kept. One
   bettor with exactly 60 heads is followed at 20%, 40% and all-in.
3. **Methods:** the median of Binomial(100, 0.6) is 60, so the typical result is
   (1+f)⁶⁰(1−f)⁴⁰ × $1,000; the root of g(f) = 0 by bisection; the expectation
   (1+0.2f)¹⁰⁰ × $1,000; the all-in survival chance 0.6¹⁰⁰.
4. **Done-check (outside the model):** `kelly.test.ts`. The median is 60 heads;
   g peaks at 20% with g = 0.0201; g crosses zero at 38.9%; the typical results
   are $7,490 at 20% and $783 at 40%; the expected value all-in is $82.8
   billion and is highest at all-in; surviving all-in has chance 0.6¹⁰⁰; the
   simulated median of 5,000 bettors equals the exact typical result at each
   share, and the simulated growth sits on the exact curve to nine decimals; no
   all-in bettor survives. Every narrated number equals what the seeded run
   returns or the exact function gives. The brief's "near 38.5%" is 38.9% here,
   and the narration says thirty-nine.

## Every number in the video

| Claim | Value | Source |
| --- | --- | --- |
| Chance of heads, payoff | 60%, even money | `KELLY.p` |
| Start, rounds | $1,000, 100 | `KELLY.start`, `KELLY.rounds` |
| Bettors per share | 5,000 | `KELLY.bettors` |
| Best share (spoken twenty percent) | 20% | `bestFraction()` = 0.6 − 0.4 |
| Typical growth at 20% | +2.0% a round (g = 0.0201) | `growthPerRound(0.2)` |
| Growth is zero at (spoken thirty-nine) | 38.9% | `breakEvenFraction()` |
| Median heads in 100 | 60 | `medianWins()` |
| Typical result at 20% (spoken seven and a half thousand) | $7,490 | `typicalFinal(0.2)` |
| Typical result at 40% (spoken under eight hundred) | $783 | `typicalFinal(0.4)` |
| All in, typical | $0, broke at the first tails | `typicalFinal(1)` |
| Simulated median at each share | equals the exact typical result | `median(finalsAt(run, f))` |
| Average, all in (spoken eighty-three billion) | $82.8 billion | `expectedFinal(1)` |
| Survivors of 5,000 all-in | 0 | `finalsAt(run, 1)` |
| Chance to survive 100 rounds all-in | 0.6¹⁰⁰ | `allInSurvival()` |
| One bet at 20% from $1,000 | $200; $1,200 or $800 | `start × f` |

## Reproduce it

The simulation is seeded, so it gives the same result every run. The tests
assert the exact answers and that the simulation converges on them.

```bash
npm install
npx vitest run src/sim/sims/kelly.test.ts
```

General information only, not financial advice.
