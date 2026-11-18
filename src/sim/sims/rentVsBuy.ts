import { childRng } from "../rng";

/**
 * Buy with a mortgage, or rent and invest the difference. Two people start
 * with the same savings. All amounts are illustrative, in dollars, and every
 * flow is annual.
 *
 * The buyer's net worth at the end depends only on how many property years
 * were up (a binomial lattice). The renter's portfolio depends on the order
 * of the share years, so its exact distribution is every one of the 2^20 paths.
 * The two coins are independent, so the exact chance the renter finishes ahead
 * is a sum over the property heads.
 */
export interface RentBuyParams {
  years: number;
  price: number;
  depositShare: number;
  /** Stamp duty and other upfront costs, in dollars. */
  upfront: number;
  mortgageRate: number;
  termYears: number;
  /** Rates, insurance and maintenance, fixed dollars a year. */
  ownership: number;
  rent: number;
  rentGrowth: number;
  propUp: number;
  propDown: number;
  shareUp: number;
  shareDown: number;
  /** Simulated pairs. */
  pairs: number;
}

export const RENT_BUY: RentBuyParams = {
  years: 20,
  price: 800_000,
  depositShare: 0.2,
  upfront: 30_000,
  mortgageRate: 0.06,
  termYears: 30,
  ownership: 16_000,
  rent: 32_000,
  rentGrowth: 0.03,
  propUp: 0.12,
  propDown: 0.02,
  shareUp: 0.25,
  shareDown: 0.05,
  pairs: 1000,
};

export const deposit = (p: RentBuyParams): number => p.price * p.depositShare;
export const loanAmount = (p: RentBuyParams): number => p.price - deposit(p);
/** What each person starts with: the deposit plus the upfront costs. */
export const savings = (p: RentBuyParams): number => deposit(p) + p.upfront;

/** Level yearly principal-and-interest payment. */
export const payment = (p: RentBuyParams): number => {
  const r = p.mortgageRate;
  return (loanAmount(p) * r) / (1 - Math.pow(1 + r, -p.termYears));
};

/** Loan still owed after `year` payments. */
export const loanOwed = (p: RentBuyParams, year: number): number => {
  const r = p.mortgageRate;
  let b = loanAmount(p);
  for (let i = 0; i < year; i++) b = b * (1 + r) - payment(p);
  return Math.max(0, b);
};

/** The buyer's yearly cash out: the mortgage payment plus ownership costs. */
export const buyerOutlay = (p: RentBuyParams): number => payment(p) + p.ownership;

/** Rent paid in year t (0-based). */
export const rentAt = (p: RentBuyParams, t: number): number => p.rent * Math.pow(1 + p.rentGrowth, t);

/** What the renter invests at the start of year t: the buyer's outlay less rent. */
export const investedAt = (p: RentBuyParams, t: number): number => buyerOutlay(p) - rentAt(p, t);

/** Home value after `heads` up years out of `years`. */
export const homeValue = (p: RentBuyParams, heads: number, years = p.years): number =>
  p.price * Math.pow(1 + p.propUp, heads) * Math.pow(1 - p.propDown, years - heads);

/** Buyer's net worth: home value less the loan still owed. */
export const buyerNetWorth = (p: RentBuyParams, heads: number, years = p.years): number =>
  homeValue(p, heads, years) - loanOwed(p, years);

/** Renter's portfolio after each year for one path of share coins (true = up). */
export const portfolioPath = (p: RentBuyParams, shareHeads: readonly boolean[]): number[] => {
  const out = [savings(p)];
  let v = savings(p);
  shareHeads.forEach((up, t) => {
    v = (v + investedAt(p, t)) * (up ? 1 + p.shareUp : 1 - p.shareDown);
    out.push(v);
  });
  return out;
};

/**
 * Every share-coin path's final portfolio, sorted ascending. Built by doubling:
 * each value splits into its up and its down continuation, year by year.
 */
export const enumeratePortfolios = (p: RentBuyParams): Float64Array => {
  let cur = new Float64Array(1);
  cur[0] = savings(p);
  for (let t = 0; t < p.years; t++) {
    const add = investedAt(p, t);
    const next = new Float64Array(cur.length * 2);
    for (let i = 0; i < cur.length; i++) {
      const base = (cur[i] as number) + add;
      next[2 * i] = base * (1 + p.shareUp);
      next[2 * i + 1] = base * (1 - p.shareDown);
    }
    cur = next;
  }
  return cur.sort();
};

