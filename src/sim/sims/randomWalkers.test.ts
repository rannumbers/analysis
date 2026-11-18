import { describe, expect, it } from "vitest";
import { mulberry32 } from "../rng";
import { proportionStdError } from "../stats";
import {
  COIN_FLIP,
  INDEX_FUND,
  STOCK_PICK,
  asMultiple,
  countAbove,
  edgeTraffic,
  exactBeatProbability,
  exactHeadsDistribution,
  expectedFinal,
  flipsOf,
  headsPath,
  pathFromFlips,
  latticeValue,
  meanReturn,
  minHeadsToBeat,
  runWalkers,
  typicalFinal,
  typicalValueAt,
  walkPath,
  type WalkerConfig,
} from "./randomWalkers";

const TINY: WalkerConfig = { count: 20, years: 5, up: 0.4, down: 0.2, start: 100 };

describe("walkPath", () => {
  it("returns years + 1 values starting at the stake", () => {
    const { path } = walkPath(mulberry32(1), TINY);
    expect(path).toHaveLength(6);
    expect(path[0]).toBe(100);
  });

  it("only ever applies the stated payoff", () => {
    const { path } = walkPath(mulberry32(7), TINY);
    for (let i = 1; i < path.length; i++) {
      const ratio = (path[i] as number) / (path[i - 1] as number);
      expect(Math.min(Math.abs(ratio - 1.4), Math.abs(ratio - 0.8))).toBeLessThan(1e-9);
    }
  });

  it("is reproducible for the same seed", () => {
    expect(walkPath(mulberry32(3), TINY)).toEqual(walkPath(mulberry32(3), TINY));
  });
});

describe("runWalkers", () => {
  it("is reproducible, and walker k is unaffected by the population size", () => {
    expect(runWalkers("w", TINY).finals).toEqual(runWalkers("w", TINY).finals);
    const small = runWalkers("w", { ...TINY, count: 5 });
    const big = runWalkers("w", { ...TINY, count: 500 });
    expect(big.paths.slice(0, 5)).toEqual(small.paths);
  });

  it("identifies the best and worst walkers", () => {
    const run = runWalkers("w", STOCK_PICK);
    expect(run.finals[run.bestIndex]).toBe(Math.max(...run.finals));
    expect(run.finals[run.worstIndex]).toBe(Math.min(...run.finals));
  });

  it("lands every walker on the lattice: the final depends only on the heads", () => {
    const run = runWalkers("w", STOCK_PICK);
    run.finals.forEach((f, i) =>
      expect(f).toBeCloseTo(latticeValue(STOCK_PICK, 20, run.wins[i] as number), 6),
    );
  });
});

