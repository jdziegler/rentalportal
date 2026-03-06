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

interface MaintenanceFormProps {
  action: (formData: FormData) => void;
  defaultValues?: {
    title?: string;
    description?: string;
    priority?: number;
    category?: string;
    propertyId?: string;
    unitId?: string;
    contactId?: string;
  };
  submitLabel: string;
  properties: { id: string; name: string }[];
  units: { id: string; name: string; propertyId: string }[];
  tenants: { id: string; firstName: string; lastName: string }[];
}

const categories = [
  "plumbing",
  "electrical",
  "hvac",
  "appliance",
  "structural",
  "pest_control",
  "landscaping",
  "general",
];

export function MaintenanceForm({
  action,
  defaultValues,
  submitLabel,
  properties,
  units,
  tenants,
}: MaintenanceFormProps) {
  return (
    <form action={action} className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            name="title"
            required
            defaultValue={defaultValues?.title}
            placeholder="e.g. Leaking faucet in kitchen"
          />
        </div>

        <div>
          <Label htmlFor="propertyId">Property *</Label>
          <Select
            name="propertyId"
            defaultValue={defaultValues?.propertyId}
            required
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
          <Label htmlFor="unitId">Unit</Label>
          <Select name="unitId" defaultValue={defaultValues?.unitId || ""}>
            <SelectTrigger>
              <SelectValue placeholder="Select unit (optional)" />
            </SelectTrigger>
            <SelectContent>
              {units.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="priority">Priority</Label>
          <Select
            name="priority"
            defaultValue={String(defaultValues?.priority ?? 1)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Low</SelectItem>
              <SelectItem value="1">Medium</SelectItem>
              <SelectItem value="2">High</SelectItem>
              <SelectItem value="3">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="category">Category</Label>
          <Select
            name="category"
            defaultValue={defaultValues?.category || "general"}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1).replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="contactId">Reported By</Label>
          <Select
            name="contactId"
            defaultValue={defaultValues?.contactId || ""}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select tenant (optional)" />
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
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            defaultValue={defaultValues?.description || ""}
            placeholder="Describe the issue..."
            rows={4}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
