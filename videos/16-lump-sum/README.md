# 16 — All now, or spread over a year?

## The question

I've got $60,000 to invest. Do I put it all in now, or spread it over a year?

Asked by anyone who has just received a lump of money, such as a bonus, a sale
or a payout. When the market tends to rise, waiting leaves part of the money
earning nothing, so the lump sum is ahead in 64.3% of years and by $1,714 on
average. Spreading it out buys a smaller swing: the worst year loses $10,505
instead of $18,369. The video states both and hands the choice back.

## How we ran it

1. **What a practitioner adds:** the cost of waiting is the return on the
   cash not yet invested. With a rising average, cash at 0% lags, so on
   average the lump sum leads by $1,714, which is the sum of the expected gain
   on each tranche not yet in. Averaging in is also less exposed to the first
   months, so its range is narrower. Real-world studies are often reported to
   find the lump sum ahead roughly two times in three; that is context, not
   something this coin proves.
2. **Raw material:** 5,000 seeded investors, each with twelve flips, both plans
   on the same flips. One investor followed month by month.
3. **Methods:** enumeration of all 2^12 = 4,096 paths (exact share ahead, means,
   spreads); the means again from the closed form
   60,000 × 1.005^12 and Σ 5,000 × 1.005^k; the 5,000 simulated investors.
4. **Done-check (outside the model):** `lumpSum.test.ts`. The enumeration has
   4,096 equally likely paths; the means equal the closed forms; the exact
   share, means and spreads equal the figures narrated here; the lump sum has
   the higher mean and the wider spread; 5,000 simulated investors land within
   five standard errors of the exact share and means. Every narrated number
   equals what the seeded run returns or the enumeration gives.

## Every number in the video

| Claim | Value | Source |
| --- | --- | --- |
| Stake, tranche, months | $60,000, $5,000, 12 | `MARKET` |
| Monthly coin | +4% or −3%, average +0.5% | `MARKET`, `EXPECTED_MONTHLY` |
| Equally likely paths | 4,096 | `PATHS` |
| Lump sum ahead (spoken sixty-four in a hundred) | 64.3% (2,632 of 4,096) | `EXACT.lumpAhead` |
| Expected final, lump sum | $63,701 | `EXACT.meanLump`, `expectedLump()` |
| Expected final, averaging in | $61,986 | `EXACT.meanDca`, `expectedDca()` |
| Average lead (spoken seventeen hundred) | $1,714 | `EXACT.meanLump − EXACT.meanDca` |
| Worst year, lump sum (spoken forty-two thousand) | $41,631, −$18,369 | `EXACT.minLump` |
| Worst year, averaging in (spoken nearly fifty) | $49,495, −$10,505 | `EXACT.minDca` |
| Best year, lump sum, averaging in | $96,062, $78,134 | `EXACT.maxLump`, `EXACT.maxDca` |
| The example investor (spoken seventy-three and seventy thousand) | $72,695 and $69,868 | `findExample("lump-sum")` |
| Simulated investors | 5,000 | `INVESTORS` |

## Reproduce it

The simulation is seeded, so it gives the same result every run. The tests
assert the exact answers and that the simulation converges on them.

```bash
npm install
npx vitest run src/sim/sims/lumpSum.test.ts
```

General information only, not financial advice.
