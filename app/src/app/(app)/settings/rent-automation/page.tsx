import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { updateRentScheduleConfig } from "@/lib/actions/rent-automation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default async function RentAutomationSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const config = await prisma.rentScheduleConfig.findUnique({
    where: { userId: session.user.id },
  });

  const publishDay = config?.publishDay ?? 1;

  // Get recent cron job logs
  const recentLogs = await prisma.cronJobLog.findMany({
    orderBy: { startedAt: "desc" },
    take: 10,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Rent Automation
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Invoice Schedule
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Rent invoices will be automatically created on this day each month
            for all active leases. The due date is determined by each
            lease&apos;s rent due day setting.
          </p>
          <form action={updateRentScheduleConfig} className="space-y-4">
            <div>
              <Label htmlFor="publishDay">Publish Day of Month</Label>
              <Select
                name="publishDay"
                defaultValue={String(publishDay)}
              >
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={String(day)}>
                      {day}{ordinalSuffix(day)} of each month
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Tip: Set this before the rent due day so tenants see the
                invoice ahead of time.
              </p>
            </div>
            <Button type="submit">Save Settings</Button>
          </form>
        </div>

        {/* How It Works */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            How It Works
          </h2>
          <ol className="space-y-3 text-sm text-gray-700 list-decimal list-inside">
            <li>
              <strong>Invoice creation:</strong> On the publish day, a rent
              charge is created for each active lease for the upcoming month.
            </li>
            <li>
              <strong>Auto-pay:</strong> If a tenant has auto-pay enabled,
              their payment method is charged on the rent due date.
            </li>
            <li>
              <strong>Late fees:</strong> If rent is unpaid after the due date
              plus the lease&apos;s grace period, a late fee is automatically
              assessed (if configured on the lease).
            </li>
            <li>
              <strong>ACH handling:</strong> ACH payments may take 2-5
              business days to settle. If an ACH payment fails after
              initially processing, the charge reverts to unpaid.
            </li>
          </ol>
        </div>
      </div>

      {/* Recent Automation Activity */}
      {recentLogs.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow">
          <div className="p-6 pb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Activity
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-700">
              <tr>
                <th className="px-6 py-3 font-medium">Job</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Started</th>
                <th className="px-6 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentLogs.map((log) => {
                const details = log.details as Record<string, unknown> | null;
                return (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-gray-900 font-medium">
                      {jobTypeLabel(log.jobType)}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${statusColor(log.status)}`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-700">
                      {log.startedAt.toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-gray-600 text-xs">
                      {details
                        ? Object.entries(details)
                            .filter(([k]) => k !== "errors")
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(", ")
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ordinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function jobTypeLabel(type: string): string {
  switch (type) {
    case "rent_generation":
      return "Rent Generation";
    case "auto_payment":
      return "Auto-Pay";
    case "late_fee":
      return "Late Fees";
    default:
      return type;
  }
}

function statusColor(status: string): string {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-700";
    case "completed_with_errors":
      return "bg-yellow-100 text-yellow-700";
    case "failed":
      return "bg-red-100 text-red-700";
    case "started":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}
