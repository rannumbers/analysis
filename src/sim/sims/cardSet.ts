/**
 * Completing a set: the coupon collector.
 *
 * A set has `n` different cards. Every card you open is one of the `n`, equally
 * likely, one at a time, with no packs and no rarities. How many cards until
 * you hold all of them?
 *
 * With `held` different cards in the binder, a new card turns up with
 * probability (n − held) / n, so you wait n / (n − held) cards for it. Summing
 * those waits gives n × H(n), where H is the harmonic number. The waits grow as
 * the binder fills: the first card costs 1, the last costs n. That is why the
 * last 10 cards of a 100-card set cost more than the first 90.
 */

import { childRng, type Rng } from "../rng";
import { choose } from "../stats";

export const SET_SIZE = 100;
export const COLLECTORS = 1000;
/** The split the video is about: the first 90 different cards against the last 10. */
export const FIRST = 90;

/** H(k) = 1 + 1/2 + … + 1/k. */
export const harmonic = (k: number): number => {
  let sum = 0;
  for (let i = 1; i <= k; i++) sum += 1 / i;
  return sum;
};

/** Cards to open for the next new card, holding `held` different ones. */
export const expectedWait = (n: number, held: number): number => n / (n - held);

/** Expected cards to complete a set of `n`: n × H(n). */
export const expectedTotal = (n: number): number => n * harmonic(n);

/** Expected cards to collect the first `k` different ones: n × (H(n) − H(n − k)). */
export const expectedFirst = (n: number, k: number): number => n * (harmonic(n) - harmonic(n - k));

/** Expected cards for the last `k` different ones: n × H(k). */
export const expectedLast = (n: number, k: number): number => n * harmonic(k);

/** Expected duplicates in hand at completion. */
export const expectedDuplicates = (n: number): number => expectedTotal(n) - n;

/**
 * P(complete within t cards) = Σₖ (−1)ᵏ C(n,k) (1 − k/n)ᵗ, by inclusion-exclusion
 * over which cards are still missing. The alternating terms cancel badly for t
 * well below the mean, but they are tiny against the answer from t = n upward.
 */
export const completionCdf = (n: number, t: number): number => {
  if (t < n) return 0;
  let sum = 0;
  for (let k = 0; k <= n; k++) {
    sum += (k % 2 === 0 ? 1 : -1) * choose(n, k) * (1 - k / n) ** t;
  }
  return Math.min(1, Math.max(0, sum));
};

/** P(complete on exactly the t-th card). */
export const completionPmf = (n: number, t: number): number => completionCdf(n, t) - completionCdf(n, t - 1);

/** The same distribution by a different route: walk the binder one card at a time. */
export const completionCdfByChain = (n: number, maxT: number): number[] => {
  // state[h] = P(holding h different cards after t openings)
  let state = new Array<number>(n + 1).fill(0);
  state[0] = 1;
  const out: number[] = [0];
  for (let t = 1; t <= maxT; t++) {
    const next = new Array<number>(n + 1).fill(0);
    for (let h = 0; h <= n; h++) {
      const p = state[h] as number;
      if (p === 0) continue;
      if (h === n) {
        next[n] = (next[n] as number) + p;
        continue;
      }
      next[h] = (next[h] as number) + (p * h) / n;
      next[h + 1] = (next[h + 1] as number) + (p * (n - h)) / n;
    }
    state = next;
    out.push(state[n] as number);
  }
  return out;
};

export interface Collector {
  /** Every card opened, in order, numbered 1 to n. */
  draws: number[];
  /** newAt[j]: how many cards had been opened when the (j + 1)-th different card arrived. */
  newAt: number[];
  /** firstSeen[c − 1]: the opening (1-based) at which card c first arrived. */
  firstSeen: number[];
  total: number;
}

/** One collector, opening cards until the set is complete. */
export const collect = (rng: Rng, n: number = SET_SIZE): Collector => {
  const seen = new Array<number>(n).fill(0);
  const draws: number[] = [];
  const newAt: number[] = [];
  while (newAt.length < n) {
    const card = Math.floor(rng() * n) + 1;
    draws.push(card);
    if (seen[card - 1] === 0) {
      seen[card - 1] = draws.length;
      newAt.push(draws.length);
    }
  }
  return { draws, newAt, firstSeen: seen, total: draws.length };
};

/** Each collector gets its own stream, so adding one does not change the others. */
export const runCollectors = (seed: string, count: number = COLLECTORS, n: number = SET_SIZE): Collector[] =>
  Array.from({ length: count }, (_, i) => collect(childRng(seed, i), n));

/** Cards opened to hold the first `k` different ones. */
export const cardsForFirst = (c: Collector, k: number = FIRST): number => c.newAt[k - 1] as number;

/** Cards opened after those, for the rest of the set. */
export const cardsForLast = (c: Collector, k: number = FIRST): number => c.total - cardsForFirst(c, k);

/** Cards opened to find the very last different one, after holding n − 1. */
export const lastCardWait = (c: Collector): number => c.total - (c.newAt[c.newAt.length - 2] as number);

/**
 * Expected openings, in total, until `k` complete sets can be made from what was
 * opened: n ∫₀^∞ (1 − (1 − e^(−t) Σ_{j<k} t^j / j!)^n) dt. With k = 2 this is two
 * collectors who pool every duplicate and swap freely, so each needs half of it.
 * Midpoint rule: the integrand is smooth and gone by t = 60 for n = 100.
 */
export const expectedOpeningsForSets = (n: number, k: number): number => {
  const h = 0.002;
  let sum = 0;
  for (let t = h / 2; t < 60; t += h) {
    let poisson = 0;
    let term = 1;
    for (let j = 0; j < k; j++) {
      poisson += term;
      term *= t / (j + 1);
    }
    sum += (1 - (1 - Math.exp(-t) * poisson) ** n) * h;
  }
  return n * sum;
};

/** Openings by `k` collectors together, until every card has turned up at least `k` times. */
export const poolOpenings = (rng: Rng, k: number, n: number = SET_SIZE): number => {
  const counts = new Array<number>(n).fill(0);
  let enough = 0;
  let opened = 0;
  while (enough < n) {
    const card = Math.floor(rng() * n);
    opened++;
    counts[card] = (counts[card] as number) + 1;
    if (counts[card] === k) enough++;
  }
  return opened;
};
