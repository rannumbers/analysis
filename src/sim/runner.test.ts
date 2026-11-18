import { describe, expect, it } from "vitest";
import { estimateProbability, revealedCount, runSimulation, runTrials, stepForFrame } from "./runner";
import { randSign, type Rng } from "./rng";
import { proportionStdError } from "./stats";
import {
  LIMITED_16,
  LIMITED_17,
  drawHand,
  exactAtLeast,
  exactDistribution,
  handHasAtLeast,
} from "./sims/landDraws";

describe("runSimulation", () => {
  const walk = {
    init: () => ({ x: 0 }),
    step: (s: { x: number }, rng: Rng) => ({ x: s.x + randSign(rng) }),
  };

  it("returns steps + 1 states", () => {
    expect(runSimulation(walk, { steps: 10, seed: 1 })).toHaveLength(11);
  });

  it("is reproducible for the same seed", () => {
    expect(runSimulation(walk, { steps: 50, seed: "a" })).toEqual(
      runSimulation(walk, { steps: 50, seed: "a" }),
    );
  });

  it("differs for a different seed", () => {
    expect(runSimulation(walk, { steps: 50, seed: "a" })).not.toEqual(
      runSimulation(walk, { steps: 50, seed: "b" })
    );
  });

  it("a longer run extends a shorter one rather than diverging", () => {
    const short = runSimulation(walk, { steps: 10, seed: 7 });
    const long = runSimulation(walk, { steps: 40, seed: 7 });
    expect(long.slice(0, 11)).toEqual(short);
  });
});

describe("runTrials", () => {
  it("is reproducible", () => {
    const t = (rng: Rng) => rng();
    expect(runTrials(t, { trials: 100, seed: "x" })).toEqual(
      runTrials(t, { trials: 100, seed: "x" }),
    );
  });

  it("trial k is independent of the total trial count", () => {
    // This is what lets a video animate a growing sample smoothly.
    const t = (rng: Rng) => rng();
    const small = runTrials(t, { trials: 10, seed: "x" });
    const big = runTrials(t, { trials: 5000, seed: "x" });
    expect(big.slice(0, 10)).toEqual(small);
  });
});

describe("Monte Carlo converges to the exact answer", () => {
  // The reference case: at least 3 target cards in a 7-card opening hand
  // from a 40-card deck. Exact value comes from the hypergeometric PMF.
  it("matches exact hypergeometric for 17 lands, at least 3", () => {
    const exact = exactAtLeast(LIMITED_17, 3);
    const trials = 200_000;
    const { estimate } = estimateProbability(handHasAtLeast(LIMITED_17, 3), {
      trials,
      seed: "lands-17-atleast-3",
    });
    // Four standard errors: tight, but not flaky for a fixed seed.
    const tolerance = 4 * proportionStdError(exact, trials);
    expect(Math.abs(estimate - exact)).toBeLessThan(tolerance);
  });

  it("matches exact for 16 lands, and 16 is worse than 17", () => {
    const trials = 200_000;
    const exact16 = exactAtLeast(LIMITED_16, 3);
    const exact17 = exactAtLeast(LIMITED_17, 3);
    const { estimate } = estimateProbability(handHasAtLeast(LIMITED_16, 3), {
      trials,
      seed: "lands-16-atleast-3",
    });
    expect(Math.abs(estimate - exact16)).toBeLessThan(
      4 * proportionStdError(exact16, trials),
    );
    // The whole point of the video: one card changes the odds, measurably.
    expect(exact16).toBeLessThan(exact17);
  });

  it("the whole simulated distribution matches the exact distribution", () => {
    const trials = 200_000;
    const exact = exactDistribution(LIMITED_17);
    const counts = new Array(LIMITED_17.handSize + 1).fill(0);
    const outcomes = runTrials((rng) => drawHand(rng, LIMITED_17), {
      trials,
      seed: "lands-dist",
    });
    for (const hits of outcomes) counts[hits]++;

    for (let k = 0; k < exact.length; k++) {
      const p = exact[k] as number;
      const observed = counts[k] / trials;
      // Skip outcomes too rare to estimate meaningfully at this sample size.
      if (p * trials < 50) continue;
      expect(Math.abs(observed - p)).toBeLessThan(4 * proportionStdError(p, trials));
    }
  });

  it("the estimate tightens as trials grow", () => {
    const exact = exactAtLeast(LIMITED_17, 3);
    const err = (trials: number) =>
      Math.abs(
        estimateProbability(handHasAtLeast(LIMITED_17, 3), { trials, seed: "shrink" })
          .estimate - exact,
      );
    // Averaged behaviour, not a guarantee for any single pair of sample sizes,
    // so compare a small sample against a much larger one.
    expect(err(100_000)).toBeLessThan(Math.max(err(100), 0.001));
  });

  it("running estimate ends at the final estimate", () => {
    const r = estimateProbability(handHasAtLeast(LIMITED_17, 3), {
      trials: 1000,
      seed: "running",
    });
    expect(r.running).toHaveLength(1000);
    expect(r.running[999]).toBeCloseTo(r.estimate, 12);
    expect(r.hits / r.trials).toBeCloseTo(r.estimate, 12);
  });
});

describe("frame mapping", () => {
  it("stepForFrame spans 0 to totalSteps and clamps", () => {
    const o = { totalFrames: 100, totalSteps: 50 };
    expect(stepForFrame(0, o)).toBe(0);
    expect(stepForFrame(100, o)).toBe(50);
    expect(stepForFrame(999, o)).toBe(50);
    expect(stepForFrame(-5, o)).toBe(0);
  });

  it("stepForFrame reaches the end early when holding frames", () => {
    const o = { totalFrames: 100, totalSteps: 50, holdFrames: 20 };
    expect(stepForFrame(80, o)).toBe(50);
    expect(stepForFrame(99, o)).toBe(50);
  });

  it("stepForFrame is monotonic", () => {
    const o = { totalFrames: 90, totalSteps: 33 };
    let prev = -1;
    for (let f = 0; f <= 90; f++) {
      const s = stepForFrame(f, o);
      expect(s).toBeGreaterThanOrEqual(prev);
      prev = s;
    }
  });

  it("revealedCount grows to the total and never hits zero", () => {
    const o = { totalFrames: 100, total: 5000, curve: 2 };
    expect(revealedCount(0, o)).toBe(1);
    expect(revealedCount(100, o)).toBe(5000);
    expect(revealedCount(50, o)).toBeLessThan(5000);
    expect(revealedCount(50, o)).toBeGreaterThan(0);
  });
});
