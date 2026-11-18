import { childRng, shuffle } from "../rng";

/**
 * Sequence risk. Every retiree gets the same 25 yearly returns (15 up, 10
 * down) and withdraws the same amount, in a different order. Without
 * withdrawals the order cannot matter (multiplication commutes); with them it
 * decides who runs out.
 */
export interface RetireParams {
  nest: number;
  withdrawal: number;
  years: number;
  upYears: number;
  up: number;
  down: number;
  count: number;
}

export const RETIRE: RetireParams = {
  nest: 500_000,
  withdrawal: 30_000,
  years: 25,
  upYears: 15,
  up: 0.15,
  down: 0.1,
  count: 1000,
};

/** true = an up year. */
export type Order = boolean[];

/** Withdraw at the start of the year, then the year's return. Ruin is the first balance at or below zero after a withdrawal; it stays zero after. */
export const balances = (p: RetireParams, order: Order, withdraw = true): number[] => {
  const out = [p.nest];
  let b = p.nest;
  for (const isUp of order) {
    if (withdraw) b -= p.withdrawal;
    if (b <= 0) {
      while (out.length <= order.length) out.push(0);
      return out;
    }
    b *= isUp ? 1 + p.up : 1 - p.down;
    out.push(b);
  }
  return out;
};

export const finalBalance = (p: RetireParams, order: Order, withdraw = true): number =>
  balances(p, order, withdraw)[order.length] as number;

/** The 1-based year the money runs out, or 0 if it never does. */
export const ruinYear = (p: RetireParams, order: Order): number => {
  const b = balances(p, order);
  const i = b.findIndex((v, k) => k > 0 && v === 0);
  return i < 0 ? 0 : i;
};

/** All the down years first, then all the up years. */
export const badFirst = (p: RetireParams): Order =>
  Array.from({ length: p.years }, (_, i) => i >= p.years - p.upYears);
export const goodFirst = (p: RetireParams): Order => badFirst(p).reverse();

/** Exact integer binomials, so counts in the millions stay exact. */
const pascal = (n: number): number[][] => {
  const t: number[][] = [];
  for (let i = 0; i <= n; i++) {
    const row: number[] = [];
    for (let j = 0; j <= i; j++) {
      row[j] = j === 0 || j === i ? 1 : ((t[i - 1] as number[])[j - 1] as number) + ((t[i - 1] as number[])[j] as number);
    }
    t[i] = row;
  }
  return t;
};

export const orderingsCount = (p: RetireParams): number =>
  ((pascal(p.years)[p.years] as number[])[p.upYears]) as number;

/**
 * Exact count of orderings that run out, by walking the tree of orderings.
 * With prune, a ruined branch counts all its completions at once; without it
 * every one of the C(25,10) orderings is walked to its end.
 */
export const exactRuinCount = (p: RetireParams, prune = true): number => {
  const t = pascal(p.years);
  const downYears = p.years - p.upYears;
  let ruined = 0;
  const walk = (depth: number, ups: number, b: number, dead: boolean): void => {
    if (depth === p.years) {
      if (dead) ruined++;
      return;
    }
    if (dead && prune) {
      ruined += ((t[p.years - depth] as number[])[p.upYears - ups]) as number;
      return;
    }
    const after = dead ? 0 : b - p.withdrawal;
    const nowDead = dead || after <= 0;
    if (ups < p.upYears) walk(depth + 1, ups + 1, nowDead ? 0 : after * (1 + p.up), nowDead);
    if (depth - ups < downYears) walk(depth + 1, ups, nowDead ? 0 : after * (1 - p.down), nowDead);
  };
  walk(0, 0, p.nest, false);
  return ruined;
};

export const exactRuinShare = (p: RetireParams): number => exactRuinCount(p) / orderingsCount(p);

export interface RetireRun {
  orders: Order[];
  ruinYears: number[];
  finals: number[];
  ruined: number;
}

/** Each retiree is a shuffle of the same returns, from their own seeded stream. */
export const runRetirees = (seed: string, p: RetireParams): RetireRun => {
  const base: Order = badFirst(p);
  const orders: Order[] = [];
  const ruinYears: number[] = [];
  const finals: number[] = [];
  for (let i = 0; i < p.count; i++) {
    const o = shuffle(childRng(seed, i), base.slice());
    orders.push(o);
    ruinYears.push(ruinYear(p, o));
    finals.push(finalBalance(p, o));
  }
  return { orders, ruinYears, finals, ruined: ruinYears.filter((y) => y > 0).length };
};

/** Running share of retirees who have run out, after the first k. */
export const runningShare = (run: RetireRun): number[] => {
  let r = 0;
  return run.ruinYears.map((y, i) => {
    if (y > 0) r++;
    return r / (i + 1);
  });
};
