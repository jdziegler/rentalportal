import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TenantFilters } from "@/components/tenant-filters";
import { SetPageContext } from "@/components/set-page-context";
import { EmptyState } from "@/components/empty-state";

const statusLabels: Record<string, string> = {
  PENDING: "Pending",
  INVITED: "Invited",
  ACTIVE: "Active",
  INACTIVE: "Inactive",
};

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
  INVITED: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  ACTIVE: "bg-green-100 text-green-700 hover:bg-green-100",
  INACTIVE: "bg-gray-100 text-gray-500 hover:bg-gray-100",
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
  const statusFilter = params.status ?? "ACTIVE"; // default to Active

  const where: Record<string, unknown> = {
    userId: session.user.id,
    role: "tenant",
  };

  // Active = has an active lease (as primary or co-tenant)
  // Inactive = no active leases
  if (statusFilter === "ACTIVE") {
    where.OR = [
      { leases: { some: { leaseStatus: "ACTIVE" } } },
      { leaseTenants: { some: { lease: { leaseStatus: "ACTIVE" } } } },
    ];
  } else if (statusFilter === "INACTIVE") {
    where.AND = [
      { leases: { none: { leaseStatus: "ACTIVE" } } },
      { leaseTenants: { none: { lease: { leaseStatus: "ACTIVE" } } } },
    ];
  } else if (statusFilter !== "all") {
    where.status = statusFilter;
  }

  if (params.search) {
    const searchConditions = [
      { firstName: { contains: params.search, mode: "insensitive" } },
      { lastName: { contains: params.search, mode: "insensitive" } },
      { email: { contains: params.search, mode: "insensitive" } },
      { phone: { contains: params.search, mode: "insensitive" } },
    ];
    // If we already have an OR/AND from status filter, nest search in AND
    if (where.OR || where.AND) {
      where.AND = [...(Array.isArray(where.AND) ? where.AND : []), { OR: searchConditions }];
    } else {
      where.OR = searchConditions;
    }
  }

  const tenants = await prisma.contact.findMany({
    where,
    include: {
      _count: { select: { leases: true } },
      // Primary leases (where this contact is the main tenant)
      leases: {
        where: { leaseStatus: "ACTIVE" },
        select: {
          id: true,
          unit: {
            select: {
              id: true,
              name: true,
              property: { select: { name: true } },
            },
          },
        },
      },
      // Co-tenant leases (via join table)
      leaseTenants: {
        where: { lease: { leaseStatus: "ACTIVE" }, isPrimary: false },
        select: {
          lease: {
            select: {
              id: true,
              unit: {
                select: {
                  id: true,
                  name: true,
                  property: { select: { name: true } },
                },
              },
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
        <EmptyState
          icon="tenant"
          title="No tenants yet"
          description="Add your tenants to keep track of contact info, lease history, and payment records. You can also invite them to pay rent online."
          href="/tenants/new"
          cta="Add Tenant"
        />
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
                  // Combine primary leases + co-tenant leases, dedup by lease id
                  const coTenantLeases = t.leaseTenants.map((lt) => lt.lease);
                  const seenIds = new Set(t.leases.map((l) => l.id));
                  const allActiveLeases = [
                    ...t.leases,
                    ...coTenantLeases.filter((l) => !seenIds.has(l.id)),
                  ];
                  const hasActiveLease = allActiveLeases.length > 0;
                  return (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <Link
                          href={`/tenants/${t.id}`}
                          className="text-gray-900 font-medium hover:text-indigo-600"
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
                          className={hasActiveLease ? statusColors["ACTIVE"] : statusColors["INACTIVE"]}
                        >
                          {hasActiveLease ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {allActiveLeases.length > 0 ? (
                          <span>
                            {allActiveLeases.map((l, i) => (
                              <span key={l.id}>
                                {i > 0 && ", "}
                                <Link
                                  href={l.unit?.id ? `/units/${l.unit.id}` : `/leases/${l.id}`}
                                  className="text-indigo-600 hover:underline text-xs"
                                >
                                  {l.unit?.property?.name || "?"} — {l.unit?.name || "?"}
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
              const coTenantLeases = t.leaseTenants.map((lt) => lt.lease);
              const seenIds = new Set(t.leases.map((l) => l.id));
              const allActiveLeases = [
                ...t.leases,
                ...coTenantLeases.filter((l) => !seenIds.has(l.id)),
              ];
              const hasActiveLease = allActiveLeases.length > 0;
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
                      className={hasActiveLease ? statusColors["ACTIVE"] : statusColors["INACTIVE"]}
                    >
                      {hasActiveLease ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {(t.email || t.phone) && (
                    <div className="text-xs text-gray-500 mt-1">
                      {[t.email, t.phone].filter(Boolean).join(" \u00b7 ")}
                    </div>
                  )}
                  {allActiveLeases.length > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      {allActiveLeases.length} active {allActiveLeases.length === 1 ? "lease" : "leases"}:{" "}
                      {allActiveLeases.map((l, i) => (
                        <span key={l.id}>
                          {i > 0 && ", "}
                          {l.unit?.property?.name || "?"} — {l.unit?.name || "?"}
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
