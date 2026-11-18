/**
 * Seeded pseudo-random number generation.
 *
 * Remotion renders frames independently and in parallel, so any randomness that
 * is not derived from a fixed seed will differ between frames and between runs.
 * Every simulation in this repo draws from one of these generators.
 */

export type Rng = () => number;

/**
 * mulberry32: small, fast, good enough statistically for visualisation work.
 * Returns a function producing floats in [0, 1).
 */
export const mulberry32 = (seed: number): Rng => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * Turn a string into a 32-bit seed, so sims can be seeded by name
 * ("walkers-v1") rather than by magic number.
 */
export const hashSeed = (input: string): number => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

export const rngFromSeed = (seed: number | string): Rng =>
  mulberry32(typeof seed === "string" ? hashSeed(seed) : seed);

/** Integer in [min, max] inclusive. */
export const randInt = (rng: Rng, min: number, max: number): number =>
  min + Math.floor(rng() * (max - min + 1));

/** Float in [min, max). */
export const randRange = (rng: Rng, min: number, max: number): number =>
  min + rng() * (max - min);

/** +1 or -1 with equal probability. */
export const randSign = (rng: Rng): number => (rng() < 0.5 ? -1 : 1);

/**
 * Standard normal via Box-Muller. Stateless on purpose: caching the second
 * variate would make output depend on call history, which is harder to reason
 * about when sims are composed.
 */
export const randNormal = (rng: Rng, mean = 0, stdDev = 1): number => {
  // Guard against log(0).
  const u1 = Math.max(rng(), Number.EPSILON);
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stdDev;
};

/** Fisher-Yates, in place, using the supplied generator. */
export const shuffle = <T>(rng: Rng, items: T[]): T[] => {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = items[i] as T;
    const b = items[j] as T;
    items[i] = b;
    items[j] = a;
  }
  return items;
};

/**
 * Draw `count` items without replacement. Partial Fisher-Yates so drawing 7
 * cards from a 99-card deck does not shuffle all 99.
 */
export const sampleWithoutReplacement = <T>(rng: Rng, pool: T[], count: number): T[] => {
  if (count > pool.length) {
    throw new Error(`Cannot draw ${count} from a pool of ${pool.length}`);
  }
  const copy = pool.slice();
  const out: T[] = [];
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(rng() * (copy.length - i));
    const a = copy[i] as T;
    const b = copy[j] as T;
    copy[i] = b;
    copy[j] = a;
    out.push(copy[i] as T);
  }
  return out;
};

/**
 * Independent child generator derived from a parent seed and an index.
 * Used to give each of N walkers/bettors its own stream, so adding a walker
 * does not change the path of the ones before it.
 */
export const childRng = (seed: number | string, index: number): Rng => {
  const base = typeof seed === "string" ? hashSeed(seed) : seed;
  return mulberry32((base ^ Math.imul(index + 1, 0x9e3779b9)) >>> 0);
};
