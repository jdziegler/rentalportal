import { describe, it, expect } from "vitest";
import { generateCode } from "./tenant-auth";

describe("generateCode", () => {
  it("returns a 6-digit string", () => {
    const code = generateCode();
    expect(code).toMatch(/^\d{6}$/);
  });

  it("returns different codes on successive calls", () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateCode()));
    // With 20 random 6-digit codes, collisions are extremely unlikely
    expect(codes.size).toBeGreaterThan(15);
  });

  it("never returns a code shorter than 6 digits", () => {
    for (let i = 0; i < 100; i++) {
      const code = generateCode();
      expect(code.length).toBe(6);
      expect(Number(code)).toBeGreaterThanOrEqual(100000);
      expect(Number(code)).toBeLessThanOrEqual(999999);
    }
  });
});
