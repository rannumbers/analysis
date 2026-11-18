import { describe, expect, it } from "vitest";
import {
  BET_SIZES,
  EXAMPLE_BET,
  HOUSE,
  HOUSE_EDGE,
  P_WIN,
  doubleChance,
  doubledShare,
  findExample,
  personRng,
  playOut,
  runCrowd,
  walkPath,
} from "./houseEdge";

/** Independent check: solve h(k) = p·h(k+1) + q·h(k−1), h(0)=0, h(N)=1, by the Thomas algorithm. */
const solveChance = (bet: number, p: number): number => {
  const top = HOUSE.target / bet;
  const start = HOUSE.start / bet;
  const q = 1 - p;
  const m = top - 1; // unknowns h(1..top-1)
  const c = new Array<number>(m).fill(0);
  const d = new Array<number>(m).fill(0);
  // Row i: −q·h(i−1) + h(i) − p·h(i+1) = 0, with h(top) = 1 on the last row's right side.
  for (let i = 0; i < m; i++) {
    const a = i === 0 ? 0 : -q;
    const b = 1;
    const cc = i === m - 1 ? 0 : -p;
    const rhs = i === m - 1 ? p : 0;
    const denom = i === 0 ? b : b - a * (c[i - 1] as number);
    c[i] = cc / denom;
    d[i] = (rhs - (i === 0 ? 0 : a * (d[i - 1] as number))) / denom;
  }
  const h = new Array<number>(m).fill(0);
  for (let i = m - 1; i >= 0; i--) h[i] = (d[i] as number) - (c[i] as number) * (i === m - 1 ? 0 : (h[i + 1] as number));
  return h[start - 1] as number;
};

describe("exact answers", () => {
  it("red wins 18 pockets in 37, a 2.7% house edge", () => {
    expect(P_WIN).toBeCloseTo(18 / 37, 15);
    expect(P_WIN * 100).toBeCloseTo(48.65, 2);
    expect(HOUSE_EDGE).toBeCloseTo(1 / 37, 15);
    expect(HOUSE_EDGE * 100).toBeCloseTo(2.7, 1);
  });

  it("one $100 bet doubles you with chance 18/37", () => {
    expect(doubleChance(100)).toBeCloseTo(18 / 37, 12);
  });

  it("$10 bets give about 36.8% and $1 bets about 0.45%", () => {
    expect(doubleChance(10)).toBeCloseTo(0.368, 3);
    expect(doubleChance(1)).toBeCloseTo(0.004466, 5);
    expect(doubleChance(1) * 100).toBeCloseTo(0.45, 2);
    expect(1 / doubleChance(1)).toBeGreaterThan(200);
  });

  it("matches the shortcut 1 / (1 + r^n)", () => {
    const r = 19 / 18;
    for (const b of BET_SIZES) expect(doubleChance(b)).toBeCloseTo(1 / (1 + r ** (100 / b)), 12);
  });

  it("agrees with solving the chain directly at every bet size", () => {
    for (const b of BET_SIZES) {
      if (b === 100) continue; // a single state: no equations to solve
      expect(solveChance(b, P_WIN)).toBeCloseTo(doubleChance(b), 10);
    }
  });

  it("a fair coin gives 50% at every bet size", () => {
    for (const b of BET_SIZES) {
      expect(doubleChance(b, 0.5)).toBe(0.5);
      if (b !== 100) expect(solveChance(b, 0.5)).toBeCloseTo(0.5, 10);
    }
  });

  it("smaller bets are strictly worse, and always below even", () => {
    for (let i = 1; i < BET_SIZES.length; i++) {
      expect(doubleChance(BET_SIZES[i] as number)).toBeLessThan(doubleChance(BET_SIZES[i - 1] as number));
    }
    for (const b of BET_SIZES) expect(doubleChance(b)).toBeLessThan(0.5);
  });
});

describe("the simulation converges on them", () => {
  it("is a pure function of the seed", () => {
    expect(playOut(personRng("t", 10, 3), 10)).toEqual(playOut(personRng("t", 10, 3), 10));
    expect(runCrowd("t", 10, 50)).toEqual(runCrowd("t", 10, 50));
  });

  it("$100 and $10 bets: simulated share is within five standard errors", () => {
    for (const b of [100, 10] as const) {
      const exact = doubleChance(b);
      const n = 20_000;
      const se = Math.sqrt((exact * (1 - exact)) / n);
      expect(Math.abs(doubledShare(runCrowd("conv", b, n)) - exact)).toBeLessThan(5 * se);
    }
  });

  it("$1 bets: simulated share is within five standard errors", () => {
    const exact = doubleChance(1);
    const n = 4000;
    const se = Math.sqrt((exact * (1 - exact)) / n);
    expect(Math.abs(doubledShare(runCrowd("conv", 1, n)) - exact)).toBeLessThan(5 * se);
  });

  it("every walk ends at exactly $0 or $200", () => {
    const path = walkPath(personRng("t", 10, 0), 10);
    const end = path[path.length - 1] as number;
    expect([0, 200]).toContain(end);
    expect(path[0]).toBe(100);
  });

  it("the example person bets $10 at a time and goes broke", () => {
    const ex = findExample("t");
    expect(ex.path[0]).toBe(100);
    expect(ex.path[ex.path.length - 1]).toBe(0);
    expect(ex.path.length - 1).toBeGreaterThanOrEqual(60);
    expect(EXAMPLE_BET).toBe(10);
  });
});

describe("the narrated figures for seed house-edge", () => {
  it("one person at $10 goes broke after sixty bets, and the crowds match the script's table", () => {
    expect(findExample("house-edge").path.length - 1).toBe(60);
    const counts = [100, 10, 1].map((b) => runCrowd("house-edge", b).outcomes.filter((o) => o.doubled).length);
    expect(counts).toEqual([490, 377, 4]);
  });
});
