import { describe, expect, it } from "vitest";
import { childRng } from "../rng";
import { mean, proportionStdError } from "../stats";
import {
  FIRST,
  SET_SIZE,
  cardsForFirst,
  cardsForLast,
  collect,
  completionCdf,
  completionCdfByChain,
  completionPmf,
  expectedDuplicates,
  expectedFirst,
  expectedLast,
  expectedTotal,
  expectedWait,
  harmonic,
  expectedOpeningsForSets,
  lastCardWait,
  poolOpenings,
  runCollectors,
} from "./cardSet";

describe("the exact answers for a 100-card set", () => {
  it("takes 100 × H(100) = 518.7 cards on average", () => {
    expect(harmonic(100)).toBeCloseTo(5.187378, 6);
    expect(expectedTotal(SET_SIZE)).toBeCloseTo(518.7378, 3);
  });

  it("the first 90 take 225.8 and the last 10 take 292.9, which add to the total", () => {
    expect(expectedFirst(SET_SIZE, FIRST)).toBeCloseTo(225.841, 2);
    expect(expectedLast(SET_SIZE, 10)).toBeCloseTo(292.897, 2);
    expect(expectedFirst(SET_SIZE, FIRST) + expectedLast(SET_SIZE, 10)).toBeCloseTo(expectedTotal(SET_SIZE), 9);
    expect(expectedLast(SET_SIZE, 10)).toBeGreaterThan(expectedFirst(SET_SIZE, FIRST));
  });

  it("the very last card alone takes 100, the first takes 1", () => {
    expect(expectedWait(SET_SIZE, 99)).toBe(100);
    expect(expectedWait(SET_SIZE, 0)).toBe(1);
    // Holding 99, one card in 100 is new.
    expect(1 / expectedWait(SET_SIZE, 99)).toBeCloseTo(0.01, 12);
  });

  it("leaves about 419 duplicates at completion", () => {
    expect(expectedDuplicates(SET_SIZE)).toBeCloseTo(418.74, 2);
    expect(Math.round(expectedDuplicates(SET_SIZE))).toBe(419);
  });
});

describe("the exact distribution", () => {
  it("matches a card-by-card walk of the binder", () => {
    const chain = completionCdfByChain(SET_SIZE, 1400);
    for (const t of [150, 250, 400, 519, 700, 1000, 1400]) {
      expect(completionCdf(SET_SIZE, t)).toBeCloseTo(chain[t] as number, 6);
    }
  });

  it("cannot finish in fewer than 100 cards, and sums to an average of 518.7", () => {
    expect(completionCdf(SET_SIZE, 99)).toBe(0);
    let average = 0;
    for (let t = 0; t < 4000; t++) average += 1 - completionCdf(SET_SIZE, t);
    expect(average).toBeCloseTo(expectedTotal(SET_SIZE), 2);
    let viaPmf = 0;
    for (let t = SET_SIZE; t <= 4000; t++) viaPmf += t * completionPmf(SET_SIZE, t);
    expect(viaPmf).toBeCloseTo(expectedTotal(SET_SIZE), 2);
  });
});

describe("one collector", () => {
  it("opens until the set is complete, then stops", () => {
    const c = collect(childRng("check", 0));
    expect(new Set(c.draws).size).toBe(SET_SIZE);
    expect(c.total).toBe(c.draws.length);
    // The last card opened is the one that completed the set: its first sighting is the final opening.
    expect(c.firstSeen[(c.draws[c.total - 1] as number) - 1]).toBe(c.total);
    expect(Math.max(...c.firstSeen)).toBe(c.total);
    expect(c.newAt).toHaveLength(SET_SIZE);
    expect(cardsForFirst(c) + cardsForLast(c)).toBe(c.total);
    expect(lastCardWait(c)).toBeGreaterThanOrEqual(1);
  });

  it("is reproducible from its seed", () => {
    expect(collect(childRng("same", 3)).draws).toEqual(collect(childRng("same", 3)).draws);
  });
});

describe("the simulation converges onto the exact answers", () => {
  const run = runCollectors("converge", 20_000);
  const totals = run.map((c) => c.total);
  const sd = Math.sqrt(mean(totals.map((v) => (v - mean(totals)) ** 2)));
  const se = sd / Math.sqrt(run.length);

  it("average total is 518.7", () => {
    expect(Math.abs(mean(totals) - expectedTotal(SET_SIZE))).toBeLessThan(4.5 * se);
  });

  it("average first 90 is 225.8 and average last 10 is 292.9", () => {
    const firsts = run.map((c) => cardsForFirst(c));
    const lasts = run.map((c) => cardsForLast(c));
    expect(Math.abs(mean(firsts) - expectedFirst(SET_SIZE, FIRST))).toBeLessThan(4.5 * (sd / Math.sqrt(run.length)));
    expect(Math.abs(mean(lasts) - expectedLast(SET_SIZE, 10))).toBeLessThan(4.5 * (sd / Math.sqrt(run.length)));
  });

  it("the very last card averages 100 openings", () => {
    const waits = run.map(lastCardWait);
    // A geometric wait with p = 0.01 has a standard deviation of about 99.5.
    expect(Math.abs(mean(waits) - 100)).toBeLessThan((4.5 * 100) / Math.sqrt(run.length));
  });

  it("the share finished within 519 cards matches the exact distribution", () => {
    const p = completionCdf(SET_SIZE, 519);
    const share = totals.filter((t) => t <= 519).length / run.length;
    expect(Math.abs(share - p)).toBeLessThan(4.5 * proportionStdError(p, run.length));
  });
});

describe("two collectors who swap duplicates", () => {
  it("one set by the integral equals n × H(n)", () => {
    expect(expectedOpeningsForSets(SET_SIZE, 1)).toBeCloseTo(expectedTotal(SET_SIZE), 3);
  });

  it("two sets cost 728.8 openings together, 364.4 each, and simulation agrees", () => {
    const exact = expectedOpeningsForSets(SET_SIZE, 2);
    expect(exact).toBeCloseTo(728.81, 1);
    const totals = Array.from({ length: 20_000 }, (_, i) => poolOpenings(childRng("swap-test", i), 2));
    const m = mean(totals);
    const se = Math.sqrt(mean(totals.map((v) => (v - m) ** 2)) / totals.length);
    expect(Math.abs(m - exact)).toBeLessThan(4.5 * se);
  });
});
