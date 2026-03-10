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

interface UnitFormProps {
  action: (formData: FormData) => void;
  defaultValues?: {
    name?: string;
    propertyId?: string;
    type?: string;
    bedrooms?: number | null;
    bathrooms?: number | null;
    size?: number | null;
    price?: number | string | null;
    deposit?: number | string | null;
    description?: string;
    petsAllowed?: boolean;
  };
  submitLabel: string;
  properties: { id: string; name: string }[];
}

export function UnitForm({
  action,
  defaultValues,
  submitLabel,
  properties,
}: UnitFormProps) {
  return (
    <form action={action} className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="propertyId">Property *</Label>
          <Select
            name="propertyId"
            defaultValue={defaultValues?.propertyId || ""}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a property" />
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
          <Label htmlFor="name">Unit Name *</Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={defaultValues?.name}
            placeholder="e.g. Unit 101"
          />
        </div>

        <div>
          <Label htmlFor="type">Unit Type</Label>
          <Select
            name="type"
            defaultValue={defaultValues?.type ?? "APARTMENT"}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="APARTMENT">Apartment</SelectItem>
              <SelectItem value="HOUSE">House</SelectItem>
              <SelectItem value="ROOM">Room</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="bedrooms">Bedrooms</Label>
          <Input
            id="bedrooms"
            name="bedrooms"
            type="number"
            min={0}
            defaultValue={defaultValues?.bedrooms ?? ""}
            placeholder="e.g. 2"
          />
        </div>

        <div>
          <Label htmlFor="bathrooms">Bathrooms</Label>
          <Input
            id="bathrooms"
            name="bathrooms"
            type="number"
            min={0}
            defaultValue={defaultValues?.bathrooms ?? ""}
            placeholder="e.g. 1"
          />
        </div>

        <div>
          <Label htmlFor="size">Size (sqft)</Label>
          <Input
            id="size"
            name="size"
            type="number"
            min={0}
            defaultValue={defaultValues?.size ?? ""}
            placeholder="e.g. 850"
          />
        </div>

        <div>
          <Label htmlFor="price">Monthly Rent ($)</Label>
          <Input
            id="price"
            name="price"
            type="number"
            step="0.01"
            min={0}
            defaultValue={defaultValues?.price ?? ""}
            placeholder="e.g. 1200.00"
          />
        </div>

        <div>
          <Label htmlFor="deposit">Deposit ($)</Label>
          <Input
            id="deposit"
            name="deposit"
            type="number"
            step="0.01"
            min={0}
            defaultValue={defaultValues?.deposit ?? ""}
            placeholder="e.g. 1200.00"
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            defaultValue={defaultValues?.description || ""}
            placeholder="Notes about this unit..."
            rows={3}
          />
        </div>

        <div className="md:col-span-2 flex items-center gap-2">
          <Checkbox
            id="petsAllowed"
            name="petsAllowed"
            defaultChecked={defaultValues?.petsAllowed ?? false}
          />
          <Label htmlFor="petsAllowed" className="cursor-pointer">
            Pets Allowed
          </Label>
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
