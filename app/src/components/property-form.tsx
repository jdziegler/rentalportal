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

interface PropertyFormProps {
  action: (formData: FormData) => void;
  defaultValues?: {
    name?: string;
    type?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    county?: string;
    country?: string;
    year?: string;
    description?: string;
    photoUrl?: string;
  };
  submitLabel: string;
}

export function PropertyForm({
  action,
  defaultValues,
  submitLabel,
}: PropertyFormProps) {
  const [photoUrl, setPhotoUrl] = useState(defaultValues?.photoUrl || "");
  const [uploading, setUploading] = useState(false);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (res.ok) {
        const { url } = await res.json();
        setPhotoUrl(url);
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={action} className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Photo Upload */}
        <div className="md:col-span-2">
          <Label>Property Photo</Label>
          <div className="mt-1 flex items-center gap-4">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt="Property"
                className="w-32 h-24 object-cover rounded-lg border border-gray-200"
              />
            ) : (
              <div className="w-32 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs">
                No photo
              </div>
            )}
            <div className="flex flex-col gap-1">
              <label className="cursor-pointer inline-flex items-center px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition">
                {uploading ? "Uploading..." : "Upload Photo"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
              {photoUrl && (
                <button
                  type="button"
                  onClick={() => setPhotoUrl("")}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
          <input type="hidden" name="photoUrl" value={photoUrl} />
        </div>

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
            defaultValue={defaultValues?.type ?? "MULTI_FAMILY"}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SINGLE_FAMILY">Single Family</SelectItem>
              <SelectItem value="MULTI_FAMILY">Multi-Family</SelectItem>
              <SelectItem value="COMMERCIAL">Commercial</SelectItem>
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
