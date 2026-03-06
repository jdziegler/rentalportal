"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ListingFormProps {
  action: (formData: FormData) => void;
  defaultValues?: {
    unitId?: string;
    description?: string;
    price?: number;
    isActive?: boolean;
  };
  submitLabel: string;
  units: {
    id: string;
    name: string;
    propertyName: string;
    price: number | null;
  }[];
}

export function ListingForm({
  action,
  defaultValues,
  submitLabel,
  units,
}: ListingFormProps) {
  return (
    <form action={action} className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label htmlFor="unitId">Unit *</Label>
          <Select name="unitId" defaultValue={defaultValues?.unitId} required>
            <SelectTrigger>
              <SelectValue placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent>
              {units.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.propertyName} — {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="price">Price ($/month) *</Label>
          <Input
            id="price"
            name="price"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={defaultValues?.price ?? ""}
            placeholder="1500.00"
          />
        </div>

        <div className="flex items-end pb-1">
          <div className="flex items-center gap-2">
            <Checkbox
              id="isActive"
              name="isActive"
              defaultChecked={defaultValues?.isActive ?? true}
            />
            <Label htmlFor="isActive" className="cursor-pointer">
              Active listing
            </Label>
          </div>
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            defaultValue={defaultValues?.description || ""}
            placeholder="Describe the rental unit, amenities, policies..."
            rows={5}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
