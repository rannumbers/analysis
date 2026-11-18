/**
 * Statistics helpers and exact-math references.
 *
 * The exact functions here are the ground truth that Monte Carlo simulations
 * are checked against in tests, and the number the videos converge onto.
 */

export interface Histogram {
  bins: number[];
  /** Left edge of each bin. */
  edges: number[];
  binWidth: number;
  min: number;
  max: number;
  count: number;
  maxBinCount: number;
}

/** Fixed-width histogram. Values outside [min, max] are clamped into the end bins. */
export const histogram = (
  values: readonly number[],
  binCount: number,
  range?: { min: number; max: number },
): Histogram => {
  if (binCount <= 0) throw new Error("binCount must be positive");
  const min = range?.min ?? Math.min(...values);
  const max = range?.max ?? Math.max(...values);
  // Degenerate range (all values identical): give the bin nominal width.
  const span = max - min || 1;
  const binWidth = span / binCount;
  const bins = new Array<number>(binCount).fill(0);
  for (const v of values) {
    const raw = Math.floor((v - min) / binWidth);
    const idx = Math.min(binCount - 1, Math.max(0, raw));
    bins[idx] = (bins[idx] as number) + 1;
  }
  const edges = Array.from({ length: binCount }, (_, i) => min + i * binWidth);
  return {
    bins,
    edges,
    binWidth,
    min,
    max,
    count: values.length,
    maxBinCount: bins.length ? Math.max(...bins) : 0,
  };
};

export const mean = (values: readonly number[]): number =>
  values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;

/** Population standard deviation. */
export const stdDev = (values: readonly number[]): number => {
  if (values.length === 0) return 0;
  const m = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - m) ** 2)));
};

/** Running mean after each observation. Drives the "converging" line in videos. */
export const runningMean = (values: readonly number[]): number[] => {
  const out: number[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i] as number;
    out.push(sum / (i + 1));
  }
  return out;
};

/** Linearly interpolated percentile (p in [0, 1]) over a copy of the values. */
export const percentile = (values: readonly number[], p: number): number => {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const pos = (sorted.length - 1) * Math.min(1, Math.max(0, p));
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const a = sorted[lo] as number;
  if (lo === hi) return a;
  const b = sorted[hi] as number;
  return a + (b - a) * (pos - lo);
};

/**
 * Geometric mean of growth multipliers (e.g. 1.07 for +7%).
 * This is the "types of averages" video: the arithmetic mean of returns
 * overstates what you actually compound at.
 */
export const geometricMean = (multipliers: readonly number[]): number => {
  if (multipliers.length === 0) return 0;
  // Sum of logs rather than a running product, to avoid underflow over long runs.
  let logSum = 0;
  for (const m of multipliers) {
    if (m <= 0) return 0;
    logSum += Math.log(m);
  }
  return Math.exp(logSum / multipliers.length);
};

// --- Exact combinatorics -------------------------------------------------
// Done in log space so 99-card Commander decks do not overflow.

const logFactorialCache: number[] = [0, 0];
const logFactorial = (n: number): number => {
  if (n < 0) throw new Error("logFactorial of negative");
  const cached = logFactorialCache[n];
  if (cached !== undefined) return cached;
  let value = logFactorialCache[logFactorialCache.length - 1] as number;
  for (let i = logFactorialCache.length; i <= n; i++) {
    value += Math.log(i);
    logFactorialCache[i] = value;
  }
  return value;
};

export const logChoose = (n: number, k: number): number => {
  if (k < 0 || k > n) return -Infinity;
  return logFactorial(n) - logFactorial(k) - logFactorial(n - k);
};

export const choose = (n: number, k: number): number => Math.exp(logChoose(n, k));

/**
 * Hypergeometric PMF: probability of exactly `successesDrawn` successes when
 * drawing `draws` cards from a deck of `population` containing `successes`.
 *
 * This is the reference answer for every "what are the odds of drawing X"
 * video, and the target the Monte Carlo estimate must converge to.
 */
export const hypergeometricPmf = (
  population: number,
  successes: number,
  draws: number,
  successesDrawn: number,
): number => {
  if (successesDrawn < 0 || successesDrawn > draws) return 0;
  if (successesDrawn > successes) return 0;
  if (draws - successesDrawn > population - successes) return 0;
  const logP =
    logChoose(successes, successesDrawn) +
    logChoose(population - successes, draws - successesDrawn) -
    logChoose(population, draws);
  return Math.exp(logP);
};

/** P(X <= successesDrawn). */
export const hypergeometricCdf = (
  population: number,
  successes: number,
  draws: number,
  successesDrawn: number,
): number => {
  let total = 0;
  for (let k = 0; k <= successesDrawn; k++) {
    total += hypergeometricPmf(population, successes, draws, k);
  }
  return Math.min(1, total);
};

/** P(X >= atLeast) — "at least 3 lands in my opening 7". */
export const hypergeometricAtLeast = (
  population: number,
  successes: number,
  draws: number,
  atLeast: number,
): number => {
  if (atLeast <= 0) return 1;
  return Math.max(0, 1 - hypergeometricCdf(population, successes, draws, atLeast - 1));
};

/**
 * 95% confidence half-width for a proportion estimated from n samples.
 * Used in tests to assert convergence at a tolerance that scales with n
 * rather than a magic number.
 */
export const proportionStdError = (p: number, n: number): number =>
  Math.sqrt(Math.max(p * (1 - p), Number.EPSILON) / n);
