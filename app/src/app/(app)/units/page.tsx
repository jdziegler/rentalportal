import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SetPageContext } from "@/components/set-page-context";

const unitTypes: Record<number, string> = {
  1: "Apartment",
  2: "House",
  3: "Room",
};

export default async function UnitsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const units = await prisma.unit.findMany({
    where: { property: { userId: session.user.id } },
    include: { property: { select: { id: true, name: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <SetPageContext label="/Units" context={`Units list: ${units.length} units. User can see unit names, properties, bed/bath counts, rent prices, and occupancy status.`} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Units</h1>
        <Button asChild>
          <Link href="/units/new">Add Unit</Link>
        </Button>
      </div>
      {units.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-600 mb-4">No units yet. Add your first unit to get started.</p>
          <Button asChild>
            <Link href="/units/new">Add Unit</Link>
          </Button>
        </div>
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
    </div>
  );
}
