# 05 — The last 10 cards cost more than the first 90

## The question

Should I keep opening packs to finish my set?

Asked by any collector, or any parent buying packs for a child's binder, with 10
cards left to find. The last 10 cost more openings (292.9 on average) than the
first 90 (225.8), so swapping duplicates or buying those cards on their own
saves most of the cost. Buying the last 10 directly costs 10 cards instead of
about 293 openings. Two collectors who pool every duplicate need 728.8 openings
between them for two full sets, 364.4 each instead of 518.7 (description only:
it does not fit 45 seconds).

## How we ran it

1. **What a practitioner adds:** the coupon collector problem, with the waits
   shown rather than the total. Holding h different cards, a new one turns up
   with probability (100 − h) / 100, so the wait is 100 / (100 − h) openings:
   1 at the start, 100 at the end. The total is 100 × H₁₀₀, with H the harmonic
   number. The twist is where the cost sits: 100 × H₁₀ = 292.9 for the last 10
   against 100 × (H₁₀₀ − H₁₀) = 225.8 for the first 90.
2. **Raw material:** every opening of one seeded collector (which card, and the
   opening on which each new card arrived), then the seeded totals of 1,000
   collectors. Not the summary: the sequence of openings.
3. **Methods:** the harmonic-number closed forms; the exact distribution by
   inclusion-exclusion, P(done within t) = Σₖ (−1)ᵏ C(100,k) (1 − k/100)ᵗ; a
   second route to the same distribution by walking the binder one card at a
   time; a one-collector-at-a-time simulation with each collector on its own
   seeded stream; a histogram checked against the exact curve.
4. **Done-check (outside the model):** closed forms asserted in
   `cardSet.test.ts`: 100 × H₁₀₀ = 518.74, first 90 = 225.84, last 10 = 292.90,
   the last card alone = 100, duplicates at completion = 418.74; the
   inclusion-exclusion formula equals the card-by-card walk to six decimals at
   seven values of t, and sums to the same 518.74 average; a 20,000-collector run
   converges to the totals, both halves, the last card and P(done within 519).
   Every narrated number equals what the seeded run returns or the exact
   function gives.

## Every number in the video

| Claim | Value | Source |
| --- | --- | --- |
| Cards in the set | 100 | `SET_SIZE` |
| Each opening | one of 100, equally likely | `collect` |
| Collectors | 1,000 | `COLLECTORS` |
| Exact average to complete | 518.7 (spoken 519) | `expectedTotal(100)` |
| Exact average, first 90 | 225.8 (spoken 226) | `expectedFirst(100, 90)` |
| Exact average, last 10 | 292.9 (spoken 293) | `expectedLast(100, 10)` |
| Exact, last card alone | 100 | `expectedWait(100, 99)` |
| New-card chance holding 90, 99 | 10%, 1% | `1 / expectedWait` |
| Exact repeats at completion | about 419 | `expectedDuplicates(100)` |
| The exact curve | P(done within t) | `completionCdf` |
| Hero collector, first 90 | 229 | `cardsForFirst` |
| Hero collector, last 10 | 287 | `cardsForLast` |
| Hero collector, total | 516 | `Collector.total` |
| Hero collector, repeats | 416 | `total − 100` |
| Hero collector, last card | 92 openings | `lastCardWait` |
| Simulated average, 1,000 collectors | shown on screen | `mean(totals)` |
| Buying the last 10 directly | 10 cards, against 292.9 openings | arithmetic on `expectedLast` |
| Two collectors pooling duplicates (description only) | 728.8 together, 364.4 each | `expectedOpeningsForSets(100, 2)`, checked by `poolOpenings` |

## Reproduce it

The simulation is seeded, so it gives the same result every run. The tests
assert the exact answers and that the simulation converges on them.

```bash
npm install
npx vitest run src/sim/sims/cardSet.test.ts
```

General information only, not financial advice.
