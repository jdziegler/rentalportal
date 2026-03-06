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

export async function updateRentScheduleConfig(formData: FormData) {
  const userId = await getUserId();
  const publishDay = parseInt(formData.get("publishDay") as string) || 1;

  await prisma.rentScheduleConfig.upsert({
    where: { userId },
    create: { userId, publishDay },
    update: { publishDay },
  });

  revalidatePath("/settings/rent-automation");
  redirect("/settings/rent-automation?toast=Settings+saved");
}

export async function updateLateFeeConfig(leaseId: string, formData: FormData) {
  const userId = await getUserId();

  // Verify lease ownership
  await prisma.lease.findUniqueOrThrow({
    where: { id: leaseId, userId },
  });

  const enabled = formData.get("lateFeeEnabled") === "on";
  const type = (formData.get("lateFeeType") as string) || "flat";
  const amount = parseFloat(formData.get("lateFeeAmount") as string) || 0;
  const accrual = (formData.get("lateFeeAccrual") as string) || "one_time";
  const maxAmountRaw = formData.get("lateFeeMaxAmount") as string;
  const maxAmount = maxAmountRaw ? parseFloat(maxAmountRaw) : null;

  await prisma.lease.update({
    where: { id: leaseId, userId },
    data: {
      lateFeeEnabled: enabled,
      lateFeeType: type,
      lateFeeAmount: amount,
      lateFeeAccrual: accrual,
      lateFeeMaxAmount: maxAmount,
    },
  });

  revalidatePath(`/leases/${leaseId}`);
  redirect(`/leases/${leaseId}?toast=Late+fee+settings+updated`);
}