/** Share of sorted values strictly above x. */
export const shareAbove = (sorted: Float64Array, x: number): number => {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if ((sorted[mid] as number) > x) hi = mid;
    else lo = mid + 1;
  }
  return (sorted.length - lo) / sorted.length;
};

export const binomialPmf = (n: number, k: number, p = 0.5): number => {
  let c = 1;
  for (let i = 1; i <= k; i++) c = (c * (n - k + i)) / i;
  return c * Math.pow(p, k) * Math.pow(1 - p, n - k);
};

export interface Exact {
  /** Chance the renter's portfolio beats the buyer's net worth. */
  renterAhead: number;
  /** Expected buyer net worth and expected portfolio. */
  buyerMean: number;
  renterMean: number;
  /** P(renter ahead | k property heads), k = 0..years. */
  aheadGivenHeads: number[];
  buyerByHeads: number[];
  medianPortfolio: number;
  medianBuyer: number;
}

export const exactAnswer = (p: RentBuyParams, sorted = enumeratePortfolios(p)): Exact => {
  const n = p.years;
  const buyerByHeads: number[] = [];
  const aheadGivenHeads: number[] = [];
  let renterAhead = 0;
  let buyerMean = 0;
  let medianBuyer = 0;
  let cum = 0;
  for (let k = 0; k <= n; k++) {
    const w = buyerNetWorth(p, k);
    const pk = binomialPmf(n, k);
    const a = shareAbove(sorted, w);
    buyerByHeads.push(w);
    aheadGivenHeads.push(a);
    renterAhead += pk * a;
    buyerMean += pk * w;
    if (cum < 0.5 && cum + pk >= 0.5) medianBuyer = w;
    cum += pk;
  }
  let sum = 0;
  for (let i = 0; i < sorted.length; i++) sum += sorted[i] as number;
  return {
    renterAhead,
    buyerMean,
    renterMean: sum / sorted.length,
    aheadGivenHeads,
    buyerByHeads,
    medianPortfolio: ((sorted[sorted.length / 2 - 1] as number) + (sorted[sorted.length / 2] as number)) / 2,
    medianBuyer,
  };
};

export interface Pair {
  propHeads: number;
  buyer: number;
  renter: number;
  renterAhead: boolean;
}

export interface Run {
  pairs: Pair[];
  /** Running share of pairs in which the renter finished ahead, after the first k. */
  running: number[];
  share: number;
}

/** Many pairs of lives: each draws its own property coins and its own share coins. */
export const runPairs = (seed: string, p: RentBuyParams = RENT_BUY): Run => {
  const pairs: Pair[] = [];
  const running: number[] = [];
  let ahead = 0;
  for (let i = 0; i < p.pairs; i++) {
    const rng = childRng(seed, i);
    let heads = 0;
    for (let t = 0; t < p.years; t++) if (rng() < 0.5) heads++;
    const shares: boolean[] = [];
    for (let t = 0; t < p.years; t++) shares.push(rng() < 0.5);
    const buyer = buyerNetWorth(p, heads);
    const renter = portfolioPath(p, shares)[p.years] as number;
    const renterAhead = renter > buyer;
    if (renterAhead) ahead++;
    pairs.push({ propHeads: heads, buyer, renter, renterAhead });
    running.push(ahead / (i + 1));
  }
  return { pairs, running, share: ahead / p.pairs };
};

/** The example pair: the property coin comes up heads on `propHeadsAt`, the share coin on `shareHeadsAt`. */
export const examplePair = (
  seed: string,
  p: RentBuyParams = RENT_BUY,
): { prop: boolean[]; share: boolean[] } => {
  const rng = childRng(seed + "/example", 0);
  const prop: boolean[] = [];
  const share: boolean[] = [];
  for (let t = 0; t < p.years; t++) prop.push(rng() < 0.5);
  for (let t = 0; t < p.years; t++) share.push(rng() < 0.5);
  return { prop, share };
};

/** Home value after each year along a path (true = up). */
export const homePath = (p: RentBuyParams, prop: readonly boolean[]): number[] => {
  const out = [p.price];
  let v = p.price;
  for (const up of prop) {
    v *= up ? 1 + p.propUp : 1 - p.propDown;
    out.push(v);
  }
  return out;
};
