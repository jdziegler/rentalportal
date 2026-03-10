"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LeaseFormProps {
  action: (formData: FormData) => void;
  defaultValues?: {
    unitId?: string;
    contactId?: string;
    leaseType?: string;
    rentAmount?: number;
    rentDueDay?: number;
    gracePeriod?: number;
    startDate?: string;
    endDate?: string;
    deposit?: number;
    name?: string;
    lateFeeEnabled?: boolean;
    lateFeeType?: string;
    lateFeeAmount?: number;
    lateFeeAccrual?: string;
    lateFeeMaxAmount?: number | null;
  };
  submitLabel: string;
  units: { id: string; name: string; propertyName: string }[];
  tenants: { id: string; firstName: string; lastName: string }[];
}

export function LeaseForm({
  action,
  defaultValues,
  submitLabel,
  units,
  tenants,
}: LeaseFormProps) {
  return (
    <form action={action} className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label htmlFor="name">Lease Label</Label>
          <Input
            id="name"
            name="name"
            defaultValue={defaultValues?.name || ""}
            placeholder="e.g. Apt 4B - 2024 Lease"
          />
        </div>

        <div>
          <Label htmlFor="unitId">Unit *</Label>
          <Select
            name="unitId"
            defaultValue={defaultValues?.unitId}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a unit" />
            </SelectTrigger>
            <SelectContent>
              {units.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.propertyName} - {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="contactId">Tenant *</Label>
          <Select
            name="contactId"
            defaultValue={defaultValues?.contactId}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a tenant" />
            </SelectTrigger>
            <SelectContent>
              {tenants.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.firstName} {t.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="leaseType">Lease Type</Label>
          <Select
            name="leaseType"
            defaultValue={defaultValues?.leaseType ?? "FIXED"}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FIXED">Fixed</SelectItem>
              <SelectItem value="MONTH_TO_MONTH">Month-to-Month</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="rentAmount">Rent Amount *</Label>
          <Input
            id="rentAmount"
            name="rentAmount"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={defaultValues?.rentAmount ?? ""}
            placeholder="0.00"
          />
        </div>

        <div>
          <Label htmlFor="rentDueDay">Rent Due Day</Label>
          <Select
            name="rentDueDay"
            defaultValue={String(defaultValues?.rentDueDay ?? 1)}
          >
            <SelectTrigger>
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

        <div>
          <Label htmlFor="gracePeriod">Grace Period (days)</Label>
          <Input
            id="gracePeriod"
            name="gracePeriod"
            type="number"
            min="0"
            max="30"
            defaultValue={defaultValues?.gracePeriod ?? 5}
          />
        </div>

        <div>
          <Label htmlFor="deposit">Security Deposit</Label>
          <Input
            id="deposit"
            name="deposit"
            type="number"
            step="0.01"
            min="0"
            defaultValue={defaultValues?.deposit ?? ""}
            placeholder="0.00"
          />
        </div>

        <div>
          <Label htmlFor="startDate">Start Date *</Label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            required
            defaultValue={defaultValues?.startDate || ""}
          />
        </div>

        <div>
          <Label htmlFor="endDate">End Date</Label>
          <Input
            id="endDate"
            name="endDate"
            type="date"
            defaultValue={defaultValues?.endDate || ""}
          />
        </div>
      </div>

      {/* Late Fee Configuration */}
      <div className="border-t pt-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Late Fee Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2 flex items-center gap-2">
            <input
              type="checkbox"
              id="lateFeeEnabled"
              name="lateFeeEnabled"
              defaultChecked={defaultValues?.lateFeeEnabled ?? false}
              className="rounded border-gray-300"
            />
            <Label htmlFor="lateFeeEnabled">Enable automatic late fees</Label>
          </div>

          <div>
            <Label htmlFor="lateFeeType">Fee Type</Label>
            <Select
              name="lateFeeType"
              defaultValue={defaultValues?.lateFeeType ?? "flat"}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="flat">Flat Amount ($)</SelectItem>
                <SelectItem value="percentage">Percentage of Rent (%)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="lateFeeAmount">Fee Amount</Label>
            <Input
              id="lateFeeAmount"
              name="lateFeeAmount"
              type="number"
              step="0.01"
              min="0"
              defaultValue={defaultValues?.lateFeeAmount ?? ""}
              placeholder="e.g. 50.00 or 5"
            />
          </div>

          <div>
            <Label htmlFor="lateFeeAccrual">Accrual Type</Label>
            <Select
              name="lateFeeAccrual"
              defaultValue={defaultValues?.lateFeeAccrual ?? "one_time"}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="one_time">One-time</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="lateFeeMaxAmount">Max Late Fee (daily cap)</Label>
            <Input
              id="lateFeeMaxAmount"
              name="lateFeeMaxAmount"
              type="number"
              step="0.01"
              min="0"
              defaultValue={defaultValues?.lateFeeMaxAmount ?? ""}
              placeholder="Optional max cap"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
