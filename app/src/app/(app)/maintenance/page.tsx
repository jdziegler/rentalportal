import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const priorityLabels: Record<number, string> = {
  0: "Low",
  1: "Medium",
  2: "High",
  3: "Urgent",
};

const priorityStyles: Record<number, string> = {
  0: "bg-gray-100 text-gray-700 hover:bg-gray-100",
  1: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  2: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
  3: "bg-red-100 text-red-700 hover:bg-red-100",
};

const statusLabels: Record<number, string> = {
  0: "Open",
  1: "In Progress",
  2: "Completed",
  3: "Cancelled",
};

const statusStyles: Record<number, string> = {
  0: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
  1: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  2: "bg-green-100 text-green-700 hover:bg-green-100",
  3: "bg-gray-100 text-gray-700 hover:bg-gray-100",
};

export default async function MaintenancePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const requests = await prisma.maintenanceRequest.findMany({
    where: { userId: session.user.id },
    include: {
      property: { select: { id: true, name: true } },
      unit: { select: { id: true, name: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
  });

  const openCount = requests.filter((r) => r.status === 0).length;
  const inProgressCount = requests.filter((r) => r.status === 1).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maintenance</h1>
          <p className="text-sm text-gray-600 mt-1">
            {openCount} open, {inProgressCount} in progress
          </p>
        </div>
        <Button asChild>
          <Link href="/maintenance/new">New Request</Link>
        </Button>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-600 mb-4">
            No maintenance requests yet.
          </p>
          <Button asChild>
            <Link href="/maintenance/new">Create Request</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="hidden md:block bg-white rounded-lg shadow">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-700">
                <tr>
                  <th className="px-6 py-3 font-medium">Title</th>
                  <th className="px-6 py-3 font-medium">Property / Unit</th>
                  <th className="px-6 py-3 font-medium">Priority</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Reported By</th>
                  <th className="px-6 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <Link
                        href={`/maintenance/${r.id}`}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {r.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/properties/${r.property.id}`} className="text-blue-600 hover:underline">
                        {r.property.name}
                      </Link>
                      {r.unit && (
                        <>
                          {" — "}
                          <Link href={`/units/${r.unit.id}`} className="text-blue-600 hover:underline">
                            {r.unit.name}
                          </Link>
                        </>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="secondary" className={priorityStyles[r.priority]}>
                        {priorityLabels[r.priority]}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="secondary" className={statusStyles[r.status]}>
                        {statusLabels[r.status]}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      {r.contact ? (
                        <Link href={`/tenants/${r.contact.id}`} className="text-blue-600 hover:underline">
                          {r.contact.firstName} {r.contact.lastName}
                        </Link>
                      ) : "—"}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {r.createdAt.toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {requests.map((r) => (
              <Link
                key={r.id}
                href={`/maintenance/${r.id}`}
                className="block bg-white rounded-lg shadow p-4 active:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900 truncate">{r.title}</span>
                  <Badge variant="secondary" className={priorityStyles[r.priority]}>
                    {priorityLabels[r.priority]}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">
                    {r.property.name}
                    {r.unit ? ` — ${r.unit.name}` : ""}
                  </span>
                  <Badge variant="secondary" className={statusStyles[r.status]}>
                    {statusLabels[r.status]}
                  </Badge>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {r.contact
                    ? `${r.contact.firstName} ${r.contact.lastName}`
                    : "—"}
                  &middot;
                  {r.createdAt.toLocaleDateString()}
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
