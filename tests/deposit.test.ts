import { describe, expect, it } from "vitest";
import { calculateDeposit } from "@/lib/core/deposit";
import { formatGBP, parsePoundsToPence } from "@/lib/core/money";

describe("calculateDeposit", () => {
  it("fixed deposit: £45 treatment with £10 deposit leaves £35", () => {
    const d = calculateDeposit(4500, { depositType: "fixed", depositFixedPence: 1000, depositPercent: 0 });
    expect(d).toMatchObject({ depositPence: 1000, balancePence: 3500, requiresDeposit: true });
    expect(d.ruleLabel).toBe("£10.00 fixed deposit");
  });

  it("percentage deposit: £60 at 25% = £15 deposit, £45 balance", () => {
    const d = calculateDeposit(6000, { depositType: "percentage", depositFixedPence: 0, depositPercent: 25 });
    expect(d).toMatchObject({ depositPence: 1500, balancePence: 4500 });
    expect(d.ruleLabel).toBe("25% deposit");
  });

  it("rounds percentage deposits half-up to the penny with integer maths", () => {
    expect(calculateDeposit(4500, { depositType: "percentage", depositFixedPence: 0, depositPercent: 12.5 }).depositPence).toBe(563); // 562.5p
    expect(calculateDeposit(9900, { depositType: "percentage", depositFixedPence: 0, depositPercent: 25 }).depositPence).toBe(2475);
    expect(calculateDeposit(3333, { depositType: "percentage", depositFixedPence: 0, depositPercent: 33.33 }).depositPence).toBe(1111); // 1110.89
    expect(calculateDeposit(1, { depositType: "percentage", depositFixedPence: 0, depositPercent: 50 }).depositPence).toBe(1); // 0.5p → 1p
    // 0.1 + 0.2 style float traps
    expect(calculateDeposit(1010, { depositType: "percentage", depositFixedPence: 0, depositPercent: 10.1 }).depositPence).toBe(102);
  });

  it("deposit + balance always equals the price", () => {
    for (let price = 0; price < 30000; price += 137) {
      for (const pct of [0, 5, 12.5, 20, 25, 33.33, 50, 99.99, 100]) {
        const d = calculateDeposit(price, { depositType: "percentage", depositFixedPence: 0, depositPercent: pct });
        expect(d.depositPence + d.balancePence).toBe(price);
        expect(d.depositPence).toBeGreaterThanOrEqual(0);
        expect(d.depositPence).toBeLessThanOrEqual(price);
      }
    }
  });

  it("0 means no deposit for both methods", () => {
    expect(calculateDeposit(3500, { depositType: "fixed", depositFixedPence: 0, depositPercent: 0 })).toMatchObject({ depositPence: 0, balancePence: 3500, requiresDeposit: false, ruleLabel: "No deposit required" });
    expect(calculateDeposit(3500, { depositType: "percentage", depositFixedPence: 0, depositPercent: 0 })).toMatchObject({ depositPence: 0, requiresDeposit: false });
  });

  it("caps a fixed deposit at the price and clamps percentages", () => {
    expect(calculateDeposit(800, { depositType: "fixed", depositFixedPence: 1000, depositPercent: 0 }).depositPence).toBe(800);
    expect(calculateDeposit(800, { depositType: "percentage", depositFixedPence: 0, depositPercent: 150 }).depositPence).toBe(800);
    expect(calculateDeposit(800, { depositType: "percentage", depositFixedPence: 0, depositPercent: -5 }).depositPence).toBe(0);
  });

  it("rejects invalid prices", () => {
    expect(() => calculateDeposit(-1, { depositType: "fixed", depositFixedPence: 0, depositPercent: 0 })).toThrow();
    expect(() => calculateDeposit(10.5, { depositType: "fixed", depositFixedPence: 0, depositPercent: 0 })).toThrow();
  });
});

describe("money", () => {
  it("parses pounds to pence safely", () => {
    expect(parsePoundsToPence("45")).toBe(4500);
    expect(parsePoundsToPence("45.5")).toBe(4550);
    expect(parsePoundsToPence("£1,045.07")).toBe(104507);
    expect(parsePoundsToPence("0.29")).toBe(29);
    expect(parsePoundsToPence("4.555")).toBeNull();
    expect(parsePoundsToPence("abc")).toBeNull();
    expect(parsePoundsToPence("-5")).toBeNull();
  });
  it("formats GBP", () => {
    expect(formatGBP(2475)).toBe("£24.75");
    expect(formatGBP(39000, { trimWhole: true })).toBe("£390");
    expect(formatGBP(123456)).toBe("£1,234.56");
  });
});
