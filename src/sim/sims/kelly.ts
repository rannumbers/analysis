/**
 * Betting a fixed share of your money on a coin with an edge.
 *
 * The coin lands heads with probability p (0.6). Bets are even money: heads
 * gains the stake, tails loses it. Each round you stake a fixed fraction f of
 * what you hold now, so a round multiplies your money by (1 + f) or (1 − f).
 *
 * After n rounds with k heads the money is start × (1+f)^k × (1−f)^(n−k). The
 * typical (median) bettor has the median number of heads, so the typical
 * result and the growth per round g(f) = p·ln(1+f) + q·ln(1−f) are exact. The
 * average (expected value) is a different number: start × (1 + (2p−1)f)^n.
 *
 * Every bettor in a run flips the same kind of coin from their own seeded
 * stream, and the same bettors are replayed at every fraction, so the only
 * thing that differs between columns is how much was bet.
 */

import { childRng } from "../rng";
import { choose } from "../stats";

export interface KellyConfig {
  /** Chance of heads. */
  p: number;
  rounds: number;
  start: number;
  bettors: number;
}

export const KELLY: KellyConfig = { p: 0.6, rounds: 100, start: 1000, bettors: 5000 };

/** Typical growth per round, in natural log: p·ln(1+f) + q·ln(1−f). */
export const growthPerRound = (f: number, p = KELLY.p): number =>
  p * Math.log(1 + f) + (1 - p) * (f >= 1 ? -Infinity : Math.log(1 - f));

/** The growth-maximising fraction: p − q, the edge itself. */
export const bestFraction = (p = KELLY.p): number => 2 * p - 1;

/** Largest fraction that still grows: the root of g(f) = 0 above the peak, by bisection. */
export const breakEvenFraction = (p = KELLY.p): number => {
  let lo = bestFraction(p);
  let hi = 1 - 1e-12;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (growthPerRound(mid, p) > 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
};

/** The median of Binomial(rounds, p): the smallest k whose cumulative chance reaches one half. */
export const medianWins = (config: KellyConfig = KELLY): number => {
  let cum = 0;
  for (let k = 0; k <= config.rounds; k++) {
    cum += choose(config.rounds, k) * config.p ** k * (1 - config.p) ** (config.rounds - k);
    if (cum >= 0.5) return k;
  }
  return config.rounds;
};

/** Money after `wins` heads in `rounds` rounds, betting fraction f every round. */
export const finalFor = (f: number, wins: number, config: KellyConfig = KELLY): number =>
  config.start * (1 + f) ** wins * (1 - f) ** (config.rounds - wins);

/** The typical (median) result after all rounds. */
export const typicalFinal = (f: number, config: KellyConfig = KELLY): number => finalFor(f, medianWins(config), config);

/** The average (expected) result after all rounds: heads and tails weighted by their chances. */
export const expectedFinal = (f: number, config: KellyConfig = KELLY): number =>
  config.start * (1 + (2 * config.p - 1) * f) ** config.rounds;

/** Chance of surviving every round betting everything: all heads. */
export const allInSurvival = (config: KellyConfig = KELLY): number => config.p ** config.rounds;

export interface Run {
  /** Flips of bettor i at index i * rounds + r: 1 for heads. */
  flips: Uint8Array;
  wins: number[];
}

export const runBettors = (seed: string, config: KellyConfig = KELLY): Run => {
  const flips = new Uint8Array(config.bettors * config.rounds);
  const wins: number[] = [];
  for (let i = 0; i < config.bettors; i++) {
    const rng = childRng(seed, i);
    let w = 0;
    for (let r = 0; r < config.rounds; r++) {
      const heads = rng() < config.p ? 1 : 0;
      flips[i * config.rounds + r] = heads;
      w += heads;
    }
    wins.push(w);
  }
  return { flips, wins };
};

/** One bettor's money after each round (index 0 is the start), played round by round. */
export const bankrollPath = (run: Run, bettor: number, f: number, config: KellyConfig = KELLY): number[] => {
  const path = [config.start];
  let money = config.start;
  for (let r = 0; r < config.rounds; r++) {
    money *= run.flips[bettor * config.rounds + r] === 1 ? 1 + f : 1 - f;
    path.push(money);
  }
  return path;
};

/** Every bettor's final money at fraction f, by playing the rounds out. */
export const finalsAt = (run: Run, f: number, config: KellyConfig = KELLY): number[] => {
  const out: number[] = [];
  for (let i = 0; i < config.bettors; i++) out.push(bankrollPath(run, i, f, config)[config.rounds] as number);
  return out;
};

export const median = (values: readonly number[]): number => {
  const s = values.slice().sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? (s[mid] as number) : ((s[mid - 1] as number) + (s[mid] as number)) / 2;
};

/** Growth per round a final result implies, in natural log; -Infinity when broke. */
export const growthOf = (final: number, config: KellyConfig = KELLY): number =>
  final <= 0 ? -Infinity : Math.log(final / config.start) / config.rounds;

/** Round of a bettor's first tails (1-based), or null if they never lose. */
export const firstTails = (run: Run, bettor: number, config: KellyConfig = KELLY): number | null => {
  for (let r = 0; r < config.rounds; r++) if (run.flips[bettor * config.rounds + r] !== 1) return r + 1;
  return null;
};
