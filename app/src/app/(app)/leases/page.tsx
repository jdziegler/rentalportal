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

const leaseStatusLabels: Record<string, string> = {
  ACTIVE: "Active",
  EXPIRED: "Expired",
  TERMINATED: "Terminated",
};

const leaseStatusStyles: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700 hover:bg-green-100",
  EXPIRED: "bg-red-100 text-red-700 hover:bg-red-100",
  TERMINATED: "bg-gray-100 text-gray-700 hover:bg-gray-100",
};

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

export default async function LeasesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search : "";
  const statusParam = typeof params.status === "string" ? params.status : "ACTIVE";
  const propertyId = typeof params.propertyId === "string" ? params.propertyId : "";
  const page = Math.max(1, parseInt(String(params.page || "1"), 10) || 1);
  const rawPageSize = parseInt(String(params.pageSize || "25"), 10);
  const pageSize = PAGE_SIZE_OPTIONS.includes(rawPageSize as 25 | 50 | 100) ? rawPageSize : 25;

  // Build where clause
  const where: Record<string, unknown> = { userId: session.user.id };

  if (statusParam && statusParam !== "all") {
    where.leaseStatus = statusParam;
  }

  if (propertyId && propertyId !== "all") {
    where.unit = { propertyId };
  }

  if (search) {
    where.contact = {
      OR: [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
      ],
    };
  }

  const skip = (page - 1) * pageSize;

  const [totalCount, leases, properties] = await Promise.all([
    prisma.lease.count({ where }),
    prisma.lease.findMany({
      where,
      include: {
        unit: { select: { id: true, name: true, property: { select: { id: true, name: true } } } },
        contact: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { startDate: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.property.findMany({
      where: { userId: session.user.id, archivedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const filters: FilterConfig[] = [
    {
      key: "search",
      label: "Search",
      type: "search",
      placeholder: "Tenant name...",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      defaultValue: "ACTIVE",
      options: [
        { value: "all", label: "All Statuses" },
        { value: "ACTIVE", label: "Active" },
        { value: "EXPIRED", label: "Expired" },
        { value: "TERMINATED", label: "Terminated" },
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
      <SetPageContext label="/Leases" context={`Leases list: ${totalCount} leases (page ${page}). User can see property/unit, tenant name, start/end dates, rent amount, and status.`} />
      <div className="bg-white rounded-lg shadow-sm px-6 py-4 mb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Leases</h1>
          <Button asChild>
            <Link href="/leases/new">Add Lease</Link>
          </Button>
        </div>
      </div>

      <ListFilters basePath="/leases" filters={filters} />

      {leases.length === 0 ? (
        <EmptyState
          icon="lease"
          title="No leases yet"
          description="Leases connect tenants to units with rent terms, dates, and late fee rules. Create your first lease to start tracking rent."
          href="/leases/new"
          cta="Create Lease"
        />
      ) : (
        <>
          <div className="hidden md:block bg-white rounded-lg shadow">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-700">
                <tr>
                  <th className="px-6 py-3 font-medium">Property / Unit</th>
                  <th className="px-6 py-3 font-medium">Tenant</th>
                  <th className="px-6 py-3 font-medium">Start</th>
                  <th className="px-6 py-3 font-medium">End</th>
                  <th className="px-6 py-3 font-medium">Rent</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leases.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <Link
                        href={`/units/${l.unit.id}`}
                        className="text-gray-900 font-medium hover:text-indigo-600"
                      >
                        {l.unit.property.name} — {l.unit.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/tenants/${l.contact.id}`} className="text-indigo-600 hover:underline">
                        {l.contact.firstName} {l.contact.lastName}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {l.startDate.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {l.endDate?.toLocaleDateString() || "---"}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      ${Number(l.rentAmount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        className={
                          leaseStatusStyles[l.leaseStatus] ||
                          "bg-gray-100 text-gray-700"
                        }
                      >
                        {leaseStatusLabels[l.leaseStatus] || "Unknown"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-3">
            {leases.map((l) => (
              <Link
                key={l.id}
                href={`/leases/${l.id}`}
                className="block bg-white rounded-lg shadow p-4 active:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900 truncate">
                    {l.unit.property.name} — {l.unit.name}
                  </span>
                  <Badge
                    className={
                      leaseStatusStyles[l.leaseStatus] ||
                      "bg-gray-100 text-gray-700"
                    }
                  >
                    {leaseStatusLabels[l.leaseStatus] || "Unknown"}
                  </Badge>
                </div>
                <div className="text-xs text-gray-500">
                  {l.contact.firstName} {l.contact.lastName}
                </div>
                <div className="text-xs text-gray-500">
                  ${Number(l.rentAmount).toFixed(2)} &middot;{" "}
                  {l.startDate.toLocaleDateString()} &middot;{" "}
                  {l.endDate?.toLocaleDateString() || "---"}
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      <Pagination totalCount={totalCount} page={page} pageSize={pageSize} basePath="/leases" />
    </div>
  );
}
