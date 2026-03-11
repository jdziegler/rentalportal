"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { applyRentIncrease, cancelRentIncrease } from "@/lib/actions/rent-increases";
import { useState } from "react";

interface RentIncreaseRow {
  id: string;
  previousRent: { toString(): string };
  newRent: { toString(): string };
  effectiveDate: Date;
  noticeDate: Date | null;
  status: string;
  notes: string | null;
  appliedAt: Date | null;
}

const statusStyles: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  APPLIED: "bg-green-100 text-green-700 hover:bg-green-100",
  CANCELLED: "bg-gray-100 text-gray-500 hover:bg-gray-100",
};

export function RentIncreaseList({ increases }: { increases: RentIncreaseRow[] }) {
  if (increases.length === 0) return null;

  return (
    <div className="mt-6 bg-white rounded-lg shadow overflow-x-auto">
      <div className="p-6 pb-4">
        <h2 className="text-lg font-semibold text-gray-900">Rent Increases</h2>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-gray-700">
          <tr>
            <th className="px-6 py-3 font-medium">Effective Date</th>
            <th className="px-6 py-3 font-medium text-right">Previous</th>
            <th className="px-6 py-3 font-medium text-right">New</th>
            <th className="px-6 py-3 font-medium text-right">Change</th>
            <th className="px-6 py-3 font-medium">Status</th>
            <th className="px-6 py-3 font-medium">Notes</th>
            <th className="px-6 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {increases.map((ri) => (
            <RentIncreaseRowItem key={ri.id} ri={ri} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RentIncreaseRowItem({ ri }: { ri: RentIncreaseRow }) {
  const [acting, setActing] = useState(false);
  const prev = Number(ri.previousRent);
  const next = Number(ri.newRent);
  const diff = next - prev;
  const pct = prev > 0 ? ((diff / prev) * 100).toFixed(1) : "0";

  async function handleApply() {
    setActing(true);
    try { await applyRentIncrease(ri.id); } finally { setActing(false); }
  }

  async function handleCancel() {
    setActing(true);
    try { await cancelRentIncrease(ri.id); } finally { setActing(false); }
  }

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-3 text-gray-700">
        {ri.effectiveDate.toLocaleDateString()}
      </td>
      <td className="px-6 py-3 text-right text-gray-700">
        ${prev.toFixed(2)}
      </td>
      <td className="px-6 py-3 text-right font-medium text-gray-900">
        ${next.toFixed(2)}
      </td>
      <td className={`px-6 py-3 text-right font-medium ${diff > 0 ? "text-red-600" : "text-green-600"}`}>
        {diff > 0 ? "+" : ""}{diff.toFixed(2)} ({diff > 0 ? "+" : ""}{pct}%)
      </td>
      <td className="px-6 py-3">
        <Badge className={statusStyles[ri.status] || "bg-gray-100 text-gray-700"}>
          {ri.status === "SCHEDULED" ? "Scheduled" : ri.status === "APPLIED" ? "Applied" : "Cancelled"}
        </Badge>
      </td>
      <td className="px-6 py-3 text-gray-500 max-w-[200px] truncate">
        {ri.notes || "—"}
      </td>
      <td className="px-6 py-3">
        {ri.status === "SCHEDULED" && (
          <div className="flex gap-1">
            <Button size="sm" variant="default" onClick={handleApply} disabled={acting}>
              Apply Now
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancel} disabled={acting}>
              Cancel
            </Button>
          </div>
        )}
      </td>
    </tr>
  );
}
