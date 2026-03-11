"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function getUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

export async function scheduleRentIncrease(leaseId: string, formData: FormData) {
  const userId = await getUserId();

  const lease = await prisma.lease.findUniqueOrThrow({
    where: { id: leaseId, userId },
    select: { rentAmount: true },
  });

  const newRent = parseFloat(formData.get("newRent") as string);
  const effectiveDate = new Date(formData.get("effectiveDate") as string);
  const noticeDateRaw = formData.get("noticeDate") as string;
  const noticeDate = noticeDateRaw ? new Date(noticeDateRaw) : null;
  const notes = (formData.get("notes") as string) || null;

  await prisma.rentIncrease.create({
    data: {
      leaseId,
      userId,
      previousRent: lease.rentAmount,
      newRent,
      effectiveDate,
      noticeDate,
      notes,
    },
  });

  revalidatePath(`/leases/${leaseId}`);
}

export async function applyRentIncrease(id: string) {
  const userId = await getUserId();

  const increase = await prisma.rentIncrease.findUniqueOrThrow({
    where: { id },
    include: { lease: { select: { id: true, userId: true } } },
  });

  if (increase.lease.userId !== userId) throw new Error("Not authorized");
  if (increase.status !== "SCHEDULED") throw new Error("Already processed");

  await prisma.$transaction([
    prisma.lease.update({
      where: { id: increase.leaseId },
      data: { rentAmount: increase.newRent },
    }),
    prisma.rentIncrease.update({
      where: { id },
      data: { status: "APPLIED", appliedAt: new Date() },
    }),
  ]);

  revalidatePath(`/leases/${increase.leaseId}`);
}

export async function cancelRentIncrease(id: string) {
  const userId = await getUserId();

  const increase = await prisma.rentIncrease.findUniqueOrThrow({
    where: { id },
    include: { lease: { select: { id: true, userId: true } } },
  });

  if (increase.lease.userId !== userId) throw new Error("Not authorized");
  if (increase.status !== "SCHEDULED") throw new Error("Already processed");

  await prisma.rentIncrease.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  revalidatePath(`/leases/${increase.leaseId}`);
}
