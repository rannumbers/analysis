/**
 * Riffle shuffles in the Gilbert-Shannon-Reeds model (Bayer and Diaconis, 1992).
 *
 * One riffle: cut at a Binomial(n, 1/2) point, then drop cards one at a time
 * from the bottom of either half, each half chosen with probability
 * proportional to the cards it has left. After k riffles a deck with r rising
 * sequences has probability C(2^k + n - r, n) / 2^(nk), so the number of
 * decks with r rising sequences, A(n, r) Eulerian, gives the exact
 * distribution of r. The exact numbers use BigInt; nothing is rounded until
 * the final division.
 *
 * Both the riffled deck and a uniformly random deck are constant on each
 * rising-sequence class, so the total-variation distance between them equals
 * the distance between their rising-sequence distributions. That is what
 * lets a simulation estimate it without enumerating 52! decks.
 */

import { childRng, type Rng } from "../rng";

export const DECK = 52;

const choose = (n: number, k: number): bigint => {
  if (k < 0 || k > n) return 0n;
  let out = 1n;
  for (let i = 1; i <= k; i++) out = (out * BigInt(n - k + i)) / BigInt(i);
  return out;
};

const factorial = (n: number): bigint => {
  let out = 1n;
  for (let i = 2; i <= n; i++) out *= BigInt(i);
  return out;
};

/** Eulerian numbers: element r (1..n) counts permutations with r rising sequences. Element 0 is unused. */
export const eulerian = (n: number): bigint[] => {
  let row: bigint[] = [0n, 1n];
  for (let m = 2; m <= n; m++) {
    const next: bigint[] = new Array<bigint>(m + 1).fill(0n);
    for (let r = 1; r <= m; r++) {
      next[r] = BigInt(r) * (row[r] ?? 0n) + BigInt(m - r + 1) * (row[r - 1] ?? 0n);
    }
    row = next;
  }
  return row;
};

/** num/den as a float, exact to about 1e-18 however large the integers are. */
const ratio = (num: bigint, den: bigint): number => Number((num * 10n ** 18n) / den) / 1e18;

/** Probability that a deck riffled k times has r rising sequences, r = 1..n (element 0 unused). */
export const exactRisingDistribution = (n: number, k: number): number[] => {
  const a = eulerian(n);
  const total = 1n << BigInt(n * k);
  const out = new Array<number>(n + 1).fill(0);
  for (let r = 1; r <= n; r++) {
    out[r] = ratio((a[r] as bigint) * choose((1 << k) + n - r, n), total);
  }
  return out;
};

/** Exact distance from a perfectly random deck after k riffles, in [0, 1]. */
export const exactDistance = (n: number, k: number): number => {
  const a = eulerian(n);
  const nFact = factorial(n);
  const total = 1n << BigInt(n * k);
  let sum = 0n;
  for (let r = 1; r <= n; r++) {
    const mine = nFact * choose((1 << k) + n - r, n);
    const diff = mine > total ? mine - total : total - mine;
    sum += (a[r] as bigint) * diff;
  }
  return ratio(sum, 2n * nFact * total);
};

/** Rising sequences: one more than the number of i with card i+1 above card i in the deck. */
export const risingSequences = (deck: readonly number[]): number => {
  const pos = new Array<number>(deck.length);
  deck.forEach((card, p) => {
    pos[card] = p;
  });
  let r = 1;
  for (let c = 0; c + 1 < deck.length; c++) if ((pos[c + 1] as number) < (pos[c] as number)) r++;
  return r;
};

export interface Riffle {
  deck: number[];
  /** Cards in the first half. */
  cut: number;
  /** dest[p] is where the card at position p ended up. */
  dest: number[];
}

/** One GSR riffle. Position 0 is the top of the deck; the halves drop from the bottom up. */
export const riffle = (rng: Rng, deck: readonly number[]): Riffle => {
  const n = deck.length;
  let cut = 0;
  for (let i = 0; i < n; i++) if (rng() < 0.5) cut++;
  let left = cut;
  let right = n - cut;
  const out = new Array<number>(n);
  const dest = new Array<number>(n);
  for (let q = n - 1; q >= 0; q--) {
    if (rng() < left / (left + right)) {
      left--;
      out[q] = deck[left] as number;
      dest[left] = q;
    } else {
      right--;
      out[q] = deck[cut + right] as number;
      dest[cut + right] = q;
    }
  }
  return { deck: out, cut, dest };
};

export interface Trail {
  /** decks[k] is the deck after k riffles; decks[0] is in order. */
  decks: number[][];
  /** riffles[k] is the riffle that turned decks[k] into decks[k + 1]. */
  riffles: Riffle[];
  /** Rising sequences after k riffles. */
  runs: number[];
}

const newDeck = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

/** One deck, riffled k times, with every step kept. */
export const trailOf = (seed: number | string, index: number, riffles: number, n = DECK): Trail => {
  const rng = childRng(seed, index);
  const decks = [newDeck(n)];
  const steps: Riffle[] = [];
  for (let k = 0; k < riffles; k++) {
    const s = riffle(rng, decks[k] as number[]);
    steps.push(s);
    decks.push(s.deck);
  }
  return { decks, riffles: steps, runs: decks.map(risingSequences) };
};

export interface RiffleRun {
  decks: number;
  maxRiffles: number;
  /** counts[k][r]: decks with r rising sequences after k riffles. */
  counts: number[][];
  /** First deck that shows exactly 2^3 = 8 rising sequences after three riffles. */
  heroIndex: number;
}

/** `decks` decks, each riffled `maxRiffles` times in a row. Each deck draws from its own stream. */
export const runRiffles = (seed: number | string, decks: number, maxRiffles: number, n = DECK): RiffleRun => {
  const counts = Array.from({ length: maxRiffles + 1 }, () => new Array<number>(n + 1).fill(0));
  let heroIndex = -1;
  for (let i = 0; i < decks; i++) {
    const rng = childRng(seed, i);
    let deck = newDeck(n);
    for (let k = 1; k <= maxRiffles; k++) {
      deck = riffle(rng, deck).deck;
      const r = risingSequences(deck);
      (counts[k] as number[])[r] = ((counts[k] as number[])[r] as number) + 1;
      if (k === 3 && r === 8 && heroIndex < 0) heroIndex = i;
    }
  }
  return { decks, maxRiffles, counts, heroIndex };
};

/** Distance from random after k riffles, estimated from the simulated rising-sequence counts. */
export const simulatedDistance = (run: RiffleRun, k: number, n = DECK): number => {
  const a = eulerian(n);
  const nFact = factorial(n);
  const counts = run.counts[k] as number[];
  let sum = 0;
  for (let r = 1; r <= n; r++) {
    sum += Math.abs((counts[r] as number) / run.decks - ratio(a[r] as bigint, nFact));
  }
  return sum / 2;
};
