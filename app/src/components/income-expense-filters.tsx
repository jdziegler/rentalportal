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

interface IncomeExpenseFiltersProps {
  properties: { id: string; name: string }[];
  csvUrl: string;
}

export function IncomeExpenseFilters({ properties, csvUrl }: IncomeExpenseFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const propertyId = searchParams.get("propertyId") || "all";
  const dateRange = searchParams.get("range") || "this_year";
  const customFrom = searchParams.get("from") || "";
  const customTo = searchParams.get("to") || "";

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    router.push(`/reports/income-expense?${params.toString()}`);
  }

  function handleDatePreset(preset: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("from");
    params.delete("to");

    if (preset === "this_year") {
      params.delete("range");
    } else {
      params.set("range", preset);
    }

    router.push(`/reports/income-expense?${params.toString()}`);
  }

  function clearFilters() {
    router.push("/reports/income-expense");
  }

  const hasFilters = propertyId !== "all" || dateRange !== "this_year";

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div className="grid grid-cols-2 md:flex md:flex-wrap md:items-end gap-3 md:gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Property</label>
          <Select
            value={propertyId}
            onValueChange={(value) => updateParams({ propertyId: value })}
          >
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="All Properties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {properties.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Date Range</label>
          <Select value={dateRange} onValueChange={handleDatePreset}>
            <SelectTrigger className="w-full md:w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="this_year">This Year</SelectItem>
              <SelectItem value="last_year">Last Year</SelectItem>
              <SelectItem value="all_time">All Time</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {dateRange === "custom" && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">From</label>
              <Input
                type="date"
                value={customFrom}
                onChange={(e) => updateParams({ from: e.target.value, range: "custom" })}
                className="w-full md:w-[160px]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">To</label>
              <Input
                type="date"
                value={customTo}
                onChange={(e) => updateParams({ to: e.target.value, range: "custom" })}
                className="w-full md:w-[160px]"
              />
            </div>
          </>
        )}

        <div className="flex items-end gap-2 col-span-2 md:col-span-1">
          <a
            href={csvUrl}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 text-gray-700"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export CSV
          </a>

          {hasFilters && (
            <Button variant="outline" onClick={clearFilters}>
              Clear
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
