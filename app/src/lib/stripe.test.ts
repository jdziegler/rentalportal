import { describe, it, expect } from "vitest";
import { CONNECT_FEES } from "./fees";

describe("CONNECT_FEES", () => {
  it("has ACH fee of $1.95 (195 cents)", () => {
    expect(CONNECT_FEES.ach).toBe(195);
  });

  it("has card percentage of 3.5%", () => {
    expect(CONNECT_FEES.card_percent).toBe(3.5);
  });

  it("has card fixed fee of $0.30 (30 cents)", () => {
    expect(CONNECT_FEES.card_fixed).toBe(30);
  });
});

describe("fee calculations", () => {
  it("calculates correct ACH fee for any amount", () => {
    // ACH is always flat $1.95
    expect(CONNECT_FEES.ach).toBe(195);
  });

  it("calculates correct card fee for $1500 rent", () => {
    const amountCents = 150000;
    const fee = Math.round(
      amountCents * (CONNECT_FEES.card_percent / 100) + CONNECT_FEES.card_fixed
    );
    // 1500 * 0.035 = 52.50 + 0.30 = 52.80 → 5280 cents
    expect(fee).toBe(5280);
  });

  it("calculates correct card fee for $800 rent", () => {
    const amountCents = 80000;
    const fee = Math.round(
      amountCents * (CONNECT_FEES.card_percent / 100) + CONNECT_FEES.card_fixed
    );
    // 800 * 0.035 = 28.00 + 0.30 = 28.30 → 2830 cents
    expect(fee).toBe(2830);
  });

  it("ACH is always cheaper than card for rent above ~$47", () => {
    // ACH = 195 cents flat
    // Card = amount * 0.035 + 30
    // Break-even: 195 = amount * 0.035 + 30 → amount = 4714 cents ($47.14)
    const breakEven = Math.ceil((CONNECT_FEES.ach - CONNECT_FEES.card_fixed) / (CONNECT_FEES.card_percent / 100));
    expect(breakEven).toBeLessThan(5000); // under $50

    // For typical rent ($500+), ACH is way cheaper
    const rentCents = 50000;
    const cardFee = Math.round(rentCents * (CONNECT_FEES.card_percent / 100) + CONNECT_FEES.card_fixed);
    expect(CONNECT_FEES.ach).toBeLessThan(cardFee);
  });
});
