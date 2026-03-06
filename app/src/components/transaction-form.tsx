"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { getIncomeSubcategories, getExpenseSubcategories } from "@/lib/transaction-categories";

interface TransactionFormProps {
  action: (formData: FormData) => void;
  defaultValues?: {
    category?: string;
    subcategory?: string;
    amount?: string;
    date?: string;
    details?: string;
    note?: string;
    propertyId?: string;
    unitId?: string;
    contactId?: string;
    paymentMethod?: string;
    status?: string;
  };
  submitLabel: string;
  properties: { id: string; name: string }[];
  tenants: { id: string; firstName: string; lastName: string }[];
}

export function TransactionForm({
  action,
  defaultValues,
  submitLabel,
  properties,
  tenants,
}: TransactionFormProps) {
  const [category, setCategory] = useState(defaultValues?.category || "income");
  const subcats = category === "income" ? getIncomeSubcategories() : getExpenseSubcategories();

  return (
    <form action={action} className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="category">Category *</Label>
          <Select
            name="category"
            defaultValue={category}
            required
            onValueChange={setCategory}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="subcategory">Type</Label>
          <Select
            name="subcategory"
            defaultValue={defaultValues?.subcategory || ""}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {subcats.map(([key, val]) => (
                <SelectItem key={key} value={key}>
                  {val.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="amount">Amount *</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={defaultValues?.amount || ""}
            placeholder="0.00"
          />
        </div>

        <div>
          <Label htmlFor="date">Date *</Label>
          <Input
            id="date"
            name="date"
            type="date"
            required
            defaultValue={defaultValues?.date || ""}
          />
        </div>

        <div>
          <Label htmlFor="status">Status</Label>
          <Select
            name="status"
            defaultValue={defaultValues?.status || "0"}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Unpaid</SelectItem>
              <SelectItem value="2">Paid</SelectItem>
              <SelectItem value="3">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="paymentMethod">Payment Method</Label>
          <Select
            name="paymentMethod"
            defaultValue={defaultValues?.paymentMethod || ""}
          >
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

        <div className="md:col-span-2">
          <Label htmlFor="details">Details</Label>
          <Input
            id="details"
            name="details"
            defaultValue={defaultValues?.details || ""}
            placeholder="e.g. Monthly Rent, Repair Cost"
          />
        </div>

        <div>
          <Label htmlFor="propertyId">Property</Label>
          <Select
            name="propertyId"
            defaultValue={defaultValues?.propertyId || ""}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select property" />
            </SelectTrigger>
            <SelectContent>
              {properties.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="contactId">Tenant</Label>
          <Select
            name="contactId"
            defaultValue={defaultValues?.contactId || ""}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select tenant" />
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

        <div className="md:col-span-2">
          <Label htmlFor="note">Note</Label>
          <Textarea
            id="note"
            name="note"
            defaultValue={defaultValues?.note || ""}
            placeholder="Additional notes..."
            rows={3}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
