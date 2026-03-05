import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function PropertiesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const properties = await prisma.property.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { units: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Properties</h1>
        <Link
          href="/properties/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          Add Property
        </Link>
      </div>
      {properties.length === 0 ? (
        <p className="text-gray-500">No properties yet.</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Address</th>
                <th className="px-6 py-3 font-medium">Type</th>
                <th className="px-6 py-3 font-medium">Units</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {properties.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link
                      href={`/properties/${p.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {[p.address, p.city, p.state, p.zip]
                      .filter(Boolean)
                      .join(", ")}
                  </td>
                  <td className="px-6 py-4 text-gray-600">{p.type || "—"}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {p._count.units}
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
