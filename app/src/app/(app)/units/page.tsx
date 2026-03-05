import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function UnitsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const units = await prisma.unit.findMany({
    where: { property: { userId: session.user.id } },
    include: { property: { select: { name: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Units</h1>
        <Link
          href="/units/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          Add Unit
        </Link>
      </div>
      {units.length === 0 ? (
        <p className="text-gray-500">No units yet.</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
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
                      className="text-blue-600 hover:underline"
                    >
                      {u.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {u.property.name}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {u.bedrooms ?? "—"}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {u.bathrooms ?? "—"}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {u.price ? `$${Number(u.price).toFixed(2)}` : "—"}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        u.isRented
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {u.isRented ? "Occupied" : "Vacant"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
