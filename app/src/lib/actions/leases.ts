"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
  const rentFrom = new Date(formData.get("rentFrom") as string);
  const rentToRaw = formData.get("rentTo") as string;
  const rentTo = rentToRaw ? new Date(rentToRaw) : null;
  const leaseType = parseInt(formData.get("leaseType") as string) || 1;
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
        rentFrom,
        rentTo,
        deposit,
        lateFeeEnabled,
        lateFeeType,
        lateFeeAmount,
        lateFeeAccrual,
        lateFeeMaxAmount,
      },
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
  const rentFrom = new Date(formData.get("rentFrom") as string);
  const rentToRaw = formData.get("rentTo") as string;
  const rentTo = rentToRaw ? new Date(rentToRaw) : null;
  const leaseType = parseInt(formData.get("leaseType") as string) || 1;
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
      rentFrom,
      rentTo,
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
    where: { unitId: lease.unitId, leaseStatus: 0 },
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

export async function terminateLease(id: string) {
  const userId = await getUserId();

  const lease = await prisma.lease.update({
    where: { id, userId },
    data: { leaseStatus: 2 },
    select: { unitId: true },
  });

  // Check if the unit has any other active leases
  const otherActiveLeases = await prisma.lease.count({
    where: { unitId: lease.unitId, leaseStatus: 0 },
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
