/**
 * Runs in fair coin flips.
 *
 * The exact answer comes from dynamic programming over the current run length,
 * so nothing here is assumed: P(longest run <= k) is the chance that a walk
 * which resets to 1 on a change and grows by 1 on a repeat never reaches k+1.
 */

import { childRng, type Rng } from "../rng";

export const FLIPS = 100;
export const SEQUENCES = 1_000;
/** The run the viewer's mate got. */
export const MATE_RUN = 6;
/** Longest runs above this are folded into the last bar of the chart. */
export const MAX_SHOWN = 14;

/** P(no run of `k` or more of the same face in `n` fair flips). */
export const probNoRunOf = (n: number, k: number): number => {
  if (n <= 0) return 1;
  // state[r - 1] = P(current run has length r and no run has reached k yet)
  let state: number[] = Array.from({ length: k - 1 }, (_, i) => (i === 0 ? 1 : 0));
  for (let flip = 2; flip <= n; flip++) {
    const next = new Array<number>(k - 1).fill(0);
    for (let r = 1; r <= k - 1; r++) {
      const p = state[r - 1] as number;
      next[0] = (next[0] as number) + p * 0.5; // a change resets the run
      if (r < k - 1) next[r] = (next[r] as number) + p * 0.5; // a repeat extends it
    }
    state = next;
  }
  return state.reduce((a, b) => a + b, 0);
};

/** P(at least one run of `k` or more of the same face in `n` fair flips). */
export const probRunAtLeast = (n: number, k: number): number => 1 - probNoRunOf(n, k);

/** Exact P(longest run == k) for k = 0..n, indexed by k. */
export const longestRunDistribution = (n: number): number[] =>
  Array.from({ length: n + 1 }, (_, k) => {
    if (k === 0) return n === 0 ? 1 : 0;
    return probRunAtLeast(n, k) - probRunAtLeast(n, k + 1);
  });

/** Exact P(longest run == k), with everything at or above MAX_SHOWN folded together. */
export const foldedDistribution = (n: number, max = MAX_SHOWN): number[] => {
  const d = longestRunDistribution(n);
  return Array.from({ length: max + 1 }, (_, k) =>
    k < max ? (d[k] as number) : d.slice(max).reduce((a, b) => a + b, 0),
  );
};

export const flipCoins = (rng: Rng, n: number): boolean[] => Array.from({ length: n }, () => rng() < 0.5);

export interface Run {
  start: number;
  length: number;
  face: boolean;
}

/** The longest run, first one winning a tie. */
export const longestRun = (seq: readonly boolean[]): Run => {
  let best: Run = { start: 0, length: 0, face: false };
  let cur: Run = { start: 0, length: 0, face: false };
  seq.forEach((face, i) => {
    cur = i > 0 && face === seq[i - 1] ? { ...cur, length: cur.length + 1 } : { start: i, length: 1, face };
    if (cur.length > best.length) best = cur;
  });
  return best;
};

/**
 * A made-up sequence in the way people write them: they switch face too often
 * and never let a run get past four. Illustrative only, not a measurement.
 */
export const inventedSequence = (seed: string, n = FLIPS): boolean[] => {
  for (let attempt = 0; ; attempt++) {
    const rng = childRng(seed + ":invented", attempt);
    const out: boolean[] = [rng() < 0.5];
    let run = 1;
    for (let i = 1; i < n; i++) {
      const last = out[i - 1] as boolean;
      const stay = run < 4 && rng() < 0.4;
      out.push(stay ? last : !last);
      run = stay ? run + 1 : 1;
    }
    if (longestRun(out).length === 4) return out;
  }
};

export interface StreakRun {
  /** The sequence shown for one person: longest run exactly MATE_RUN. */
  mate: boolean[];
  invented: boolean[];
  /** Longest run of each of the SEQUENCES sequences, in order. */
  longest: number[];
}

export const runStreaks = (seed: string): StreakRun => {
  const longest: number[] = [];
  let mate: boolean[] | undefined;
  for (let i = 0; i < SEQUENCES; i++) {
    const seq = flipCoins(childRng(seed, i), FLIPS);
    const len = longestRun(seq).length;
    longest.push(len);
    if (!mate && len === MATE_RUN) mate = seq;
  }
  if (!mate) throw new Error("no sequence with a longest run of " + MATE_RUN);
  return { mate, invented: inventedSequence(seed), longest };
};

/** Share of the first n sequences whose longest run is exactly k (k >= max folds upward). */
export const simShare = (longest: readonly number[], k: number, n: number, max = MAX_SHOWN): number => {
  let c = 0;
  for (let i = 0; i < n; i++) {
    const v = longest[i] as number;
    if (k >= max ? v >= max : v === k) c++;
  }
  return n === 0 ? 0 : c / n;
};

/** Share of the first n sequences with a run of at least k. */
export const simAtLeast = (longest: readonly number[], k: number, n: number): number => {
  let c = 0;
  for (let i = 0; i < n; i++) if ((longest[i] as number) >= k) c++;
  return n === 0 ? 0 : c / n;
};
