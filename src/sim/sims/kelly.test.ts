import { describe, expect, it } from "vitest";
import {
  KELLY,
  allInSurvival,
  bankrollPath,
  bestFraction,
  breakEvenFraction,
  expectedFinal,
  finalFor,
  finalsAt,
  firstTails,
  growthOf,
  growthPerRound,
  median,
  medianWins,
  runBettors,
  typicalFinal,
} from "./kelly";

const RUN = runBettors("kelly-test");

describe("exact answers", () => {
  it("peaks at the edge, 20%, at about +2% a round", () => {
    expect(bestFraction()).toBeCloseTo(0.2, 12);
    expect(growthPerRound(0.2)).toBeCloseTo(0.0201, 4);
    for (const f of [0.05, 0.1, 0.15, 0.19, 0.21, 0.25, 0.3, 0.5]) {
      expect(growthPerRound(f)).toBeLessThan(growthPerRound(0.2));
    }
  });

  it("crosses zero at 38.9% (the brief said 38.5%; the root is 0.3894)", () => {
    const f = breakEvenFraction();
    expect(f).toBeCloseTo(0.389, 3);
    expect(growthPerRound(f)).toBeCloseTo(0, 9);
    expect(growthPerRound(0.5)).toBeLessThan(0);
  });

  it("the median bettor has 60 heads of 100", () => {
    expect(medianWins()).toBe(60);
  });

  it("typical results: 20% about $7,490, 40% about $783", () => {
    expect(Math.round(typicalFinal(0.2))).toBe(7490);
    expect(Math.round(typicalFinal(0.4))).toBe(783);
    expect(typicalFinal(0.4)).toBeLessThan(KELLY.start);
    expect(typicalFinal(1)).toBe(0);
  });

  it("typical result agrees with growth per round", () => {
    for (const f of [0.1, 0.2, 0.4]) {
      expect(KELLY.start * Math.exp(KELLY.rounds * growthPerRound(f))).toBeCloseTo(typicalFinal(f), 4);
    }
  });

  it("the average is highest all-in: $82.8 billion", () => {
    expect(expectedFinal(1)).toBeCloseTo(1000 * 1.2 ** 100, 0);
    expect(Math.round(expectedFinal(1) / 1e8)).toBe(828);
    expect(expectedFinal(1)).toBeGreaterThan(expectedFinal(0.4));
    expect(expectedFinal(0.4)).toBeGreaterThan(expectedFinal(0.2));
  });

  it("surviving 100 rounds all-in has probability 0.6^100", () => {
    expect(allInSurvival()).toBeCloseTo(6.53e-23, 25);
  });
});

describe("the simulation converges to them", () => {
  it("the median of 5,000 bettors is the 60-heads result at each fraction", () => {
    for (const f of [0.1, 0.2, 0.3, 0.4, 0.5]) {
      expect(median(finalsAt(RUN, f))).toBeCloseTo(typicalFinal(f), 4);
    }
  });

  it("simulated growth per round sits on the exact curve", () => {
    for (const f of [0.05, 0.2, 0.4]) {
      expect(growthOf(median(finalsAt(RUN, f)))).toBeCloseTo(growthPerRound(f), 9);
    }
  });

  it("the simulated mean at 20% is within a quarter of the exact expectation", () => {
    const finals = finalsAt(RUN, 0.2);
    const mean = finals.reduce((a, b) => a + b, 0) / finals.length;
    expect(Math.abs(mean / expectedFinal(0.2) - 1)).toBeLessThan(0.25);
  });

  it("nobody survives betting everything", () => {
    expect(finalsAt(RUN, 1).filter((v) => v > 0)).toHaveLength(0);
  });

  it("a path ends where the closed form says for its heads", () => {
    const i = RUN.wins.indexOf(60);
    expect(bankrollPath(RUN, i, 0.2)[100]).toBeCloseTo(finalFor(0.2, 60), 6);
    expect(firstTails(RUN, i)).toBeGreaterThan(0);
  });

  it("is seeded: same seed, same flips", () => {
    expect(runBettors("kelly-test").wins).toEqual(RUN.wins);
  });
});
