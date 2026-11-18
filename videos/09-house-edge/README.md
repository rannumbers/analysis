# 09 — Smaller bets make it worse

## The question

I've got $100 at the casino. Can I double it?

Asked by anyone who walks in with a small stake and a target. The maths says
the best shot is one big bet, and even that is under even, 48.6%. The usual
instinct is to bet small and be patient, and that is the worst plan: each extra
bet hands the house its 2.7% edge again, so $1 at a time doubles you fewer than
one time in two hundred.

## How we ran it

1. **What a practitioner adds:** gambler's ruin. With r = q/p = 19/18, the
   chance of reaching $200 from $100 betting $b at a time is
   (1 − r^(100/b)) / (1 − r^(200/b)) = 1 / (1 + r^(100/b)). The number of bets
   is the exponent, so each halving of the bet size squares r's weight. A
   practitioner also notes that bold play is optimal in an unfavourable game
   (Dubins and Savage, 1965), and that no betting system changes the edge per
   bet.
2. **Raw material:** 1,000 seeded people at each of $100, $10 and $1 a bet,
   each walking until $0 or $200. One person at $10 a bet, followed bet by
   bet, who goes broke after 60 bets.
3. **Methods:** the closed form; the same probability solved independently as
   a tridiagonal linear system at every bet size; the fair coin (p = 1/2) as
   the control, giving 50% at every size.
4. **Done-check (outside the model):** `houseEdge.test.ts`. One bet is exactly
   18/37; $10 bets 36.8%; $1 bets 0.4466%; the closed form equals the linear
   solve at all nine bet sizes; a fair coin gives 50% at all nine; the chance
   falls strictly with every smaller bet; 20,000 simulated people at $100 and
   $10 and 4,000 at $1 land within five standard errors of the exact chance.
   Every narrated number equals what the seeded run returns or the exact
   function gives.

## Every number in the video

| Claim | Value | Source |
| --- | --- | --- |
| Pockets, winning, losing | 37, 18, 19 | `POCKETS`, `WHEEL` |
| Chance a bet wins | 18/37 = 48.6% | `P_WIN` |
| House edge | 1/37 = 2.7% | `HOUSE_EDGE` |
| Start, target | $100, $200 | `HOUSE` |
| One $100 bet doubles you (spoken forty-nine in a hundred) | 48.6% | `doubleChance(100)` |
| $10 bets (spoken thirty-seven in a hundred) | 36.8% | `doubleChance(10)` |
| $1 bets (spoken less than one in two hundred) | 0.4466%, 1 in 224 | `doubleChance(1)` |
| Fair coin, any bet size | 50% | `doubleChance(b, 0.5)` |
| People per bet size | 1,000 | `HOUSE.people` |
| Simulated doublers at $100, $10, $1 | 490, 377, 4 of 1,000 | `runCrowd("house-edge", b)` |
| The example person's bets at $10 | 60, ends at $0 | `findExample("house-edge")` |

## Reproduce it

The simulation is seeded, so it gives the same result every run. The tests
assert the exact answers and that the simulation converges on them.

```bash
npm install
npx vitest run src/sim/sims/houseEdge.test.ts
```

General information only, not financial advice.
