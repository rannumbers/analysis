/**
 * Rebalancing: two investments that go nowhere make money together.
 *
 * A stock flips a coin each year: heads it doubles (+100%), tails it halves
 * (−50%). Cash earns nothing. With average luck (ten heads, ten tails) the stock
 * ends where it started, and cash does too.
 *
 * Hold half in each and reset to 50/50 at the end of every year, and the whole
 * portfolio is multiplied by 1.5 after heads and 0.75 after tails. Ten of each
 * is (1.5 × 0.75)^10 = 1.125^10, so $10,000 becomes $32,473. The mix is just
 * the same coin with a different payoff, so it reuses the random-walk model:
 * `rebalancedConfig` is that payoff, and the stock-alone runs and the
 * rebalanced runs share their flips.
 */

import { choose } from "../stats";
import { expectedFinal, pathFromFlips, runWalkers, type WalkerConfig, type WalkerRun } from "./randomWalkers";

/** The stock on its own: heads +100%, tails −50%. Average return +25%. */
export const STOCK_ALONE: WalkerConfig = { count: 500, years: 20, up: 1, down: 0.5, start: 10_000 };

/** The share of the portfolio held in the stock after every rebalance. */
export const STOCK_SHARE = 0.5;

/** The whole portfolio's payoff: the stock's swing on its share, cash earning nothing. */
export const rebalancedConfig = (stock: WalkerConfig, share = STOCK_SHARE): WalkerConfig => ({
  ...stock,
  up: stock.up * share,
  down: stock.down * share,
});

export const REBALANCED: WalkerConfig = rebalancedConfig(STOCK_ALONE);

export interface Holdings {
  stock: number;
  cash: number;
}

export interface YearStep {
  heads: boolean;
  /** Holdings at the start of the year. */
  before: Holdings;
  /** After the flip, before anything is bought or sold. */
  flipped: Holdings;
  /** After rebalancing back to the target share. */
  after: Holdings;
  /** Dollars moved: positive is stock sold into cash, negative is cash used to buy stock. */
  sold: number;
}

/** One year of the strategy, step by step, so the animation shows the actual trades. */
export const rebalanceYear = (config: WalkerConfig, before: Holdings, heads: boolean, share = STOCK_SHARE): YearStep => {
  const flipped = { stock: before.stock * (heads ? 1 + config.up : 1 - config.down), cash: before.cash };
  const total = flipped.stock + flipped.cash;
  const after = { stock: total * share, cash: total * (1 - share) };
  return { heads, before, flipped, after, sold: flipped.stock - after.stock };
};

/** Every year of a flip sequence, starting from the target split of the stake. */
export const rebalanceSteps = (config: WalkerConfig, flips: readonly boolean[], share = STOCK_SHARE): YearStep[] => {
  const steps: YearStep[] = [];
  let holdings: Holdings = { stock: config.start * share, cash: config.start * (1 - share) };
  for (const heads of flips) {
    const step = rebalanceYear(config, holdings, heads, share);
    steps.push(step);
    holdings = step.after;
  }
  return steps;
};

/** The left-alone mix's value when its stock leg is worth `stockValue`: the cash leg never moves. */
export const leftAloneFromStock = (config: WalkerConfig, stockValue: number, share = STOCK_SHARE): number =>
  stockValue * share + config.start * (1 - share);

/** The same people on both ways of holding the same 50/50 start: one set of flips each. */
export interface RebalancingRun {
  stockRun: WalkerRun;
  /** Left-alone mix paths for the same flips: the stock leg drifts, the cash leg sits. */
  leftAlonePaths: number[][];
  /** Left-alone final per investor. */
  leftAloneFinals: number[];
  /** Rebalanced paths for the same flips, one per investor. */
  rebalancedPaths: number[][];
  /** Rebalanced final per investor. */
  rebalancedFinals: number[];
}

export const runRebalancing = (seed: number | string, config: WalkerConfig = STOCK_ALONE): RebalancingRun => {
  const stockRun = runWalkers(seed, config);
  const mix = rebalancedConfig(config);
  const rebalancedPaths = stockRun.paths.map((path) =>
    pathFromFlips(
      mix,
      path.slice(1).map((v, i) => v > (path[i] as number)),
    ),
  );
  const leftAlonePaths = stockRun.paths.map((path) => path.map((v) => leftAloneFromStock(config, v)));
  return {
    stockRun,
    leftAlonePaths,
    leftAloneFinals: leftAlonePaths.map((p) => p[p.length - 1] as number),
    rebalancedPaths,
    rebalancedFinals: rebalancedPaths.map((p) => p[p.length - 1] as number),
  };
};

// --- Exact answers ----------------------------------------------------------

/** Rebalanced final for an investor with `heads` heads. Order does not matter. */
export const rebalancedFinal = (config: WalkerConfig, heads: number, share = STOCK_SHARE): number => {
  const mix = rebalancedConfig(config, share);
  return mix.start * (1 + mix.up) ** heads * (1 - mix.down) ** (mix.years - heads);
};

/** Stock-alone final for an investor with `heads` heads. */
export const stockFinal = (config: WalkerConfig, heads: number): number =>
  config.start * (1 + config.up) ** heads * (1 - config.down) ** (config.years - heads);

/** Left-alone final for `heads` heads: 5,000 × 2^(2h−20) + 5,000, the stock leg drifting beside idle cash. */
export const leftAloneFinal = (config: WalkerConfig, heads: number, share = STOCK_SHARE): number =>
  leftAloneFromStock(config, stockFinal(config, heads), share);

/** Exact average final of the left-alone mix: the stock leg's average plus the cash. */
export const expectedLeftAlone = (config: WalkerConfig, share = STOCK_SHARE): number =>
  leftAloneFromStock(config, expectedFinal(config), share);

/** The geometric mean yearly multiplier of the mix: √(1.5 × 0.75) = 1.0607. */
export const rebalancedYearlyMultiplier = (config: WalkerConfig, share = STOCK_SHARE): number => {
  const mix = rebalancedConfig(config, share);
  return Math.sqrt((1 + mix.up) * (1 - mix.down));
};

/**
 * The head counts at which resetting finishes strictly ahead of leaving the same mix alone.
 * Left alone has a floor (the idle cash), so it also wins after very unlucky runs, not
 * only lucky ones: resetting wins in the middle only.
 */
export const headsRebalancedWins = (config: WalkerConfig, share = STOCK_SHARE): number[] => {
  const wins: number[] = [];
  for (let k = 0; k <= config.years; k++) {
    if (rebalancedFinal(config, k, share) > leftAloneFinal(config, k, share)) wins.push(k);
  }
  return wins;
};

/** Exact chance that one person does better resetting yearly than leaving the same mix alone. */
export const exactRebalancedWinProbability = (config: WalkerConfig, share = STOCK_SHARE): number => {
  let p = 0;
  for (const k of headsRebalancedWins(config, share)) p += choose(config.years, k) / 2 ** config.years;
  return p;
};

/** How many people in a run finish strictly ahead when they reset rather than leave the mix alone. */
export const countRebalancedAhead = (run: RebalancingRun): number =>
  run.rebalancedFinals.filter((v, i) => v > (run.leftAloneFinals[i] as number)).length;
