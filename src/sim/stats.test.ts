import { describe, expect, it } from "vitest";
import {
  choose,
  geometricMean,
  histogram,
  hypergeometricAtLeast,
  hypergeometricCdf,
  hypergeometricPmf,
  mean,
  percentile,
  runningMean,
  stdDev,
} from "./stats";

describe("histogram", () => {
  it("counts every value exactly once", () => {
    const h = histogram([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5);
    expect(h.bins.reduce((a, b) => a + b, 0)).toBe(10);
    expect(h.count).toBe(10);
  });

  it("clamps out-of-range values into the end bins", () => {
    const h = histogram([-10, 0.5, 99], 2, { min: 0, max: 1 });
    expect(h.bins.reduce((a, b) => a + b, 0)).toBe(3);
    expect(h.bins[0]).toBe(1); // -10 clamped into the left bin
    expect(h.bins[1]).toBe(2); // 0.5 sits on the upper bin's edge; 99 clamps right
  });

  it("handles all-identical values without dividing by zero", () => {
    const h = histogram([3, 3, 3], 4);
    expect(h.bins.reduce((a, b) => a + b, 0)).toBe(3);
    expect(Number.isFinite(h.binWidth)).toBe(true);
  });
});

describe("summary statistics", () => {
  it("mean and stdDev", () => {
    expect(mean([2, 4, 6])).toBe(4);
    expect(stdDev([2, 4, 6])).toBeCloseTo(Math.sqrt(8 / 3), 10);
    expect(mean([])).toBe(0);
  });

  it("runningMean ends at the overall mean", () => {
    const r = runningMean([1, 2, 3, 4]);
    expect(r[0]).toBe(1);
    expect(r[3]).toBe(2.5);
    expect(r).toHaveLength(4);
  });

  it("percentile interpolates", () => {
    const xs = [1, 2, 3, 4, 5];
    expect(percentile(xs, 0)).toBe(1);
    expect(percentile(xs, 0.5)).toBe(3);
    expect(percentile(xs, 1)).toBe(5);
    expect(percentile([1, 2], 0.5)).toBe(1.5);
  });

  it("geometric mean is below the arithmetic mean when returns vary", () => {
    // +50% then -50% averages to +0% arithmetically but loses 13.4% a year.
    const multipliers = [1.5, 0.5];
    expect(mean(multipliers)).toBe(1);
    expect(geometricMean(multipliers)).toBeCloseTo(Math.sqrt(0.75), 10);
    expect(geometricMean(multipliers)).toBeLessThan(mean(multipliers));
  });

  it("geometric mean survives long runs without underflow", () => {
    const g = geometricMean(new Array(10_000).fill(0.5));
    expect(g).toBeCloseTo(0.5, 10);
  });
});

describe("exact combinatorics", () => {
  it("choose matches known values", () => {
    expect(choose(5, 2)).toBeCloseTo(10, 9);
    expect(choose(52, 5)).toBeCloseTo(2_598_960, 3);
    expect(choose(10, 0)).toBeCloseTo(1, 10);
  });

  it("stays finite for Commander-sized decks", () => {
    expect(Number.isFinite(choose(99, 7))).toBe(true);
    // Exact value is 14,887,031,544; log-space arithmetic costs a little precision,
    // so assert a relative error instead of absolute closeness at this magnitude.
    expect(Math.abs(choose(99, 7) / 14_887_031_544 - 1)).toBeLessThan(1e-9);
  });

  it("hypergeometric PMF sums to 1 over all outcomes", () => {
    // 40-card deck, 17 lands, 7-card opening hand.
    let total = 0;
    for (let k = 0; k <= 7; k++) total += hypergeometricPmf(40, 17, 7, k);
    expect(total).toBeCloseTo(1, 10);
  });

  it("matches a hand-computed case", () => {
    // P(exactly 0 lands in 7 from 40 with 17 lands) = C(23,7)/C(40,7).
    const expected = choose(23, 7) / choose(40, 7);
    expect(hypergeometricPmf(40, 17, 7, 0)).toBeCloseTo(expected, 12);
  });

  it("returns 0 for impossible outcomes", () => {
    expect(hypergeometricPmf(40, 17, 7, 8)).toBe(0); // more than drawn
    expect(hypergeometricPmf(40, 3, 7, 4)).toBe(0); // more than exist
    expect(hypergeometricPmf(40, 36, 7, 0)).toBe(0); // too few non-successes
  });

  it("CDF and atLeast are complementary", () => {
    for (let k = 0; k <= 7; k++) {
      const cdf = hypergeometricCdf(40, 17, 7, k);
      const atLeastNext = hypergeometricAtLeast(40, 17, 7, k + 1);
      expect(cdf + atLeastNext).toBeCloseTo(1, 10);
    }
  });

  it("atLeast(0) is certain and CDF(all) is certain", () => {
    expect(hypergeometricAtLeast(40, 17, 7, 0)).toBe(1);
    expect(hypergeometricCdf(40, 17, 7, 7)).toBeCloseTo(1, 10);
  });
});
