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

const unitTypes: Record<number, string> = {
  1: "Apartment",
  2: "House",
  3: "Room",
};

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

export default async function UnitsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search : "";
  const propertyId = typeof params.propertyId === "string" ? params.propertyId : "";
  const status = typeof params.status === "string" ? params.status : "";
  const page = Math.max(1, parseInt(String(params.page || "1"), 10) || 1);
  const rawPageSize = parseInt(String(params.pageSize || "25"), 10);
  const pageSize = PAGE_SIZE_OPTIONS.includes(rawPageSize as 25 | 50 | 100) ? rawPageSize : 25;

  // Build where clause
  const where: Record<string, unknown> = {
    property: { userId: session.user.id },
  };

  if (search) {
    where.name = { contains: search, mode: "insensitive" };
  }

  if (propertyId && propertyId !== "all") {
    where.propertyId = propertyId;
  }

  if (status === "occupied") {
    where.isRented = true;
  } else if (status === "vacant") {
    where.isRented = false;
  }

  const skip = (page - 1) * pageSize;

  const [totalCount, units, properties] = await Promise.all([
    prisma.unit.count({ where }),
    prisma.unit.findMany({
      where,
      include: {
        property: { select: { id: true, name: true } },
        leases: {
          orderBy: { updatedAt: "desc" },
          select: { leaseStatus: true, rentTo: true, updatedAt: true },
          take: 1,
        },
      },
      orderBy: { name: "asc" },
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
      placeholder: "Unit name...",
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
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "all", label: "All Statuses" },
        { value: "occupied", label: "Occupied" },
        { value: "vacant", label: "Vacant" },
      ],
    },
  ];

  return (
    <div>
      <SetPageContext label="/Units" context={`Units list: ${totalCount} units (page ${page}). User can see unit names, properties, bed/bath counts, rent prices, and occupancy status.`} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Units</h1>
        <Button asChild>
          <Link href="/units/new">Add Unit</Link>
        </Button>
      </div>

      <ListFilters basePath="/units" filters={filters} />

      {units.length === 0 ? (
        <EmptyState
          icon="unit"
          title="No units yet"
          description="Units are the individual spaces within your properties — apartments, rooms, or offices. Add a unit to start tracking occupancy and rent."
          href="/units/new"
          cta="Add Unit"
        />
      ) : (
        <>
          <div className="hidden md:block bg-white rounded-lg shadow">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-700">
                <tr>
                  <th className="px-6 py-3 font-medium">Unit</th>
                  <th className="px-6 py-3 font-medium">Property</th>
                  <th className="px-6 py-3 font-medium">Bedrooms</th>
                  <th className="px-6 py-3 font-medium">Bathrooms</th>
                  <th className="px-6 py-3 font-medium">Price</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {units.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <Link
                        href={`/units/${u.id}`}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {u.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/properties/${u.property.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {u.property.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {u.bedrooms ?? "\u2014"}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {u.bathrooms ?? "\u2014"}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {u.price ? `$${Number(u.price).toFixed(2)}` : "\u2014"}
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant="secondary"
                        className={
                          u.isRented
                            ? "bg-green-100 text-green-700 hover:bg-green-100"
                            : "bg-yellow-100 text-yellow-700 hover:bg-yellow-100"
                        }
                      >
                        {u.isRented ? "Occupied" : "Vacant"}
                      </Badge>
                      {!u.isRented && (() => {
                        const lastLease = u.leases[0];
                        if (!lastLease) return null;
                        const vacantSince = lastLease.rentTo || lastLease.updatedAt;
                        const days = Math.floor((Date.now() - vacantSince.getTime()) / 86400000);
                        if (days <= 0) return null;
                        return (
                          <span className="ml-2 text-xs text-gray-500">
                            {days}d
                          </span>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-3">
            {units.map((u) => (
              <Link
                key={u.id}
                href={`/units/${u.id}`}
                className="block bg-white rounded-lg shadow p-4 active:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{u.name}</span>
                  <div className="flex items-center gap-1">
                    <Badge
                      variant="secondary"
                      className={
                        u.isRented
                          ? "bg-green-100 text-green-700 hover:bg-green-100"
                          : "bg-yellow-100 text-yellow-700 hover:bg-yellow-100"
                      }
                    >
                      {u.isRented ? "Occupied" : "Vacant"}
                    </Badge>
                    {!u.isRented && (() => {
                      const lastLease = u.leases[0];
                      if (!lastLease) return null;
                      const vacantSince = lastLease.rentTo || lastLease.updatedAt;
                      const days = Math.floor((Date.now() - vacantSince.getTime()) / 86400000);
                      if (days <= 0) return null;
                      return <span className="text-xs text-gray-500">{days}d</span>;
                    })()}
                  </div>
                </div>
                <div className="mt-1">
                  <Link
                    href={`/properties/${u.property.id}`}
                    className="text-xs text-gray-500"
                  >
                    {u.property.name}
                  </Link>
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {[
                    u.bedrooms != null ? `${u.bedrooms} bed` : null,
                    u.bathrooms != null ? `${u.bathrooms} bath` : null,
                    u.price != null ? `$${Number(u.price).toFixed(2)}` : null,
                  ]
                    .filter(Boolean)
                    .join(" \u00b7 ")}
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      <Pagination totalCount={totalCount} page={page} pageSize={pageSize} basePath="/units" />
    </div>
  );
}
