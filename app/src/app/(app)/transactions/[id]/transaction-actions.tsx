"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  recordPayment,
  markAsPaid,
  markAsPending,
  waiveTransaction,
  voidTransaction,
} from "@/lib/actions/transactions";
import { TRANSACTION_STATUS } from "@/lib/transaction-status";

interface TransactionActionsProps {
  id: string;
  status: number;
  amount: number;
  paid: number;
  balance: number;
}

export function TransactionActions({
  id,
  status,
  amount,
  paid,
  balance,
}: TransactionActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentNote, setPaymentNote] = useState("");

  const canRecordPayment = status < TRANSACTION_STATUS.PAID && balance > 0;
  const canMarkPaid = status < TRANSACTION_STATUS.PAID;
  const canMarkPending = status <= TRANSACTION_STATUS.PAID;
  const canWaive = status < TRANSACTION_STATUS.WAIVED;
  const canVoid = status < TRANSACTION_STATUS.VOIDED;

  function handleAction(action: () => Promise<void>) {
    startTransition(async () => {
      await action();
      router.refresh();
    });
  }

  function handleRecordPayment() {
    const amt = parseFloat(paymentAmount);
    if (!amt || amt <= 0) return;
    startTransition(async () => {
      await recordPayment(id, amt, paymentMethod || undefined, paymentNote || undefined);
      setShowPaymentDialog(false);
      setPaymentAmount("");
      setPaymentMethod("");
      setPaymentNote("");
      router.refresh();
    });
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>

      {/* Payment progress bar */}
      {amount > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>${paid.toFixed(2)} paid</span>
            <span>${amount.toFixed(2)} total</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{ width: `${Math.min(100, (paid / amount) * 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {canRecordPayment && (
          <Button
            onClick={() => {
              setPaymentAmount(balance.toFixed(2));
              setShowPaymentDialog(true);
            }}
            disabled={isPending}
          >
            Record Payment
          </Button>
        )}

        {canMarkPaid && (
          <Button
            variant="outline"
            onClick={() => handleAction(() => markAsPaid(id))}
            disabled={isPending}
          >
            Mark as Paid
          </Button>
        )}

        {canMarkPending && status !== TRANSACTION_STATUS.PENDING && (
          <Button
            variant="outline"
            onClick={() => handleAction(() => markAsPending(id))}
            disabled={isPending}
          >
            Mark as Pending
          </Button>
        )}

        {canWaive && (
          <Button
            variant="outline"
            onClick={() => handleAction(() => waiveTransaction(id))}
            disabled={isPending}
          >
            Waive
          </Button>
        )}

        {canVoid && (
          <Button
            variant="outline"
            className="text-red-600 hover:text-red-700"
            onClick={() => handleAction(() => voidTransaction(id))}
            disabled={isPending}
          >
            Void
          </Button>
        )}
      </div>

      {/* Record Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-sm text-gray-600">
              Balance remaining: <span className="font-medium text-gray-900">${balance.toFixed(2)}</span>
            </div>
            <div>
              <Label htmlFor="paymentAmount">Payment Amount</Label>
              <Input
                id="paymentAmount"
                type="number"
                step="0.01"
                min="0.01"
                max={balance}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="ach">ACH</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="paymentNote">Note (optional)</Label>
              <Textarea
                id="paymentNote"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="e.g. Check #1234, Venmo reference..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRecordPayment} disabled={isPending}>
              {isPending ? "Processing..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
