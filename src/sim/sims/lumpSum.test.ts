import { describe, expect, it } from "vitest";
import {
  EXACT,
  INVESTORS,
  MARKET,
  PATHS,
  enumerateAll,
  expectedDca,
  expectedLump,
  finals,
  findExample,
  investor,
  runInvestors,
  summariseInvestors,
  trajectory,
} from "./lumpSum";

describe("exact answers by enumerating 4,096 paths", () => {
  it("has 4,096 paths", () => {
    expect(PATHS).toBe(4096);
    expect(enumerateAll()).toHaveLength(4096);
  });

  it("the lump sum ends ahead in 2,632 of 4,096 paths, 64.3%", () => {
    expect(EXACT.lumpAhead * PATHS).toBe(2632);
    expect(EXACT.lumpAhead * 100).toBeCloseTo(64.26, 2);
  });

  it("expected finals equal the closed forms", () => {
    expect(EXACT.meanLump).toBeCloseTo(expectedLump(), 6);
    expect(EXACT.meanDca).toBeCloseTo(expectedDca(), 6);
    expect(EXACT.meanLump).toBeCloseTo(63700.67, 2);
    expect(EXACT.meanDca).toBeCloseTo(61986.2, 2);
    expect(EXACT.meanLump - EXACT.meanDca).toBeCloseTo(1714.47, 2);
  });

  it("worst and best years: the lump sum swings wider", () => {
    expect(EXACT.minLump).toBeCloseTo(60000 * 0.97 ** 12, 6);
    expect(EXACT.maxLump).toBeCloseTo(60000 * 1.04 ** 12, 6);
    expect(Math.round(EXACT.minLump)).toBe(41631);
    expect(Math.round(EXACT.minDca)).toBe(49495);
    expect(Math.round(EXACT.maxLump)).toBe(96062);
    expect(Math.round(EXACT.maxDca)).toBe(78134);
    expect(EXACT.minDca).toBeGreaterThan(EXACT.minLump);
    expect(EXACT.maxDca).toBeLessThan(EXACT.maxLump);
    expect(EXACT.sdDca).toBeLessThan(EXACT.sdLump);
  });

  it("the lump sum leads on average and in share, averaging in has the narrower spread", () => {
    expect(EXACT.lumpAhead).toBeGreaterThan(0.5);
    expect(EXACT.meanLump).toBeGreaterThan(EXACT.meanDca);
    expect(EXACT.sdLump).toBeGreaterThan(EXACT.sdDca);
  });

  it("the market averages +0.5% a month", () => {
    expect((MARKET.up + MARKET.down) / 2).toBeCloseTo(0.005, 15);
  });
});

describe("finals", () => {
  it("an all-up year matches the closed form for both plans", () => {
    // All up: lump grows 1.04^12, the last tranche only 1.04 once.
    const allUp = Array<boolean>(12).fill(true);
    const f = finals(allUp);
    expect(f.lump).toBeCloseTo(60000 * 1.04 ** 12, 6);
    expect(f.dca).toBeCloseTo(5000 * Array.from({ length: 12 }, (_, k) => 1.04 ** (k + 1)).reduce((a, b) => a + b, 0), 6);
  });

  it("the trajectory ends where finals says, and both plans start at the stake", () => {
    const ups = investor("lump-sum", 3).ups;
    const t = trajectory(ups);
    const f = finals(ups);
    expect(t.lump[0]).toBe(60000);
    expect(t.dca[0]).toBe(60000);
    expect(t.lump).toHaveLength(13);
    expect(t.lump[12]).toBeCloseTo(f.lump, 6);
    expect(t.dca[12]).toBeCloseTo(f.dca, 6);
  });
});

describe("simulated investors converge on the exact answer", () => {
  const people = runInvestors("lump-sum");
  const sim = summariseInvestors(people);

  it("is reproducible", () => {
    expect(runInvestors("lump-sum", 50)).toEqual(runInvestors("lump-sum", 50));
    expect(INVESTORS).toBe(5000);
  });

  it("the share ahead is within five standard errors of exact", () => {
    const se = Math.sqrt((EXACT.lumpAhead * (1 - EXACT.lumpAhead)) / INVESTORS);
    expect(Math.abs(sim.lumpAhead - EXACT.lumpAhead)).toBeLessThan(5 * se);
  });

  it("the means are within five standard errors of exact", () => {
    expect(Math.abs(sim.meanLump - EXACT.meanLump)).toBeLessThan((5 * EXACT.sdLump) / Math.sqrt(INVESTORS));
    expect(Math.abs(sim.meanDca - EXACT.meanDca)).toBeLessThan((5 * EXACT.sdDca) / Math.sqrt(INVESTORS));
  });

  it("the spreads are within 5% of exact, and no investor beats the exact extremes", () => {
    expect(Math.abs(sim.sdLump / EXACT.sdLump - 1)).toBeLessThan(0.05);
    expect(Math.abs(sim.sdDca / EXACT.sdDca - 1)).toBeLessThan(0.05);
    expect(sim.minLump).toBeGreaterThanOrEqual(EXACT.minLump - 1e-6);
    expect(sim.maxLump).toBeLessThanOrEqual(EXACT.maxLump + 1e-6);
    expect(sim.minDca).toBeGreaterThanOrEqual(EXACT.minDca - 1e-6);
  });

  it("the example investor has the lump sum ahead, at $72,695 and $69,868", () => {
    const ex = findExample("lump-sum");
    expect(ex.lump).toBeGreaterThan(ex.dca);
    expect(Math.round(ex.lump)).toBe(72695);
    expect(Math.round(ex.dca)).toBe(69868);
  });
});
