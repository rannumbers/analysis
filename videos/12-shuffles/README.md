# 12 — Three shuffles isn't enough

## The question

How many times should I shuffle before a game of cards?

Asked by anyone at a games night about to give the deck three quick riffles. The exact maths (Bayer and Diaconis, 1992) says about seven.

## How we ran it

1. **What a practitioner adds:** the Gilbert-Shannon-Reeds model, and that the
   distance from random depends only on the count of rising sequences, so it can
   be estimated by simulation without enumerating 52! decks.
2. **Raw material:** one deck riffled step by step, and 10,000 decks riffled ten
   times each.
3. **Methods:** exact Eulerian numbers and binomials in BigInt, total-variation
   distance, a seeded sampler checked against it.
4. **Outside check:** Bayer and Diaconis's published table, 1.000 for one to four
   riffles, then 0.924, 0.614, 0.334, 0.167 and 0.085 for five to nine.

## Every number in the video

| Claim | Value | Source |
| --- | --- | --- |
| Deck size | 52 | `DECK` |
| Runs after three riffles | at most 8 (this deck: 8) | `trailOf(...).runs[3]` |
| Distance after three riffles | 1.00 | `exactDistance(52, 3)` |
| Distance after five | 0.924 | `exactDistance(52, 5)` |
| Distance after seven | 0.334, about a third | `exactDistance(52, 7)` |
| Past seven | halves each time: 0.334, 0.167, 0.085 | `exactDistance(52, 7..9)` |
| Decks simulated | 10,000 | `DECKS` |

## Reproduce it

The simulation is seeded, so it gives the same result every run. The tests
assert the exact answers and that the simulation converges on them.

```bash
npm install
npx vitest run src/sim/sims/riffle.test.ts
```

General information only, not financial advice.
