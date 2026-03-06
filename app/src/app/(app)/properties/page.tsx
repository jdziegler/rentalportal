import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SetPageContext } from "@/components/set-page-context";

const propertyTypes: Record<number, string> = {
  1: "Single Family",
  2: "Multi-Family",
  3: "Commercial",
};

export default async function PropertiesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const properties = await prisma.property.findMany({
    where: { userId: session.user.id, archivedAt: null },
    include: {
      _count: { select: { units: true } },
      units: { select: { isRented: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <SetPageContext label="/Properties" context={`Properties list: ${properties.length} properties. User can see property names, addresses, types, unit counts, and occupancy rates.`} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
        <Button asChild>
          <Link href="/properties/new">Add Property</Link>
        </Button>
      </div>
      {properties.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-600 mb-4">No properties yet. Add your first property to get started.</p>
          <Button asChild>
            <Link href="/properties/new">Add Property</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="hidden md:block bg-white rounded-lg shadow">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-700">
                <tr>
                  <th className="px-6 py-3 font-medium">Name</th>
                  <th className="px-6 py-3 font-medium">Address</th>
                  <th className="px-6 py-3 font-medium">Type</th>
                  <th className="px-6 py-3 font-medium">Units</th>
                  <th className="px-6 py-3 font-medium">Occupancy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {properties.map((p) => {
                  const occupied = p.units.filter((u) => u.isRented).length;
                  const total = p._count.units;
                  const rate = total > 0 ? Math.round((occupied / total) * 100) : 0;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <Link
                          href={`/properties/${p.id}`}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          {p.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {[p.address, p.city, p.state].filter(Boolean).join(", ")}
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {propertyTypes[p.type] || "Unknown"}
                      </td>
                      <td className="px-6 py-4 text-gray-700">{total}</td>
                      <td className="px-6 py-4">
                        {total > 0 ? (
                          <Badge
                            variant="secondary"
                            className={
                              rate === 100
                                ? "bg-green-100 text-green-700 hover:bg-green-100"
                                : rate > 0
                                  ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-100"
                                  : "bg-gray-100 text-gray-700 hover:bg-gray-100"
                            }
                          >
                            {rate}% ({occupied}/{total})
                          </Badge>
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
            {properties.map((p) => {
              const occupied = p.units.filter((u) => u.isRented).length;
              const total = p._count.units;
              const rate = total > 0 ? Math.round((occupied / total) * 100) : 0;
              return (
                <Link
                  key={p.id}
                  href={`/properties/${p.id}`}
                  className="block bg-white rounded-lg shadow p-4 active:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 truncate">{p.name}</span>
                    {total > 0 ? (
                      <Badge
                        variant="secondary"
                        className={
                          rate === 100
                            ? "bg-green-100 text-green-700 hover:bg-green-100"
                            : rate > 0
                              ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-100"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-100"
                        }
                      >
                        {rate}% ({occupied}/{total})
                      </Badge>
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {[p.address, p.city, p.state].filter(Boolean).join(", ")}
                  </div>
                  <div className="text-xs text-gray-500">
                    {propertyTypes[p.type] || "Unknown"} &middot; {p._count.units} units
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
