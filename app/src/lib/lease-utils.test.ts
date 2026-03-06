import { describe, it, expect } from "vitest";

// Replicate the display logic used in the lease detail page
function getEffectiveLeaseType(lease: {
  leaseType: number;
  leaseStatus: number;
  rentTo: Date | null;
}): string {
  const labels: Record<number, string> = { 1: "Fixed", 2: "Month-to-Month" };

  if (
    lease.leaseType === 1 &&
    lease.leaseStatus === 0 &&
    lease.rentTo &&
    lease.rentTo < new Date()
  ) {
    return "Month-to-Month";
  }

  return labels[lease.leaseType] || "Unknown";
}

describe("getEffectiveLeaseType", () => {
  it("shows Fixed for active fixed-term lease with future end date", () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    expect(
      getEffectiveLeaseType({ leaseType: 1, leaseStatus: 0, rentTo: future })
    ).toBe("Fixed");
  });

  it("shows Month-to-Month for active fixed-term lease with past end date", () => {
    const past = new Date();
    past.setFullYear(past.getFullYear() - 1);
    expect(
      getEffectiveLeaseType({ leaseType: 1, leaseStatus: 0, rentTo: past })
    ).toBe("Month-to-Month");
  });

  it("shows Fixed for terminated fixed-term lease with past end date", () => {
    const past = new Date();
    past.setFullYear(past.getFullYear() - 1);
    // leaseStatus 2 = terminated — shouldn't show as MTM
    expect(
      getEffectiveLeaseType({ leaseType: 1, leaseStatus: 2, rentTo: past })
    ).toBe("Fixed");
  });

  it("shows Month-to-Month for explicit month-to-month lease", () => {
    expect(
      getEffectiveLeaseType({ leaseType: 2, leaseStatus: 0, rentTo: null })
    ).toBe("Month-to-Month");
  });

  it("shows Fixed for fixed lease with no end date", () => {
    expect(
      getEffectiveLeaseType({ leaseType: 1, leaseStatus: 0, rentTo: null })
    ).toBe("Fixed");
  });
});
