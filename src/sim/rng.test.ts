import { describe, expect, it } from "vitest";
import {
  childRng,
  hashSeed,
  mulberry32,
  randInt,
  randNormal,
  rngFromSeed,
  sampleWithoutReplacement,
  shuffle,
} from "./rng";

const take = (rng: () => number, n: number) => Array.from({ length: n }, () => rng());

describe("determinism", () => {
  it("same numeric seed gives identical output", () => {
    expect(take(mulberry32(42), 200)).toEqual(take(mulberry32(42), 200));
  });

  it("same string seed gives identical output", () => {
    expect(take(rngFromSeed("walkers-v1"), 200)).toEqual(
      take(rngFromSeed("walkers-v1"), 200),
    );
  });

  it("different seeds give different output", () => {
    expect(take(mulberry32(42), 50)).not.toEqual(take(mulberry32(43), 50));
  });

  it("hashSeed is stable and collision-free for our seed names", () => {
    expect(hashSeed("kelly")).toBe(hashSeed("kelly"));
    const names = ["walkers", "kelly", "lands", "mulligan", "outbreak", "fees"];
    expect(new Set(names.map(hashSeed)).size).toBe(names.length);
  });

  it("childRng streams are independent of sibling count", () => {
    // Trial 3 must look the same whether we ran 10 trials or 10,000.
    const a = take(childRng("seed", 3), 20);
    const b = take(childRng("seed", 3), 20);
    expect(a).toEqual(b);
    expect(a).not.toEqual(take(childRng("seed", 4), 20));
  });

  it("shuffle and sampling are reproducible", () => {
    const deck = Array.from({ length: 40 }, (_, i) => i);
    expect(shuffle(rngFromSeed("s"), deck.slice())).toEqual(
      shuffle(rngFromSeed("s"), deck.slice()),
    );
    expect(sampleWithoutReplacement(rngFromSeed("s"), deck, 7)).toEqual(
      sampleWithoutReplacement(rngFromSeed("s"), deck, 7),
    );
  });
});

describe("output ranges", () => {
  it("stays in [0, 1)", () => {
    for (const v of take(mulberry32(7), 5000)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("randInt covers an inclusive range", () => {
    const rng = mulberry32(1);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) seen.add(randInt(rng, 1, 6));
    expect([...seen].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("is roughly uniform", () => {
    const buckets = new Array(10).fill(0);
    const rng = mulberry32(99);
    const n = 100_000;
    for (let i = 0; i < n; i++) buckets[Math.floor(rng() * 10)]++;
    for (const b of buckets) expect(Math.abs(b / n - 0.1)).toBeLessThan(0.01);
  });

  it("randNormal has about the requested mean and spread", () => {
    const rng = mulberry32(5);
    const xs = Array.from({ length: 50_000 }, () => randNormal(rng, 10, 2));
    const m = xs.reduce((a, b) => a + b, 0) / xs.length;
    const sd = Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length);
    expect(m).toBeCloseTo(10, 1);
    expect(sd).toBeCloseTo(2, 1);
  });
});

describe("sampling without replacement", () => {
  it("draws distinct items", () => {
    const pool = Array.from({ length: 99 }, (_, i) => i);
    const drawn = sampleWithoutReplacement(mulberry32(3), pool, 7);
    expect(drawn).toHaveLength(7);
    expect(new Set(drawn).size).toBe(7);
  });

  it("does not mutate the pool", () => {
    const pool = [1, 2, 3, 4, 5];
    sampleWithoutReplacement(mulberry32(1), pool, 3);
    expect(pool).toEqual([1, 2, 3, 4, 5]);
  });

  it("rejects drawing more than the pool holds", () => {
    expect(() => sampleWithoutReplacement(mulberry32(1), [1, 2], 3)).toThrow();
  });
});
