import { describe, expect, it } from "vitest";
import {
  DISPLAY_STEPS,
  MAX_STEPS,
  POLYA_3D,
  WATSON_3D,
  firstReturnSeries,
  homeWithin,
  originProbability3dBySum,
  originSeries,
  runWorld,
  simulatedHome,
  type Dim,
} from "./polya";

/** Every walk of `steps` steps, counted: those that are home at least once, over all (2d)^steps. */
const bruteForceHome = (dim: Dim, steps: number): number => {
  const choices = 2 * dim;
  const pos = [0, 0, 0];
  const go = (depth: number): number => {
    if (depth === steps) return 0;
    let home = 0;
    for (let axis = 0; axis < dim; axis++) {
      for (const delta of [1, -1]) {
        pos[axis] = (pos[axis] as number) + delta;
        if (pos[0] === 0 && pos[1] === 0 && pos[2] === 0) home += choices ** (steps - depth - 1);
        else home += go(depth + 1);
        pos[axis] = (pos[axis] as number) - delta;
      }
    }
    return home;
  };
  return go(0) / choices ** steps;
};

describe("the exact answers", () => {
  it("1D: u(2n) = C(2n,n)/4^n, the first few by hand", () => {
    const u = originSeries(1, 3);
    expect(u[0]).toBe(1);
    expect(u[1]).toBeCloseTo(2 / 4, 12);
    expect(u[2]).toBeCloseTo(6 / 16, 12);
    expect(u[3]).toBeCloseTo(20 / 64, 12);
  });

  it("2D is the square of 1D, and 3D starts 6, 90, 1860 closed walks out of 6^(2n)", () => {
    const u2 = originSeries(2, 3);
    expect(u2[2]).toBeCloseTo((6 / 16) ** 2, 12);
    const u3 = originSeries(3, 3);
    expect(u3[1]).toBeCloseTo(6 / 36, 12);
    expect(u3[2]).toBeCloseTo(90 / 1296, 12);
    expect(u3[3]).toBeCloseTo(1860 / 46656, 12);
  });

  it("3D from the sum over three axes equals the multinomial formula, far out", () => {
    const u = originSeries(3, 300);
    for (const n of [1, 2, 7, 40, 150, 300]) {
      expect(u[n]).toBeCloseTo(originProbability3dBySum(n), 12);
      expect(Math.abs((u[n] as number) / originProbability3dBySum(n) - 1)).toBeLessThan(1e-9);
    }
  });

  it("the first-return chances are probabilities: non-negative and summing to at most 1", () => {
    for (const dim of [1, 2, 3] as const) {
      const f = firstReturnSeries(dim, 400);
      expect(Math.min(...f)).toBeGreaterThanOrEqual(0);
      expect(f.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(1);
    }
  });

  it("matches brute-force enumeration of every walk, in each dimension", () => {
    const cases: [Dim, number[]][] = [
      [1, [1, 2, 3, 6, 10, 14]],
      [2, [2, 3, 4, 6, 8]],
      [3, [2, 3, 4, 6, 7]],
    ];
    for (const [dim, lengths] of cases) {
      for (const steps of lengths) {
        expect(homeWithin(dim, steps)).toBeCloseTo(bruteForceHome(dim, steps), 12);
      }
    }
  });

  it("an odd step count adds nothing to the even one before it", () => {
    for (const dim of [1, 2, 3] as const) expect(homeWithin(dim, 101)).toBe(homeWithin(dim, 100));
  });

  it("1D: home within 10,000 steps is 0.992, and the miss is about √(2/(π·steps))", () => {
    expect(homeWithin(1, MAX_STEPS)).toBeCloseTo(0.992, 3);
    expect(1 - homeWithin(1, MAX_STEPS)).toBeCloseTo(Math.sqrt(2 / (Math.PI * MAX_STEPS)), 3);
  });

  it("2D: slow, still climbing, not yet 75% at 10,000 steps", () => {
    const p = homeWithin(2, MAX_STEPS);
    expect(p).toBeGreaterThan(0.72);
    expect(p).toBeLessThan(0.75);
    expect(homeWithin(2, MAX_STEPS)).toBeGreaterThan(homeWithin(2, MAX_STEPS / 2));
    expect(homeWithin(2, MAX_STEPS / 2)).toBeGreaterThan(homeWithin(2, MAX_STEPS / 4));
  });

  it("3D: flattens just under Pólya's 0.3405, and never reaches it", () => {
    expect(POLYA_3D).toBeCloseTo(0.3405, 4);
    expect(homeWithin(3, MAX_STEPS)).toBeGreaterThan(0.335);
    expect(homeWithin(3, MAX_STEPS)).toBeLessThan(POLYA_3D);
    // Between 1,000 and 10,000 steps the curve gains under 1 point.
    expect(homeWithin(3, MAX_STEPS) - homeWithin(3, 1000)).toBeLessThan(0.01);
  });

  it("3D: the total expected visits u = Σ u(2n) is 1.516386, which gives 1 − 1/u = 0.3405", () => {
    const n = MAX_STEPS / 2;
    const u = originSeries(3, n);
    const partial = u.reduce((a, b) => a + b, 0);
    // The tail beyond n pairs of steps is about 2(3/(4π))^1.5 × 2/√n.
    const tail = 2 * (3 / (4 * Math.PI)) ** 1.5 * 2 / Math.sqrt(n);
    expect(partial + tail).toBeCloseTo(WATSON_3D, 3);
    expect(1 - 1 / (partial + tail)).toBeCloseTo(POLYA_3D, 3);
  });
});

describe("the simulation converges onto the exact curve", () => {
  const WALKERS = 4000;
  for (const dim of [1, 2, 3] as const) {
    it(dim + "D: within four standard errors at 10, 100, 1,000 and 10,000 steps", () => {
      const run = runWorld("test-polya", dim, WALKERS, 5);
      for (const steps of [10, 100, 1000, 10000]) {
        const p = homeWithin(dim, steps);
        const se = Math.sqrt((p * (1 - p)) / WALKERS);
        expect(Math.abs(simulatedHome(run, steps) - p)).toBeLessThan(4 * se + 1e-9);
      }
    });
  }

  it("is the same every time, and a display path is the walker's own opening", () => {
    const a = runWorld("test-polya", 2, 50, 5);
    const b = runWorld("test-polya", 2, 50, 5);
    expect(a.firstReturn).toEqual(b.firstReturn);
    expect(a.paths).toEqual(b.paths);
    a.paths.forEach((path, i) => {
      expect(path).toHaveLength(DISPLAY_STEPS + 1);
      const first = a.firstReturn[i] as number;
      if (first > 0 && first <= DISPLAY_STEPS) expect(path[first]).toEqual([0, 0, 0]);
      // Never home before the recorded first return.
      const early = path.findIndex((p, s) => s > 0 && p[0] === 0 && p[1] === 0 && p[2] === 0);
      if (first > 0 && first <= DISPLAY_STEPS) expect(early).toBe(first);
      else expect(early).toBe(-1);
    });
  });

  it("each step moves one unit along one axis, and a line walker never leaves its axis", () => {
    const run = runWorld("test-polya", 1, 3, 3);
    for (const path of run.paths) {
      for (let s = 1; s < path.length; s++) {
        const a = path[s - 1] as number[];
        const b = path[s] as number[];
        expect(Math.abs((b[0] as number) - (a[0] as number))).toBe(1);
        expect(b[1]).toBe(0);
        expect(b[2]).toBe(0);
      }
    }
  });
});
