"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkPlanLimit } from "@/lib/subscription";
import type { LeaseType } from "@prisma/client";

async function getUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

export async function createLease(formData: FormData) {
  const userId = await getUserId();

  const unitId = formData.get("unitId") as string;
  const contactId = formData.get("contactId") as string;
  const rentAmount = parseFloat(formData.get("rentAmount") as string);
  const startDate = new Date(formData.get("startDate") as string);
  const endDateRaw = formData.get("endDate") as string;
  const endDate = endDateRaw ? new Date(endDateRaw) : null;
  const leaseType = ((formData.get("leaseType") as string) || "FIXED") as LeaseType;
  const rentDueDay = parseInt(formData.get("rentDueDay") as string) || 1;
  const gracePeriod = parseInt(formData.get("gracePeriod") as string) ?? 5;
  const depositRaw = formData.get("deposit") as string;
  const deposit = depositRaw ? parseFloat(depositRaw) : null;
  const name = (formData.get("name") as string) || null;

  // Late fee fields
  const lateFeeEnabled = formData.get("lateFeeEnabled") === "on";
  const lateFeeType = (formData.get("lateFeeType") as string) || "flat";
  const lateFeeAmount = parseFloat(formData.get("lateFeeAmount") as string) || 0;
  const lateFeeAccrual = (formData.get("lateFeeAccrual") as string) || "one_time";
  const lateFeeMaxRaw = formData.get("lateFeeMaxAmount") as string;
  const lateFeeMaxAmount = lateFeeMaxRaw ? parseFloat(lateFeeMaxRaw) : null;

  // Check plan limit
  const { allowed, current, limit } = await checkPlanLimit(userId, "leases");
  if (!allowed) {
    redirect(`/leases/new?toast=Plan+limit+reached+(${current}/${limit}+active+leases).+Upgrade+to+Pro+for+more.&error=true`);
  }

  // Look up the unit to get propertyId
  const unit = await prisma.unit.findUniqueOrThrow({
    where: { id: unitId },
    select: { propertyId: true },
  });

  const lease = await prisma.$transaction(async (tx) => {
    const created = await tx.lease.create({
      data: {
        userId,
        propertyId: unit.propertyId,
        unitId,
        contactId,
        name,
        leaseType,
        rentAmount,
        rentDueDay,
        gracePeriod,
        startDate,
        endDate,
        deposit,
        lateFeeEnabled,
        lateFeeType,
        lateFeeAmount,
        lateFeeAccrual,
        lateFeeMaxAmount,
      },
    });

    // Add primary tenant to LeaseTenant join table
    await tx.leaseTenant.create({
      data: { leaseId: created.id, contactId, isPrimary: true },
    });

    await tx.unit.update({
      where: { id: unitId },
      data: { isRented: true },
    });

    return created;
  });

  revalidatePath("/leases");
  revalidatePath(`/units/${unitId}`);
  redirect(`/leases/${lease.id}?toast=Lease+created`);
}

export async function updateLease(id: string, formData: FormData) {
  const userId = await getUserId();

  const unitId = formData.get("unitId") as string;
  const contactId = formData.get("contactId") as string;
  const rentAmount = parseFloat(formData.get("rentAmount") as string);
  const startDate = new Date(formData.get("startDate") as string);
  const endDateRaw = formData.get("endDate") as string;
  const endDate = endDateRaw ? new Date(endDateRaw) : null;
  const leaseType = ((formData.get("leaseType") as string) || "FIXED") as LeaseType;
  const rentDueDay = parseInt(formData.get("rentDueDay") as string) || 1;
  const gracePeriod = parseInt(formData.get("gracePeriod") as string) ?? 5;
  const depositRaw = formData.get("deposit") as string;
  const deposit = depositRaw ? parseFloat(depositRaw) : null;
  const name = (formData.get("name") as string) || null;

  // Late fee fields
  const lateFeeEnabled = formData.get("lateFeeEnabled") === "on";
  const lateFeeType = (formData.get("lateFeeType") as string) || "flat";
  const lateFeeAmount = parseFloat(formData.get("lateFeeAmount") as string) || 0;
  const lateFeeAccrual = (formData.get("lateFeeAccrual") as string) || "one_time";
  const lateFeeMaxRaw = formData.get("lateFeeMaxAmount") as string;
  const lateFeeMaxAmount = lateFeeMaxRaw ? parseFloat(lateFeeMaxRaw) : null;

  // Look up the unit to get propertyId
  const unit = await prisma.unit.findUniqueOrThrow({
    where: { id: unitId },
    select: { propertyId: true },
  });

  await prisma.lease.update({
    where: { id, userId },
    data: {
      propertyId: unit.propertyId,
      unitId,
      contactId,
      name,
      leaseType,
      rentAmount,
      rentDueDay,
      gracePeriod,
      startDate,
      endDate,
      deposit,
      lateFeeEnabled,
      lateFeeType,
      lateFeeAmount,
      lateFeeAccrual,
      lateFeeMaxAmount,
    },
  });

  revalidatePath(`/leases/${id}`);
  revalidatePath("/leases");
  redirect(`/leases/${id}?toast=Lease+updated`);
}

