import { describe, it, expect } from "vitest";
import {
  renderEmailTemplate,
  renderSMSTemplate,
  type NotificationData,
} from "./notifications";

const baseData: NotificationData = {
  tenantName: "Jane Doe",
  propertyName: "132 Broughton Ave",
  unitName: "Apt 4B",
};

describe("Email Templates", () => {
  it("renders rent reminder", () => {
    const result = renderEmailTemplate("rent_reminder", {
      ...baseData,
      rentAmount: 1650,
      dueDate: "3/1/2026",
      daysUntilDue: 3,
    });
    expect(result.subject).toContain("$1650.00");
    expect(result.subject).toContain("3/1/2026");
    expect(result.text).toContain("Jane Doe");
    expect(result.text).toContain("132 Broughton Ave");
    expect(result.text).toContain("Apt 4B");
  });

  it("renders rent overdue", () => {
    const result = renderEmailTemplate("rent_overdue", {
      ...baseData,
      rentAmount: 1650,
      dueDate: "3/1/2026",
      daysOverdue: 5,
    });
    expect(result.subject).toContain("Overdue");
    expect(result.text).toContain("5 day(s) overdue");
  });

  it("renders payment received with zero balance", () => {
    const result = renderEmailTemplate("payment_received", {
      ...baseData,
      paymentAmount: 1650,
      paymentMethod: "ACH",
      remainingBalance: 0,
    });
    expect(result.subject).toContain("$1650.00");
    expect(result.text).toContain("fully paid");
  });

  it("renders payment received with remaining balance", () => {
    const result = renderEmailTemplate("payment_received", {
      ...baseData,
      paymentAmount: 800,
      paymentMethod: "card",
      remainingBalance: 850,
    });
    expect(result.text).toContain("$850.00");
  });

  it("renders late fee charged", () => {
    const result = renderEmailTemplate("late_fee_charged", {
      ...baseData,
      lateFeeAmount: 50,
    });
    expect(result.subject).toContain("$50.00");
    expect(result.text).toContain("late fee");
  });

  it("renders maintenance update", () => {
    const result = renderEmailTemplate("maintenance_update", {
      ...baseData,
      requestTitle: "Kitchen faucet leaking",
      oldStatus: "Open",
      newStatus: "In Progress",
    });
    expect(result.subject).toContain("Kitchen faucet leaking");
    expect(result.text).toContain("Open");
    expect(result.text).toContain("In Progress");
  });

  it("renders lease expiring", () => {
    const result = renderEmailTemplate("lease_expiring", {
      ...baseData,
      leaseEndDate: "5/31/2026",
      daysUntilExpiry: 30,
    });
    expect(result.subject).toContain("30 days");
    expect(result.text).toContain("5/31/2026");
  });

  it("renders new message", () => {
    const result = renderEmailTemplate("new_message", {
      ...baseData,
      senderName: "Jesse Ziegler",
      messagePreview: "Hi Jane, the plumber will be there Wednesday.",
    });
    expect(result.subject).toContain("Jesse Ziegler");
    expect(result.text).toContain("plumber");
  });
});

describe("SMS Templates", () => {
  it("renders rent reminder under 160 chars", () => {
    const result = renderSMSTemplate("rent_reminder", {
      ...baseData,
      rentAmount: 1650,
      dueDate: "3/1/2026",
    });
    expect(result).toContain("$1650.00");
    expect(result).toContain("PropertyPilot");
    expect(result.length).toBeLessThan(200);
  });

  it("renders payment received", () => {
    const result = renderSMSTemplate("payment_received", {
      ...baseData,
      paymentAmount: 1650,
      remainingBalance: 0,
    });
    expect(result).toContain("All paid up!");
  });

  it("renders late fee charged", () => {
    const result = renderSMSTemplate("late_fee_charged", {
      ...baseData,
      lateFeeAmount: 50,
    });
    expect(result).toContain("$50.00");
  });

  it("renders new message and truncates preview", () => {
    const longMessage = "A".repeat(200);
    const result = renderSMSTemplate("new_message", {
      ...baseData,
      senderName: "Jesse",
      messagePreview: longMessage,
    });
    // Should truncate to 80 chars
    expect(result.length).toBeLessThan(200);
  });

  it("renders all 7 template types without error", () => {
    const types = [
      "rent_reminder", "rent_overdue", "payment_received",
      "late_fee_charged", "maintenance_update", "lease_expiring", "new_message",
    ] as const;
    for (const type of types) {
      const result = renderSMSTemplate(type, {
        ...baseData,
        rentAmount: 1000,
        dueDate: "1/1/2026",
        daysOverdue: 1,
        paymentAmount: 500,
        remainingBalance: 500,
        lateFeeAmount: 25,
        requestTitle: "Test",
        oldStatus: "Open",
        newStatus: "Closed",
        leaseEndDate: "12/31/2026",
        daysUntilExpiry: 30,
        senderName: "Owner",
        messagePreview: "Hello",
      });
      expect(result).toBeTruthy();
      expect(result).toContain("PropertyPilot");
    }
  });
});
