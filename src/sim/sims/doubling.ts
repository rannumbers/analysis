import { childRng, type Rng } from "../rng";

/**
 * The doubling system on an even-money wheel bet, exact and simulated.
 *
 * Rules, all defined here so the script and the composition cannot drift:
 *   - A bet wins with probability 18/37 (18 winning pockets, 19 losing ones).
 *   - A RUN starts at the base bet. After a loss the bet doubles; after a win
 *     the run ends, up the base bet. The bankroll covers six bets in a row
 *     (10+20+40+80+160+320 = 630) but not a seventh (640), so six losses in a
 *     row end the run down 630.
 *   - A NIGHT is a sequence of runs that stops at the first of: ten winning
 *     runs in a row (up 100, go home), or one lost run (down 630 less the
 *     10s already won that night, go home). Each night starts with a fresh
 *     bankroll, so nights are independent and profit adds across them.
 */
export const DOUBLING = {
  /** Winning pockets out of 37, on an even-money bet. */
  winPockets: 18,
  pockets: 37,
  base: 10,
  /** Bets the bankroll can cover in a row. */
  maxBets: 6,
  bankroll: 1000,
  /** Winning runs that end a night happy. */
  runsPerNight: 10,
  nights: 20,
  players: 1000,
} as const;

export const pWinBet = (): number => DOUBLING.winPockets / DOUBLING.pockets;

/** Bet sizes down a losing streak: 10, 20, 40, 80, 160, 320. */
export const ladder = (): number[] => Array.from({ length: DOUBLING.maxBets }, (_, i) => DOUBLING.base * 2 ** i);

/** What six losses in a row cost: 630. */
export const ladderTotal = (): number => ladder().reduce((a, b) => a + b, 0);

/** The bet a seventh loss would need: 640, more than the bankroll. */
export const nextBet = (): number => DOUBLING.base * 2 ** DOUBLING.maxBets;

/** Chance a run loses: six losses in a row, (19/37)^6. */
export const pLoseRun = (): number => (1 - pWinBet()) ** DOUBLING.maxBets;
export const pWinRun = (): number => 1 - pLoseRun();

/** Expected profit of one run: 10 x P(win) - 630 x P(lose). */
export const runExpectedValue = (): number => DOUBLING.base * pWinRun() - ladderTotal() * pLoseRun();

/** Chance a night reaches its target: ten winning runs in a row. */
export const pNightSuccess = (): number => pWinRun() ** DOUBLING.runsPerNight;
export const nightTarget = (): number => DOUBLING.base * DOUBLING.runsPerNight;

/** Every way a night can end, with its exact probability. */
export const nightOutcomes = (): { net: number; prob: number }[] => {
  const out: { net: number; prob: number }[] = [{ net: nightTarget(), prob: pNightSuccess() }];
  for (let lostAt = 1; lostAt <= DOUBLING.runsPerNight; lostAt++) {
    out.push({
      net: DOUBLING.base * (lostAt - 1) - ladderTotal(),
      prob: pWinRun() ** (lostAt - 1) * pLoseRun(),
    });
  }
  return out;
};

/** Exact average profit of a night. */
export const nightExpectedValue = (): number => nightOutcomes().reduce((s, o) => s + o.net * o.prob, 0);

/** Average number of runs in a night, (1 - w^10) / (1 - w) with w = P(win run). */
export const expectedRunsPerNight = (): number =>
  (1 - pNightSuccess()) / pLoseRun();

/** Exact average profit after n nights: nights are independent. */
export const expectedAfter = (nights: number): number => nights * nightExpectedValue();

/** The average loss on a bet as a share of the stake: 1/37 on an even-money bet. */
export const houseEdge = (): number => 1 - 2 * pWinBet();

export interface Night {
  net: number;
  /** True when a run lost, so the night fell off the cliff. */
  cliff: boolean;
}

/** Play one run: returns the profit, 10 or -630. */
export const playRun = (rng: Rng): number => {
  const p = pWinBet();
  for (let bet = 0; bet < DOUBLING.maxBets; bet++) {
    if (rng() < p) return DOUBLING.base;
  }
  return -ladderTotal();
};

/** Play one night by the stopping rule above. */
export const playNight = (rng: Rng): Night => {
  let net = 0;
  for (let run = 0; run < DOUBLING.runsPerNight; run++) {
    const r = playRun(rng);
    net += r;
    if (r < 0) return { net, cliff: true };
  }
  return { net, cliff: false };
};

export interface Run {
  /** nights[player][night] */
  nights: Night[][];
  /** profit[player][k] is the cumulative profit after k nights, k = 0..nights. */
  profit: number[][];
}

/** Every player gets their own seeded stream, so adding players keeps earlier ones. */
export const simulate = (seed: string, players: number = DOUBLING.players, nights: number = DOUBLING.nights): Run => {
  const allNights: Night[][] = [];
  const profit: number[][] = [];
  for (let i = 0; i < players; i++) {
    const rng = childRng(seed, i);
    const ns: Night[] = [];
    const path = [0];
    for (let n = 0; n < nights; n++) {
      const night = playNight(rng);
      ns.push(night);
      path.push((path[n] as number) + night.net);
    }
    allNights.push(ns);
    profit.push(path);
  }
  return { nights: allNights, profit };
};

/** Mean cumulative profit across players after each night, 0..nights. */
export const meanPath = (run: Run): number[] => {
  const len = (run.profit[0] as number[]).length;
  return Array.from({ length: len }, (_, k) => run.profit.reduce((s, p) => s + (p[k] as number), 0) / run.profit.length);
};

/** Share of all simulated nights that reached the target. */
export const shareOfNightsUp = (run: Run): number => {
  let up = 0;
  let total = 0;
  for (const ns of run.nights) for (const n of ns) { total++; if (!n.cliff) up++; }
  return up / total;
};

/** Mean profit per simulated night. */
export const meanNight = (run: Run): number => {
  let sum = 0;
  let total = 0;
  for (const ns of run.nights) for (const n of ns) { total++; sum += n.net; }
  return sum / total;
};

/** Index of the first night that fell off the cliff, or -1. */
export const firstCliff = (nights: readonly Night[]): number => nights.findIndex((n) => n.cliff);
