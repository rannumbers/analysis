import { describe, expect, it } from "vitest";
import { proportionStdError } from "../stats";
import { expectedFinal, flipsOf, typicalFinal } from "./randomWalkers";
import {
  REBALANCED,
  STOCK_ALONE,
  countRebalancedAhead,
  exactRebalancedWinProbability,
  expectedLeftAlone,
  leftAloneFinal,
  leftAloneFromStock,
  headsRebalancedWins,
  rebalanceSteps,
  rebalancedFinal,
  rebalancedYearlyMultiplier,
  runRebalancing,
  stockFinal,
} from "./rebalancing";

describe("the stock alone", () => {
  it("goes nowhere with ten heads and ten tails: ×2 and ×½ cancel", () => {
    expect(typicalFinal(STOCK_ALONE)).toBeCloseTo(10_000, 6);
    expect(stockFinal(STOCK_ALONE, 10)).toBeCloseTo(10_000, 6);
  });
});

describe("the half-and-half mix, rebalanced yearly", () => {
  it("is ×1.5 after heads and ×0.75 after tails", () => {
    expect(1 + REBALANCED.up).toBe(1.5);
    expect(1 - REBALANCED.down).toBe(0.75);
  });

  it("turns $10,000 into $32,473 with ten heads and ten tails: 1.125^10", () => {
    expect(typicalFinal(REBALANCED)).toBeCloseTo(10_000 * 1.125 ** 10, 6);
    expect(rebalancedFinal(STOCK_ALONE, 10)).toBeCloseTo(10_000 * (1.5 * 0.75) ** 10, 6);
    expect(Math.round(rebalancedFinal(STOCK_ALONE, 10))).toBe(32_473);
  });

  it("grows 6.1% a year: the geometric mean is √1.125", () => {
    expect(rebalancedYearlyMultiplier(STOCK_ALONE)).toBeCloseTo(Math.sqrt(1.125), 12);
    expect(rebalancedYearlyMultiplier(STOCK_ALONE) - 1).toBeCloseTo(0.0607, 4);
  });

  it("one up year then one down year: the stock alone ×1, the mix ×1.125", () => {
    const [up, down] = rebalanceSteps(STOCK_ALONE, [true, false]) as [
      ReturnType<typeof rebalanceSteps>[number],
      ReturnType<typeof rebalanceSteps>[number],
    ];
    // Up: the stock doubles to $10,000 beside $5,000 cash, so $2,500 is sold.
    expect(up.flipped).toEqual({ stock: 10_000, cash: 5_000 });
    expect(up.sold).toBeCloseTo(2_500, 9);
    expect(up.after.stock).toBeCloseTo(7_500, 9);
    expect(up.after.cash).toBeCloseTo(7_500, 9);
    // Down: the stock halves to $3,750 beside $7,500 cash, so $1,875 is bought.
    expect(down.flipped).toEqual({ stock: 3_750, cash: 7_500 });
    expect(down.sold).toBeCloseTo(-1_875, 9);
    expect(down.after.stock + down.after.cash).toBeCloseTo(11_250, 9);
    expect(2 * 0.5).toBe(1);
  });

  it("the step-by-step trades equal the closed-form path for every investor", () => {
    const run = runRebalancing("steps", { ...STOCK_ALONE, count: 20 });
    run.stockRun.paths.forEach((path, i) => {
      const steps = rebalanceSteps(STOCK_ALONE, flipsOf(path));
      steps.forEach((s, y) => {
        expect(s.after.stock + s.after.cash).toBeCloseTo(run.rebalancedPaths[i]?.[y + 1] as number, 6);
        expect(s.after.stock).toBeCloseTo(s.after.cash, 6);
      });
    });
  });
});

describe("the same 50/50 mix left alone", () => {
  it("is 5,000 × 2^(2h−20) + 5,000, so average luck ends at $10,000", () => {
    for (let h = 0; h <= 20; h++) {
      expect(leftAloneFinal(STOCK_ALONE, h)).toBeCloseTo(5_000 * 2 ** (2 * h - 20) + 5_000, 6);
    }
    expect(leftAloneFinal(STOCK_ALONE, 10)).toBeCloseTo(10_000, 6);
  });

  it("is $15,000 after an up year and $10,000 after the down year that follows", () => {
    const run = runRebalancing("left", { ...STOCK_ALONE, count: 1, years: 2 });
    expect(leftAloneFromStock(STOCK_ALONE, 20_000)).toBe(15_000);
    expect(leftAloneFromStock(STOCK_ALONE, 10_000)).toBe(10_000);
    expect(run.leftAlonePaths[0]?.[0]).toBe(10_000);
  });
});

describe("resetting yearly against leaving the same mix alone", () => {
  it("at ten heads, resetting makes $32,473 and leaving it alone makes $10,000", () => {
    expect(Math.round(rebalancedFinal(STOCK_ALONE, 10))).toBe(32_473);
    expect(Math.round(leftAloneFinal(STOCK_ALONE, 10))).toBe(10_000);
  });

  it("resetting wins on 8 to 12 heads; left alone wins on 7 or fewer (its cash floor) and on 13 or more", () => {
    expect(headsRebalancedWins(STOCK_ALONE)).toEqual([8, 9, 10, 11, 12]);
    expect(rebalancedFinal(STOCK_ALONE, 12)).toBeGreaterThan(leftAloneFinal(STOCK_ALONE, 12));
    expect(rebalancedFinal(STOCK_ALONE, 13)).toBeLessThan(leftAloneFinal(STOCK_ALONE, 13));
    expect(rebalancedFinal(STOCK_ALONE, 7)).toBeLessThan(leftAloneFinal(STOCK_ALONE, 7));
    expect(rebalancedFinal(STOCK_ALONE, 8)).toBeGreaterThan(leftAloneFinal(STOCK_ALONE, 8));
  });

  it("the exact chance is 73.7%: P(8 to 12 heads of 20) = 772,616 / 1,048,576", () => {
    const p = exactRebalancedWinProbability(STOCK_ALONE);
    expect(p).toBeCloseTo(772_616 / 1_048_576, 9);
    expect(Math.round(p * 1000) / 10).toBe(73.7);
  });

  it("the simulated share converges to the exact chance", () => {
    const big = { ...STOCK_ALONE, count: 100_000 };
    const p = exactRebalancedWinProbability(big);
    const observed = countRebalancedAhead(runRebalancing("convergence", big)) / big.count;
    expect(Math.abs(observed - p)).toBeLessThan(4 * proportionStdError(p, big.count));
  });

  it("left alone has the higher average, from a few lucky runs", () => {
    expect(Math.round(expectedLeftAlone(STOCK_ALONE))).toBe(Math.round(5_000 * 1.25 ** 20 + 5_000));
    expect(Math.round(expectedLeftAlone(STOCK_ALONE))).toBe(438_681);
    expect(Math.round(expectedFinal(REBALANCED))).toBe(Math.round(10_000 * 1.125 ** 20));
    expect(expectedLeftAlone(STOCK_ALONE)).toBeGreaterThan(expectedFinal(REBALANCED));
  });
});