describe("the two strategies", () => {
  it("average the same 10% a year", () => {
    expect(meanReturn(INDEX_FUND)).toBeCloseTo(0.1, 12);
    expect(meanReturn(STOCK_PICK)).toBeCloseTo(0.1, 12);
  });

  it("have very different typical results: the swings cost the stock picker", () => {
    // Median = 10 heads, 10 tails.
    expect(typicalFinal(INDEX_FUND)).toBeCloseTo(10_000 * 1.25 ** 10 * 0.95 ** 10, 6);
    expect(typicalFinal(STOCK_PICK)).toBeCloseTo(10_000 * 1.4 ** 10 * 0.8 ** 10, 6);
    expect(typicalFinal(STOCK_PICK)).toBeLessThan(typicalFinal(INDEX_FUND));
  });

  it("the typical path ends at the typical final", () => {
    expect(typicalValueAt(INDEX_FUND, 20)).toBeCloseTo(typicalFinal(INDEX_FUND), 6);
    expect(typicalValueAt(INDEX_FUND, 0)).toBe(10_000);
  });

  it("a stock picker needs 12 heads of 20 to beat the index fund's typical result", () => {
    const bar = typicalFinal(INDEX_FUND);
    expect(minHeadsToBeat(STOCK_PICK, bar)).toBe(12);
    expect(latticeValue(STOCK_PICK, 20, 11)).toBeLessThan(bar);
  });

  it("the exact chance of beating it is 263,950 / 1,048,576", () => {
    expect(exactBeatProbability(STOCK_PICK, typicalFinal(INDEX_FUND))).toBeCloseTo(263_950 / 1_048_576, 12);
  });

  it("the simulated share that beats it converges to the exact answer", () => {
    const big = { ...STOCK_PICK, count: 100_000 };
    const bar = typicalFinal(INDEX_FUND);
    const p = exactBeatProbability(STOCK_PICK, bar);
    const observed = countAbove(runWalkers("convergence", big), bar) / big.count;
    expect(Math.abs(observed - p)).toBeLessThan(4 * proportionStdError(p, big.count));
  });

  it("have the same expected final, $67,275, because they share an average", () => {
    expect(expectedFinal(INDEX_FUND)).toBeCloseTo(10_000 * 1.1 ** 20, 6);
    expect(expectedFinal(STOCK_PICK)).toBeCloseTo(expectedFinal(INDEX_FUND), 6);
    expect(Math.round(expectedFinal(STOCK_PICK))).toBe(67_275);
  });

  it("the simulated mean converges to the expected final", () => {
    const big = { ...STOCK_PICK, count: 100_000 };
    const finals = runWalkers("convergence", big).finals;
    const mean = finals.reduce((a, b) => a + b, 0) / big.count;
    const secondMoment = 10_000 ** 2 * (((1 + big.up) ** 2 + (1 - big.down) ** 2) / 2) ** big.years;
    const se = Math.sqrt((secondMoment - expectedFinal(big) ** 2) / big.count);
    expect(Math.abs(mean - expectedFinal(big))).toBeLessThan(4 * se);
  });

  it("replaying one picker's flips on the index fund's coin gives the same luck, gentler swings", () => {
    const run = runWalkers("w", STOCK_PICK);
    const path = run.paths[0] as number[];
    const flips = flipsOf(path);
    expect(flips.filter(Boolean)).toHaveLength(run.wins[0] as number);
    pathFromFlips(STOCK_PICK, flips).forEach((v, i) => expect(v).toBeCloseTo(path[i] as number, 6));
    const index = pathFromFlips(INDEX_FUND, flips);
    expect(index[20]).toBeCloseTo(latticeValue(INDEX_FUND, 20, run.wins[0] as number), 6);
  });

  it("exact heads distribution sums to 1", () => {
    expect(exactHeadsDistribution(STOCK_PICK).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
  });
});

describe("the ±20% coin (Short 01)", () => {
  it("averages zero, so the expected final value is exactly the stake", () => {
    expect(meanReturn(COIN_FLIP)).toBe(0);
  });

  it("needs 12 heads of 20 to finish ahead: 11 wins still loses money", () => {
    expect(minHeadsToBeat(COIN_FLIP, COIN_FLIP.start)).toBe(12);
    expect(latticeValue(COIN_FLIP, 20, 11)).toBeLessThan(COIN_FLIP.start);
  });

  it("finishes ahead exactly one time in four: 263,950 / 1,048,576", () => {
    expect(exactBeatProbability(COIN_FLIP, COIN_FLIP.start)).toBeCloseTo(263_950 / 1_048_576, 12);
  });

  it("has a typical final of $6,648", () => {
    expect(typicalFinal(COIN_FLIP)).toBeCloseTo(10_000 * 0.96 ** 10, 6);
  });
});

describe("lattice helpers", () => {
  it("headsPath and edgeTraffic agree with the walkers' wins", () => {
    const run = runWalkers("w", { ...STOCK_PICK, count: 50 });
    const heads = run.paths.map(headsPath);
    heads.forEach((h, i) => expect(h[20]).toBe(run.wins[i]));
    const traffic = edgeTraffic(heads);
    expect((traffic.get("0:0:1") ?? 0) + (traffic.get("0:0:0") ?? 0)).toBe(50);
    expect([...traffic.values()].reduce((a, b) => a + b, 0)).toBe(50 * 20);
  });

  it("asMultiple expresses a value as a multiple of the stake", () => {
    expect(asMultiple(50_000, STOCK_PICK)).toBeCloseTo(5, 10);
  });
});
