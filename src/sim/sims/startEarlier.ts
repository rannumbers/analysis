/**
 * Start earlier: two savers put the same yearly amount into the same coin-flip
 * market. The early saver deposits for a few years and stops; the late saver
 * starts later and deposits every year until the end. Both are judged on the
 * same day. Pure TypeScript, no React.
 *
 * Timing convention: a deposit is made at the start of a year and then takes
 * that year's flip. Year i (0-based) is age `startAge + i`.
 */

import { childRng, type Rng } from "../rng";
import { proportionStdError } from "../stats";

export interface SaverConfig {
  /** Age of the first deposit and of the first flip. */
  startAge: number;
  /** The early saver's last deposit age (inclusive). */
  earlyLastAge: number;
  /** The late saver's first deposit age. */
  lateFirstAge: number;
  /** The late saver's last deposit age (inclusive). */
  lateLastAge: number;
  /** Judged at the start of this age: the last flip is the year before. */
  endAge: number;
  /** Deposit per year. */
  yearly: number;
  up: number;
  down: number;
}

/** The classic comparison, on the 01b index coin (+25% or -5%, average +10%). */
export const CLASSIC: SaverConfig = {
  startAge: 22,
  earlyLastAge: 31,
  lateFirstAge: 32,
  lateLastAge: 64,
  endAge: 65,
  yearly: 5_000,
  up: 0.25,
  down: 0.05,
};

export const meanReturn = (c: SaverConfig): number => (c.up - c.down) / 2;
export const flipCount = (c: SaverConfig): number => c.endAge - c.startAge;

export type Who = "early" | "late";

const firstAge = (c: SaverConfig, who: Who): number => (who === "early" ? c.startAge : c.lateFirstAge);
const lastAge = (c: SaverConfig, who: Who): number => (who === "early" ? c.earlyLastAge : c.lateLastAge);

/** Deposit made at the start of `age`. */
export const depositAt = (c: SaverConfig, who: Who, age: number): number =>
  age >= firstAge(c, who) && age <= lastAge(c, who) ? c.yearly : 0;

export const depositYears = (c: SaverConfig, who: Who): number => lastAge(c, who) - firstAge(c, who) + 1;

/** Total put in over the whole life. */
export const totalPut = (c: SaverConfig, who: Who): number => depositYears(c, who) * c.yearly;

/** One lifetime of shared flips: true is heads. */
export const drawFlips = (rng: Rng, c: SaverConfig): boolean[] =>
  Array.from({ length: flipCount(c) }, () => rng() < 0.5);

/** The pile at the start of each age from startAge to endAge, given the flips. */
export const pileFromFlips = (c: SaverConfig, who: Who, flips: readonly boolean[]): number[] => {
  const out = [0];
  for (let i = 0; i < flips.length; i++) {
    const grown = ((out[i] as number) + depositAt(c, who, c.startAge + i)) * (flips[i] ? 1 + c.up : 1 - c.down);
    out.push(grown);
  }
  return out;
};

export interface Lifetime {
  flips: boolean[];
  early: number[];
  late: number[];
}

export const lifetimeFromFlips = (c: SaverConfig, flips: readonly boolean[]): Lifetime => ({
  flips: [...flips],
  early: pileFromFlips(c, "early", flips),
  late: pileFromFlips(c, "late", flips),
});

export const finalOf = (path: readonly number[]): number => path[path.length - 1] as number;

// --- Exact answers ----------------------------------------------------------

/**
 * Final value if every year returned `rate`. For the expected value, rate is
 * the mean return: each deposit's growth is a product of distinct independent
 * flips, so its expectation is (1 + mean)^years, and the sum is exact.
 */
export const finalAtRate = (c: SaverConfig, who: Who, rate: number): number => {
  let sum = 0;
  for (let age = firstAge(c, who); age <= lastAge(c, who); age++) sum += c.yearly * (1 + rate) ** (c.endAge - age);
  return sum;
};

/** Exact expected final, and equal to the final at the average rate. */
export const expectedFinal = (c: SaverConfig, who: Who): number => finalAtRate(c, who, meanReturn(c));

/** The pile at the start of each age if every year returned `rate`. Ends at finalAtRate. */
export const steadyPath = (c: SaverConfig, who: Who, rate = meanReturn(c)): number[] => {
  const out = [0];
  for (let i = 0; i < flipCount(c); i++) out.push(((out[i] as number) + depositAt(c, who, c.startAge + i)) * (1 + rate));
  return out;
};

/**
 * Exact chance the early saver finishes strictly ahead, by enumerating every
 * flip sequence. Only for short lives (2^n sequences); tests use it to check
 * the simulation's logic on a small case.
 */
export const exactEarlyAheadProbability = (c: SaverConfig): number => {
  const n = flipCount(c);
  if (n > 22) throw new Error("exact enumeration is only for short lives");
  let ahead = 0;
  for (let mask = 0; mask < 2 ** n; mask++) {
    const flips = Array.from({ length: n }, (_, i) => ((mask >> i) & 1) === 1);
    if (finalOf(pileFromFlips(c, "early", flips)) > finalOf(pileFromFlips(c, "late", flips))) ahead++;
  }
  return ahead / 2 ** n;
};

// --- Many lifetimes ---------------------------------------------------------

export interface LifetimeRun {
  lifetimes: Lifetime[];
  earlyFinals: number[];
  lateFinals: number[];
  /** Lifetimes where the early saver finishes strictly ahead. */
  earlyAhead: number;
  config: SaverConfig;
}

/** Lifetime k draws from its own stream, so adding lifetimes never moves earlier ones. */
export const runLifetimes = (seed: number | string, count: number, c: SaverConfig = CLASSIC): LifetimeRun => {
  const lifetimes: Lifetime[] = [];
  for (let k = 0; k < count; k++) lifetimes.push(lifetimeFromFlips(c, drawFlips(childRng(seed, k), c)));
  const earlyFinals = lifetimes.map((l) => finalOf(l.early));
  const lateFinals = lifetimes.map((l) => finalOf(l.late));
  const earlyAhead = earlyFinals.filter((e, k) => e > (lateFinals[k] as number)).length;
  return { lifetimes, earlyFinals, lateFinals, earlyAhead, config: c };
};

/** Simulated share ahead, with its standard error (a simulated figure, not exact). */
export const earlyAheadShare = (run: LifetimeRun): { p: number; se: number } => {
  const p = run.earlyAhead / run.lifetimes.length;
  return { p, se: proportionStdError(p, run.lifetimes.length) };
};

/** Heads in a lifetime. */
export const headsIn = (flips: readonly boolean[]): number => flips.filter(Boolean).length;
