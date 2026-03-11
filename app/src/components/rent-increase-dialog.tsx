"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { scheduleRentIncrease } from "@/lib/actions/rent-increases";

interface RentIncreaseDialogProps {
  leaseId: string;
  currentRent: number;
  tenantName: string;
  unitLabel: string;
}

export function RentIncreaseDialog({
  leaseId,
  currentRent,
  tenantName,
  unitLabel,
}: RentIncreaseDialogProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newRent, setNewRent] = useState(currentRent);

  const diff = newRent - currentRent;
  const pct = currentRent > 0 ? ((diff / currentRent) * 100).toFixed(1) : "0";

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    try {
      await scheduleRentIncrease(leaseId, formData);
      setOpen(false);
    } catch {
      // handled by server
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Rent Increase</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Rent Increase</DialogTitle>
          <DialogDescription>
            {unitLabel} &mdash; {tenantName}
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Current Rent */}
            <div>
              <Label className="text-gray-500">Current Rent</Label>
              <p className="text-lg font-semibold">${currentRent.toFixed(2)}/mo</p>
            </div>

            {/* New Rent */}
            <div>
              <Label htmlFor="ri-newRent">New Rent Amount *</Label>
              <Input
                id="ri-newRent"
                name="newRent"
                type="number"
                step="0.01"
                min="0"
                required
                defaultValue={currentRent}
                onChange={(e) => setNewRent(parseFloat(e.target.value) || 0)}
              />
              {diff !== 0 && (
                <p className={`text-xs mt-1 ${diff > 0 ? "text-red-600" : "text-green-600"}`}>
                  {diff > 0 ? "+" : ""}{diff.toFixed(2)} ({diff > 0 ? "+" : ""}{pct}%)
                </p>
              )}
            </div>

            {/* Effective Date */}
            <div>
              <Label htmlFor="ri-effectiveDate">Effective Date *</Label>
              <Input
                id="ri-effectiveDate"
                name="effectiveDate"
                type="date"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                The date the new rent takes effect
              </p>
            </div>

            {/* Notice Date */}
            <div>
              <Label htmlFor="ri-noticeDate">Notice Given Date</Label>
              <Input
                id="ri-noticeDate"
                name="noticeDate"
                type="date"
                defaultValue={new Date().toISOString().split("T")[0]}
              />
              <p className="text-xs text-gray-500 mt-1">
                When the tenant was notified (for your records)
              </p>
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="ri-notes">Notes</Label>
              <Textarea
                id="ri-notes"
                name="notes"
                rows={2}
                placeholder="Reason for increase, reference to notice letter..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Scheduling..." : "Schedule Increase"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
