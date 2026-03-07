/**
 * Pure functions for late fee calculation.
 * Used by rent-automation.ts and testable in isolation.
 */

export interface LateFeeConfig {
  lateFeeEnabled: boolean;
  lateFeeType: string;     // "flat" or "percentage"
  lateFeeAmount: number;   // dollar amount or percentage value
  lateFeeAccrual: string;  // "one_time" or "daily"
  lateFeeMaxAmount: number | null; // cap for daily accrual
  gracePeriod: number;     // days after due date
}

/**
 * Calculate the late fee amount for a single charge.
 * Returns 0 if fees are disabled or amount is non-positive.
 */
export function calculateLateFee(
  config: LateFeeConfig,
  rentAmount: number
): number {
  if (!config.lateFeeEnabled || config.lateFeeAmount <= 0) return 0;

  if (config.lateFeeType === "percentage") {
    return Math.round(rentAmount * (config.lateFeeAmount / 100) * 100) / 100;
  }
  return config.lateFeeAmount;
}

/**
 * Determine if a late fee should be charged for a given transaction.
 * Takes into account grace period, existing fees, accrual type, and max cap.
 */
export function shouldChargeFee(
  config: LateFeeConfig,
  dueDate: Date,
  today: Date,
  existingFeeTotal: number,
  alreadyChargedToday: boolean
): { charge: boolean; amount: number; reason: string } {
  if (!config.lateFeeEnabled) {
    return { charge: false, amount: 0, reason: "Late fees disabled" };
  }

  if (config.lateFeeAmount <= 0) {
    return { charge: false, amount: 0, reason: "Fee amount is zero" };
  }

  // Check grace period
  const graceDeadline = new Date(dueDate);
  graceDeadline.setDate(graceDeadline.getDate() + config.gracePeriod);

  // Normalize to midnight for comparison
  const todayNorm = new Date(today);
  todayNorm.setHours(0, 0, 0, 0);
  const deadlineNorm = new Date(graceDeadline);
  deadlineNorm.setHours(0, 0, 0, 0);

  if (todayNorm <= deadlineNorm) {
    return { charge: false, amount: 0, reason: "Within grace period" };
  }

  // This is a placeholder rent amount for percentage calculation — 
  // caller should use calculateLateFee for the actual amount
  // But for one_time, we just need to know if already charged
  if (config.lateFeeAccrual === "one_time") {
    if (existingFeeTotal > 0) {
      return { charge: false, amount: 0, reason: "One-time fee already charged" };
    }
    return { charge: true, amount: 0, reason: "Past grace period, no fee yet" };
  }

  // Daily accrual
  if (alreadyChargedToday) {
    return { charge: false, amount: 0, reason: "Already charged today" };
  }

  const maxAmount = config.lateFeeMaxAmount ?? Infinity;
  if (existingFeeTotal >= maxAmount) {
    return { charge: false, amount: 0, reason: "Max fee cap reached" };
  }

  return { charge: true, amount: Math.max(0, maxAmount - existingFeeTotal), reason: "Daily fee due" };
}

/**
 * Get a human-readable summary of the late fee configuration.
 */
export function getLateFeeDetails(config: LateFeeConfig): string {
  if (!config.lateFeeEnabled) return "No late fees";

  const amount =
    config.lateFeeType === "percentage"
      ? `${config.lateFeeAmount}% of rent`
      : `$${config.lateFeeAmount.toFixed(2)}`;

  const accrual =
    config.lateFeeAccrual === "daily" ? "per day" : "one-time";

  const cap =
    config.lateFeeAccrual === "daily" && config.lateFeeMaxAmount
      ? ` (max $${config.lateFeeMaxAmount.toFixed(2)})`
      : "";

  return `${amount} ${accrual} after ${config.gracePeriod}-day grace period${cap}`;
}
