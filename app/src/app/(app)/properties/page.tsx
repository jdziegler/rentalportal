import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SetPageContext } from "@/components/set-page-context";
import { ListFilters } from "@/components/list-filters";
import { Pagination } from "@/components/pagination";
import { EmptyState } from "@/components/empty-state";

const propertyTypes: Record<string, string> = {
  SINGLE_FAMILY: "Single Family",
  MULTI_FAMILY: "Multi-Family",
  COMMERCIAL: "Commercial",
};

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search : "";
  const type = typeof params.type === "string" ? params.type : "";
  const page = Math.max(1, parseInt(String(params.page || "1"), 10) || 1);
  const rawPageSize = parseInt(String(params.pageSize || "25"), 10);
  const pageSize = PAGE_SIZE_OPTIONS.includes(rawPageSize as 25 | 50 | 100) ? rawPageSize : 25;

  // Build where clause
  const where: Record<string, unknown> = {
    userId: session.user.id,
    archivedAt: null,
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { address: { contains: search, mode: "insensitive" } },
      { city: { contains: search, mode: "insensitive" } },
    ];
  }

  if (type && type !== "all") {
    where.type = type;
  }

  const skip = (page - 1) * pageSize;

  const [totalCount, properties] = await Promise.all([
    prisma.property.count({ where }),
    prisma.property.findMany({
      where,
      include: {
        _count: { select: { units: true } },
        units: { select: { isRented: true } },
      },
      orderBy: { name: "asc" },
      skip,
      take: pageSize,
    }),
  ]);

  const filters = [
    {
      key: "search",
      label: "Search",
      type: "search" as const,
      placeholder: "Name or address...",
    },
    {
      key: "type",
      label: "Type",
      type: "select" as const,
      options: [
        { value: "all", label: "All Types" },
        { value: "SINGLE_FAMILY", label: "Single Family" },
        { value: "MULTI_FAMILY", label: "Multi-Family" },
        { value: "COMMERCIAL", label: "Commercial" },
      ],
    },
  ];

  return (
    <div>
      <SetPageContext label="/Properties" context={`Properties list: ${totalCount} properties (page ${page}). User can see property names, addresses, types, unit counts, and occupancy rates.`} />
      <div className="bg-white rounded-lg shadow-sm px-6 py-4 mb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
          <Button asChild>
            <Link href="/properties/new">Add Property</Link>
          </Button>
        </div>
      </div>

      <ListFilters basePath="/properties" filters={filters} />

      {properties.length === 0 ? (
        <EmptyState
          icon="property"
          title="No properties yet"
          description="Add your first property to start managing your rental portfolio. You can track units, tenants, and finances all in one place."
          href="/properties/new"
          cta="Add Property"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map((p) => {
            const occupied = p.units.filter((u) => u.isRented).length;
            const total = p._count.units;
            const rate = total > 0 ? Math.round((occupied / total) * 100) : 0;
            return (
              <Link
                key={p.id}
                href={`/properties/${p.id}`}
                className="bg-white rounded-lg shadow hover:shadow-md transition-shadow overflow-hidden group"
              >
                {/* Photo */}
                {p.photoUrl ? (
                  <div className="h-40 overflow-hidden">
                    <img
                      src={p.photoUrl}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                ) : (
                  <div className="h-40 bg-gray-100 flex items-center justify-center">
                    <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 0h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
                    </svg>
                  </div>
                )}

                {/* Details */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
                      {p.name}
                    </h3>
                    {total > 0 && (
                      <Badge
                        variant="secondary"
                        className={
                          rate === 100
                            ? "bg-green-100 text-green-700 shrink-0"
                            : rate > 0
                              ? "bg-yellow-100 text-yellow-700 shrink-0"
                              : "bg-gray-100 text-gray-700 shrink-0"
                        }
                      >
                        {rate}%
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate mt-1">
                    {[p.address, p.city, p.state].filter(Boolean).join(", ")}
                  </p>
                  <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                    <span>{propertyTypes[p.type] || "Unknown"}</span>
                    <span>&middot;</span>
                    <span>{total} {total === 1 ? "unit" : "units"}</span>
                    {total > 0 && (
                      <>
                        <span>&middot;</span>
                        <span>{occupied} occupied</span>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <Pagination totalCount={totalCount} page={page} pageSize={pageSize} basePath="/properties" />
    </div>
  );
}
