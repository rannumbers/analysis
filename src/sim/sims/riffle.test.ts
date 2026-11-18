import { describe, expect, it } from "vitest";
import {
  DECK,
  eulerian,
  exactDistance,
  exactRisingDistribution,
  risingSequences,
  riffle,
  runRiffles,
  simulatedDistance,
  trailOf,
} from "./riffle";
import { rngFromSeed } from "../rng";

describe("exact riffle maths", () => {
  it("Eulerian numbers add up to n!", () => {
    expect(eulerian(4).reduce((a, b) => a + b, 0n)).toBe(24n);
    expect(eulerian(52).reduce((a, b) => a + b, 0n)).toBe(Array.from({ length: 52 }, (_, i) => BigInt(i + 1)).reduce((a, b) => a * b, 1n));
  });

  it("the rising-sequence distribution sums to one", () => {
    for (const k of [1, 3, 7]) {
      const total = exactRisingDistribution(DECK, k).reduce((a, b) => a + b, 0);
      expect(total).toBeCloseTo(1, 12);
    }
  });

  it("after one riffle a deck has at most two rising sequences", () => {
    const p = exactRisingDistribution(DECK, 1);
    expect(p[1]! + p[2]!).toBeCloseTo(1, 12);
    expect(p[3]).toBe(0);
  });

  it("matches the Bayer-Diaconis table for 52 cards", () => {
    const published: [number, number][] = [
      [1, 1.0],
      [2, 1.0],
      [3, 1.0],
      [4, 1.0],
      [5, 0.924],
      [6, 0.614],
      [7, 0.334],
      [8, 0.167],
      [9, 0.085],
    ];
    for (const [k, d] of published) expect(exactDistance(DECK, k)).toBeCloseTo(d, 3);
  });

  it("matches a hand count on a tiny deck", () => {
    // 3 cards, 1 riffle: the identity has probability 4/8, each of 4 decks with
    // two rising sequences 1/8, and the reversed deck (three) cannot happen.
    const p = exactRisingDistribution(3, 1);
    expect(p[1]).toBeCloseTo(4 / 8 + 0, 12);
    expect(p[2]).toBeCloseTo(4 / 8, 12);
    // Distance from uniform over 6 decks.
    expect(exactDistance(3, 1)).toBeCloseTo(0.5 * (Math.abs(0.5 - 1 / 6) + 4 * Math.abs(1 / 8 - 1 / 6) + 1 / 6), 12);
  });
});

describe("the riffle itself", () => {
  it("keeps every card and records where each went", () => {
    const rng = rngFromSeed("riffle-test");
    const deck = Array.from({ length: DECK }, (_, i) => i);
    const r = riffle(rng, deck);
    expect([...r.deck].sort((a, b) => a - b)).toEqual(deck);
    r.dest.forEach((q, p) => expect(r.deck[q]).toBe(deck[p]));
  });

  it("never has more than 2^k rising sequences after k riffles", () => {
    const t = trailOf("bound", 0, 5);
    t.runs.forEach((r, k) => expect(r).toBeLessThanOrEqual(2 ** k));
    expect(risingSequences(t.decks[0] as number[])).toBe(1);
  });
});

describe("the simulation converges on the exact answer", () => {
  const run = runRiffles("shuffle-test", 10000, 9);

  it("rising-sequence counts follow the exact distribution", () => {
    for (const k of [3, 5, 7]) {
      const exact = exactRisingDistribution(DECK, k);
      const counts = run.counts[k] as number[];
      for (let r = 1; r <= DECK; r++) {
        if ((exact[r] as number) > 0.02) expect((counts[r] as number) / run.decks).toBeCloseTo(exact[r] as number, 1.7);
      }
    }
  });

  it("the simulated distance tracks the exact one", () => {
    for (let k = 1; k <= 9; k++) {
      expect(Math.abs(simulatedDistance(run, k) - exactDistance(DECK, k))).toBeLessThan(0.04);
    }
  });

  it("finds a hero deck with eight runs after three riffles", () => {
    expect(run.heroIndex).toBeGreaterThanOrEqual(0);
    expect(trailOf("shuffle-test", run.heroIndex, 3).runs[3]).toBe(8);
  });
});
