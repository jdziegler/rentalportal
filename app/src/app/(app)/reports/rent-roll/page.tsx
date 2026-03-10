import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { SetPageContext } from "@/components/set-page-context";

export default async function RentRollPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const leases = await prisma.lease.findMany({
    where: { userId: session.user.id, leaseStatus: "ACTIVE" },
    include: {
      unit: {
        select: {
          id: true,
          name: true,
          property: { select: { id: true, name: true } },
        },
      },
      contact: {
        select: { id: true, firstName: true, lastName: true, email: true, phone: true },
      },
    },
    orderBy: [
      { unit: { property: { name: "asc" } } },
      { unit: { name: "asc" } },
    ],
  });

  // Get balances per lease
  const leaseIds = leases.map((l) => l.id);
  const balances = await prisma.transaction.groupBy({
    by: ["leaseId"],
    where: {
      leaseId: { in: leaseIds },
      userId: session.user.id,
      category: "income",
      status: { in: ["UNPAID", "PARTIAL"] },
    },
    _sum: { balance: true },
  });

  const balanceMap = new Map(
    balances.map((b) => [b.leaseId, Number(b._sum.balance || 0)])
  );

  const totalRent = leases.reduce((s, l) => s + Number(l.rentAmount), 0);
  const totalOutstanding = leases.reduce((s, l) => s + (balanceMap.get(l.id) || 0), 0);

  function fmt(n: number) {
    return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  return (
    <div>
      <SetPageContext
        label="/Rent Roll"
        context={`Rent Roll report. ${leases.length} active leases. Total monthly rent: $${fmt(totalRent)}. Total outstanding: $${fmt(totalOutstanding)}.`}
      />

      <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
        <Link href="/reports" className="hover:text-gray-700">Reports</Link>
        <span>/</span>
        <span className="text-gray-900">Rent Roll</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Rent Roll</h1>
        <a
          href="/api/reports/rent-roll"
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Export CSV
        </a>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Active Leases</p>
          <p className="text-2xl font-bold text-gray-900">{leases.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Total Monthly Rent</p>
          <p className="text-2xl font-bold text-green-600">${fmt(totalRent)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Outstanding Balance</p>
          <p className={`text-2xl font-bold ${totalOutstanding > 0 ? "text-red-600" : "text-gray-900"}`}>
            ${fmt(totalOutstanding)}
          </p>
        </div>
      </div>

      {leases.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          No active leases found.
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-700">
                <tr>
                  <th className="px-6 py-3 font-medium">Property</th>
                  <th className="px-6 py-3 font-medium">Unit</th>
                  <th className="px-6 py-3 font-medium">Tenant</th>
                  <th className="px-6 py-3 font-medium text-right">Rent</th>
                  <th className="px-6 py-3 font-medium">Due Day</th>
                  <th className="px-6 py-3 font-medium">Lease Period</th>
                  <th className="px-6 py-3 font-medium text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leases.map((l) => {
                  const outstanding = balanceMap.get(l.id) || 0;
                  return (
                    <tr key={l.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3">
                        <Link href={`/properties/${l.unit.property.id}`} className="text-indigo-600 hover:underline">
                          {l.unit.property.name}
                        </Link>
                      </td>
                      <td className="px-6 py-3">
                        <Link href={`/units/${l.unit.id}`} className="text-indigo-600 hover:underline">
                          {l.unit.name}
                        </Link>
                      </td>
                      <td className="px-6 py-3">
                        <Link href={`/tenants/${l.contact.id}`} className="text-indigo-600 hover:underline">
                          {l.contact.firstName} {l.contact.lastName}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-right font-medium">${fmt(Number(l.rentAmount))}</td>
                      <td className="px-6 py-3">{l.rentDueDay}{l.rentDueDay === 1 ? "st" : l.rentDueDay === 2 ? "nd" : l.rentDueDay === 3 ? "rd" : "th"}</td>
                      <td className="px-6 py-3 text-gray-700">
                        {l.startDate.toLocaleDateString()} — {l.endDate ? l.endDate.toLocaleDateString() : "MTM"}
                      </td>
                      <td className={`px-6 py-3 text-right font-medium ${outstanding > 0 ? "text-red-600" : "text-gray-900"}`}>
                        ${fmt(outstanding)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {leases.map((l) => {
              const outstanding = balanceMap.get(l.id) || 0;
              return (
                <Link
                  key={l.id}
                  href={`/leases/${l.id}`}
                  className="block bg-white rounded-lg shadow p-4 active:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{l.unit.property.name} — {l.unit.name}</span>
                    <span className="font-medium text-green-600">${fmt(Number(l.rentAmount))}</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {l.contact.firstName} {l.contact.lastName}
                  </div>
                  {outstanding > 0 && (
                    <div className="text-sm text-red-600 mt-1">
                      Outstanding: ${fmt(outstanding)}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
