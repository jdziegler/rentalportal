"use client";

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

interface PropertyFormProps {
  action: (formData: FormData) => void;
  defaultValues?: {
    name?: string;
    type?: number;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    county?: string;
    country?: string;
    year?: string;
    description?: string;
  };
  submitLabel: string;
}

export function PropertyForm({
  action,
  defaultValues,
  submitLabel,
}: PropertyFormProps) {
  return (
    <form action={action} className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label htmlFor="name">Property Name *</Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={defaultValues?.name}
            placeholder="e.g. Sunset Apartments"
          />
        </div>

        <div>
          <Label htmlFor="type">Property Type</Label>
          <Select
            name="type"
            defaultValue={String(defaultValues?.type ?? 2)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Single Family</SelectItem>
              <SelectItem value="2">Multi-Family</SelectItem>
              <SelectItem value="3">Commercial</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="year">Year Built</Label>
          <Input
            id="year"
            name="year"
            defaultValue={defaultValues?.year || ""}
            placeholder="e.g. 2005"
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="address">Street Address *</Label>
          <Input
            id="address"
            name="address"
            required
            defaultValue={defaultValues?.address}
            placeholder="123 Main St"
          />
        </div>

        <div>
          <Label htmlFor="city">City *</Label>
          <Input
            id="city"
            name="city"
            required
            defaultValue={defaultValues?.city}
          />
        </div>

        <div>
          <Label htmlFor="state">State *</Label>
          <Input
            id="state"
            name="state"
            required
            defaultValue={defaultValues?.state}
          />
        </div>

        <div>
          <Label htmlFor="zip">ZIP *</Label>
          <Input
            id="zip"
            name="zip"
            required
            defaultValue={defaultValues?.zip}
          />
        </div>

        <div>
          <Label htmlFor="county">County</Label>
          <Input
            id="county"
            name="county"
            defaultValue={defaultValues?.county || ""}
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            defaultValue={defaultValues?.description || ""}
            placeholder="Notes about this property..."
            rows={3}
          />
        </div>
      </div>

      <input type="hidden" name="country" value={defaultValues?.country || "US"} />

      <div className="flex gap-3">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
