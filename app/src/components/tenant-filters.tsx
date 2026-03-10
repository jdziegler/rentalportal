"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function TenantFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const status = searchParams.get("status") ?? "ACTIVE";
  const search = searchParams.get("search") || "";

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value && value !== "all" && !(key === "status" && value === "ACTIVE")) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    router.push(`/tenants?${params.toString()}`);
  }

  function clearFilters() {
    router.push("/tenants");
  }

  const hasFilters = status !== "ACTIVE" || search !== "";

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
      <div className="grid grid-cols-2 md:flex md:flex-wrap md:items-end gap-3 md:gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Status</label>
          <Select
            value={status}
            onValueChange={(value) => updateParams({ status: value })}
          >
            <SelectTrigger className="w-full md:w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="INVITED">Invited</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Search</label>
          <Input
            type="text"
            placeholder="Name, email, phone..."
            defaultValue={search}
            className="w-full md:w-[250px]"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                updateParams({ search: (e.target as HTMLInputElement).value });
              }
            }}
            onBlur={(e) => {
              if (e.target.value !== search) {
                updateParams({ search: e.target.value });
              }
            }}
          />
        </div>

        {hasFilters && (
          <div className="col-span-2 md:col-span-1 flex items-end">
            <Button variant="outline" onClick={clearFilters} className="w-full md:w-auto">
              Clear Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
