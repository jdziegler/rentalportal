"use client";

import { useState, useEffect } from "react";
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

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  type: "select" | "search";
  options?: FilterOption[];
  placeholder?: string;
  defaultValue?: string;
}

interface ListFiltersProps {
  basePath: string;
  filters: FilterConfig[];
}

export function ListFilters({ basePath, filters }: ListFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Track search input value locally for debouncing
  const searchFilter = filters.find((f) => f.type === "search");
  const [searchValue, setSearchValue] = useState(
    searchFilter ? searchParams.get(searchFilter.key) || "" : ""
  );

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
    router.push(`${basePath}?${params.toString()}`);
  }

  function clearFilters() {
    router.push(basePath);
  }

  // Debounce search input
  useEffect(() => {
    if (!searchFilter) return;
    const timer = setTimeout(() => {
      const current = searchParams.get(searchFilter.key) || "";
      if (searchValue !== current) {
        updateParams({ [searchFilter.key]: searchValue });
      }
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  // Sync search value with URL params (e.g. on browser back)
  useEffect(() => {
    if (!searchFilter) return;
    const current = searchParams.get(searchFilter.key) || "";
    setSearchValue(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const hasFilters = filters.some((f) => {
    const value = searchParams.get(f.key);
    if (!value) return false;
    if (f.defaultValue && value === f.defaultValue) return false;
    return value !== "all";
  });

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div className="grid grid-cols-2 md:flex md:flex-wrap md:items-end gap-3 md:gap-4">
        {filters.map((filter) => {
          if (filter.type === "search") {
            return (
              <div key={filter.key} className="flex flex-col gap-1 col-span-2 md:col-span-1">
                <label className="text-xs font-medium text-gray-600">
                  {filter.label}
                </label>
                <Input
                  type="text"
                  placeholder={filter.placeholder || "Search..."}
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="w-full md:w-[200px]"
                />
              </div>
            );
          }

          const currentValue = searchParams.get(filter.key) || filter.defaultValue || "all";

          return (
            <div key={filter.key} className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">
                {filter.label}
              </label>
              <Select
                value={currentValue}
                onValueChange={(value) => updateParams({ [filter.key]: value })}
              >
                <SelectTrigger className="w-full md:w-[170px]">
                  <SelectValue placeholder={filter.placeholder || "All"} />
                </SelectTrigger>
                <SelectContent>
                  {filter.options?.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}

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
