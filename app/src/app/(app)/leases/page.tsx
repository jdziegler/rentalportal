import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SetPageContext } from "@/components/set-page-context";

const leaseStatusLabels: Record<number, string> = {
  0: "Active",
  1: "Expired",
  2: "Terminated",
};

const leaseStatusStyles: Record<number, string> = {
  0: "bg-green-100 text-green-700 hover:bg-green-100",
  1: "bg-red-100 text-red-700 hover:bg-red-100",
  2: "bg-gray-100 text-gray-700 hover:bg-gray-100",
};

export default async function LeasesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const leases = await prisma.lease.findMany({
    where: { userId: session.user.id },
    include: {
      unit: { select: { id: true, name: true, property: { select: { id: true, name: true } } } },
      contact: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { rentFrom: "desc" },
  });

  return (
    <div>
      <SetPageContext label="/Leases" context={`Leases list: ${leases.length} leases. User can see property/unit, tenant name, start/end dates, rent amount, and status.`} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Leases</h1>
        <Button asChild>
          <Link href="/leases/new">Add Lease</Link>
        </Button>
      </div>
      {leases.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 mb-4">
            No leases yet. Create your first lease to start tracking rental
            agreements.
          </p>
          <Button asChild>
            <Link href="/leases/new">Add Lease</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="hidden md:block bg-white rounded-lg shadow">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-700">
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
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {l.unit.property.name} — {l.unit.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/tenants/${l.contact.id}`} className="text-blue-600 hover:underline">
                        {l.contact.firstName} {l.contact.lastName}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {l.rentFrom.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {l.rentTo?.toLocaleDateString() || "---"}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      ${Number(l.rentAmount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        className={
                          leaseStatusStyles[l.leaseStatus] ||
                          "bg-gray-100 text-gray-700"
                        }
                      >
                        {leaseStatusLabels[l.leaseStatus] || "Unknown"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-3">
            {leases.map((l) => (
              <Link
                key={l.id}
                href={`/leases/${l.id}`}
                className="block bg-white rounded-lg shadow p-4 active:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900 truncate">
                    {l.unit.property.name} — {l.unit.name}
                  </span>
                  <Badge
                    className={
                      leaseStatusStyles[l.leaseStatus] ||
                      "bg-gray-100 text-gray-700"
                    }
                  >
                    {leaseStatusLabels[l.leaseStatus] || "Unknown"}
                  </Badge>
                </div>
                <div className="text-xs text-gray-500">
                  {l.contact.firstName} {l.contact.lastName}
                </div>
                <div className="text-xs text-gray-500">
                  ${Number(l.rentAmount).toFixed(2)} &middot;{" "}
                  {l.rentFrom.toLocaleDateString()} &middot;{" "}
                  {l.rentTo?.toLocaleDateString() || "---"}
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
