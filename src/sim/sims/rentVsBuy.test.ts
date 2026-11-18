import { describe, expect, it } from "vitest";
import {
  RENT_BUY as P,
  binomialPmf,
  buyerNetWorth,
  buyerOutlay,
  enumeratePortfolios,
  exactAnswer,
  homeValue,
  investedAt,
  loanAmount,
  loanOwed,
  portfolioPath,
  rentAt,
  runPairs,
  savings,
  shareAbove,
  type RentBuyParams,
} from "./rentVsBuy";

describe("the mortgage", () => {
  it("is cleared by the last payment of its term", () => {
    expect(loanOwed(P, P.termYears)).toBeCloseTo(0, 4);
    expect(loanOwed(P, 0)).toBe(loanAmount(P));
  });

  it("a 20% deposit gears a 10% rise in the home to a 50% gain on the deposit, before costs", () => {
    const gain = (P.price * 0.1) / (P.price * P.depositShare);
    expect(gain).toBeCloseTo(0.5, 12);
  });

  it("the renter starts with the buyer's deposit plus upfront costs", () => {
    expect(savings(P)).toBe(190_000);
  });

  it("the buyer's yearly outlay stays above rent for the whole 20 years", () => {
    for (let t = 0; t < P.years; t++) expect(investedAt(P, t)).toBeGreaterThan(0);
    expect(buyerOutlay(P) - rentAt(P, 0)).toBeCloseTo(investedAt(P, 0), 9);
  });
});

describe("the exact answer", () => {
  const sorted = enumeratePortfolios(P);
  const exact = exactAnswer(P, sorted);

  it("enumerates all 2^20 share-coin paths", () => {
    expect(sorted.length).toBe(1_048_576);
  });

  it("the expected portfolio matches its closed form", () => {
    const g = 1 + (P.shareUp - P.shareDown) / 2;
    let e = savings(P) * Math.pow(g, P.years);
    for (let t = 0; t < P.years; t++) e += investedAt(P, t) * Math.pow(g, P.years - t);
    expect(exact.renterMean / e).toBeCloseTo(1, 9);
  });

  it("the expected buyer net worth matches its closed form", () => {
    const g = 1 + (P.propUp - P.propDown) / 2;
    expect(exact.buyerMean / (P.price * Math.pow(g, P.years) - loanOwed(P, P.years))).toBeCloseTo(1, 9);
  });

  it("the binomial weights sum to one", () => {
    let s = 0;
    for (let k = 0; k <= P.years; k++) s += binomialPmf(P.years, k);
    expect(s).toBeCloseTo(1, 12);
  });

  it("matches brute force over both coins on a shorter horizon", () => {
    const q: RentBuyParams = { ...P, years: 10, termYears: 20 };
    const props: number[] = [];
    for (let m = 0; m < 1 << 10; m++) {
      let h = 0;
      for (let b = 0; b < 10; b++) if (m & (1 << b)) h++;
      props.push(buyerNetWorth(q, h));
    }
    let ahead = 0;
    for (let s = 0; s < 1 << 10; s++) {
      const path = Array.from({ length: 10 }, (_, b) => Boolean(s & (1 << b)));
      const r = portfolioPath(q, path)[10] as number;
      for (const b of props) if (r > b) ahead++;
    }
    expect(exactAnswer(q).renterAhead).toBeCloseTo(ahead / (1024 * 1024), 12);
  });

  it("pins the headline numbers", () => {
    expect(exact.renterAhead).toBeCloseTo(0.70446, 5);
    expect(Math.round(exact.buyerMean)).toBe(1_780_429);
    expect(Math.round(exact.renterMean)).toBe(2_740_830);
  });

  it("shareAbove counts strictly above", () => {
    const s = Float64Array.from([1, 2, 3, 4]);
    expect(shareAbove(s, 2)).toBe(0.5);
    expect(shareAbove(s, 0)).toBe(1);
    expect(shareAbove(s, 4)).toBe(0);
  });

  it("home value falls with fewer heads", () => {
    expect(homeValue(P, 0)).toBeLessThan(homeValue(P, 1));
  });
});

describe("the simulated pairs", () => {
  it("are reproducible from the seed", () => {
    expect(runPairs("rent-or-buy").share).toBe(runPairs("rent-or-buy").share);
  });

  it("converge on the exact answer", () => {
    const exact = exactAnswer(P);
    const run = runPairs("rent-or-buy");
    const se = Math.sqrt((exact.renterAhead * (1 - exact.renterAhead)) / P.pairs);
    expect(Math.abs(run.share - exact.renterAhead)).toBeLessThan(4 * se);
  });
});
