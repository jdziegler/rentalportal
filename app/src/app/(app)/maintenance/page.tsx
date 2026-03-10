import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SetPageContext } from "@/components/set-page-context";
import { ListFilters, type FilterConfig } from "@/components/list-filters";
import { Pagination } from "@/components/pagination";
import { EmptyState } from "@/components/empty-state";

const priorityLabels: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

const priorityStyles: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-700 hover:bg-gray-100",
  MEDIUM: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  HIGH: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
  URGENT: "bg-red-100 text-red-700 hover:bg-red-100",
};

const statusLabels: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const statusStyles: Record<string, string> = {
  OPEN: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
  IN_PROGRESS: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  COMPLETED: "bg-green-100 text-green-700 hover:bg-green-100",
  CANCELLED: "bg-gray-100 text-gray-700 hover:bg-gray-100",
};

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

export default async function MaintenancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;
  const statusParam = typeof params.status === "string" ? params.status : "";
  const priorityParam = typeof params.priority === "string" ? params.priority : "";
  const propertyId = typeof params.propertyId === "string" ? params.propertyId : "";
  const page = Math.max(1, parseInt(String(params.page || "1"), 10) || 1);
  const rawPageSize = parseInt(String(params.pageSize || "25"), 10);
  const pageSize = PAGE_SIZE_OPTIONS.includes(rawPageSize as 25 | 50 | 100) ? rawPageSize : 25;

  // Build where clause
  const where: Record<string, unknown> = { userId: session.user.id };

  if (statusParam && statusParam !== "all") {
    where.status = statusParam;
  }

  if (priorityParam && priorityParam !== "all") {
    where.priority = priorityParam;
  }

  if (propertyId && propertyId !== "all") {
    where.propertyId = propertyId;
  }

  const skip = (page - 1) * pageSize;

  const [totalCount, requests, properties, openCount, inProgressCount] = await Promise.all([
    prisma.maintenanceRequest.count({ where }),
    prisma.maintenanceRequest.findMany({
      where,
      include: {
        property: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
      skip,
      take: pageSize,
    }),
    prisma.property.findMany({
      where: { userId: session.user.id, archivedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.maintenanceRequest.count({ where: { userId: session.user.id, status: "OPEN" } }),
    prisma.maintenanceRequest.count({ where: { userId: session.user.id, status: "IN_PROGRESS" } }),
  ]);

  const filters: FilterConfig[] = [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "all", label: "All Statuses" },
        { value: "OPEN", label: "Open" },
        { value: "IN_PROGRESS", label: "In Progress" },
        { value: "COMPLETED", label: "Completed" },
        { value: "CANCELLED", label: "Cancelled" },
      ],
    },
    {
      key: "priority",
      label: "Priority",
      type: "select",
      options: [
        { value: "all", label: "All Priorities" },
        { value: "LOW", label: "Low" },
        { value: "MEDIUM", label: "Medium" },
        { value: "HIGH", label: "High" },
        { value: "URGENT", label: "Urgent" },
      ],
    },
    {
      key: "propertyId",
      label: "Property",
      type: "select",
      options: [
        { value: "all", label: "All Properties" },
        ...properties.map((p) => ({ value: p.id, label: p.name })),
      ],
    },
  ];

  return (
    <div>
      <SetPageContext label="/Maintenance" context={`Maintenance list: ${totalCount} requests shown (page ${page}). ${openCount} open, ${inProgressCount} in progress total. User can see title, property/unit, priority, status, reporter, and date.`} />
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

      <ListFilters basePath="/maintenance" filters={filters} />

      {requests.length === 0 ? (
        <EmptyState
          icon="maintenance"
          title="No maintenance requests"
          description="Track repair requests and work orders here. Tenants can also submit requests through their portal."
          href="/maintenance/new"
          cta="Create Request"
        />
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

      <Pagination totalCount={totalCount} page={page} pageSize={pageSize} basePath="/maintenance" />
    </div>
  );
}
