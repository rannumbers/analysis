/**
 * Pólya's random walk: does a drunk walker ever get home?
 *
 * A simple random walk on the integer lattice Z^d takes one unit step along a
 * randomly chosen axis, forwards or back: 2 choices on a line, 4 on a grid, 6 in
 * space. Pólya (1921) proved it returns to its start with probability 1 in one
 * and two dimensions, and only with probability 0.3405 in three.
 *
 * A simulation only runs a finite number of steps, so the answer it converges to
 * is the exact chance of being home at least once within N steps, from the
 * renewal relation. With u(2n) the chance of standing at the origin after 2n
 * steps and f(2n) the chance the first return is at step 2n,
 *
 *   f(2n) = u(2n) − Σₖ₌₁ⁿ⁻¹ f(2k) · u(2n−2k),   P(home within 2n) = Σ f.
 *
 * A walk can only be at the origin after an even number of steps.
 */

import { childRng } from "../rng";
import { logChoose } from "../stats";

export type Dim = 1 | 2 | 3;
export const DIMS: readonly Dim[] = [1, 2, 3];

/** The simple cubic lattice's Watson integral: expected visits to the origin, counting the start. */
export const WATSON_3D = 1.516386059151978;
/** Pólya's constant: the chance a 3D walk ever returns, 1 − 1/u. */
export const POLYA_3D = 1 - 1 / WATSON_3D;

/**
 * u(2n) for n = 0..maxPairs: the chance of standing at the origin after 2n steps.
 *
 * 1D and 2D are closed forms, built by running ratios so nothing overflows. 3D
 * sums the closed-walk counts (1, 6, 90, 1860, ...) over how many steps go along
 * one axis, in log space; `originProbability3dBySum` reaches it another way.
 */
export const originSeries = (dim: Dim, maxPairs: number): number[] => {
  const u: number[] = [1];
  if (dim === 1 || dim === 2) {
    let line = 1; // C(2n,n) / 4^n
    for (let n = 1; n <= maxPairs; n++) {
      line *= (2 * n - 1) / (2 * n);
      u.push(dim === 1 ? line : line * line);
    }
    return u;
  }
  // Of 2n steps, 2k are along z (placed in C(2n,2k) ways, balanced in C(2k,k)),
  // and the other 2n−2k form a closed walk on the grid, C(2n−2k, n−k)² of them.
  for (let n = 1; n <= maxPairs; n++) {
    let sum = 0;
    for (let k = 0; k <= n; k++) {
      sum += Math.exp(
        logChoose(2 * n, 2 * k) + logChoose(2 * k, k) + 2 * logChoose(2 * n - 2 * k, n - k) - 2 * n * Math.log(6),
      );
    }
    u.push(sum);
  }
  return u;
};

/**
 * 3D u(2n) straight from the definition, in log space:
 * C(2n,n) / 2²ⁿ · Σ over j+k ≤ n of (n! / (j! k! (n−j−k)!) / 3ⁿ)².
 * O(n²) per value, so it is the reference for the recurrence, not the workhorse.
 */
export const originProbability3dBySum = (n: number): number => {
  if (n === 0) return 1;
  let sum = 0;
  for (let j = 0; j <= n; j++) {
    for (let k = 0; k <= n - j; k++) {
      const logMultinomial = logChoose(n, j) + logChoose(n - j, k);
      sum += Math.exp(2 * (logMultinomial - n * Math.log(3)));
    }
  }
  return Math.exp(logChoose(2 * n, n) - 2 * n * Math.log(2)) * sum;
};

/** f(2n) for n = 0..maxPairs: the chance the first return home is at step 2n. */
export const firstReturnSeries = (dim: Dim, maxPairs: number): number[] => {
  const u = originSeries(dim, maxPairs);
  const f: number[] = [0];
  for (let n = 1; n <= maxPairs; n++) {
    let s = u[n] as number;
    for (let k = 1; k < n; k++) s -= (f[k] as number) * (u[n - k] as number);
    f.push(s);
  }
  return f;
};

/** The longest run on the chart, in steps. */
export const MAX_STEPS = 10_000;

const cache = new Map<Dim, number[]>();
/** Cumulative first-return chance by pairs of steps, out to MAX_STEPS. */
const cumulative = (dim: Dim): number[] => {
  const hit = cache.get(dim);
  if (hit) return hit;
  const f = firstReturnSeries(dim, MAX_STEPS / 2);
  const cum: number[] = [];
  let total = 0;
  for (const v of f) {
    total += v;
    cum.push(total);
  }
  cache.set(dim, cum);
  return cum;
};

/** The exact chance a walk in `dim` dimensions is at home at least once within `steps` steps. */
export const homeWithin = (dim: Dim, steps: number): number => {
  if (steps < 0 || steps > MAX_STEPS) throw new Error("steps must be 0.." + MAX_STEPS);
  return cumulative(dim)[Math.floor(steps / 2)] as number;
};

// --- The simulation --------------------------------------------------------------

/** How many opening steps of a display walker are kept for drawing. */
export const DISPLAY_STEPS = 400;

export interface WorldRun {
  dim: Dim;
  walkers: number;
  /** The step of each walker's first return, or 0 if it was not home within MAX_STEPS. */
  firstReturn: number[];
  /** The first walkers' paths: DISPLAY_STEPS steps each, [x, y, z] after every step, from the start. */
  paths: number[][][];
}

/**
 * `walkers` independent walkers in one world, each on its own seeded stream so
 * adding one does not change the others. Every walker stores only its first
 * return step; the first `showPaths` also keep their opening DISPLAY_STEPS for
 * drawing, and carry on past a return so the picture is the same walker.
 */
export const runWorld = (seed: string, dim: Dim, walkers: number, showPaths: number): WorldRun => {
  const firstReturn: number[] = [];
  const paths: number[][][] = [];
  const choices = 2 * dim;
  for (let i = 0; i < walkers; i++) {
    const rng = childRng(seed + "-" + dim + "d", i);
    const show = i < showPaths;
    const path: number[][] = [[0, 0, 0]];
    let x = 0;
    let y = 0;
    let z = 0;
    let first = 0;
    for (let step = 1; step <= MAX_STEPS; step++) {
      const r = Math.floor(rng() * choices);
      const delta = r % 2 === 0 ? 1 : -1;
      const axis = r >> 1;
      if (axis === 0) x += delta;
      else if (axis === 1) y += delta;
      else z += delta;
      if (show && step <= DISPLAY_STEPS) path.push([x, y, z]);
      if (first === 0 && x === 0 && y === 0 && z === 0) first = step;
      if (first !== 0 && (!show || step >= DISPLAY_STEPS)) break;
    }
    firstReturn.push(first);
    if (show) paths.push(path);
  }
  return { dim, walkers, firstReturn, paths };
};

/** The share of a world's walkers that have been home at least once within `steps` steps. */
export const simulatedHome = (run: WorldRun, steps: number): number => {
  let home = 0;
  for (const r of run.firstReturn) if (r > 0 && r <= steps) home++;
  return home / run.walkers;
};
