"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { TRANSACTION_STATUS } from "@/lib/transaction-status";

async function getUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

/** Convert dollars to cents to avoid floating point issues */
function toCents(value: number): number {
  return Math.round(value * 100);
}

function fromCents(cents: number): number {
  return cents / 100;
}

export async function createTransaction(formData: FormData) {
  const userId = await getUserId();

  const amount = parseFloat(formData.get("amount") as string) || 0;
  const statusStr = formData.get("status") as string;
  const status = statusStr ? parseInt(statusStr) : TRANSACTION_STATUS.UNPAID;

  // If marked as paid on creation, set paid = amount, balance = 0
  const isPaid = status === TRANSACTION_STATUS.PAID;

  const transaction = await prisma.transaction.create({
    data: {
      userId,
      category: formData.get("category") as string,
      amount,
      date: new Date(formData.get("date") as string),
      details: (formData.get("details") as string) || null,
      note: (formData.get("note") as string) || null,
      propertyId: (formData.get("propertyId") as string) || null,
      unitId: (formData.get("unitId") as string) || null,
      contactId: (formData.get("contactId") as string) || null,
      paymentMethod: (formData.get("paymentMethod") as string) || null,
      status,
      paid: isPaid ? amount : 0,
      balance: isPaid ? 0 : amount,
      paidAt: isPaid ? new Date() : null,
    },
  });

  revalidatePath("/transactions");
  redirect(`/transactions/${transaction.id}?toast=Transaction+created`);
}

export async function updateTransaction(id: string, formData: FormData) {
  const userId = await getUserId();

  const amount = parseFloat(formData.get("amount") as string) || 0;

  // Get current transaction to preserve payment state
  const current = await prisma.transaction.findUniqueOrThrow({
    where: { id, userId },
  });

  // Recalculate balance if amount changed (use cents to avoid floating point)
  const paidCents = toCents(Number(current.paid));
  const amountCents = toCents(amount);
  const newBalanceCents = Math.max(0, amountCents - paidCents);
  let newStatus = current.status;

  // Update status based on new amount vs existing payments
  if (current.status <= 2) {
    if (paidCents >= amountCents && amountCents > 0) {
      newStatus = TRANSACTION_STATUS.PAID;
    } else if (paidCents > 0) {
      newStatus = TRANSACTION_STATUS.PARTIAL;
    } else {
      newStatus = TRANSACTION_STATUS.UNPAID;
    }
  }

  await prisma.transaction.update({
    where: { id, userId },
    data: {
      category: formData.get("category") as string,
      amount,
      date: new Date(formData.get("date") as string),
      details: (formData.get("details") as string) || null,
      note: (formData.get("note") as string) || null,
      propertyId: (formData.get("propertyId") as string) || null,
      unitId: (formData.get("unitId") as string) || null,
      contactId: (formData.get("contactId") as string) || null,
      paymentMethod: (formData.get("paymentMethod") as string) || null,
      balance: fromCents(newBalanceCents),
      status: newStatus,
    },
  });

  revalidatePath(`/transactions/${id}`);
  revalidatePath("/transactions");
  redirect(`/transactions/${id}?toast=Transaction+updated`);
}

export async function recordPayment(id: string, paymentAmount: number, paymentMethod?: string) {
  const userId = await getUserId();

  const transaction = await prisma.transaction.findUniqueOrThrow({
    where: { id, userId },
  });

  if (transaction.status >= 4) {
    throw new Error("Cannot record payment on waived or voided transaction");
  }

  const currentPaidCents = toCents(Number(transaction.paid));
  const totalAmountCents = toCents(Number(transaction.amount));
  const paymentCents = toCents(paymentAmount);
  const newPaidCents = Math.min(currentPaidCents + paymentCents, totalAmountCents);
  const newBalanceCents = Math.max(0, totalAmountCents - newPaidCents);
  const isFullyPaid = newBalanceCents === 0;

  await prisma.transaction.update({
    where: { id, userId },
    data: {
      paid: fromCents(newPaidCents),
      balance: fromCents(newBalanceCents),
      status: isFullyPaid ? TRANSACTION_STATUS.PAID : TRANSACTION_STATUS.PARTIAL,
      paidAt: isFullyPaid ? new Date() : transaction.paidAt,
      paymentMethod: paymentMethod || transaction.paymentMethod,
    },
  });

  revalidatePath(`/transactions/${id}`);
  revalidatePath("/transactions");
}

export async function markAsPaid(id: string) {
  const userId = await getUserId();

  const transaction = await prisma.transaction.findUniqueOrThrow({
    where: { id, userId },
  });

  await prisma.transaction.update({
    where: { id, userId },
    data: {
      paid: transaction.amount,
      balance: 0,
      status: TRANSACTION_STATUS.PAID,
      paidAt: new Date(),
    },
  });

  revalidatePath(`/transactions/${id}`);
  revalidatePath("/transactions");
}

export async function markAsPending(id: string) {
  const userId = await getUserId();

  await prisma.transaction.update({
    where: { id, userId },
    data: {
      status: TRANSACTION_STATUS.PENDING,
    },
  });

  revalidatePath(`/transactions/${id}`);
  revalidatePath("/transactions");
}

export async function waiveTransaction(id: string) {
  const userId = await getUserId();

  const transaction = await prisma.transaction.findUniqueOrThrow({
    where: { id, userId },
  });

  await prisma.transaction.update({
    where: { id, userId },
    data: {
      status: TRANSACTION_STATUS.WAIVED,
      balance: 0,
    },
  });

  revalidatePath(`/transactions/${id}`);
  revalidatePath("/transactions");
}

export async function voidTransaction(id: string) {
  const userId = await getUserId();

  await prisma.transaction.update({
    where: { id, userId },
    data: {
      status: TRANSACTION_STATUS.VOIDED,
      balance: 0,
    },
  });

  revalidatePath(`/transactions/${id}`);
  revalidatePath("/transactions");
}

export async function deleteTransaction(id: string) {
  const userId = await getUserId();

  await prisma.transaction.delete({
    where: { id, userId },
  });

  revalidatePath("/transactions");
  redirect("/transactions?toast=Transaction+deleted");
}
