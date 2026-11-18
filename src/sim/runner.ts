/**
 * Simulation runners.
 *
 * Two shapes cover every video in the backlog:
 *
 *  1. `runSimulation` — a state machine stepped N times, returning every
 *     intermediate state. Compositions precompute this once and index it by
 *     frame, which is what keeps parallel frame rendering deterministic.
 *
 *  2. `runTrials` — a Monte Carlo experiment: repeat an independent trial
 *     many times and collect outcomes. Shared by the "money math" and
 *     "odds in games" pillars.
 */

import { childRng, rngFromSeed, type Rng } from "./rng";

export interface Simulation<TState> {
  /** Build the state at step 0. */
  init: (rng: Rng) => TState;
  /**
   * Advance one step. Must be pure with respect to anything outside `state`
   * and `rng` — no clocks, no module-level mutable state.
   */
  step: (state: TState, rng: Rng, stepIndex: number) => TState;
}

export interface RunOptions {
  steps: number;
  seed: number | string;
}

/**
 * Run a simulation and return `steps + 1` states (index 0 is the initial state).
 *
 * Memory note: this holds every state. For hundreds of walkers over hundreds of
 * steps that is fine (a few MB). For anything larger, have `step` return a
 * compact state and derive visuals from it rather than storing render data.
 */
export const runSimulation = <TState>(
  sim: Simulation<TState>,
  { steps, seed }: RunOptions,
): TState[] => {
  const rng = rngFromSeed(seed);
  const states: TState[] = [sim.init(rng)];
  for (let i = 0; i < steps; i++) {
    states.push(sim.step(states[i] as TState, rng, i));
  }
  return states;
};

export interface TrialsOptions {
  trials: number;
  seed: number | string;
}

/**
 * Run `trials` independent trials. Each trial gets its own generator derived
 * from (seed, index), so trial k's outcome does not depend on how many trials
 * ran before it. That means `runTrials(1000)` and `runTrials(5000)` agree on
 * their first 1000 outcomes — which is what lets a video animate a growing
 * sample without recomputing or visibly jumping.
 */
export const runTrials = <TOutcome>(
  trial: (rng: Rng, index: number) => TOutcome,
  { trials, seed }: TrialsOptions,
): TOutcome[] => {
  const out: TOutcome[] = new Array(trials);
  for (let i = 0; i < trials; i++) {
    out[i] = trial(childRng(seed, i), i);
  }
  return out;
};

/**
 * Monte Carlo estimate of a probability, with the running estimate after each
 * trial. The running array is what the "converging on the exact answer"
 * visuals plot against the exact line.
 */
export interface ProbabilityEstimate {
  estimate: number;
  hits: number;
  trials: number;
  /** Running estimate after each trial; same length as `trials`. */
  running: number[];
}

export const estimateProbability = (
  trial: (rng: Rng, index: number) => boolean,
  options: TrialsOptions,
): ProbabilityEstimate => {
  const outcomes = runTrials(trial, options);
  const running: number[] = new Array(outcomes.length);
  let hits = 0;
  for (let i = 0; i < outcomes.length; i++) {
    if (outcomes[i]) hits++;
    running[i] = hits / (i + 1);
  }
  return {
    estimate: outcomes.length === 0 ? 0 : hits / outcomes.length,
    hits,
    trials: outcomes.length,
    running,
  };
};

// --- Frame mapping -------------------------------------------------------

/**
 * Map a frame number onto a step index in a precomputed run.
 *
 * Compositions call this instead of doing their own arithmetic, so the
 * "clamp at the end" and "hold on the first frame" behaviour is consistent
 * across videos (and so the last frame is a stable state to loop from).
 */
export const stepForFrame = (
  frame: number,
  opts: { totalFrames: number; totalSteps: number; holdFrames?: number },
): number => {
  const hold = opts.holdFrames ?? 0;
  const active = Math.max(1, opts.totalFrames - hold);
  const t = Math.min(1, Math.max(0, frame / active));
  return Math.min(opts.totalSteps, Math.round(t * opts.totalSteps));
};

/**
 * How many trials should be "revealed" at a given frame, growing to `total`.
 * `curve` lets the reveal start fast and slow down (or the reverse), which
 * reads better than linear when the final count is in the thousands.
 */
export const revealedCount = (
  frame: number,
  opts: { totalFrames: number; total: number; curve?: number; holdFrames?: number },
): number => {
  const hold = opts.holdFrames ?? 0;
  const active = Math.max(1, opts.totalFrames - hold);
  const t = Math.min(1, Math.max(0, frame / active));
  const curved = Math.pow(t, opts.curve ?? 1);
  return Math.max(1, Math.round(curved * opts.total));
};
