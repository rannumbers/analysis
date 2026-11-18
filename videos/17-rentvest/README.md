# 17 — Buy, or rent and invest

## The question

Should I buy a home with a mortgage, or rent and invest the difference?

Asked by anyone saving a deposit. Both people start with the same money and the same twenty years. The home is a leveraged bet on property, the portfolio a bet on shares, and each has its own luck.

## How we ran it

1. **What a practitioner adds:** leverage and carrying costs. A 20% deposit
   means a 10% rise in the home is a 50% gain on the deposit, before costs; a
   10% fall is a 50% loss. Interest, upkeep and upfront costs are what the
   comparison hinges on, and the renter's rent rises while the mortgage
   payment does not, so the money the renter can invest shrinks every year.
2. **Raw material:** an $800,000 home, 20% deposit ($160,000) and $30,000 of
   upfront costs, so each person starts with $190,000. A 30-year
   principal-and-interest mortgage at 6% fixed ($46,495 a year), upkeep of
   $16,000 a year, so the buyer's outlay is $62,495 a year. Rent starts at
   $32,000 and rises 3% a year. The home is up 12% or down 2% each year; the
   renter's shares are up 25% or down 5% (the index coin of Short 01b). No
   selling costs and no tax. After 20 years the buyer still owes $342,209.
3. **Methods:** the buyer's net worth depends only on the number of up years,
   a binomial lattice of 21 outcomes. The renter's portfolio depends on the
   order of years, so all 2^20 = 1,048,576 share paths are enumerated once.
   The coins are independent, so the exact chance the renter finishes ahead
   is the sum over property heads k of P(k) × P(portfolio beats the buyer at
   k). 1,000 seeded pairs of lives converge on it.
4. **Done-check (outside the model):** `rentVsBuy.test.ts` asserts the
   closed-form expected values of both sides, the 2^20 paths, the 20% deposit
   leverage arithmetic, and that the lattice sum equals a brute-force count
   over both coins on a shorter horizon.

## Every number in the video

| Claim | Value | Source |
| --- | --- | --- |
| Illustrative assumptions | $800,000 home, 20% deposit, $30,000 upfront, 6% fixed, 30-year term, $16,000 upkeep, $32,000 rent rising 3% | `RENT_BUY` |
| Each starts with | $190,000 | `savings(RENT_BUY)` |
| Property coin | +12% or −2% a year | `RENT_BUY.propUp`, `propDown` |
| Share coin | +25% or −5% a year | `RENT_BUY.shareUp`, `shareDown` |
| Leverage | a 10% rise is a 50% gain on the deposit | `rentVsBuy.test.ts` |
| Example buyer net worth | $1,687,954 (10 up years) | `buyerNetWorth(RENT_BUY, 10)` |
| Example renter portfolio | $2,000,265 | `portfolioPath(RENT_BUY, examplePair("rent-or-buy").share)` |
| Share-coin paths enumerated | 1,048,576 | `enumeratePortfolios(RENT_BUY)` |
| Exact share where renting finishes ahead | 70.4% | `exactAnswer(RENT_BUY).renterAhead` |
| Expected net worth, buyer | $1,780,429 | `exactAnswer(RENT_BUY).buyerMean` |
| Expected portfolio, renter | $2,740,830 | `exactAnswer(RENT_BUY).renterMean` |
| Simulated share of 1,000 pairs | 70.3% | `runPairs("rent-or-buy")` |

## Reproduce it

The simulation is seeded, so it gives the same result every run. The tests
assert the exact answers and that the simulation converges on them.

```bash
npm install
npx vitest run src/sim/sims/rentVsBuy.test.ts
```

General information only, not financial advice.