export async function deleteLease(id: string) {
  const userId = await getUserId();

  const lease = await prisma.lease.findUniqueOrThrow({
    where: { id, userId },
    select: { unitId: true },
  });

  await prisma.lease.delete({
    where: { id, userId },
  });

  // Check if the unit has any other active leases
  const otherActiveLeases = await prisma.lease.count({
    where: { unitId: lease.unitId, leaseStatus: "ACTIVE" },
  });

  if (otherActiveLeases === 0) {
    await prisma.unit.update({
      where: { id: lease.unitId },
      data: { isRented: false },
    });
  }

  revalidatePath("/leases");
  revalidatePath(`/units/${lease.unitId}`);
  redirect("/leases?toast=Lease+deleted");
}

export async function renewLease(id: string, formData: FormData) {
  const userId = await getUserId();

  const existing = await prisma.lease.findUniqueOrThrow({
    where: { id, userId },
    include: { tenants: true },
  });

  // Parse renewal form data
  const leaseType = ((formData.get("leaseType") as string) || existing.leaseType) as LeaseType;
  const rentAmount = parseFloat(formData.get("rentAmount") as string) || Number(existing.rentAmount);
  const startDate = new Date(formData.get("startDate") as string || (existing.endDate || new Date()).toISOString());
  const endDateRaw = formData.get("endDate") as string;
  const endDate = endDateRaw ? new Date(endDateRaw) : null;
  const rentDueDay = parseInt(formData.get("rentDueDay") as string) || existing.rentDueDay;
  const gracePeriod = parseInt(formData.get("gracePeriod") as string) ?? existing.gracePeriod;
  const depositRaw = formData.get("deposit") as string;
  const deposit = depositRaw ? parseFloat(depositRaw) : existing.deposit;
  const notes = (formData.get("notes") as string) || existing.notes;

  // Late fee fields
  const lateFeeEnabled = formData.get("lateFeeEnabled") === "on";
  const lateFeeType = (formData.get("lateFeeType") as string) || existing.lateFeeType;
  const lateFeeAmount = parseFloat(formData.get("lateFeeAmount") as string) || 0;
  const lateFeeAccrual = (formData.get("lateFeeAccrual") as string) || existing.lateFeeAccrual;
  const lateFeeMaxRaw = formData.get("lateFeeMaxAmount") as string;
  const lateFeeMaxAmount = lateFeeMaxRaw ? parseFloat(lateFeeMaxRaw) : null;

  // Expire the old lease
  await prisma.lease.update({
    where: { id },
    data: { leaseStatus: "EXPIRED" },
  });

  const newLease = await prisma.lease.create({
    data: {
      userId,
      propertyId: existing.propertyId,
      unitId: existing.unitId,
      contactId: existing.contactId,
      name: existing.name,
      leaseType,
      rentAmount,
      rentDueDay,
      gracePeriod,
      currency: existing.currency,
      startDate,
      endDate,
      deposit,
      notes,
      previousLeaseId: id,
      lateFeeEnabled,
      lateFeeType,
      lateFeeAmount,
      lateFeeAccrual,
      lateFeeMaxAmount,
    },
  });

  // Copy all tenants (primary + co-tenants) to the renewed lease
  if (existing.tenants.length > 0) {
    await prisma.leaseTenant.createMany({
      data: existing.tenants.map((t) => ({
        leaseId: newLease.id,
        contactId: t.contactId,
        isPrimary: t.isPrimary,
      })),
    });
  }

  revalidatePath("/leases");
  revalidatePath(`/leases/${id}`);
  revalidatePath(`/units/${existing.unitId}`);
  redirect(`/leases/${newLease.id}?toast=Lease+renewed`);
}

export async function terminateLease(id: string) {
  const userId = await getUserId();

  const lease = await prisma.lease.update({
    where: { id, userId },
    data: { leaseStatus: "TERMINATED" },
    select: { unitId: true },
  });

  // Check if the unit has any other active leases
  const otherActiveLeases = await prisma.lease.count({
    where: { unitId: lease.unitId, leaseStatus: "ACTIVE" },
  });

  if (otherActiveLeases === 0) {
    await prisma.unit.update({
      where: { id: lease.unitId },
      data: { isRented: false },
    });
  }

  revalidatePath(`/leases/${id}`);
  revalidatePath("/leases");
  revalidatePath(`/units/${lease.unitId}`);
}
