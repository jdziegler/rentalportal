import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function TenantsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const tenants = await prisma.contact.findMany({
    where: { userId: session.user.id, role: "tenant" },
    orderBy: { lastName: "asc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Tenants</h1>
        <Link
          href="/tenants/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          Add Tenant
        </Link>
      </div>
      {tenants.length === 0 ? (
        <p className="text-gray-500">No tenants yet.</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Phone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tenants.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link
                      href={`/tenants/${t.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {t.firstName} {t.lastName}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {t.email || "—"}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {t.phone || "—"}
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
