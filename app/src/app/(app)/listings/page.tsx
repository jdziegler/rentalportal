import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ListFilters, type FilterConfig } from "@/components/list-filters";
import { Pagination } from "@/components/pagination";
import { EmptyState } from "@/components/empty-state";

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;
  const statusParam = typeof params.status === "string" ? params.status : "";
  const page = Math.max(1, parseInt(String(params.page || "1"), 10) || 1);
  const rawPageSize = parseInt(String(params.pageSize || "25"), 10);
  const pageSize = PAGE_SIZE_OPTIONS.includes(rawPageSize as 25 | 50 | 100) ? rawPageSize : 25;

  // Build where clause
  const where: Record<string, unknown> = { userId: session.user.id };

  if (statusParam === "active") {
    where.isActive = true;
  } else if (statusParam === "inactive") {
    where.isActive = false;
  }

  const skip = (page - 1) * pageSize;

  const [totalCount, listings] = await Promise.all([
    prisma.listing.count({ where }),
    prisma.listing.findMany({
      where,
      include: {
        property: { select: { name: true } },
        unit: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
  ]);

  const filters: FilterConfig[] = [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "all", label: "All Listings" },
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
      ],
    },
  ];

  return (
    <div>
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="flex items-center justify-between px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Listings</h1>
          <Link
            href="/listings/new"
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700"
          >
            Create Listing
          </Link>
        </div>
        <div className="border-t border-gray-200 px-6 py-4">
          <ListFilters basePath="/listings" filters={filters} bare />
        </div>
      </div>

      {listings.length === 0 ? (
        <EmptyState
          icon="listing"
          title="No listings yet"
          description="Create listings to advertise your vacant units and attract new tenants. Manage applications all in one place."
          href="/listings/new"
          cta="Create Listing"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((l) => (
            <Link
              key={l.id}
              href={`/listings/${l.id}`}
              className="bg-white rounded-lg shadow hover:shadow-md transition overflow-hidden"
            >
              <div className="p-6">
                <h3 className="font-semibold text-lg mb-1 text-gray-900">
                  {l.property.name} — {l.unit.name}
                </h3>
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                  {l.description ? l.description.replace(/<[^>]*>/g, "") : "No description"}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold text-indigo-600">
                    ${Number(l.price).toFixed(0)}/mo
                  </span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      l.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {l.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Pagination totalCount={totalCount} page={page} pageSize={pageSize} basePath="/listings" />
    </div>
  );
}
