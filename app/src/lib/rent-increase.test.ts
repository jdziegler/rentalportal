import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { applyDueRentIncreases, generateRentCharges } from "./rent-automation";

/**
 * Integration test: rent increase → rent charge uses increased amount.
 * Runs against the real database.
 */

const TEST_PREFIX = "__test_ri_";
let userId: string;
let propertyId: string;
let unitId: string;
let leaseId: string;
let rentIncreaseId: string;

beforeAll(async () => {
  // Seed a user (use upsert to avoid conflicts if test is re-run)
  const user = await prisma.user.upsert({
    where: { email: `${TEST_PREFIX}user@test.local` },
    update: {},
    create: {
      email: `${TEST_PREFIX}user@test.local`,
      name: "Test RI User",
    },
  });
  userId = user.id;

  // Set publish day to today so generateRentCharges will fire
  const today = new Date();
  await prisma.rentScheduleConfig.upsert({
    where: { userId },
    update: { publishDay: today.getDate() },
    create: { userId, publishDay: today.getDate() },
  });

  const property = await prisma.property.create({
    data: {
      userId,
      name: `${TEST_PREFIX}Property`,
      address: "1 Test St",
      city: "Test",
      state: "NJ",
      zip: "00000",
    },
  });
  propertyId = property.id;

  const unit = await prisma.unit.create({
    data: {
      propertyId,
      name: `${TEST_PREFIX}Unit 1`,
    },
  });
  unitId = unit.id;

  const contact = await prisma.contact.create({
    data: {
      userId,
      firstName: TEST_PREFIX,
      lastName: "Tenant",
    },
  });

  const lease = await prisma.lease.create({
    data: {
      userId,
      propertyId,
      unitId,
      contactId: contact.id,
      rentAmount: 1500,
      startDate: new Date("2025-01-01"),
      endDate: new Date("2026-12-31"),
      rentDueDay: today.getDate(), // due today
    },
  });
  leaseId = lease.id;

  // Schedule a rent increase effective today
  const ri = await prisma.rentIncrease.create({
    data: {
      leaseId,
      userId,
      previousRent: 1500,
      newRent: 1650,
      effectiveDate: new Date(), // today
      noticeDate: new Date("2026-02-01"),
      notes: "Integration test increase",
    },
  });
  rentIncreaseId = ri.id;
});

afterAll(async () => {
  // Clean up all test data (cascade handles children)
  await prisma.transaction.deleteMany({ where: { userId } });
  await prisma.rentIncrease.deleteMany({ where: { userId } });
  await prisma.lease.deleteMany({ where: { userId } });
  await prisma.contact.deleteMany({ where: { userId } });
  await prisma.unit.deleteMany({ where: { propertyId } });
  await prisma.property.deleteMany({ where: { id: propertyId } });
  await prisma.rentScheduleConfig.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { id: userId } });
});

describe("rent increase integration", () => {
  it("applyDueRentIncreases updates lease rent and marks increase as APPLIED", async () => {
    const result = await applyDueRentIncreases();
    expect(result.errors).toHaveLength(0);
    expect(result.applied).toBeGreaterThanOrEqual(1);

    // Verify lease rent was updated
    const lease = await prisma.lease.findUniqueOrThrow({ where: { id: leaseId } });
    expect(Number(lease.rentAmount)).toBe(1650);

    // Verify increase status
    const ri = await prisma.rentIncrease.findUniqueOrThrow({ where: { id: rentIncreaseId } });
    expect(ri.status).toBe("APPLIED");
    expect(ri.appliedAt).toBeTruthy();
  });

  it("generateRentCharges creates a charge at the increased amount", async () => {
    const result = await generateRentCharges();
    expect(result.errors).toHaveLength(0);
    expect(result.created).toBeGreaterThanOrEqual(1);

    // Find the auto-rent transaction for our lease
    const txn = await prisma.transaction.findFirst({
      where: {
        leaseId,
        source: "auto_rent",
      },
      orderBy: { createdAt: "desc" },
    });

    expect(txn).toBeTruthy();
    expect(Number(txn!.amount)).toBe(1650);
    expect(Number(txn!.balance)).toBe(1650);
    expect(txn!.status).toBe("UNPAID");
  });

  it("does not re-apply an already applied increase", async () => {
    const result = await applyDueRentIncreases();
    // Our increase is already APPLIED, so nothing new
    const ri = await prisma.rentIncrease.findUniqueOrThrow({ where: { id: rentIncreaseId } });
    expect(ri.status).toBe("APPLIED");

    // Lease rent should still be 1650
    const lease = await prisma.lease.findUniqueOrThrow({ where: { id: leaseId } });
    expect(Number(lease.rentAmount)).toBe(1650);
  });

  it("does not apply a future-dated increase", async () => {
    // Create an increase with a future effective date
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);

    const futureRi = await prisma.rentIncrease.create({
      data: {
        leaseId,
        userId,
        previousRent: 1650,
        newRent: 1800,
        effectiveDate: future,
      },
    });

    const result = await applyDueRentIncreases();
    // Should not have applied the future one
    const ri = await prisma.rentIncrease.findUniqueOrThrow({ where: { id: futureRi.id } });
    expect(ri.status).toBe("SCHEDULED");

    // Lease rent unchanged
    const lease = await prisma.lease.findUniqueOrThrow({ where: { id: leaseId } });
    expect(Number(lease.rentAmount)).toBe(1650);

    // Clean up
    await prisma.rentIncrease.delete({ where: { id: futureRi.id } });
  });
});
