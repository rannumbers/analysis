import { describe, expect, it } from "vitest";
import { choose } from "../stats";
import {
  RETIRE,
  badFirst,
  exactRuinCount,
  exactRuinShare,
  finalBalance,
  goodFirst,
  orderingsCount,
  ruinYear,
  runRetirees,
} from "./sequenceRisk";

describe("sequence risk", () => {
  it("has C(25,10) orderings", () => {
    expect(orderingsCount(RETIRE)).toBe(3_268_760);
    expect(Math.round(choose(25, 10))).toBe(3_268_760);
  });

  it("without withdrawals the order cannot matter", () => {
    const a = finalBalance(RETIRE, badFirst(RETIRE), false);
    const b = finalBalance(RETIRE, goodFirst(RETIRE), false);
    const closed = RETIRE.nest * 1.15 ** 15 * 0.9 ** 10;
    expect(a / closed).toBeCloseTo(1, 10);
    expect(b / closed).toBeCloseTo(1, 10);
  });

  it("with withdrawals, the same returns in opposite orders split the pair", () => {
    expect(ruinYear(RETIRE, badFirst(RETIRE))).toBe(10);
    expect(finalBalance(RETIRE, badFirst(RETIRE))).toBe(0);
    expect(ruinYear(RETIRE, goodFirst(RETIRE))).toBe(0);
    expect(Math.round(finalBalance(RETIRE, goodFirst(RETIRE)))).toBe(670_388);
  });

  it("the exact share who run out, over all 3,268,760 orderings", () => {
    const walkedAll = exactRuinCount(RETIRE, false);
    expect(walkedAll).toBe(1_351_158);
    expect(exactRuinCount(RETIRE, true)).toBe(walkedAll);
    expect(exactRuinShare(RETIRE)).toBeCloseTo(0.41335, 5);
  });

  it("1,000 shuffled retirees converge on the exact share", () => {
    const run = runRetirees("sequence-risk", RETIRE);
    expect(run.orders).toHaveLength(1000);
    // Binomial standard error at n=1000 is about 1.6 points.
    expect(Math.abs(run.ruined / 1000 - exactRuinShare(RETIRE))).toBeLessThan(0.05);
    for (const o of run.orders) expect(o.filter(Boolean)).toHaveLength(RETIRE.upYears);
  });

  it("a large run is tighter still", () => {
    const run = runRetirees("sequence-risk", { ...RETIRE, count: 20000 });
    expect(Math.abs(run.ruined / 20000 - exactRuinShare(RETIRE))).toBeLessThan(0.015);
  });
});
