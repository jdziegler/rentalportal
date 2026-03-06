import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { SetPageContext } from "@/components/set-page-context";
import { statusLabels } from "@/lib/transaction-status";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  const sevenDaysOut = new Date(now.getTime() + 7 * 86400000);

  const [
    propertyCount,
    unitCount,
    occupiedCount,
    leaseCount,
    tenantCount,
    monthlyIncome,
    monthlyExpenses,
    lastMonthIncome,
    lastMonthExpenses,
    recentTransactions,
    expiringLeases,
    upcomingRent,
    overdueBalances,
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
    prisma.transaction.aggregate({
      where: { userId, category: "income", date: { gte: startOfLastMonth, lte: endOfLastMonth } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, category: "expense", date: { gte: startOfLastMonth, lte: endOfLastMonth } },
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
        rentTo: { gte: now, lte: new Date(now.getTime() + 30 * 86400000) },
      },
      include: {
        unit: { select: { name: true, property: { select: { name: true } } } },
        contact: { select: { firstName: true, lastName: true } },
      },
      orderBy: { rentTo: "asc" },
      take: 5,
    }),
    // Upcoming rent due in next 7 days
    prisma.transaction.findMany({
      where: {
        userId,
        category: "income",
        status: 0, // UNPAID
        date: { gte: now, lte: sevenDaysOut },
      },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        unit: { select: { name: true, property: { select: { name: true } } } },
      },
      orderBy: { date: "asc" },
      take: 5,
    }),
    // Top 5 tenants with overdue balances
    prisma.transaction.groupBy({
      by: ["contactId"],
      where: {
        userId,
        category: "income",
        status: { in: [0, 1] }, // UNPAID or PARTIAL
        balance: { gt: 0 },
        date: { lt: now },
      },
      _sum: { balance: true },
      orderBy: { _sum: { balance: "desc" } },
      take: 5,
    }),
  ]);

  // Fetch contact names for overdue balances
  const overdueContactIds = overdueBalances
    .map((o) => o.contactId)
    .filter((id): id is string => id !== null);
  const overdueContacts = overdueContactIds.length > 0
    ? await prisma.contact.findMany({
        where: { id: { in: overdueContactIds } },
        select: { id: true, firstName: true, lastName: true },
      })
    : [];
  const contactMap = new Map(overdueContacts.map((c) => [c.id, c]));

  const income = Number(monthlyIncome._sum.amount || 0);
  const expenses = Number(monthlyExpenses._sum.amount || 0);
  const lastIncome = Number(lastMonthIncome._sum.amount || 0);
  const lastExpenses = Number(lastMonthExpenses._sum.amount || 0);
  const occupancyRate = unitCount > 0 ? Math.round((occupiedCount / unitCount) * 100) : 0;

  return (
    <div>
      <SetPageContext label="/Dashboard" context={`Dashboard: ${propertyCount} properties, ${unitCount} units (${occupancyRate}% occupied), ${leaseCount} active leases, ${tenantCount} tenants. MTD income: $${income.toLocaleString()}, expenses: $${expenses.toLocaleString()}.`} />
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard title="Properties" value={propertyCount} href="/properties" />
        <StatCard title="Units" value={unitCount} subtitle={`${occupancyRate}% occupied`} href="/units" />
        <StatCard title="Active Leases" value={leaseCount} href="/leases" />
        <StatCard title="Tenants" value={tenantCount} href="/tenants" />
        <StatCard
          title="Income (MTD)"
          value={`$${income.toLocaleString()}`}
          className="text-green-600"
          trend={lastIncome > 0 ? ((income - lastIncome) / lastIncome) * 100 : undefined}
        />
        <StatCard
          title="Expenses (MTD)"
          value={`$${expenses.toLocaleString()}`}
          className="text-red-600"
          trend={lastExpenses > 0 ? ((expenses - lastExpenses) / lastExpenses) * 100 : undefined}
          invertTrend
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Rent Due */}
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <div className="flex items-center justify-between p-6 pb-4">
            <h2 className="text-lg font-semibold text-gray-900">Rent Due (Next 7 Days)</h2>
            <Link href="/transactions" className="text-sm text-blue-600 hover:underline">
              View All
            </Link>
          </div>
          {upcomingRent.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-gray-500">No rent due in the next 7 days.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {upcomingRent.map((t) => {
                  const daysUntil = Math.ceil((t.date.getTime() - now.getTime()) / 86400000);
                  return (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3">
                        <Link href={`/transactions/${t.id}`} className="text-blue-600 hover:underline font-medium">
                          {t.unit?.property?.name ? `${t.unit.property.name} — ${t.unit.name}` : t.details || "Rent"}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-gray-700">
                        {t.contact ? `${t.contact.firstName} ${t.contact.lastName}` : "—"}
                      </td>
                      <td className="px-6 py-3 text-right font-medium text-gray-900">
                        ${Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <Badge
                          variant="secondary"
                          className={
                            daysUntil <= 1
                              ? "bg-red-100 text-red-700 hover:bg-red-100"
                              : daysUntil <= 3
                                ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-100"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-100"
                          }
                        >
                          {daysUntil <= 0 ? "Today" : `${daysUntil}d`}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Overdue Balances */}
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <div className="flex items-center justify-between p-6 pb-4">
            <h2 className="text-lg font-semibold text-gray-900">Overdue Balances</h2>
            <Link href="/transactions" className="text-sm text-blue-600 hover:underline">
              View All
            </Link>
          </div>
          {overdueBalances.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-gray-500">No overdue balances.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {overdueBalances.map((o) => {
                  const contact = o.contactId ? contactMap.get(o.contactId) : null;
                  const bal = Number(o._sum.balance || 0);
                  return (
                    <tr key={o.contactId || "unknown"} className="hover:bg-gray-50">
                      <td className="px-6 py-3">
                        {contact ? (
                          <Link href={`/tenants/${contact.id}`} className="text-blue-600 hover:underline font-medium">
                            {contact.firstName} {contact.lastName}
                          </Link>
                        ) : (
                          <span className="text-gray-500">Unknown</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right font-medium text-red-600">
                        ${bal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

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
                      <td className="px-6 py-3">
                        <Link href={`/transactions/${t.id}`} className="text-blue-600 hover:underline">
                          {t.details || t.property?.name || "—"}
                        </Link>
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
                    (l.rentTo!.getTime() - now.getTime()) / 86400000
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
  trend,
  invertTrend,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  href?: string;
  className?: string;
  trend?: number;
  invertTrend?: boolean;
}) {
  const trendUp = trend !== undefined && trend > 0;
  const trendDown = trend !== undefined && trend < 0;
  // For expenses, down is good (inverted)
  const trendColor = trend !== undefined
    ? invertTrend
      ? trendDown ? "text-green-500" : trendUp ? "text-red-500" : "text-gray-400"
      : trendUp ? "text-green-500" : trendDown ? "text-red-500" : "text-gray-400"
    : "";

  const content = (
    <div className="bg-white rounded-lg shadow p-5">
      <p className="text-sm font-medium text-gray-600">{title}</p>
      <div className="flex items-baseline gap-2">
        <p className={`text-2xl font-bold mt-1 ${className || "text-gray-900"}`}>{value}</p>
        {trend !== undefined && Math.abs(trend) >= 1 && (
          <span className={`text-xs font-medium ${trendColor}`}>
            {trendUp ? "\u2191" : trendDown ? "\u2193" : ""}
            {Math.abs(Math.round(trend))}%
          </span>
        )}
      </div>
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
