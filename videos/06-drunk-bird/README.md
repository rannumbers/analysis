# 06 — A drunk man always finds his way home, a drunk bird might not

## The question

I'm lost. Should I keep walking, or stay put?

Asked by a lost hiker, or a child separated from their parents in a crowd. Wandering at random on the ground does bring you back eventually, but a quarter of walkers still haven't made it after ten thousand steps. That is the arithmetic behind the advice to stay put. In the air, two in three never return at all.

## How we ran it

1. **What a practitioner adds:** the finite-time exact answer, not only the
   limit. A simulation runs N steps, so what it converges to is P(home within
   N steps), from the renewal relation f(2n) = u(2n) − Σ f(2k)·u(2n−2k),
   rather than Pólya's 1 and 0.3405, which no run reaches. Showing that gap is
   the honest version: the grid is certain in the limit but 74% at 10,000
   steps, and the bird's curve flattens just under 34.05%.
2. **Raw material:** each walker's own steps from its own seeded stream. Only
   the first-return step is stored for every walker, plus the opening 400 steps
   of 40 per world for drawing. Not summaries: the walks.
3. **Methods:** u(2n) in 2D as C(2n,n)²/16ⁿ, by running ratios; in 3D as the
   sum over how many steps go along one axis, in log space, checked against
   the multinomial formula; the renewal relation for first returns;
   brute-force enumeration of every walk of up to 14, 8 and 7 steps (1D, 2D,
   3D); Pólya's constant as 1 − 1/u, with u = 1.516386… summed from the series
   plus its tail.
4. **Done-check (outside the model):** `polya.test.ts`. The series equals brute
   force enumeration in every dimension to twelve decimals; the 3D series equals
   the multinomial formula to nine digits out to n = 300; 2D is below 75% at
   10,000 steps and still climbing; 3D is under 0.3405 and gains under 1 point
   from 1,000 to 10,000 steps; Σ u(2n) plus its tail gives 1.516386 and 1 − 1/u
   gives 0.3405; a 4,000-walker run lands within four standard errors of the
   exact curve in each dimension at 10, 100, 1,000 and 10,000 steps. Every
   narrated number equals what the seeded run returns or the exact function
   gives.

## Every number in the video

| Claim | Value | Source |
| --- | --- | --- |
| Choices per step: ground, air | 4, 6 | `2 × dimension` in `runWorld` |
| Walkers per world | 1,000 | `WALKERS` |
| Longest run | 10,000 steps | `MAX_STEPS` |
| Exact, ground home within 10,000 steps | 73.9% (spoken seventy-four; "three quarters" is the nearest option) | `homeWithin(2, 10000)` |
| Exact, air home ever (Pólya's constant) | 34.05% (spoken thirty-four) | `POLYA_3D` = 1 − 1/1.516386 |
| Ground walker's first return | step 60 | `firstReturn` of the followed walker |
| Simulated home within 10,000 steps | drawn as the blue dots and curve | `simulatedHome` |
| About a quarter still lost on the ground after 10,000 steps | 100 − 73.9 = 26.1% | `homeWithin(2, 10000)` |
| Mean return time on the ground is infinite | exact fact, description only | Pólya, 2D return-time tail |
| Lost hikers are told to stay put | standard search-and-rescue advice; the maths shows only that wandering is unreliable | citable guidance, not simulated |

## Reproduce it

The simulation is seeded, so it gives the same result every run. The tests
assert the exact answers and that the simulation converges on them.

```bash
npm install
npx vitest run src/sim/sims/polya.test.ts
```

General information only, not financial advice.
