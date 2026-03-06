"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  totalCount: number;
  page: number;
  pageSize: number;
}

export function Pagination({ totalCount, page, pageSize }: PaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const start = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    router.push(`/transactions?${params.toString()}`);
  }

  function goToPage(newPage: number) {
    if (newPage <= 1) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("page");
      router.push(`/transactions?${params.toString()}`);
    } else {
      updateParams({ page: String(newPage) });
    }
  }

  function changePageSize(newSize: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (newSize === "25") {
      params.delete("pageSize");
    } else {
      params.set("pageSize", newSize);
    }
    params.delete("page");
    router.push(`/transactions?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
      <p className="text-sm text-gray-600">
        {totalCount === 0
          ? "No results"
          : `Showing ${start}-${end} of ${totalCount}`}
      </p>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Rows per page</span>
          <Select value={String(pageSize)} onValueChange={changePageSize}>
            <SelectTrigger className="w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
          >
            Previous
          </Button>
          <span className="px-3 text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => goToPage(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
