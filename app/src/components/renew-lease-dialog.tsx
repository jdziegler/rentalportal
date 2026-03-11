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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { renewLease } from "@/lib/actions/leases";

interface RenewLeaseDialogProps {
  leaseId: string;
  currentValues: {
    leaseType: string;
    rentAmount: number;
    rentDueDay: number;
    gracePeriod: number;
    startDate: string;
    endDate: string | null;
    deposit: number | null;
    lateFeeEnabled: boolean;
    lateFeeType: string;
    lateFeeAmount: number;
    lateFeeAccrual: string;
    lateFeeMaxAmount: number | null;
    notes: string | null;
  };
  tenantName: string;
  unitLabel: string;
}

export function RenewLeaseDialog({
  leaseId,
  currentValues,
  tenantName,
  unitLabel,
}: RenewLeaseDialogProps) {
  const [open, setOpen] = useState(false);
  const [leaseType, setLeaseType] = useState(currentValues.leaseType);
  const [submitting, setSubmitting] = useState(false);

  // Calculate default new dates
  const oldEnd = currentValues.endDate;
  const defaultNewStart = oldEnd || new Date().toISOString().split("T")[0];
  const defaultNewEnd = oldEnd
    ? (() => {
        const d = new Date(oldEnd);
        d.setFullYear(d.getFullYear() + 1);
        return d.toISOString().split("T")[0];
      })()
    : "";

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    try {
      await renewLease(leaseId, formData);
    } catch {
      // redirect throws in server actions — that's expected
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Renew</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Renew Lease</DialogTitle>
          <DialogDescription>
            {unitLabel} &mdash; {tenantName}. Update terms for the renewed lease.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            {/* Lease Type */}
            <div>
              <Label htmlFor="renewal-leaseType">Lease Type</Label>
              <Select
                name="leaseType"
                defaultValue={currentValues.leaseType}
                onValueChange={setLeaseType}
              >
                <SelectTrigger id="renewal-leaseType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIXED">Fixed Term</SelectItem>
                  <SelectItem value="MONTH_TO_MONTH">Month-to-Month</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Rent Amount */}
            <div>
              <Label htmlFor="renewal-rentAmount">Rent Amount *</Label>
              <Input
                id="renewal-rentAmount"
                name="rentAmount"
                type="number"
                step="0.01"
                min="0"
                required
                defaultValue={currentValues.rentAmount}
              />
              <p className="text-xs text-gray-500 mt-1">
                Current: ${currentValues.rentAmount.toFixed(2)}
              </p>
            </div>

            {/* Start Date */}
            <div>
              <Label htmlFor="renewal-startDate">New Start Date *</Label>
              <Input
                id="renewal-startDate"
                name="startDate"
                type="date"
                required
                defaultValue={defaultNewStart}
              />
            </div>

            {/* End Date */}
            <div>
              <Label htmlFor="renewal-endDate">
                New End Date {leaseType === "MONTH_TO_MONTH" ? "(optional)" : "*"}
              </Label>
              <Input
                id="renewal-endDate"
                name="endDate"
                type="date"
                defaultValue={leaseType === "MONTH_TO_MONTH" ? "" : defaultNewEnd}
                required={leaseType === "FIXED"}
              />
            </div>

            {/* Rent Due Day */}
            <div>
              <Label htmlFor="renewal-rentDueDay">Rent Due Day</Label>
              <Select
                name="rentDueDay"
                defaultValue={String(currentValues.rentDueDay)}
              >
                <SelectTrigger id="renewal-rentDueDay">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={String(day)}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Grace Period */}
            <div>
              <Label htmlFor="renewal-gracePeriod">Grace Period (days)</Label>
              <Input
                id="renewal-gracePeriod"
                name="gracePeriod"
                type="number"
                min="0"
                max="30"
                defaultValue={currentValues.gracePeriod}
              />
            </div>

            {/* Security Deposit */}
            <div className="sm:col-span-2">
              <Label htmlFor="renewal-deposit">Security Deposit</Label>
              <Input
                id="renewal-deposit"
                name="deposit"
                type="number"
                step="0.01"
                min="0"
                defaultValue={currentValues.deposit ?? ""}
                placeholder="0.00"
              />
              {currentValues.deposit != null && (
                <p className="text-xs text-gray-500 mt-1">
                  Current deposit: ${currentValues.deposit.toFixed(2)}. Adjust for any additional deposit collected at renewal.
                </p>
              )}
            </div>

            {/* Notes */}
            <div className="sm:col-span-2">
              <Label htmlFor="renewal-notes">Renewal Notes</Label>
              <Textarea
                id="renewal-notes"
                name="notes"
                rows={3}
                defaultValue={currentValues.notes ?? ""}
                placeholder="Any changes, agreements, or special terms for this renewal..."
              />
            </div>
          </div>

          {/* Late Fee Section */}
          <div className="border-t pt-4 pb-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Late Fee Settings</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="renewal-lateFeeEnabled"
                  name="lateFeeEnabled"
                  defaultChecked={currentValues.lateFeeEnabled}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="renewal-lateFeeEnabled">Enable automatic late fees</Label>
              </div>

              <div>
                <Label htmlFor="renewal-lateFeeType">Fee Type</Label>
                <Select
                  name="lateFeeType"
                  defaultValue={currentValues.lateFeeType}
                >
                  <SelectTrigger id="renewal-lateFeeType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flat">Flat Amount ($)</SelectItem>
                    <SelectItem value="percentage">Percentage of Rent (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="renewal-lateFeeAmount">Fee Amount</Label>
                <Input
                  id="renewal-lateFeeAmount"
                  name="lateFeeAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={currentValues.lateFeeAmount}
                  placeholder="e.g. 50.00 or 5"
                />
              </div>

              <div>
                <Label htmlFor="renewal-lateFeeAccrual">Accrual Type</Label>
                <Select
                  name="lateFeeAccrual"
                  defaultValue={currentValues.lateFeeAccrual}
                >
                  <SelectTrigger id="renewal-lateFeeAccrual">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_time">One-time</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="renewal-lateFeeMaxAmount">Max Late Fee (daily cap)</Label>
                <Input
                  id="renewal-lateFeeMaxAmount"
                  name="lateFeeMaxAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={currentValues.lateFeeMaxAmount ?? ""}
                  placeholder="Optional max cap"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Renewing..." : "Renew Lease"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
