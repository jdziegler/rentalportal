import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TenantFilters } from "@/components/tenant-filters";
import { SetPageContext } from "@/components/set-page-context";

const statusLabels: Record<number, string> = {
  0: "Pending",
  1: "Invited",
  2: "Active",
  3: "Inactive",
};

const statusColors: Record<number, string> = {
  0: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
  1: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  2: "bg-green-100 text-green-700 hover:bg-green-100",
  3: "bg-gray-100 text-gray-500 hover:bg-gray-100",
};

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    search?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;
  const statusFilter = params.status ?? "2"; // default to Active

  const where: Record<string, unknown> = {
    userId: session.user.id,
    role: "tenant",
  };

  if (statusFilter !== "all") {
    where.status = parseInt(statusFilter, 10);
  }

  if (params.search) {
    where.OR = [
      { firstName: { contains: params.search, mode: "insensitive" } },
      { lastName: { contains: params.search, mode: "insensitive" } },
      { email: { contains: params.search, mode: "insensitive" } },
      { phone: { contains: params.search, mode: "insensitive" } },
    ];
  }

  const tenants = await prisma.contact.findMany({
    where,
    include: {
      _count: { select: { leases: true } },
      leases: {
        where: { leaseStatus: 0 },
        select: {
          id: true,
          unit: {
            select: {
              name: true,
              property: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: { lastName: "asc" },
  });

  return (
    <div>
      <SetPageContext label="/Tenants" context={`Tenants list: ${tenants.length} tenants. User can see names, email, phone, status, and active leases.`} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
        <Button asChild>
          <Link href="/tenants/new">Add Tenant</Link>
        </Button>
      </div>

      <TenantFilters />

      {tenants.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-600 mb-4">No tenants found. Try adjusting your filters or add a new tenant.</p>
          <Button asChild>
            <Link href="/tenants/new">Add Tenant</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="hidden md:block bg-white rounded-lg shadow">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-700">
                <tr>
                  <th className="px-6 py-3 font-medium">Name</th>
                  <th className="px-6 py-3 font-medium">Email</th>
                  <th className="px-6 py-3 font-medium">Phone</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Active Leases</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tenants.map((t) => {
                  const activeLeaseCount = t.leases.length;
                  return (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <Link
                          href={`/tenants/${t.id}`}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          {t.firstName} {t.lastName}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {t.email || "—"}
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {t.phone || "—"}
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant="secondary"
                          className={statusColors[t.status] || ""}
                        >
                          {statusLabels[t.status] || "Unknown"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {activeLeaseCount > 0 ? (
                          <span>
                            {t.leases.map((l, i) => (
                              <span key={l.id}>
                                {i > 0 && ", "}
                                <Link
                                  href={`/leases/${l.id}`}
                                  className="text-blue-600 hover:underline text-xs"
                                >
                                  {l.unit?.property?.name || "?"} - {l.unit?.name || "?"}
                                </Link>
                              </span>
                            ))}
                          </span>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-3">
            {tenants.map((t) => {
              const activeLeaseCount = t.leases.length;
              return (
                <Link
                  key={t.id}
                  href={`/tenants/${t.id}`}
                  className="block bg-white rounded-lg shadow p-4 active:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">
                      {t.firstName} {t.lastName}
                    </span>
                    <Badge
                      variant="secondary"
                      className={statusColors[t.status] || ""}
                    >
                      {statusLabels[t.status] || "Unknown"}
                    </Badge>
                  </div>
                  {(t.email || t.phone) && (
                    <div className="text-xs text-gray-500 mt-1">
                      {[t.email, t.phone].filter(Boolean).join(" \u00b7 ")}
                    </div>
                  )}
                  {activeLeaseCount > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      {activeLeaseCount} active {activeLeaseCount === 1 ? "lease" : "leases"}:{" "}
                      {t.leases.map((l, i) => (
                        <span key={l.id}>
                          {i > 0 && ", "}
                          {l.unit?.property?.name || "?"} - {l.unit?.name || "?"}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
