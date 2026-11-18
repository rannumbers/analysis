/**
 * Lump sum against dollar-cost averaging, on the same monthly coin.
 *
 * Each month the market is up 4% or down 3% on a fair flip, so it averages
 * +0.5% a month. A lump sum puts all $60,000 in at month 0. Averaging puts
 * $5,000 in at the start of each of 12 months and holds the rest as cash at
 * 0%. Both are compared at month 12.
 *
 * With only 12 flips there are 2^12 = 4,096 equally likely paths, so every
 * answer is exact by enumeration. The simulated investors converge on it.
 */

import { childRng } from "../rng";

export const MARKET = { up: 0.04, down: -0.03, months: 12, lump: 60000, tranche: 5000 } as const;
export const PATHS = 2 ** MARKET.months;
export const EXPECTED_MONTHLY = (MARKET.up + MARKET.down) / 2;

/** Both strategies' value at month 12 for one path of months, true meaning up. */
export interface Finals {
  lump: number;
  dca: number;
}

export const finals = (ups: readonly boolean[]): Finals => {
  const growth = ups.map((u) => 1 + (u ? MARKET.up : MARKET.down));
  let lump = MARKET.lump;
  for (const g of growth) lump *= g;
  let dca = 0;
  for (let m = 0; m < MARKET.months; m++) {
    // The tranche bought at the start of month m rides months m..11.
    let v = MARKET.tranche;
    for (let k = m; k < MARKET.months; k++) v *= growth[k] as number;
    dca += v;
  }
  return { lump, dca };
};

/** Total wealth (invested plus cash) after each month 0..12, for drawing one path. */
export const trajectory = (ups: readonly boolean[]): { lump: number[]; dca: number[] } => {
  const lump: number[] = [MARKET.lump];
  const dca: number[] = [MARKET.lump];
  let l = MARKET.lump;
  let invested = 0;
  let cash = MARKET.lump;
  for (let m = 0; m < MARKET.months; m++) {
    const g = 1 + (ups[m] ? MARKET.up : MARKET.down);
    invested = (invested + MARKET.tranche) * g;
    cash -= MARKET.tranche;
    l *= g;
    lump.push(l);
    dca.push(invested + cash);
  }
  return { lump, dca };
};

const pathFromBits = (bits: number): boolean[] => Array.from({ length: MARKET.months }, (_, m) => ((bits >> m) & 1) === 1);

export interface Summary {
  /** Share of paths where the lump sum ends ahead. */
  lumpAhead: number;
  meanLump: number;
  meanDca: number;
  minLump: number;
  maxLump: number;
  minDca: number;
  maxDca: number;
  sdLump: number;
  sdDca: number;
}

const summarise = (rows: readonly Finals[]): Summary => {
  const n = rows.length;
  const ml = rows.reduce((s, r) => s + r.lump, 0) / n;
  const md = rows.reduce((s, r) => s + r.dca, 0) / n;
  const sd = (xs: number[], m: number): number => Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / n);
  const l = rows.map((r) => r.lump);
  const d = rows.map((r) => r.dca);
  return {
    lumpAhead: rows.filter((r) => r.lump > r.dca).length / n,
    meanLump: ml,
    meanDca: md,
    minLump: Math.min(...l),
    maxLump: Math.max(...l),
    minDca: Math.min(...d),
    maxDca: Math.max(...d),
    sdLump: sd(l, ml),
    sdDca: sd(d, md),
  };
};

/** Every one of the 4,096 equally likely paths. */
export const enumerateAll = (): Finals[] => Array.from({ length: PATHS }, (_, b) => finals(pathFromBits(b)));
export const EXACT: Summary = summarise(enumerateAll());

/** Closed form for the expected finals, independent of the enumeration. */
export const expectedLump = (): number => MARKET.lump * (1 + EXPECTED_MONTHLY) ** MARKET.months;
export const expectedDca = (): number => {
  let s = 0;
  for (let m = 0; m < MARKET.months; m++) s += MARKET.tranche * (1 + EXPECTED_MONTHLY) ** (MARKET.months - m);
  return s;
};

export const INVESTORS = 5000;

export interface Investor {
  ups: boolean[];
  lump: number;
  dca: number;
}

/** One investor: twelve seeded flips, both strategies on the same ones. */
export const investor = (seed: string, index: number): Investor => {
  const rng = childRng(seed, index);
  const ups = Array.from({ length: MARKET.months }, () => rng() < 0.5);
  return { ups, ...finals(ups) };
};

export const runInvestors = (seed: string, n = INVESTORS): Investor[] => Array.from({ length: n }, (_, i) => investor(seed, i));

export const summariseInvestors = (people: readonly Investor[]): Summary => summarise(people);

/** The first investor whose lump sum ends ahead, the more common outcome. */
export const findExample = (seed: string): Investor => {
  for (let i = 0; i < 1000; i++) {
    const p = investor(seed, i);
    if (p.lump > p.dca) return p;
  }
  throw new Error("no example found");
};
