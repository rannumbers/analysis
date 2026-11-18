/**
 * Benford's law from compounding, with no randomness in the answer.
 *
 * A balance grows at one steady rate from START to END, which is a whole
 * number of decades (a factor of 10^DECADES) over YEARS. Its log10 therefore
 * rises in a straight line, and a uniformly random age lands uniformly on the
 * log scale. The share of ages with leading digit d is then exactly
 * log10(1 + 1/d): that is Benford's law, derived rather than assumed.
 */

import { childRng } from "../rng";

export const LEDGER = {
  start: 1_000,
  decades: 3,
  years: 30,
  accounts: 1_000,
} as const;

export const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

/** Years for the balance to grow tenfold. */
export const YEARS_PER_DECADE = LEDGER.years / LEDGER.decades;

export const END_BALANCE = LEDGER.start * 10 ** LEDGER.decades;

/** The exact share of leading digit d: log10(1 + 1/d). */
export const benfordShare = (d: number): number => Math.log10(1 + 1 / d);

/** The illustrative "if every digit were equally likely" baseline: 1/9. */
export const EVEN_SHARE = 1 / 9;

/** Balance after `age` years of steady growth. */
export const balanceAt = (age: number): number => LEDGER.start * 10 ** (age / YEARS_PER_DECADE);

/** The age at which the balance reaches `value`. */
export const ageAt = (value: number): number => YEARS_PER_DECADE * Math.log10(value / LEDGER.start);

/** First digit of a positive number, read from its exponent form so no log rounding can move it. */
export const leadingDigit = (x: number): number => Number(x.toExponential(12)[0]);

/** Years per decade that the balance spends with leading digit d (a 1 takes 3.01 of every 10). */
export const yearsWithDigit = (d: number): number => YEARS_PER_DECADE * benfordShare(d);

export interface Ledger {
  /** Each account's age, in years, on the day it is looked at. */
  ages: number[];
  balances: number[];
  digits: number[];
  /** Accounts per leading digit, index 0 for digit 1. */
  counts: number[];
}

/** Each account is a different age, so each is read at a different point of the same steady climb. */
export const runLedger = (seed: string, accounts: number = LEDGER.accounts): Ledger => {
  const ages: number[] = [];
  const balances: number[] = [];
  const digits: number[] = [];
  const counts: number[] = DIGITS.map(() => 0);
  for (let i = 0; i < accounts; i++) {
    const age = childRng(seed, i)() * LEDGER.years;
    const balance = balanceAt(age);
    const digit = leadingDigit(balance);
    ages.push(age);
    balances.push(balance);
    digits.push(digit);
    counts[digit - 1] = (counts[digit - 1] as number) + 1;
  }
  return { ages, balances, digits, counts };
};

/** Share of the first `n` accounts with leading digit d. */
export const shareOfFirst = (ledger: Ledger, d: number, n: number): number => {
  if (n <= 0) return 0;
  let hit = 0;
  for (let i = 0; i < n; i++) if (ledger.digits[i] === d) hit++;
  return hit / n;
};
