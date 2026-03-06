import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TransactionFilters } from "@/components/transaction-filters";
import { Pagination } from "@/components/pagination";
import { TRANSACTION_STATUS, statusLabels, statusStyles } from "@/lib/transaction-status";
import { getSubcategoryLabel, getSubcategoryColor } from "@/lib/transaction-categories";
import { SetPageContext } from "@/components/set-page-context";

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    category?: string;
    propertyId?: string;
    contactId?: string;
    status?: string;
    range?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;

  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const rawPageSize = parseInt(params.pageSize || "25", 10);
  const pageSize = PAGE_SIZE_OPTIONS.includes(rawPageSize as 25 | 50 | 100)
    ? rawPageSize
    : 25;

  // Build the where clause from filters
  const where: Record<string, unknown> = { userId: session.user.id };

  if (params.category && params.category !== "all") {
    where.category = params.category;
  }
  if (params.propertyId) {
    where.propertyId = params.propertyId;
  }
  if (params.contactId) {
    where.contactId = params.contactId;
  }
  if (params.status && params.status !== "all") {
    where.status = parseInt(params.status, 10);
  }

  // Date range filter — presets or custom
  const range = params.range || "this_month";
  const now = new Date();

  if (range === "custom" && (params.from || params.to)) {
    const dateFilter: Record<string, Date> = {};
    if (params.from) dateFilter.gte = new Date(params.from);
    if (params.to) {
      const toDate = new Date(params.to);
      toDate.setHours(23, 59, 59, 999);
      dateFilter.lte = toDate;
    }
    where.date = dateFilter;
  } else if (range === "this_month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    where.date = { gte: start };
  } else if (range === "last_month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    where.date = { gte: start, lte: end };
  } else if (range === "last_year") {
    const start = new Date(now.getFullYear() - 1, 0, 1);
    const end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    where.date = { gte: start, lte: end };
  } else if (range === "all_time") {
    // No date filter
  } else if (range === "quarter") {
    const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    where.date = { gte: quarterStart };
  } else if (range === "ytd") {
    where.date = { gte: new Date(now.getFullYear(), 0, 1) };
  } else if (range === "year") {
    const yearAgo = new Date(now);
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);
    where.date = { gte: yearAgo };
  } else {
    // Default: this month
    where.date = { gte: new Date(now.getFullYear(), now.getMonth(), 1) };
  }

  // Load properties for the filter dropdown
  const propertiesPromise = prisma.property.findMany({
    where: { userId: session.user.id, archivedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // Get total count for pagination
  const countPromise = prisma.transaction.count({ where });

  // Get paginated transactions
  const skip = (page - 1) * pageSize;
  const transactionsPromise = prisma.transaction.findMany({
    where,
    include: {
      property: { select: { name: true } },
      unit: { select: { name: true } },
      contact: { select: { firstName: true, lastName: true } },
    },
    orderBy: { date: "desc" },
    skip,
    take: pageSize,
  });

  // Paid: sum of paid field on income transactions with status Paid (2)
  const paidAggPromise = prisma.transaction.aggregate({
    where: { ...where, category: "income", status: TRANSACTION_STATUS.PAID },
    _sum: { paid: true },
  });

  // Outstanding: balance on unpaid/partial income transactions
  const outstandingPromise = prisma.transaction.aggregate({
    where: { ...where, category: "income", status: { in: [0, 1] } },
    _sum: { balance: true },
  });

  // Overdue: unpaid/partial income transactions past due date + grace period
  // Must be computed per-transaction since grace period varies by lease
  const overdueTransactionsPromise = prisma.transaction.findMany({
    where: { ...where, category: "income", status: { in: [0, 1] } },
    select: { balance: true, date: true, lease: { select: { gracePeriod: true } } },
  });

  const [properties, totalCount, transactions, paidAgg, outstandingAgg, overdueTransactions] =
    await Promise.all([
      propertiesPromise,
      countPromise,
      transactionsPromise,
      paidAggPromise,
      outstandingPromise,
      overdueTransactionsPromise,
    ]);

  const totalPaid = Number(paidAgg._sum.paid ?? 0);
  const totalOutstanding = Number(outstandingAgg._sum.balance ?? 0);

  const today = new Date();
  const totalOverdue = overdueTransactions.reduce((sum, t) => {
    const graceDays = t.lease?.gracePeriod ?? 5;
    const dueDate = new Date(t.date);
    dueDate.setDate(dueDate.getDate() + graceDays);
    return dueDate < today ? sum + Number(t.balance) : sum;
  }, 0);

  return (
    <div>
      <SetPageContext label="/Transactions" context={`Transactions list: ${transactions.length} shown (page ${page}). Paid: $${totalPaid.toLocaleString()}, Outstanding: $${totalOutstanding.toLocaleString()}, Overdue: $${totalOverdue.toLocaleString()}. User can see date, details, property, tenant, status, amount, and balance.`} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <Button asChild>
          <Link href="/transactions/new">Add Transaction</Link>
        </Button>
      </div>

      {/* Totals Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Paid</p>
          <p className="text-2xl font-bold text-green-600">
            ${totalPaid.toFixed(2)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Outstanding</p>
          <p className={`text-2xl font-bold ${totalOutstanding > 0 ? "text-orange-600" : "text-gray-600"}`}>
            ${totalOutstanding.toFixed(2)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Overdue</p>
          <p className={`text-2xl font-bold ${totalOverdue > 0 ? "text-red-600" : "text-gray-600"}`}>
            ${totalOverdue.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <TransactionFilters properties={properties} />

      {transactions.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-600 mb-4">
            No transactions found. Try adjusting your filters or add a new
            transaction.
          </p>
          <Button asChild>
            <Link href="/transactions/new">Add Transaction</Link>
          </Button>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-lg shadow">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-700">
                <tr>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Details</th>
                  <th className="px-6 py-3 font-medium">Property / Unit</th>
                  <th className="px-6 py-3 font-medium">Contact</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium text-right">Amount</th>
                  <th className="px-6 py-3 font-medium text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.map((t) => {
                  const isIncome = t.category === "income";
                  return (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-gray-700">
                        {t.date.toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/transactions/${t.id}`}
                            className="text-blue-600 hover:underline font-medium"
                          >
                            {t.details || "\u2014"}
                          </Link>
                          {t.subcategory && (
                            <Badge variant="secondary" className={`text-xs py-0 ${getSubcategoryColor(t.subcategory)}`}>
                              {getSubcategoryLabel(t.subcategory)}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {t.property?.name || "\u2014"}
                        {t.unit ? ` \u2014 ${t.unit.name}` : ""}
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {t.contact
                          ? `${t.contact.firstName} ${t.contact.lastName}`
                          : "\u2014"}
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant="secondary"
                          className={statusStyles[t.status] || "bg-gray-100 text-gray-700"}
                        >
                          {statusLabels[t.status] || "Unknown"}
                        </Badge>
                      </td>
                      <td
                        className={`px-6 py-4 text-right font-medium ${
                          isIncome ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {isIncome ? "+" : "-"}$
                        {Math.abs(Number(t.amount)).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-700">
                        ${Number(t.balance).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {transactions.map((t) => {
              const isIncome = t.category === "income";
              return (
                <Link
                  key={t.id}
                  href={`/transactions/${t.id}`}
                  className="block bg-white rounded-lg shadow p-4 active:bg-gray-50"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="font-medium text-gray-900 truncate">
                      {t.details || `Transaction #${t.id.slice(0, 8)}`}
                    </div>
                    <span
                      className={`text-sm font-semibold whitespace-nowrap ${
                        isIncome ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {isIncome ? "+" : "-"}${Math.abs(Number(t.amount)).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span>{t.date.toLocaleDateString()}</span>
                    <span>&middot;</span>
                    <Badge
                      variant="secondary"
                      className={`text-xs py-0 ${statusStyles[t.status] || "bg-gray-100 text-gray-700"}`}
                    >
                      {statusLabels[t.status] || "Unknown"}
                    </Badge>
                    {t.subcategory && (
                      <>
                        <span>&middot;</span>
                        <Badge variant="secondary" className={`text-xs py-0 ${getSubcategoryColor(t.subcategory)}`}>
                          {getSubcategoryLabel(t.subcategory)}
                        </Badge>
                      </>
                    )}
                    {Number(t.balance) > 0 && (
                      <>
                        <span>&middot;</span>
                        <span className="text-orange-600">Bal: ${Number(t.balance).toFixed(2)}</span>
                      </>
                    )}
                  </div>
                  {(t.property?.name || t.contact) && (
                    <div className="text-xs text-gray-500 mt-1 truncate">
                      {t.property?.name || ""}
                      {t.unit ? ` \u2014 ${t.unit.name}` : ""}
                      {t.contact ? ` \u2022 ${t.contact.firstName} ${t.contact.lastName}` : ""}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </>
      )}

      {/* Pagination */}
      <Pagination totalCount={totalCount} page={page} pageSize={pageSize} />
    </div>
  );
}
