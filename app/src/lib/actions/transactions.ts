"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { TRANSACTION_STATUS } from "@/lib/transaction-status";
import { recalcTransactionFromPayments } from "@/lib/payment-helpers";

async function getUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

export async function createTransaction(formData: FormData) {
  const userId = await getUserId();

  const amount = parseFloat(formData.get("amount") as string) || 0;
  const statusStr = formData.get("status") as string;
  const status = statusStr || TRANSACTION_STATUS.UNPAID;

  const isPaid = status === TRANSACTION_STATUS.PAID;

  const transaction = await prisma.transaction.create({
    data: {
      userId,
      category: formData.get("category") as string,
      subcategory: (formData.get("subcategory") as string) || null,
      amount,
      date: new Date(formData.get("date") as string),
      details: (formData.get("details") as string) || null,
      note: (formData.get("note") as string) || null,
      propertyId: (formData.get("propertyId") as string) || null,
      unitId: (formData.get("unitId") as string) || null,
      contactId: (formData.get("contactId") as string) || null,
      paymentMethod: (formData.get("paymentMethod") as string) || null,
      status,
      paidAmount: isPaid ? amount : 0,
      balance: isPaid ? 0 : amount,
      paidAt: isPaid ? new Date() : null,
    },
  });

  // If created as paid, also create a Payment record
  if (isPaid) {
    await prisma.payment.create({
      data: {
        transactionId: transaction.id,
        amount,
        date: new Date(),
        method: (formData.get("paymentMethod") as string) || null,
        note: "Initial payment on creation",
      },
    });
  }

  revalidatePath("/transactions");
  redirect(`/transactions/${transaction.id}?toast=Transaction+created`);
}

export async function updateTransaction(id: string, formData: FormData) {
  const userId = await getUserId();

  const amount = parseFloat(formData.get("amount") as string) || 0;

  await prisma.transaction.update({
    where: { id, userId },
    data: {
      category: formData.get("category") as string,
      subcategory: (formData.get("subcategory") as string) || null,
      amount,
      date: new Date(formData.get("date") as string),
      details: (formData.get("details") as string) || null,
      note: (formData.get("note") as string) || null,
      propertyId: (formData.get("propertyId") as string) || null,
      unitId: (formData.get("unitId") as string) || null,
      contactId: (formData.get("contactId") as string) || null,
      paymentMethod: (formData.get("paymentMethod") as string) || null,
    },
  });

  // Recalc from payments since amount may have changed
  await recalcTransactionFromPayments(id);

  revalidatePath(`/transactions/${id}`);
  revalidatePath("/transactions");
  redirect(`/transactions/${id}?toast=Transaction+updated`);
}

export async function recordPayment(
  id: string,
  paymentAmount: number,
  paymentMethod?: string,
  paymentNote?: string,
) {
  const userId = await getUserId();

  const transaction = await prisma.transaction.findUniqueOrThrow({
    where: { id, userId },
  });

  if (transaction.status === TRANSACTION_STATUS.WAIVED || transaction.status === TRANSACTION_STATUS.VOIDED) {
    throw new Error("Cannot record payment on waived or voided transaction");
  }

  // Create the Payment record
  await prisma.payment.create({
    data: {
      transactionId: id,
      amount: paymentAmount,
      date: new Date(),
      method: paymentMethod || null,
      note: paymentNote || null,
    },
  });

  // Recalc cached fields from all payments
  await recalcTransactionFromPayments(id);

  revalidatePath(`/transactions/${id}`);
  revalidatePath("/transactions");
}

export async function markAsPaid(id: string) {
  const userId = await getUserId();

  const transaction = await prisma.transaction.findUniqueOrThrow({
    where: { id, userId },
    include: { payments: { select: { amount: true, type: true } } },
  });

  // Calculate remaining balance
  const totalPaid = transaction.payments
    .filter((p) => p.type === "payment")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const remaining = Number(transaction.amount) - totalPaid;

  if (remaining > 0) {
    // Create a payment for the remaining balance
    await prisma.payment.create({
      data: {
        transactionId: id,
        amount: remaining,
        date: new Date(),
        note: "Marked as paid",
      },
    });
  }

  await recalcTransactionFromPayments(id);

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

export async function deletePayment(paymentId: string, transactionId: string) {
  const userId = await getUserId();

  // Verify transaction belongs to user
  await prisma.transaction.findUniqueOrThrow({
    where: { id: transactionId, userId },
  });

  await prisma.payment.delete({
    where: { id: paymentId },
  });

  await recalcTransactionFromPayments(transactionId);

  revalidatePath(`/transactions/${transactionId}`);
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
