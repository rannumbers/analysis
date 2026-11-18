/**
 * Random walkers: why luck looks like skill on a chart.
 *
 * Two ways to invest for twenty years, each modelled as one coin flip a year
 * with a stated payoff:
 *
 *   index fund     heads +25%, tails  −5%   (average +10% a year)
 *   single stock   heads +40%, tails −20%   (average +10% a year)
 *
 * Same average return, different swings. Everyone who holds the same index
 * fund gets the same result, so luck can only make an individual look like a
 * genius when each person picks their own stock: their own coin.
 *
 * The payoffs are fixed so the maths is exact. The number of heads is
 * binomial, so the typical (median) result, and the chance a stock picker
 * beats the index fund's typical result, are closed-form answers the
 * simulation converges to. Every walker moves on the same lattice of routes,
 * which is why the crowd draws as a Galton board.
 */

import { childRng, type Rng } from "../rng";
import { choose } from "../stats";

export interface WalkerConfig {
  /** How many investors. */
  count: number;
  /** How many years each one runs. */
  years: number;
  /** Gain on heads, as a fraction (0.4 = +40%). */
  up: number;
  /** Loss on tails, as a fraction (0.2 = −20%). */
  down: number;
  /** Everyone starts here. */
  start: number;
}

/** Short 01's coin: heads +20%, tails −20%. Average return zero. */
export const COIN_FLIP: WalkerConfig = { count: 500, years: 20, up: 0.2, down: 0.2, start: 10_000 };

/** Holding a broad index fund: smaller swings, same average return. */
export const INDEX_FUND: WalkerConfig = { count: 1, years: 20, up: 0.25, down: 0.05, start: 10_000 };

/** Picking a single stock: bigger swings, same average return. */
export const STOCK_PICK: WalkerConfig = { count: 500, years: 20, up: 0.4, down: 0.2, start: 10_000 };

/** Average yearly return: half the time up, half the time down. */
export const meanReturn = (config: WalkerConfig): number => (config.up - config.down) / 2;

export interface Walk {
  /** Value at the end of each year, including year 0. */
  path: number[];
  /** How many of the years were heads. */
  wins: number;
}

export const walkPath = (rng: Rng, config: WalkerConfig): Walk => {
  const path = new Array<number>(config.years + 1);
  let value = config.start;
  let wins = 0;
  path[0] = value;
  for (let y = 1; y <= config.years; y++) {
    const heads = rng() < 0.5;
    if (heads) wins++;
    value *= heads ? 1 + config.up : 1 - config.down;
    path[y] = value;
  }
  return { path, wins };
};

export interface WalkerRun {
  /** `count` paths, each `years + 1` long. */
  paths: number[][];
  /** Heads per walker. */
  wins: number[];
  /** Final value of each walker. */
  finals: number[];
  bestIndex: number;
  worstIndex: number;
  config: WalkerConfig;
}

/**
 * Run the whole population.
 *
 * Each walker draws from its own stream, so walker *k* follows the same path
 * whether the population is 50 or 500 — the chart can grow without the lines
 * already on screen moving.
 */
export const runWalkers = (seed: number | string, config: WalkerConfig): WalkerRun => {
  const paths: number[][] = new Array(config.count);
  const wins: number[] = new Array(config.count);
  const finals: number[] = new Array(config.count);

  for (let i = 0; i < config.count; i++) {
    const walk = walkPath(childRng(seed, i), config);
    paths[i] = walk.path;
    wins[i] = walk.wins;
    finals[i] = walk.path[config.years] as number;
  }

  let bestIndex = 0;
  let worstIndex = 0;
  for (let i = 1; i < config.count; i++) {
    if ((finals[i] as number) > (finals[bestIndex] as number)) bestIndex = i;
    if ((finals[i] as number) < (finals[worstIndex] as number)) worstIndex = i;
  }

  return { paths, wins, finals, bestIndex, worstIndex, config };
};

/** Multiple of the starting stake, e.g. 5.1 for "5.1x". */
export const asMultiple = (value: number, config: WalkerConfig): number => value / config.start;

/** How many walkers finished above `threshold` (default: the starting stake). */
export const countAbove = (run: WalkerRun, threshold = run.config.start): number =>
  run.finals.filter((f) => f > threshold).length;

// --- Exact answers ----------------------------------------------------------

/** Value after `year` years with `heads` of them heads. Order does not matter. */
export const latticeValue = (config: WalkerConfig, year: number, heads: number): number =>
  config.start * (1 + config.up) ** heads * (1 - config.down) ** (year - heads);

/** Probability of exactly k heads in `years` fair flips. */
export const exactHeadsDistribution = (config: WalkerConfig): number[] =>
  Array.from({ length: config.years + 1 }, (_, k) => choose(config.years, k) / 2 ** config.years);

/**
 * The typical (median) final value: the value after an even split of heads and
 * tails. For the index fund this is the benchmark a stock picker is judged
 * against.
 */
export const typicalFinal = (config: WalkerConfig): number =>
  latticeValue(config, config.years, Math.floor(config.years / 2));

/**
 * The typical path, year by year: the median value grows by the geometric mean
 * of the two outcomes each year. Drawn as the index fund's line.
 */
export const typicalValueAt = (config: WalkerConfig, year: number): number =>
  config.start * Math.sqrt((1 + config.up) * (1 - config.down)) ** year;

/**
 * The mean final value: each year multiplies the expected value by 1 + the
 * average return. Equal for any two coins with the same average, however much
 * they swing.
 */
export const expectedFinal = (config: WalkerConfig): number =>
  config.start * (1 + meanReturn(config)) ** config.years;

/** Each year's flip from a path: true for heads. */
export const flipsOf = (path: readonly number[]): boolean[] =>
  path.slice(1).map((v, i) => v > (path[i] as number));

/** The path a run of flips produces on a given coin, so two coins can share the same luck. */
export const pathFromFlips = (config: WalkerConfig, flips: readonly boolean[]): number[] => {
  const path = [config.start];
  for (const heads of flips) path.push((path[path.length - 1] as number) * (heads ? 1 + config.up : 1 - config.down));
  return path;
};

/** Fewest heads that finish strictly above `threshold`. */
export const minHeadsToBeat = (config: WalkerConfig, threshold: number): number => {
  for (let k = 0; k <= config.years; k++) {
    if (latticeValue(config, config.years, k) > threshold) return k;
  }
  return config.years + 1;
};

/** The exact chance one walker finishes strictly above `threshold`. */
export const exactBeatProbability = (config: WalkerConfig, threshold: number): number =>
  exactHeadsDistribution(config)
    .slice(minHeadsToBeat(config, threshold))
    .reduce((a, b) => a + b, 0);

/** Running heads count for one walker, year by year (length years + 1). */
export const headsPath = (path: readonly number[]): number[] => {
  const out = [0];
  for (let y = 1; y < path.length; y++) {
    out.push((out[y - 1] as number) + ((path[y] as number) > (path[y - 1] as number) ? 1 : 0));
  }
  return out;
};

/**
 * Lattice edge traffic for the given walkers: how many took each step.
 * Key: `${year}:${headsBefore}:${up ? 1 : 0}`, for the step from `year` to `year + 1`.
 */
export const edgeTraffic = (heads: readonly (readonly number[])[]): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const h of heads) {
    for (let y = 0; y + 1 < h.length; y++) {
      const up = (h[y + 1] as number) > (h[y] as number) ? 1 : 0;
      const key = y + ":" + h[y] + ":" + up;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return counts;
};
