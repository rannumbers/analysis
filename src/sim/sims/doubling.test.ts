import { describe, expect, it } from "vitest";
import {
  DOUBLING,
  expectedAfter,
  expectedRunsPerNight,
  houseEdge,
  ladder,
  ladderTotal,
  meanNight,
  meanPath,
  nextBet,
  nightExpectedValue,
  nightOutcomes,
  pLoseRun,
  pNightSuccess,
  pWinBet,
  pWinRun,
  runExpectedValue,
  shareOfNightsUp,
  simulate,
} from "./doubling";

const RUN = simulate("doubling-test", 4000, 20);

describe("exact answers", () => {
  it("six bets fit in $1,000 and a seventh does not", () => {
    expect(ladder()).toEqual([10, 20, 40, 80, 160, 320]);
    expect(ladderTotal()).toBe(630);
    expect(ladderTotal()).toBeLessThanOrEqual(DOUBLING.bankroll);
    expect(nextBet()).toBe(640);
    expect(ladderTotal() + nextBet()).toBeGreaterThan(DOUBLING.bankroll);
  });

  it("a run loses with chance (19/37)^6, about 1.8%", () => {
    expect(pWinBet()).toBeCloseTo(18 / 37, 15);
    expect(pLoseRun()).toBeCloseTo((19 / 37) ** 6, 15);
    expect(pLoseRun()).toBeCloseTo(0.0183, 4);
    expect(pWinRun()).toBeCloseTo(0.9817, 4);
  });

  it("a run is worth a small negative amount on average", () => {
    expect(runExpectedValue()).toBeCloseTo(pWinRun() * 10 - pLoseRun() * 630, 12);
    expect(runExpectedValue()).toBeCloseTo(-1.735, 3);
    expect(runExpectedValue()).toBeLessThan(0);
    expect(630 / 10).toBe(63);
  });

  it("a night reaches +$100 with chance (1 - (19/37)^6)^10, about 83%", () => {
    expect(pNightSuccess()).toBeCloseTo((1 - (19 / 37) ** 6) ** 10, 15);
    expect(Math.round(pNightSuccess() * 100)).toBe(83);
  });

  it("night outcomes are a distribution; losses are $540 to $630", () => {
    const outcomes = nightOutcomes();
    expect(outcomes.reduce((s, o) => s + o.prob, 0)).toBeCloseTo(1, 12);
    expect(outcomes[0]).toMatchObject({ net: 100 });
    const losses = outcomes.slice(1).map((o) => o.net);
    expect(Math.min(...losses)).toBe(-630);
    expect(Math.max(...losses)).toBe(-540);
  });

  it("the average night loses about $16, two ways", () => {
    const ev = nightExpectedValue();
    expect(ev).toBeLessThan(0);
    expect(Math.round(ev)).toBe(-16);
    // Wald: average runs per night x average profit per run.
    expect(ev).toBeCloseTo(expectedRunsPerNight() * runExpectedValue(), 10);
    // Same thing as the house edge on the money staked: 1/37 of $10 per run unit.
    expect(houseEdge()).toBeCloseTo(1 / 37, 15);
  });

  it("the average after twenty nights is twenty times that", () => {
    expect(expectedAfter(20)).toBeCloseTo(20 * nightExpectedValue(), 10);
    expect(expectedAfter(20)).toBeLessThan(-300);
  });
});

describe("the simulation converges on it", () => {
  it("is deterministic for a seed", () => {
    expect(simulate("same", 5, 5)).toEqual(simulate("same", 5, 5));
  });

  it("nights reach the target as often as the exact chance says", () => {
    expect(shareOfNightsUp(RUN)).toBeCloseTo(pNightSuccess(), 2);
  });

  it("the average night and the average after 20 nights match the exact values", () => {
    expect(Math.abs(meanNight(RUN) - nightExpectedValue())).toBeLessThan(3);
    const mean = meanPath(RUN);
    expect(Math.abs((mean[20] as number) - expectedAfter(20))).toBeLessThan(60);
  });

  it("every night ends at +100 or between -630 and -540", () => {
    for (const ns of RUN.nights.slice(0, 50)) {
      for (const n of ns) {
        expect(n.cliff ? n.net >= -630 && n.net <= -540 : n.net === 100).toBe(true);
      }
    }
  });
});
