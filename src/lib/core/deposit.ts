export type DepositType = "fixed" | "percentage";

export interface DepositConfig {
  depositType: DepositType;
  /** Used when depositType === "fixed". Integer pence. */
  depositFixedPence: number;
  /** Used when depositType === "percentage". 0–100, up to 2 decimal places. */
  depositPercent: number;
}

export interface DepositBreakdown {
  pricePence: number;
  depositPence: number;
  balancePence: number;
  requiresDeposit: boolean;
  /** Human readable rule, e.g. "£10.00 fixed deposit" or "25% deposit". */
  ruleLabel: string;
}

/**
 * Calculates the deposit and remaining balance for a treatment price.
 *
 * - Fixed deposits are capped at the treatment price (a deposit can never exceed the price).
 * - Percentage deposits are rounded half-up to the nearest penny using integer maths
 *   (percent is converted to basis points, so 12.5% of £45.00 = £5.63 exactly).
 * - A value of 0 (fixed or percentage) means no deposit is required.
 */
export function calculateDeposit(pricePence: number, config: DepositConfig): DepositBreakdown {
  if (!Number.isInteger(pricePence) || pricePence < 0) {
    throw new Error("Price must be a non-negative whole number of pence");
  }
  let depositPence: number;
  let ruleLabel: string;
  if (config.depositType === "fixed") {
    const fixed = Math.max(0, Math.round(config.depositFixedPence || 0));
    depositPence = Math.min(fixed, pricePence);
    ruleLabel = depositPence === 0 ? "No deposit required" : `${formatPence(depositPence)} fixed deposit`;
  } else {
    const bp = Math.min(10000, Math.max(0, Math.round((config.depositPercent || 0) * 100)));
    depositPence = Math.floor((pricePence * bp + 5000) / 10000);
    ruleLabel = bp === 0 ? "No deposit required" : `${trimPercent(bp / 100)}% deposit`;
  }
  return {
    pricePence,
    depositPence,
    balancePence: pricePence - depositPence,
    requiresDeposit: depositPence > 0,
    ruleLabel,
  };
}

function trimPercent(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, "");
}

function formatPence(p: number): string {
  return `£${(p / 100).toFixed(2)}`;
}
