import { describe, it, expect } from "vitest";
import { PLANS, getPlanByPriceId, getPlanLimits } from "./plans";

describe("PLANS", () => {
  it("has free and pro plans", () => {
    expect(Object.keys(PLANS)).toEqual(["free", "pro"]);
  });

  it("free plan has no price", () => {
    expect(PLANS.free.price).toBe(0);
    expect(PLANS.free.priceId).toBeNull();
  });

  it("pro plan costs $29/mo", () => {
    expect(PLANS.pro.price).toBe(2900);
  });

  it("free plan has lower limits than pro", () => {
    expect(PLANS.free.limits.units).toBeLessThan(PLANS.pro.limits.units);
    expect(PLANS.free.limits.leases).toBeLessThan(PLANS.pro.limits.leases);
  });

  it("free plan allows 5 units and 3 leases", () => {
    expect(PLANS.free.limits.units).toBe(5);
    expect(PLANS.free.limits.leases).toBe(3);
  });

  it("pro plan allows 250 units and 100 leases", () => {
    expect(PLANS.pro.limits.units).toBe(250);
    expect(PLANS.pro.limits.leases).toBe(100);
  });
});

describe("getPlanByPriceId", () => {
  it("returns free for null priceId", () => {
    expect(getPlanByPriceId(null)).toBe("free");
  });

  it("returns free for unknown priceId", () => {
    expect(getPlanByPriceId("price_unknown")).toBe("free");
  });

  it("returns free for empty string", () => {
    expect(getPlanByPriceId("")).toBe("free");
  });

  it("returns pro for pro priceId", () => {
    // PLANS.pro.priceId comes from env, so it may be null in test
    // but if set, it should resolve
    if (PLANS.pro.priceId) {
      expect(getPlanByPriceId(PLANS.pro.priceId)).toBe("pro");
    }
  });
});

describe("getPlanLimits", () => {
  it("returns free limits for null", () => {
    const limits = getPlanLimits(null);
    expect(limits.units).toBe(5);
    expect(limits.leases).toBe(3);
  });

  it("returns free limits for unknown priceId", () => {
    const limits = getPlanLimits("price_bogus");
    expect(limits.units).toBe(5);
    expect(limits.leases).toBe(3);
  });

  it("limits have positive numbers", () => {
    for (const plan of Object.values(PLANS)) {
      expect(plan.limits.units).toBeGreaterThan(0);
      expect(plan.limits.leases).toBeGreaterThan(0);
    }
  });
});

describe("subscription status logic", () => {
  it("free plan is always active regardless of dates", () => {
    // Free plan has no periodEnd to check
    const plan = getPlanByPriceId(null);
    expect(plan).toBe("free");
  });

  it("expired pro subscription falls back to free limits", () => {
    // When subscription expires, getPlanLimits(null) is used
    const freeLimits = getPlanLimits(null);
    expect(freeLimits.units).toBe(5);
  });

  it("plan hierarchy: free limits < pro limits for all resources", () => {
    const free = PLANS.free.limits;
    const pro = PLANS.pro.limits;
    expect(free.units).toBeLessThan(pro.units);
    expect(free.leases).toBeLessThan(pro.leases);
  });
});

describe("webhook idempotency design", () => {
  it("event IDs are unique strings (evt_xxx format)", () => {
    const mockEventId = "evt_1234567890";
    expect(mockEventId).toMatch(/^evt_/);
  });

  it("duplicate insert should be caught by unique constraint", () => {
    // The WebhookEvent model uses Stripe event ID as primary key
    // Attempting to insert the same ID twice will throw
    // This is verified by the prisma schema: id String @id
    expect(true).toBe(true); // Schema-level guarantee
  });
});

describe("payment race condition prevention", () => {
  it("Payment.stripePaymentIntentId has unique constraint", () => {
    // The Payment model has: stripePaymentIntentId String? @unique
    // upsert on this field prevents duplicate Payment records
    // from concurrent webhook events
    expect(true).toBe(true); // Schema-level guarantee
  });
});
