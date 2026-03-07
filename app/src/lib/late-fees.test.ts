import { describe, it, expect } from "vitest";
import {
  calculateLateFee,
  shouldChargeFee,
  getLateFeeDetails,
  type LateFeeConfig,
} from "./late-fees";

const baseConfig: LateFeeConfig = {
  lateFeeEnabled: true,
  lateFeeType: "flat",
  lateFeeAmount: 50,
  lateFeeAccrual: "one_time",
  lateFeeMaxAmount: null,
  gracePeriod: 5,
};

describe("calculateLateFee", () => {
  it("returns flat fee amount", () => {
    expect(calculateLateFee(baseConfig, 1500)).toBe(50);
  });

  it("returns percentage of rent", () => {
    const config = { ...baseConfig, lateFeeType: "percentage", lateFeeAmount: 5 };
    expect(calculateLateFee(config, 1500)).toBe(75);
  });

  it("returns 0 when disabled", () => {
    const config = { ...baseConfig, lateFeeEnabled: false };
    expect(calculateLateFee(config, 1500)).toBe(0);
  });

  it("returns 0 when fee amount is 0", () => {
    const config = { ...baseConfig, lateFeeAmount: 0 };
    expect(calculateLateFee(config, 1500)).toBe(0);
  });

  it("handles percentage with rounding", () => {
    const config = { ...baseConfig, lateFeeType: "percentage", lateFeeAmount: 3 };
    // 3% of 1234 = 37.02
    expect(calculateLateFee(config, 1234)).toBe(37.02);
  });
});

describe("shouldChargeFee", () => {
  const dueDate = new Date("2026-03-01");

  it("does not charge within grace period", () => {
    const today = new Date("2026-03-05"); // 4 days after, grace=5
    const result = shouldChargeFee(baseConfig, dueDate, today, 0, false);
    expect(result.charge).toBe(false);
    expect(result.reason).toBe("Within grace period");
  });

  it("does not charge on the last grace day", () => {
    const today = new Date("2026-03-06"); // 5 days after, grace=5
    const result = shouldChargeFee(baseConfig, dueDate, today, 0, false);
    expect(result.charge).toBe(false);
    expect(result.reason).toBe("Within grace period");
  });

  it("charges after grace period", () => {
    const today = new Date("2026-03-07"); // 6 days after, grace=5
    const result = shouldChargeFee(baseConfig, dueDate, today, 0, false);
    expect(result.charge).toBe(true);
  });

  it("does not charge one-time fee if already charged", () => {
    const today = new Date("2026-03-07");
    const result = shouldChargeFee(baseConfig, dueDate, today, 50, false);
    expect(result.charge).toBe(false);
    expect(result.reason).toBe("One-time fee already charged");
  });

  it("does not charge when disabled", () => {
    const config = { ...baseConfig, lateFeeEnabled: false };
    const today = new Date("2026-03-15");
    const result = shouldChargeFee(config, dueDate, today, 0, false);
    expect(result.charge).toBe(false);
    expect(result.reason).toBe("Late fees disabled");
  });

  it("does not charge when amount is zero", () => {
    const config = { ...baseConfig, lateFeeAmount: 0 };
    const today = new Date("2026-03-15");
    const result = shouldChargeFee(config, dueDate, today, 0, false);
    expect(result.charge).toBe(false);
    expect(result.reason).toBe("Fee amount is zero");
  });

  // Daily accrual tests
  const dailyConfig: LateFeeConfig = {
    ...baseConfig,
    lateFeeAccrual: "daily",
    lateFeeAmount: 10,
    lateFeeMaxAmount: 100,
  };

  it("charges daily fee when past grace period", () => {
    const today = new Date("2026-03-07");
    const result = shouldChargeFee(dailyConfig, dueDate, today, 0, false);
    expect(result.charge).toBe(true);
    expect(result.amount).toBe(100); // remaining cap
  });

  it("does not charge daily fee if already charged today", () => {
    const today = new Date("2026-03-07");
    const result = shouldChargeFee(dailyConfig, dueDate, today, 0, true);
    expect(result.charge).toBe(false);
    expect(result.reason).toBe("Already charged today");
  });

  it("does not exceed max cap", () => {
    const today = new Date("2026-03-15");
    const result = shouldChargeFee(dailyConfig, dueDate, today, 100, false);
    expect(result.charge).toBe(false);
    expect(result.reason).toBe("Max fee cap reached");
  });

  it("returns remaining cap amount", () => {
    const today = new Date("2026-03-15");
    const result = shouldChargeFee(dailyConfig, dueDate, today, 75, false);
    expect(result.charge).toBe(true);
    expect(result.amount).toBe(25);
  });

  it("daily with no max cap returns Infinity remaining", () => {
    const config = { ...dailyConfig, lateFeeMaxAmount: null };
    const today = new Date("2026-03-15");
    const result = shouldChargeFee(config, dueDate, today, 500, false);
    expect(result.charge).toBe(true);
  });
});

describe("getLateFeeDetails", () => {
  it("returns disabled message", () => {
    const config = { ...baseConfig, lateFeeEnabled: false };
    expect(getLateFeeDetails(config)).toBe("No late fees");
  });

  it("returns flat one-time description", () => {
    expect(getLateFeeDetails(baseConfig)).toBe(
      "$50.00 one-time after 5-day grace period"
    );
  });

  it("returns percentage daily with cap", () => {
    const config: LateFeeConfig = {
      lateFeeEnabled: true,
      lateFeeType: "percentage",
      lateFeeAmount: 5,
      lateFeeAccrual: "daily",
      lateFeeMaxAmount: 200,
      gracePeriod: 3,
    };
    expect(getLateFeeDetails(config)).toBe(
      "5% of rent per day after 3-day grace period (max $200.00)"
    );
  });

  it("returns daily without cap", () => {
    const config: LateFeeConfig = {
      ...baseConfig,
      lateFeeAccrual: "daily",
      lateFeeAmount: 10,
      lateFeeMaxAmount: null,
    };
    expect(getLateFeeDetails(config)).toBe(
      "$10.00 per day after 5-day grace period"
    );
  });
});
