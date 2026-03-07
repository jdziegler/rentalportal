import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { SetPageContext } from "@/components/set-page-context";

const statusLabels: Record<number, string> = {
  0: "Unpaid",
  1: "Partial",
  2: "Paid",
  3: "Overpaid",
  4: "Voided",
  5: "Waived",
};

const statusColors: Record<number, string> = {
  0: "bg-red-100 text-red-700",
  1: "bg-yellow-100 text-yellow-700",
  2: "bg-green-100 text-green-700",
  3: "bg-blue-100 text-blue-700",
  4: "bg-gray-100 text-gray-500",
  5: "bg-gray-100 text-gray-500",
};

export default async function TenantStatementPage({
  searchParams,
}: {
  searchParams: Promise<{ contactId?: string; tenantId?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;
  const contactId = params.contactId || params.tenantId;

  // Fetch all tenants for the selector
  const tenants = await prisma.contact.findMany({
    where: { userId: session.user.id, role: "tenant" },
    select: { id: true, firstName: true, lastName: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  let tenant = null;
  let transactions: any[] = [];
  let payments: any[] = [];

  if (contactId) {
    tenant = await prisma.contact.findUnique({
      where: { id: contactId, userId: session.user.id, role: "tenant" },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true },
    });

    if (tenant) {
      transactions = await prisma.transaction.findMany({
        where: {
          contactId,
          userId: session.user.id,
          category: "income",
        },
        include: {
          payments: { orderBy: { date: "asc" } },
          property: { select: { name: true } },
          unit: { select: { name: true } },
        },
        orderBy: { date: "asc" },
      });

      // Also get expense transactions (if any)
      const expenses = await prisma.transaction.findMany({
        where: {
          contactId,
          userId: session.user.id,
          category: "expense",
        },
        include: {
          payments: { orderBy: { date: "asc" } },
          property: { select: { name: true } },
          unit: { select: { name: true } },
        },
        orderBy: { date: "asc" },
      });

      transactions = [...transactions, ...expenses].sort(
        (a, b) => a.date.getTime() - b.date.getTime()
      );
    }
  }

  const totalCharged = transactions
    .filter((t) => t.category === "income")
    .reduce((s, t) => s + Number(t.amount), 0);
  const totalPaid = transactions
    .filter((t) => t.category === "income")
    .reduce((s, t) => s + Number(t.paid), 0);
  const totalBalance = totalCharged - totalPaid;

  return (
    <div>
      <SetPageContext label="/Tenant Statement" context="Tenant Statement report page. Select a tenant to view all charges and payments." />

      <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
        <Link href="/reports" className="hover:text-gray-700">Reports</Link>
        <span>/</span>
        <span className="text-gray-900">Tenant Statement</span>
      </div>
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Tenant Statement</h1>

      {/* Tenant Selector */}
      <form className="mb-6 flex items-end gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Select Tenant</label>
          <select
            name="contactId"
            defaultValue={contactId || ""}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64"
          >
            <option value="">Choose a tenant...</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.firstName} {t.lastName}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          Generate
        </button>
        {tenant && (
          <a
            href={`/api/reports/tenant-statement?contactId=${contactId}`}
            className="px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50"
          >
            Download CSV
          </a>
        )}
      </form>

      {/* Statement */}
      {tenant && (
        <>
          {/* Tenant Info */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {tenant.firstName} {tenant.lastName}
                </h2>
                <p className="text-sm text-gray-600">
                  {tenant.email && <span>{tenant.email}</span>}
                  {tenant.email && tenant.phone && <span> &middot; </span>}
                  {tenant.phone && <span>{tenant.phone}</span>}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Balance</p>
                <p className={`text-2xl font-bold ${totalBalance > 0 ? "text-red-600" : "text-green-600"}`}>
                  ${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">
                  ${totalCharged.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500">Total Charged</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-green-600">
                  ${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500">Total Paid</p>
              </div>
              <div className="text-center">
                <p className={`text-lg font-bold ${totalBalance > 0 ? "text-red-600" : "text-gray-900"}`}>
                  ${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500">Outstanding</p>
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-700">
                <tr>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Description</th>
                  <th className="px-6 py-3 font-medium">Property / Unit</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium text-right">Charged</th>
                  <th className="px-6 py-3 font-medium text-right">Paid</th>
                  <th className="px-6 py-3 font-medium text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      No transactions found for this tenant.
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-gray-700">
                        {t.date.toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3">
                        <Link href={`/transactions/${t.id}`} className="text-blue-600 hover:underline">
                          {t.details || "—"}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-gray-700">
                        {t.property?.name || ""}
                        {t.unit?.name ? ` / ${t.unit.name}` : ""}
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant="secondary" className={statusColors[t.status] || ""}>
                          {statusLabels[t.status] || "Unknown"}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-right font-medium">
                        ${Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-3 text-right font-medium text-green-600">
                        ${Number(t.paid).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className={`px-6 py-3 text-right font-medium ${Number(t.balance) > 0 ? "text-red-600" : "text-gray-900"}`}>
                        ${Number(t.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!tenant && !contactId && (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          Select a tenant above to generate their statement.
        </div>
      )}
    </div>
  );
}
