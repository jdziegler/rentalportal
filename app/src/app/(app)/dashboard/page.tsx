import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { SetPageContext } from "@/components/set-page-context";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [
    propertyCount,
    unitCount,
    occupiedCount,
    leaseCount,
    tenantCount,
    monthlyIncome,
    monthlyExpenses,
    recentTransactions,
    expiringLeases,
  ] = await Promise.all([
    prisma.property.count({ where: { userId, archivedAt: null } }),
    prisma.unit.count({ where: { property: { userId } } }),
    prisma.unit.count({ where: { property: { userId }, isRented: true } }),
    prisma.lease.count({ where: { userId, leaseStatus: 0 } }),
    prisma.contact.count({ where: { userId, role: "tenant" } }),
    prisma.transaction.aggregate({
      where: { userId, category: "income", date: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, category: "expense", date: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { amount: true },
    }),
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 5,
      include: {
        property: { select: { name: true } },
        contact: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.lease.findMany({
      where: {
        userId,
        leaseStatus: 0,
        rentTo: { gte: now, lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
      },
      include: {
        unit: { select: { name: true, property: { select: { name: true } } } },
        contact: { select: { firstName: true, lastName: true } },
      },
      orderBy: { rentTo: "asc" },
      take: 5,
    }),
  ]);

  const income = Number(monthlyIncome._sum.amount || 0);
  const expenses = Number(monthlyExpenses._sum.amount || 0);
  const occupancyRate = unitCount > 0 ? Math.round((occupiedCount / unitCount) * 100) : 0;

  return (
    <div>
      <SetPageContext context={`Dashboard: ${propertyCount} properties, ${unitCount} units (${occupancyRate}% occupied), ${leaseCount} active leases, ${tenantCount} tenants. MTD income: $${income.toLocaleString()}, expenses: $${expenses.toLocaleString()}.`} />
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard title="Properties" value={propertyCount} href="/properties" />
        <StatCard title="Units" value={unitCount} subtitle={`${occupancyRate}% occupied`} href="/units" />
        <StatCard title="Active Leases" value={leaseCount} href="/leases" />
        <StatCard title="Tenants" value={tenantCount} href="/tenants" />
        <StatCard title="Income (MTD)" value={`$${income.toLocaleString()}`} className="text-green-600" />
        <StatCard title="Expenses (MTD)" value={`$${expenses.toLocaleString()}`} className="text-red-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <div className="flex items-center justify-between p-6 pb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
            <Link href="/transactions" className="text-sm text-blue-600 hover:underline">
              View All
            </Link>
          </div>
          {recentTransactions.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-gray-500">No transactions yet.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {recentTransactions.map((t) => {
                  const isIncome = t.category === "income";
                  return (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-gray-700">
                        {t.date.toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3 text-gray-900">
                        {t.details || t.property?.name || "—"}
                      </td>
                      <td className={`px-6 py-3 text-right font-medium ${isIncome ? "text-green-600" : "text-red-600"}`}>
                        {isIncome ? "+" : "-"}${Math.abs(Number(t.amount)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Expiring Leases */}
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <div className="flex items-center justify-between p-6 pb-4">
            <h2 className="text-lg font-semibold text-gray-900">Leases Expiring Soon</h2>
            <Link href="/leases" className="text-sm text-blue-600 hover:underline">
              View All
            </Link>
          </div>
          {expiringLeases.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-gray-500">No leases expiring in the next 30 days.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {expiringLeases.map((l) => {
                  const daysLeft = Math.ceil(
                    (l.rentTo!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                  );
                  return (
                    <tr key={l.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3">
                        <Link href={`/leases/${l.id}`} className="text-blue-600 hover:underline font-medium">
                          {l.unit.property.name} — {l.unit.name}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-gray-700">
                        {l.contact.firstName} {l.contact.lastName}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <Badge
                          variant="secondary"
                          className={
                            daysLeft <= 7
                              ? "bg-red-100 text-red-700 hover:bg-red-100"
                              : "bg-yellow-100 text-yellow-700 hover:bg-yellow-100"
                          }
                        >
                          {daysLeft} days
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  href,
  className,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  href?: string;
  className?: string;
}) {
  const content = (
    <div className="bg-white rounded-lg shadow p-5">
      <p className="text-sm font-medium text-gray-600">{title}</p>
      <p className={`text-2xl font-bold mt-1 ${className || "text-gray-900"}`}>{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="hover:ring-2 hover:ring-blue-200 rounded-lg transition-shadow">
        {content}
      </Link>
    );
  }
  return content;
}
