import { describe, expect, it } from "vitest";
import {
  DIGITS,
  END_BALANCE,
  EVEN_SHARE,
  LEDGER,
  YEARS_PER_DECADE,
  ageAt,
  balanceAt,
  benfordShare,
  leadingDigit,
  runLedger,
  yearsWithDigit,
} from "./benford";

describe("Benford's law, exact", () => {
  it("gives the published leading-digit shares", () => {
    const pct = DIGITS.map((d) => Math.round(benfordShare(d) * 1000) / 10);
    expect(pct).toEqual([30.1, 17.6, 12.5, 9.7, 7.9, 6.7, 5.8, 5.1, 4.6]);
  });

  it("sums to one", () => {
    expect(DIGITS.reduce((a, d) => a + benfordShare(d), 0)).toBeCloseTo(1, 12);
  });

  it("puts the even baseline at one ninth, 11.1%", () => {
    expect(Math.round(EVEN_SHARE * 1000) / 10).toBe(11.1);
  });
});

describe("a steadily compounding balance", () => {
  it("grows tenfold every ten years and ends at a million", () => {
    expect(YEARS_PER_DECADE).toBe(10);
    expect(balanceAt(0)).toBe(1_000);
    expect(balanceAt(30)).toBeCloseTo(END_BALANCE, 6);
    expect(balanceAt(10)).toBeCloseTo(10_000, 8);
  });

  it("takes as long to go from $1,000 to $2,000 as from $5,000 to $10,000", () => {
    const first = ageAt(2_000) - ageAt(1_000);
    const second = ageAt(10_000) - ageAt(5_000);
    expect(first).toBeCloseTo(second, 12);
    expect(first).toBeCloseTo(3.0103, 4);
    expect(yearsWithDigit(1)).toBeCloseTo(first, 12);
  });

  it("spends under half a year going from $9,000 to $10,000", () => {
    expect(ageAt(10_000) - ageAt(9_000)).toBeCloseTo(0.4576, 4);
    expect(yearsWithDigit(9)).toBeLessThan(0.5);
  });

  it("reads leading digits without rounding slips at exact powers of ten", () => {
    expect(leadingDigit(1_000)).toBe(1);
    expect(leadingDigit(999.9999)).toBe(9);
    expect(leadingDigit(19_999.99)).toBe(1);
    expect(leadingDigit(20_000)).toBe(2);
  });

  it("spends exactly the Benford share of its whole life on each leading digit", () => {
    // Integrate over time on a fine grid: the midpoint rule on 600,000 steps.
    const steps = 600_000;
    const time = DIGITS.map(() => 0);
    for (let i = 0; i < steps; i++) {
      const d = leadingDigit(balanceAt(((i + 0.5) / steps) * LEDGER.years));
      time[d - 1] = (time[d - 1] as number) + 1;
    }
    DIGITS.forEach((d, i) => {
      expect((time[i] as number) / steps).toBeCloseTo(benfordShare(d), 4);
    });
  });
});

describe("1,000 simulated accounts", () => {
  const ledger = runLedger("benford");

  it("has every account on a leading digit", () => {
    expect(ledger.digits).toHaveLength(LEDGER.accounts);
    expect(ledger.counts.reduce((a, n) => a + n, 0)).toBe(LEDGER.accounts);
  });

  it("is reproducible from its seed", () => {
    expect(runLedger("benford").digits).toEqual(ledger.digits);
    expect(runLedger("another").digits).not.toEqual(ledger.digits);
  });

  it("lands within sampling error of the exact shares", () => {
    DIGITS.forEach((d) => {
      const p = benfordShare(d);
      const se = Math.sqrt((p * (1 - p)) / LEDGER.accounts);
      expect(Math.abs((ledger.counts[d - 1] as number) / LEDGER.accounts - p)).toBeLessThan(3 * se);
    });
  });

  it("passes a chi-square test against Benford, and fails the even baseline", () => {
    const chi = (expected: (d: number) => number): number =>
      DIGITS.reduce((a, d) => {
        const e = expected(d) * LEDGER.accounts;
        return a + ((ledger.counts[d - 1] as number) - e) ** 2 / e;
      }, 0);
    // 8 degrees of freedom: the 1% critical value is 20.09.
    expect(chi(benfordShare)).toBeLessThan(20.09);
    expect(chi(() => EVEN_SHARE)).toBeGreaterThan(100);
  });

  it("converges onto the exact shares with 200,000 accounts", () => {
    const big = runLedger("benford", 200_000);
    DIGITS.forEach((d) => {
      expect(Math.abs((big.counts[d - 1] as number) / 200_000 - benfordShare(d))).toBeLessThan(0.003);
    });
  });
});
