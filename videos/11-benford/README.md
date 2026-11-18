# 11 — Real money starts with a one

## The question

If someone made up the numbers on an expense claim, would an auditor notice?

Asked by anyone who has padded a receipt, or reviewed one. The maths says
nothing about any one claim. It says what real, growing figures look like in
bulk: a 1 first about 30% of the time, a 9 first under 5%. Digits spread evenly
across nine values are a pattern real data rarely makes, so forensic
accountants use the law (Mark Nigrini's work) to choose which records to look at
more closely. It flags data for a second look. It does not prove fraud.

## How we ran it

1. **What a practitioner adds:** Benford's law is scale-invariant. It holds for
   data spanning several orders of magnitude, and it is the leading-digit
   distribution of any quantity whose logarithm is uniform. Forensic accountants
   use it as a screen, not a verdict: real data that breaks it (narrow ranges,
   assigned numbers) can be innocent, and a fit proves nothing either.
2. **Raw material:** 1,000 accounts opened on different days, each growing from
   $1,000 to $1,000,000 over 30 years, each read at its own age.
3. **Methods:** sample age uniformly over exactly three decades of growth, so
   log10(balance) is exactly uniform and the exact answer is log10(1 + 1/d);
   a chi-square against Benford and against an even spread.
4. **Done-check (outside the model):** `benford.test.ts` asserts the published
   shares (30.1, 17.6, 12.5, 9.7, 7.9, 6.7, 5.8, 5.1, 4.6), that $1,000 to
   $2,000 takes as long as $5,000 to $10,000, a fine time integral matching
   each share to four places, and a 200,000-account run converging on them.

## Every number in the video

| Claim | Value | Source |
| --- | --- | --- |
| Growth | $1,000 to $1,000,000 in 30 years | `LEDGER` |
| Years to grow tenfold | 10 | `YEARS_PER_DECADE` |
| $1,000 to $2,000 | 3.0 years | `yearsWithDigit(1)` |
| $9,000 to $10,000 | 0.5 years | `yearsWithDigit(9)` |
| Exact share, leading 1 | 30.1% | `benfordShare(1)` |
| Exact share, leading 9 | 4.6% | `benfordShare(9)` |
| Simulated share, leading 1 | 30.6% of 1,000 | `runLedger` |
| Even baseline | 11.1% | `EVEN_SHARE` |

## Reproduce it

The simulation is seeded, so it gives the same result every run. The tests
assert the exact answers and that the simulation converges on them.

```bash
npm install
npx vitest run src/sim/sims/benford.test.ts
```

General information only, not financial advice.
