import { describe, expect, it } from "vitest";
import {
  CLASSIC,
  depositAt,
  drawFlips,
  earlyAheadShare,
  exactEarlyAheadProbability,
  expectedFinal,
  finalAtRate,
  finalOf,
  flipCount,
  lifetimeFromFlips,
  meanReturn,
  pileFromFlips,
  runLifetimes,
  steadyPath,
  totalPut,
  type SaverConfig,
} from "./startEarlier";
import { mulberry32 } from "../rng";

/** Short enough to enumerate every sequence: 2^14 lives. */
const SHORT: SaverConfig = {
  startAge: 20,
  earlyLastAge: 22,
  lateFirstAge: 23,
  lateLastAge: 33,
  endAge: 34,
  yearly: 100,
  up: 0.25,
  down: 0.05,
};

describe("the classic set-up", () => {
  it("deposits 10 years against 33, at the coin's +10% average", () => {
    expect(meanReturn(CLASSIC)).toBeCloseTo(0.1, 12);
    expect(flipCount(CLASSIC)).toBe(43);
    expect(totalPut(CLASSIC, "early")).toBe(50_000);
    expect(totalPut(CLASSIC, "late")).toBe(165_000);
    expect(depositAt(CLASSIC, "early", 31)).toBe(5_000);
    expect(depositAt(CLASSIC, "early", 32)).toBe(0);
    expect(depositAt(CLASSIC, "late", 31)).toBe(0);
    expect(depositAt(CLASSIC, "late", 64)).toBe(5_000);
    expect(depositAt(CLASSIC, "late", 65)).toBe(0);
  });

  it("matches the hand sum of 5000 x 1.1^k at a steady 10%", () => {
    let early = 0;
    for (let k = 34; k <= 43; k++) early += 5_000 * 1.1 ** k;
    let late = 0;
    for (let k = 1; k <= 33; k++) late += 5_000 * 1.1 ** k;
    expect(expectedFinal(CLASSIC, "early")).toBeCloseTo(early, 4);
    expect(expectedFinal(CLASSIC, "late")).toBeCloseTo(late, 4);
    expect(Math.round(expectedFinal(CLASSIC, "early"))).toBe(2_035_820);
    expect(Math.round(expectedFinal(CLASSIC, "late"))).toBe(1_222_383);
  });

  it("draws a steady path that ends on the exact expected final", () => {
    for (const who of ["early", "late"] as const) {
      expect(finalOf(steadyPath(CLASSIC, who))).toBeCloseTo(expectedFinal(CLASSIC, who), 4);
    }
  });

  it("puts a steady rate through the same pile logic as the coin", () => {
    const steady = Array.from({ length: 43 }, () => true);
    // Every year heads: the pile must equal the closed form at +25%.
    expect(finalOf(pileFromFlips(CLASSIC, "early", steady))).toBeCloseTo(finalAtRate(CLASSIC, "early", 0.25), 3);
    expect(finalOf(pileFromFlips(CLASSIC, "late", steady))).toBeCloseTo(finalAtRate(CLASSIC, "late", 0.25), 3);
    const tails = steady.map(() => false);
    expect(finalOf(pileFromFlips(CLASSIC, "late", tails))).toBeCloseTo(finalAtRate(CLASSIC, "late", -0.05), 3);
  });
});

describe("exact expectation", () => {
  it("equals the average over every flip sequence of a short life", () => {
    const n = flipCount(SHORT);
    for (const who of ["early", "late"] as const) {
      let sum = 0;
      for (let mask = 0; mask < 2 ** n; mask++) {
        const flips = Array.from({ length: n }, (_, i) => ((mask >> i) & 1) === 1);
        sum += finalOf(pileFromFlips(SHORT, who, flips));
      }
      expect(sum / 2 ** n).toBeCloseTo(expectedFinal(SHORT, who), 6);
    }
  });
});

describe("simulation", () => {
  it("is reproducible and lifetime k does not depend on the count", () => {
    expect(runLifetimes("s", 10).earlyFinals).toEqual(runLifetimes("s", 10).earlyFinals);
    expect(runLifetimes("s", 50).lifetimes.slice(0, 10)).toEqual(runLifetimes("s", 10).lifetimes);
  });

  it("only ever applies the stated payoff", () => {
    const l = lifetimeFromFlips(CLASSIC, drawFlips(mulberry32(5), CLASSIC));
    expect(l.flips).toHaveLength(43);
    expect(l.early).toHaveLength(44);
    expect(l.early[0]).toBe(0);
    // After the last deposit the early pile moves only by the coin.
    for (let i = 11; i < 43; i++) {
      const ratio = (l.early[i + 1] as number) / (l.early[i] as number);
      expect(ratio).toBeCloseTo(l.flips[i] ? 1.25 : 0.95, 9);
    }
  });

  it("agrees with exact enumeration on a short life", () => {
    const exact = exactEarlyAheadProbability(SHORT);
    const run = runLifetimes("short", 20_000, SHORT);
    const { p, se } = earlyAheadShare(run);
    expect(Math.abs(p - exact)).toBeLessThan(5 * se);
  });

  it("averages to the exact expected final, within 5 standard errors", () => {
    const run = runLifetimes("expect", 20_000);
    for (const [finals, who] of [
      [run.earlyFinals, "early"],
      [run.lateFinals, "late"],
    ] as const) {
      const mean = finals.reduce((a, b) => a + b, 0) / finals.length;
      const variance = finals.reduce((a, b) => a + (b - mean) ** 2, 0) / (finals.length - 1);
      expect(Math.abs(mean - expectedFinal(CLASSIC, who))).toBeLessThan(5 * Math.sqrt(variance / finals.length));
    }
  });

  it("has the early saver ahead in about 79% of lives (simulated, not exact)", () => {
    const run = runLifetimes("big", 200_000);
    const { p, se } = earlyAheadShare(run);
    expect(p).toBeGreaterThan(0.78);
    expect(p).toBeLessThan(0.8);
    expect(se).toBeLessThan(0.001);
  });

  it("the video's seed gives 378 of 500", () => {
    const run = runLifetimes("start-earlier", 500);
    expect(run.earlyAhead).toBe(378);
    expect(Math.round(finalOf(run.lifetimes[11]!.early))).toBe(1_404_910);
    expect(Math.round(finalOf(run.lifetimes[11]!.late))).toBe(655_304);
  });
});
