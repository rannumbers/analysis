import { childRng, type Rng } from "../rng";

/**
 * Buffon's needle with the needle as long as the boards are wide.
 *
 * Units: one board width = one match length = 1. A match lands with its centre
 * anywhere on the floor and its angle anywhere in a half turn. It crosses a
 * crack when a crack lies strictly between its two ends, measured across the
 * boards. The exact chance is 2/pi, so pi is estimated as 2 x drops / crossings.
 */

/** Floor shown on screen: five boards tall, wide enough for a few match lengths. */
export const FLOOR = { boards: 5, width: 6.8 } as const;

/** The exact chance that a match crosses a crack. */
export const P_CROSS = 2 / Math.PI;

export interface Drop {
  /** Centre of the match, in match lengths from the floor's left and top edge. */
  x: number;
  y: number;
  /** Angle from the cracks, 0 to pi. */
  angle: number;
  crosses: boolean;
}

/** One match dropped. Centres keep the whole match on the floor. */
export const dropMatch = (rng: Rng): Drop => {
  const x = 0.5 + rng() * (FLOOR.width - 1);
  const y = 0.5 + rng() * (FLOOR.boards - 1);
  const angle = rng() * Math.PI;
  const half = Math.sin(angle) / 2;
  return { x, y, angle, crosses: Math.floor(y - half) !== Math.floor(y + half) };
};

/** pi from the counts: two times drops, divided by crossings. */
export const estimatePi = (drops: number, crossings: number): number =>
  crossings > 0 ? (2 * drops) / crossings : Infinity;

/**
 * The typical error of that estimate after n drops (one standard error), by the
 * delta method: pi = 2/p, so its spread is (pi^2 / 2) x sqrt(p(1-p)/n).
 */
export const standardError = (n: number): number =>
  (Math.PI ** 2 / 2) * Math.sqrt((P_CROSS * (1 - P_CROSS)) / n);

/** Chance a match crosses, at one angle: the cracks are 1 apart, the match spans |sin| across. */
export const crossChanceAtAngle = (angle: number): number => Math.abs(Math.sin(angle));

export interface Person {
  /** The first `keep` drops, with their geometry. */
  drops: Drop[];
  /** cum[k] is how many of the first k drops crossed; length n + 1. */
  cum: Uint32Array;
}

/** One person dropping n matches, keeping the first `keep` in full. */
export const runPerson = (seed: string, index: number, n: number, keep: number): Person => {
  const rng = childRng(seed, index);
  const cum = new Uint32Array(n + 1);
  const drops: Drop[] = [];
  for (let i = 0; i < n; i++) {
    const d = dropMatch(rng);
    if (i < keep) drops.push(d);
    cum[i + 1] = (cum[i] as number) + (d.crosses ? 1 : 0);
  }
  return { drops, cum };
};

/** Each of `people` people (indices 1..people) drops a box of `box` matches; their estimates of pi. */
export const crowdEstimates = (seed: string, people: number, box: number): number[] =>
  Array.from({ length: people }, (_, i) => {
    const rng = childRng(seed, i + 1);
    let c = 0;
    for (let k = 0; k < box; k++) if (dropMatch(rng).crosses) c++;
    return estimatePi(box, c);
  });

/** 1901: Mario Lazzarini's reported result, 355/113 from 3,408 drops. */
export const LAZZARINI = { year: 1901, drops: 3408, reported: 3.1415929 } as const;
