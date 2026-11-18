import { describe, expect, it } from "vitest";
import {
  FLIPS,
  MATE_RUN,
  SEQUENCES,
  flipCoins,
  foldedDistribution,
  inventedSequence,
  longestRun,
  longestRunDistribution,
  probRunAtLeast,
  runStreaks,
  simAtLeast,
} from "./streaks";
import { childRng } from "../rng";

describe("exact run probabilities", () => {
  it("matches the published figures for 100 flips", () => {
    expect(probRunAtLeast(100, 5)).toBeCloseTo(0.972, 3);
    expect(probRunAtLeast(100, 6)).toBeCloseTo(0.807, 3);
    expect(probRunAtLeast(100, 7)).toBeCloseTo(0.542, 3);
  });

  it("agrees with brute force on short sequences", () => {
    const n = 12;
    for (const k of [2, 3, 4, 5]) {
      let hits = 0;
      for (let m = 0; m < 1 << n; m++) {
        const seq = Array.from({ length: n }, (_, i) => ((m >> i) & 1) === 1);
        if (longestRun(seq).length >= k) hits++;
      }
      expect(probRunAtLeast(n, k)).toBeCloseTo(hits / (1 << n), 12);
    }
  });

  it("is a distribution whose typical longest run is about 7", () => {
    const d = longestRunDistribution(FLIPS);
    expect(d.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    const mean = d.reduce((a, p, k) => a + p * k, 0);
    expect(mean).toBeGreaterThan(6.5);
    expect(mean).toBeLessThan(7.5);
    const mode = d.indexOf(Math.max(...d));
    expect(mode).toBe(6);
    expect(foldedDistribution(FLIPS).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
  });
});

describe("simulation", () => {
  it("is reproducible and picks a sequence whose longest run is six", () => {
    const a = runStreaks("streaks");
    expect(runStreaks("streaks").longest).toEqual(a.longest);
    expect(longestRun(a.mate).length).toBe(MATE_RUN);
    expect(a.longest).toHaveLength(SEQUENCES);
  });

  it("converges on the exact answer with many sequences", () => {
    const N = 20_000;
    const longest = Array.from({ length: N }, (_, i) => longestRun(flipCoins(childRng("converge", i), FLIPS)).length);
    expect(simAtLeast(longest, 6, N)).toBeCloseTo(probRunAtLeast(FLIPS, 6), 2);
    expect(simAtLeast(longest, 7, N)).toBeCloseTo(probRunAtLeast(FLIPS, 7), 2);
  });

  it("the 1,000-sequence run lands near the exact answer", () => {
    const r = runStreaks("streaks");
    expect(Math.abs(simAtLeast(r.longest, 6, SEQUENCES) - probRunAtLeast(FLIPS, 6))).toBeLessThan(0.04);
  });

  it("the invented sequence never runs past four", () => {
    expect(longestRun(inventedSequence("streaks")).length).toBe(4);
  });
});
