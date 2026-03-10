import { prisma } from "@/lib/db";
import { TRANSACTION_STATUS } from "@/lib/transaction-status";

function toCents(value: number): number {
  return Math.round(value * 100);
}

function fromCents(cents: number): number {
  return cents / 100;
}

/**
 * Recalculates paidAmount/balance/status on a transaction from its Payment records.
 * This is the single source of truth — call after any payment create/delete.
 */
export async function recalcTransactionFromPayments(transactionId: string) {
  const transaction = await prisma.transaction.findUniqueOrThrow({
    where: { id: transactionId },
    include: {
      payments: {
        select: { amount: true, type: true },
      },
    },
  });

  const totalAmountCents = toCents(Number(transaction.amount));

  const totalPaidCents = transaction.payments
    .filter((p) => p.type === "payment")
    .reduce((sum, p) => sum + toCents(Number(p.amount)), 0);

  const totalRefundedCents = transaction.payments
    .filter((p) => p.type === "refund")
    .reduce((sum, p) => sum + toCents(Number(p.amount)), 0);

  const netPaidCents = Math.max(0, totalPaidCents - totalRefundedCents);
  const balanceCents = Math.max(0, totalAmountCents - netPaidCents);
  const isFullyPaid = balanceCents === 0 && totalAmountCents > 0;
  const isPartial = netPaidCents > 0 && !isFullyPaid;

  // Only update status if it's in a payment-related state (not waived/voided)
  const currentStatus = transaction.status;
  let newStatus = currentStatus;
  if (["UNPAID", "PAID", "PARTIAL", "PENDING"].includes(currentStatus)) {
    if (isFullyPaid) {
      newStatus = TRANSACTION_STATUS.PAID;
    } else if (isPartial) {
      newStatus = TRANSACTION_STATUS.PARTIAL;
    } else {
      newStatus = TRANSACTION_STATUS.UNPAID;
    }
  }

  // Find the most recent payment date for paidAt
  const lastPayment = isFullyPaid
    ? await prisma.payment.findFirst({
        where: { transactionId, type: "payment" },
        orderBy: { date: "desc" },
        select: { date: true },
      })
    : null;

  await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      paidAmount: fromCents(netPaidCents),
      balance: fromCents(balanceCents),
      status: newStatus,
      paidAt: isFullyPaid ? (lastPayment?.date ?? new Date()) : null,
    },
  });
}
