"use client";

import { useState } from "react";
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
import { statusLabels } from "@/lib/transaction-status";

interface TransactionFiltersProps {
  properties: { id: string; name: string }[];
}

export function TransactionFilters({ properties }: TransactionFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const category = searchParams.get("category") || "all";
  const propertyId = searchParams.get("propertyId") || "all";
  const status = searchParams.get("status") || "all";
  const dateRange = searchParams.get("range") || "this_month";
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
    params.delete("page");
    router.push(`/transactions?${params.toString()}`);
  }

  function handleDatePreset(preset: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    params.delete("from");
    params.delete("to");

    if (preset === "this_month") {
      params.delete("range");
    } else {
      params.set("range", preset);
    }

    router.push(`/transactions?${params.toString()}`);
  }

  function clearFilters() {
    router.push("/transactions");
  }

  const hasFilters =
    category !== "all" || propertyId !== "all" || status !== "all" || dateRange !== "this_month";

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div className="grid grid-cols-2 md:flex md:flex-wrap md:items-end gap-3 md:gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Category</label>
          <Select
            value={category}
            onValueChange={(value) => updateParams({ category: value })}
          >
            <SelectTrigger className="w-full md:w-[150px]">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Status</label>
          <Select
            value={status}
            onValueChange={(value) => updateParams({ status: value })}
          >
            <SelectTrigger className="w-full md:w-[150px]">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(statusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="ytd">Year to Date</SelectItem>
              <SelectItem value="year">Last 12 Months</SelectItem>
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
                onChange={(e) => updateParams({ from: e.target.value })}
                className="w-full md:w-[160px]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">To</label>
              <Input
                type="date"
                value={customTo}
                onChange={(e) => updateParams({ to: e.target.value })}
                className="w-full md:w-[160px]"
              />
            </div>
          </>
        )}

        {hasFilters && (
          <div className="col-span-2 md:col-span-1">
            <Button variant="outline" onClick={clearFilters} className="w-full md:w-auto">
              Clear Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
