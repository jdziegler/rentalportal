"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { deletePayment } from "@/lib/actions/transactions";
import { TRANSACTION_STATUS } from "@/lib/transaction-status";

interface PaymentRecord {
  id: string;
  amount: number;
  date: string;
  method: string | null;
  note: string | null;
  type: string;
  stripePaymentIntentId: string | null;
}

const methodLabels: Record<string, string> = {
  cash: "Cash",
  check: "Check",
  ach: "ACH",
  card: "Card",
  other: "Other",
};

export function PaymentHistory({
  payments,
  transactionId,
  transactionStatus,
}: {
  payments: PaymentRecord[];
  transactionId: string;
  transactionStatus: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<PaymentRecord | null>(null);

  const canDelete =
    transactionStatus < TRANSACTION_STATUS.WAIVED;

  function handleDelete(payment: PaymentRecord) {
    startTransition(async () => {
      await deletePayment(payment.id, transactionId);
      setDeleteTarget(null);
      router.refresh();
    });
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 pb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Payment History
        </h2>
      </div>

      {payments.length === 0 ? (
        <p className="px-6 pb-6 text-sm text-gray-500">
          No payments recorded yet.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-700">
            <tr>
              <th className="px-6 py-3 font-medium">Date</th>
              <th className="px-6 py-3 font-medium">Amount</th>
              <th className="px-6 py-3 font-medium">Method</th>
              <th className="px-6 py-3 font-medium">Note</th>
              {canDelete && (
                <th className="px-6 py-3 font-medium w-16"></th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {payments.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-6 py-3 text-gray-900">
                  {new Date(p.date).toLocaleDateString()}
                </td>
                <td className="px-6 py-3">
                  <span
                    className={`font-medium ${
                      p.type === "refund" ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {p.type === "refund" ? "-" : "+"}${p.amount.toFixed(2)}
                  </span>
                </td>
                <td className="px-6 py-3 text-gray-700">
                  {p.method ? methodLabels[p.method] || p.method : "—"}
                </td>
                <td className="px-6 py-3 text-gray-600 text-xs">
                  {p.note || "—"}
                  {p.stripePaymentIntentId && (
                    <span className="ml-1 text-blue-500" title={p.stripePaymentIntentId}>
                      (Stripe)
                    </span>
                  )}
                </td>
                {canDelete && (
                  <td className="px-6 py-3">
                    <Button
                      variant="ghost"
                      size="xs"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setDeleteTarget(p)}
                      disabled={isPending}
                    >
                      Remove
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Delete confirmation */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Payment</DialogTitle>
            <DialogDescription>
              Remove this ${deleteTarget?.amount.toFixed(2)} payment from{" "}
              {deleteTarget
                ? new Date(deleteTarget.date).toLocaleDateString()
                : ""}
              ? The transaction balance will be recalculated.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
              disabled={isPending}
            >
              {isPending ? "Removing..." : "Remove Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
