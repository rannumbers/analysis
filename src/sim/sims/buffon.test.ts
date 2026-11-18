import { describe, expect, it } from "vitest";
import { stdDev, mean } from "../stats";
import {
  LAZZARINI,
  P_CROSS,
  crossChanceAtAngle,
  crowdEstimates,
  estimatePi,
  runPerson,
  standardError,
} from "./buffon";

describe("Buffon's needle, exact", () => {
  it("crosses with chance 2/pi = 63.66% when the match is as long as the board is wide", () => {
    // Average of |sin(angle)| over a half turn, by the midpoint rule.
    const steps = 100_000;
    let sum = 0;
    for (let i = 0; i < steps; i++) sum += crossChanceAtAngle(((i + 0.5) / steps) * Math.PI);
    expect(sum / steps).toBeCloseTo(2 / Math.PI, 8);
    expect(Math.round(P_CROSS * 10_000) / 100).toBe(63.66);
  });

  it("estimates pi as two times drops over crossings", () => {
    expect(estimatePi(1_000, 637)).toBeCloseTo(3.1397, 3);
    expect(estimatePi(10, 0)).toBe(Infinity);
  });

  it("has a standard error of about 0.075 after 1,000 drops and 0.0075 after 100,000", () => {
    expect(standardError(1_000)).toBeCloseTo(0.0751, 3);
    expect(standardError(100_000)).toBeCloseTo(0.00751, 4);
    // A hundred times the drops, ten times the precision.
    expect(standardError(1_000) / standardError(100_000)).toBeCloseTo(10, 10);
  });

  it("makes 3,408 drops too coarse for Lazzarini's 3.1415929", () => {
    expect(Math.abs(LAZZARINI.reported - Math.PI)).toBeLessThan(3e-7);
    expect(standardError(LAZZARINI.drops)).toBeGreaterThan(0.04);
    expect(standardError(LAZZARINI.drops)).toBeLessThan(0.042);
  });
});

describe("the simulation converges on the exact answers", () => {
  it("crosses about 63.66% of the time over 400,000 drops", () => {
    const p = runPerson("buffon-test", 0, 400_000, 0);
    const share = (p.cum[400_000] as number) / 400_000;
    expect(Math.abs(share - P_CROSS)).toBeLessThan(0.004);
  });

  it("gives estimates whose spread across 2,000 boxes of 1,000 matches is about 0.075", () => {
    const est = crowdEstimates("buffon-test", 2_000, 1_000);
    expect(est.every(Number.isFinite)).toBe(true);
    const sd = stdDev(est);
    expect(sd / standardError(1_000)).toBeGreaterThan(0.93);
    expect(sd / standardError(1_000)).toBeLessThan(1.07);
    expect(Math.abs(mean(est) - Math.PI)).toBeLessThan(0.01);
  });

  // The 1/√N law at ten times the 1,000-drop test above. At 100,000 drops this
  // ran 30 million drops and timed out whenever builders rendered in parallel.
  it("narrows by √10 with ten times the drops, so 100,000 drops give about 0.0075", () => {
    const est = Array.from({ length: 300 }, (_, i) => {
      const p = runPerson("buffon-test", i + 1, 10_000, 0);
      return estimatePi(10_000, p.cum[10_000] as number);
    });
    expect(standardError(100_000)).toBeCloseTo(standardError(10_000) / Math.sqrt(10), 12);
    const ratio = stdDev(est) / standardError(10_000);
    expect(ratio).toBeGreaterThan(0.85);
    expect(ratio).toBeLessThan(1.15);
  });

  it("is deterministic for a seed and keeps the first drops' geometry", () => {
    const a = runPerson("s", 0, 50, 10);
    const b = runPerson("s", 0, 50, 10);
    expect(a.drops).toEqual(b.drops);
    expect(a.drops).toHaveLength(10);
    expect(a.drops.filter((d) => d.crosses).length).toBe(a.cum[10]);
  });
});
