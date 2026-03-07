import { describe, it, expect } from "vitest";
import { MockScreeningProvider, getProvider } from "./screening";

describe("MockScreeningProvider", () => {
  const provider = new MockScreeningProvider();

  it("has name 'mock'", () => {
    expect(provider.name).toBe("mock");
  });

  it("returns three report types", async () => {
    const results = await provider.runScreening({
      firstName: "John",
      lastName: "Doe",
    });
    expect(results).toHaveLength(3);
    expect(results.map((r) => r.type)).toEqual([
      "credit",
      "criminal",
      "eviction",
    ]);
  });

  it("returns a credit score between 580 and 850", async () => {
    const results = await provider.runScreening({
      firstName: "A",
      lastName: "B",
    });
    const credit = results.find((r) => r.type === "credit")!;
    expect(credit.score).toBeGreaterThanOrEqual(580);
    expect(credit.score).toBeLessThanOrEqual(850);
  });

  it("returns deterministic results based on name", async () => {
    const r1 = await provider.runScreening({
      firstName: "John",
      lastName: "Doe",
    });
    const r2 = await provider.runScreening({
      firstName: "John",
      lastName: "Doe",
    });
    expect(r1[0].score).toBe(r2[0].score);
    expect(r1[0].status).toBe(r2[0].status);
  });

  it("classifies high scores as clear", async () => {
    // 8+8=16, seed=6, score=580+6*30=760
    const results = await provider.runScreening({
      firstName: "Alexandr",
      lastName: "Smithson",
    });
    const credit = results.find((r) => r.type === "credit")!;
    expect(credit.score).toBeGreaterThanOrEqual(700);
    expect(credit.status).toBe("clear");
  });

  it("classifies mid scores as review", async () => {
    // 3+3=6, seed=6, score=580+6*30=760
    // Need seed 1-3: score 610-670
    // 5+5=10, seed=0, score=580 -> alert
    // 4+2=6, seed=6 -> 760, clear
    // Let's find one: seed=1 -> 610, review
    // length sum=11 -> seed=1
    const results = await provider.runScreening({
      firstName: "Abcde",
      lastName: "Fghijk",
    }); // 5+6=11, seed=1, score=610
    const credit = results.find((r) => r.type === "credit")!;
    expect(credit.score).toBe(610);
    expect(credit.status).toBe("review");
  });

  it("includes details in credit report", async () => {
    const results = await provider.runScreening({
      firstName: "Jane",
      lastName: "Smith",
    });
    const credit = results.find((r) => r.type === "credit")!;
    expect(credit.details).toBeDefined();
    expect(credit.details).toHaveProperty("openAccounts");
    expect(credit.details).toHaveProperty("latePayments");
    expect(credit.details).toHaveProperty("bankruptcies");
  });

  it("includes details in criminal report", async () => {
    const results = await provider.runScreening({
      firstName: "Jane",
      lastName: "Smith",
    });
    const criminal = results.find((r) => r.type === "criminal")!;
    expect(criminal.details).toHaveProperty("felonies");
    expect(criminal.details).toHaveProperty("sexOffenderRegistry");
  });

  it("includes details in eviction report", async () => {
    const results = await provider.runScreening({
      firstName: "Jane",
      lastName: "Smith",
    });
    const eviction = results.find((r) => r.type === "eviction")!;
    expect(eviction.details).toHaveProperty("evictions");
    expect(eviction.details).toHaveProperty("judgments");
  });

  it("always returns a summary string", async () => {
    const results = await provider.runScreening({
      firstName: "Test",
      lastName: "User",
    });
    for (const result of results) {
      expect(typeof result.summary).toBe("string");
      expect(result.summary.length).toBeGreaterThan(0);
    }
  });

  it("criminal status is always clear or alert", async () => {
    const results = await provider.runScreening({
      firstName: "Any",
      lastName: "One",
    });
    const criminal = results.find((r) => r.type === "criminal")!;
    expect(["clear", "alert"]).toContain(criminal.status);
  });

  it("eviction status is always clear or review", async () => {
    const results = await provider.runScreening({
      firstName: "Any",
      lastName: "One",
    });
    const eviction = results.find((r) => r.type === "eviction")!;
    expect(["clear", "review"]).toContain(eviction.status);
  });

  it("credit report status matches score thresholds", async () => {
    // Test multiple names to cover threshold boundaries
    for (const [first, last] of [["A", "B"], ["Hello", "World"], ["X", "Y"]]) {
      const results = await provider.runScreening({ firstName: first, lastName: last });
      const credit = results.find((r) => r.type === "credit")!;
      if (credit.score! >= 700) expect(credit.status).toBe("clear");
      else if (credit.score! >= 600) expect(credit.status).toBe("review");
      else expect(credit.status).toBe("alert");
    }
  });
});

describe("getProvider", () => {
  it("returns mock provider", () => {
    const provider = getProvider("mock");
    expect(provider.name).toBe("mock");
  });

  it("throws for unknown provider", () => {
    expect(() => getProvider("unknown")).toThrow("Unknown screening provider");
  });

  it("throws for empty string", () => {
    expect(() => getProvider("")).toThrow("Unknown screening provider");
  });
});

describe("Screening data validation", () => {
  const provider = new MockScreeningProvider();

  it("handles short names", async () => {
    const results = await provider.runScreening({
      firstName: "A",
      lastName: "B",
    });
    expect(results).toHaveLength(3);
  });

  it("handles long names", async () => {
    const results = await provider.runScreening({
      firstName: "Alexander",
      lastName: "VeryLongLastNameThatIsUnusual",
    });
    expect(results).toHaveLength(3);
    // seed wraps around mod 10
    const credit = results.find((r) => r.type === "credit")!;
    expect(credit.score).toBeGreaterThanOrEqual(580);
    expect(credit.score).toBeLessThanOrEqual(850);
  });

  it("bankruptcies is always 0 in mock", async () => {
    const results = await provider.runScreening({
      firstName: "Test",
      lastName: "User",
    });
    const credit = results.find((r) => r.type === "credit")!;
    expect((credit.details as any).bankruptcies).toBe(0);
  });

  it("sex offender registry is always false in mock", async () => {
    const results = await provider.runScreening({
      firstName: "Test",
      lastName: "User",
    });
    const criminal = results.find((r) => r.type === "criminal")!;
    expect((criminal.details as any).sexOffenderRegistry).toBe(false);
  });
});
