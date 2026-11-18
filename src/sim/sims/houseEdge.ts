/**
 * Doubling $100 on a wheel with a house edge (gambler's ruin).
 *
 * 37 pockets, 18 of them win an even-money bet, so p = 18/37 per bet. You bet
 * a fixed amount b each time and stop at $200 (doubled) or $0. With
 * r = q/p = 19/18 the chance of reaching $200 from $100 is
 *
 *   (1 − r^(100/b)) / (1 − r^(200/b)) = 1 / (1 + r^(100/b))
 *
 * Smaller bets mean more bets (n = 100/b), and each one hands the house its
 * edge again, so the chance falls toward zero. A fair coin gives 50% at every
 * size. b must divide 100 so the walk lands exactly on $0 and $200.
 */

import { childRng } from "../rng";

export const WHEEL = { win: 18, lose: 19 } as const;
export const POCKETS = WHEEL.win + WHEEL.lose;
export const P_WIN = WHEEL.win / POCKETS;
/** Expected loss per dollar bet: (19 − 18) / 37. */
export const HOUSE_EDGE = (WHEEL.lose - WHEEL.win) / POCKETS;

export const HOUSE: { start: number; target: number; people: number } = { start: 100, target: 200, people: 1000 };

/** Bet sizes that divide $100, largest first. */
export const BET_SIZES = [100, 50, 25, 20, 10, 5, 4, 2, 1] as const;
/** The three sizes followed by a thousand people each. */
export const CROWD_BETS = [100, 10, 1] as const;
/** The one person followed in the example bets this much. */
export const EXAMPLE_BET = 10;

/** Chance of reaching the target from the start, betting `bet` each time. */
export const doubleChance = (bet: number, p = P_WIN): number => {
  const n = HOUSE.start / bet;
  if (p === 0.5) return HOUSE.start / HOUSE.target;
  const r = (1 - p) / p;
  return (1 - r ** n) / (1 - r ** (2 * n));
};

/** Bets made, and whether the walk ended at the target. */
export interface Outcome {
  bets: number;
  doubled: boolean;
}

/** One person's whole session from a seeded stream; no path kept. */
export const playOut = (rng: () => number, bet: number): Outcome => {
  let money = HOUSE.start;
  let bets = 0;
  while (money > 0 && money < HOUSE.target) {
    money += rng() < P_WIN ? bet : -bet;
    bets++;
  }
  return { bets, doubled: money >= HOUSE.target };
};

/** The same walk with every balance kept, starting at $100. */
export const walkPath = (rng: () => number, bet: number): number[] => {
  const path = [HOUSE.start];
  let money = HOUSE.start;
  while (money > 0 && money < HOUSE.target) {
    money += rng() < P_WIN ? bet : -bet;
    path.push(money);
  }
  return path;
};

export const personRng = (seed: string, bet: number, index: number) => childRng(seed + "-bet-" + bet, index);

export interface Crowd {
  bet: number;
  outcomes: Outcome[];
}

/** `people` seeded people, each betting `bet` at a time. */
export const runCrowd = (seed: string, bet: number, people: number = HOUSE.people): Crowd => ({
  bet,
  outcomes: Array.from({ length: people }, (_, i) => playOut(personRng(seed, bet, i), bet)),
});

export const doubledShare = (crowd: Crowd): number =>
  crowd.outcomes.filter((o) => o.doubled).length / crowd.outcomes.length;

/**
 * The person followed in the example: the first one betting EXAMPLE_BET at a
 * time who goes broke within [minBets, maxBets], so the walk is long enough to
 * watch and short enough to fit the beat.
 */
export const findExample = (seed: string, minBets = 60, maxBets = 100): { index: number; path: number[] } => {
  for (let i = 0; i < 100_000; i++) {
    const o = playOut(personRng(seed, EXAMPLE_BET, i), EXAMPLE_BET);
    if (!o.doubled && o.bets >= minBets && o.bets <= maxBets) {
      return { index: i, path: walkPath(personRng(seed, EXAMPLE_BET, i), EXAMPLE_BET) };
    }
  }
  throw new Error('Seed "' + seed + '" has no example bettor');
};
