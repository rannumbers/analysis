# 01 — Why luck looks like skill

## The question

Is someone with a brilliant investing record actually skilled?

Asked by anyone choosing a fund manager, or watching a friend or an influencer post their winning trades. In a crowd running on pure luck, someone always ends up with a record that looks like genius, so a record on its own cannot tell skill from luck.

## How we ran it



## Every number in the video

| Claim | Value | Source |
| --- | --- | --- |
| Best final value | $113,593 | `finals[bestIndex]` |
| Multiple of stake | 11.4x | `asMultiple(best)` |
| Best walker's heads | 17 of 20 | `wins[bestIndex]` |
| Median final value | $6,648 | `typicalFinal(COIN_FLIP)`, matched by the run |
| Finished ahead | 125 of 500 | `countAbove(run)` |
| Exact chance of finishing ahead | 25.2%, one in four | `exactBeatProbability(COIN_FLIP, start)` |
| Heads needed to finish ahead | 12 of 20 | `minHeadsToBeat(COIN_FLIP, start)` |
| Payoff | heads +20%, tails −20% | `COIN_FLIP.up`, `COIN_FLIP.down` |
| Spoken answer | A record alone cannot separate skill from luck: among 500 no-skill flippers the best ends at $113,593 | the figures above |
| Starting stake | $10,000 | `COIN_FLIP.start` |
| Years | 20 | `COIN_FLIP.years` |

## Reproduce it

The simulation is seeded, so it gives the same result every run. The tests
assert the exact answers and that the simulation converges on them.

```bash
npm install
npx vitest run src/sim/sims/randomWalkers.test.ts
```

General information only, not financial advice.
