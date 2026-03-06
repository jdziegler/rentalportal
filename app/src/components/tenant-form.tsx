"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface TenantFormProps {
  action: (formData: FormData) => void;
  defaultValues?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    notes?: string;
  };
  submitLabel: string;
}

export function TenantForm({
  action,
  defaultValues,
  submitLabel,
}: TenantFormProps) {
  return (
    <form action={action} className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            name="firstName"
            required
            defaultValue={defaultValues?.firstName}
            placeholder="John"
          />
        </div>

        <div>
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            id="lastName"
            name="lastName"
            required
            defaultValue={defaultValues?.lastName}
            placeholder="Doe"
          />
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={defaultValues?.email || ""}
            placeholder="john@example.com"
          />
        </div>

        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={defaultValues?.phone || ""}
            placeholder="(555) 123-4567"
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="address">Street Address</Label>
          <Input
            id="address"
            name="address"
            defaultValue={defaultValues?.address || ""}
            placeholder="123 Main St"
          />
        </div>

        <div>
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            name="city"
            defaultValue={defaultValues?.city || ""}
          />
        </div>

        <div>
          <Label htmlFor="state">State</Label>
          <Input
            id="state"
            name="state"
            defaultValue={defaultValues?.state || ""}
          />
        </div>

        <div>
          <Label htmlFor="zip">ZIP</Label>
          <Input
            id="zip"
            name="zip"
            defaultValue={defaultValues?.zip || ""}
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            name="notes"
            defaultValue={defaultValues?.notes || ""}
            placeholder="Additional notes about this tenant..."
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
