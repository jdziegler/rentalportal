import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";

const leaseStatusLabels: Record<number, string> = {
  0: "Active",
  1: "Expired",
  2: "Terminated",
};

const leaseStatusStyles: Record<number, string> = {
  0: "bg-green-100 text-green-700",
  1: "bg-red-100 text-red-700",
  2: "bg-gray-100 text-gray-700",
};

export default async function LeasesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const leases = await prisma.lease.findMany({
    where: { userId: session.user.id },
    include: {
      unit: { select: { name: true, property: { select: { name: true } } } },
      contact: { select: { firstName: true, lastName: true } },
    },
    orderBy: { rentFrom: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Leases</h1>
        <Link
          href="/leases/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          Add Lease
        </Link>
      </div>
      {leases.length === 0 ? (
        <p className="text-gray-500">No leases yet.</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-6 py-3 font-medium">Property / Unit</th>
                <th className="px-6 py-3 font-medium">Tenant</th>
                <th className="px-6 py-3 font-medium">Start</th>
                <th className="px-6 py-3 font-medium">End</th>
                <th className="px-6 py-3 font-medium">Rent</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leases.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link
                      href={`/leases/${l.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {l.unit.property.name} — {l.unit.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {l.contact.firstName} {l.contact.lastName}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {l.rentFrom.toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {l.rentTo?.toLocaleDateString() || "—"}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    ${Number(l.rentAmount).toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        leaseStatusStyles[l.leaseStatus] ||
                        "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {leaseStatusLabels[l.leaseStatus] || "Unknown"}
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
