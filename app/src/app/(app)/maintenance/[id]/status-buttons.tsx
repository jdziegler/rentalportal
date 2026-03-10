"use client";

import { Button } from "@/components/ui/button";
import { updateMaintenanceStatus } from "@/lib/actions/maintenance";

export function StatusButtons({
  id,
  currentStatus,
}: {
  id: string;
  currentStatus: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600 font-medium">Update Status:</span>
      {currentStatus === "OPEN" && (
        <form action={() => updateMaintenanceStatus(id, "IN_PROGRESS")}>
          <Button type="submit" size="sm" variant="outline">
            Start Work
          </Button>
        </form>
      )}
      {(currentStatus === "OPEN" || currentStatus === "IN_PROGRESS") && (
        <form action={() => updateMaintenanceStatus(id, "COMPLETED")}>
          <Button type="submit" size="sm" className="bg-green-600 hover:bg-green-700">
            Mark Complete
          </Button>
        </form>
      )}
      {(currentStatus === "OPEN" || currentStatus === "IN_PROGRESS") && (
        <form action={() => updateMaintenanceStatus(id, "CANCELLED")}>
          <Button type="submit" size="sm" variant="ghost" className="text-gray-500">
            Cancel
          </Button>
        </form>
      )}
    </div>
  );
}
