import { describe, it, expect } from "vitest";
import { csvEscape, buildCSV, formatDate, formatCurrency } from "./export";

describe("csvEscape", () => {
  it("returns simple values unchanged", () => {
    expect(csvEscape("hello")).toBe("hello");
    expect(csvEscape("123")).toBe("123");
  });

  it("wraps values with commas in quotes", () => {
    expect(csvEscape("hello, world")).toBe('"hello, world"');
  });

  it("wraps values with quotes and escapes them", () => {
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
  });

  it("wraps values with newlines", () => {
    expect(csvEscape("line1\nline2")).toBe('"line1\nline2"');
  });

  it("handles empty string", () => {
    expect(csvEscape("")).toBe("");
  });
});

describe("buildCSV", () => {
  it("builds CSV with headers and rows", () => {
    const result = buildCSV(
      ["Name", "Amount"],
      [["Rent", 1500], ["Deposit", 2000]]
    );
    expect(result).toBe("Name,Amount\nRent,1500\nDeposit,2000");
  });

  it("escapes values with special characters", () => {
    const result = buildCSV(
      ["Description"],
      [["Income, from rent"]]
    );
    expect(result).toContain('"Income, from rent"');
  });

  it("handles empty rows", () => {
    const result = buildCSV(["A", "B"], []);
    expect(result).toBe("A,B");
  });

  it("handles null/undefined values", () => {
    const result = buildCSV(["A"], [[null as unknown as string]]);
    expect(result).toBe("A\n");
  });
});

describe("formatDate", () => {
  it("formats date as YYYY-MM-DD", () => {
    const date = new Date("2026-03-07T12:00:00Z");
    expect(formatDate(date)).toBe("2026-03-07");
  });
});

describe("formatCurrency", () => {
  it("formats positive number", () => {
    expect(formatCurrency(1500)).toBe("1500.00");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("0.00");
  });

  it("formats with signed negative", () => {
    expect(formatCurrency(-500, true)).toBe("-500.00");
  });

  it("rounds to 2 decimal places", () => {
    expect(formatCurrency(99.999)).toBe("100.00");
  });
});
