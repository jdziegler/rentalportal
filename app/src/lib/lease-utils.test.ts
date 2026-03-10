import { describe, it, expect } from "vitest";

// Replicate the display logic used in the lease detail page
function getEffectiveLeaseType(lease: {
  leaseType: string;
  leaseStatus: string;
  endDate: Date | null;
}): string {
  const labels: Record<string, string> = { FIXED: "Fixed", MONTH_TO_MONTH: "Month-to-Month" };

  if (
    lease.leaseType === "FIXED" &&
    lease.leaseStatus === "ACTIVE" &&
    lease.endDate &&
    lease.endDate < new Date()
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
      getEffectiveLeaseType({ leaseType: "FIXED", leaseStatus: "ACTIVE", endDate: future })
    ).toBe("Fixed");
  });

  it("shows Month-to-Month for active fixed-term lease with past end date", () => {
    const past = new Date();
    past.setFullYear(past.getFullYear() - 1);
    expect(
      getEffectiveLeaseType({ leaseType: "FIXED", leaseStatus: "ACTIVE", endDate: past })
    ).toBe("Month-to-Month");
  });

  it("shows Fixed for terminated fixed-term lease with past end date", () => {
    const past = new Date();
    past.setFullYear(past.getFullYear() - 1);
    // leaseStatus "TERMINATED" — shouldn't show as MTM
    expect(
      getEffectiveLeaseType({ leaseType: "FIXED", leaseStatus: "TERMINATED", endDate: past })
    ).toBe("Fixed");
  });

  it("shows Month-to-Month for explicit month-to-month lease", () => {
    expect(
      getEffectiveLeaseType({ leaseType: "MONTH_TO_MONTH", leaseStatus: "ACTIVE", endDate: null })
    ).toBe("Month-to-Month");
  });

  it("shows Fixed for fixed lease with no end date", () => {
    expect(
      getEffectiveLeaseType({ leaseType: "FIXED", leaseStatus: "ACTIVE", endDate: null })
    ).toBe("Fixed");
  });
});
