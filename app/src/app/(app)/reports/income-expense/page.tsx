import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SetPageContext } from "@/components/set-page-context";
import { IncomeExpenseFilters } from "@/components/income-expense-filters";
import { getSubcategoryLabel } from "@/lib/transaction-categories";

export default async function IncomeExpenseReportPage({
  searchParams,
}: {
  searchParams: Promise<{
    propertyId?: string;
    range?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;

  // Build where clause
  const where: Record<string, unknown> = { userId: session.user.id };

  if (params.propertyId) {
    where.propertyId = params.propertyId;
  }

  // Date range filter
  const range = params.range || "this_year";
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
    where.date = { gte: new Date(now.getFullYear(), now.getMonth(), 1) };
  } else if (range === "last_month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    where.date = { gte: start, lte: end };
  } else if (range === "quarter") {
    const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    where.date = { gte: quarterStart };
  } else if (range === "this_year") {
    where.date = { gte: new Date(now.getFullYear(), 0, 1) };
  } else if (range === "last_year") {
    const start = new Date(now.getFullYear() - 1, 0, 1);
    const end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    where.date = { gte: start, lte: end };
  } else if (range === "all_time") {
    // No date filter
  } else {
    // Default: this year
    where.date = { gte: new Date(now.getFullYear(), 0, 1) };
  }

  // Load properties and transactions in parallel
  const [properties, transactions] = await Promise.all([
    prisma.property.findMany({
      where: { userId: session.user.id, archivedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.transaction.findMany({
      where,
      select: {
        category: true,
        subcategory: true,
        amount: true,
      },
    }),
  ]);

  // Group by category + subcategory
  const incomeGroups = new Map<string, { count: number; total: number }>();
  const expenseGroups = new Map<string, { count: number; total: number }>();

  let totalIncome = 0;
  let totalExpenses = 0;

  for (const t of transactions) {
    const amount = Number(t.amount);
    const subcat = t.subcategory || (t.category === "income" ? "rent" : "other_expense");

    if (t.category === "income") {
      totalIncome += amount;
      const entry = incomeGroups.get(subcat) || { count: 0, total: 0 };
      entry.count++;
      entry.total += amount;
      incomeGroups.set(subcat, entry);
    } else {
      totalExpenses += amount;
      const entry = expenseGroups.get(subcat) || { count: 0, total: 0 };
      entry.count++;
      entry.total += amount;
      expenseGroups.set(subcat, entry);
    }
  }

  const netIncome = totalIncome - totalExpenses;

  // Sort groups by total descending
  const sortedIncome = [...incomeGroups.entries()].sort((a, b) => b[1].total - a[1].total);
  const sortedExpenses = [...expenseGroups.entries()].sort((a, b) => b[1].total - a[1].total);

  // Build CSV URL with current filters
  const csvParams = new URLSearchParams();
  if (params.propertyId) csvParams.set("propertyId", params.propertyId);
  if (range === "custom") {
    if (params.from) csvParams.set("from", params.from);
    if (params.to) csvParams.set("to", params.to);
  } else {
    csvParams.set("range", range);
  }
  const csvUrl = `/api/reports/income-expense?${csvParams.toString()}`;

  function fmt(n: number) {
    return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  return (
    <div>
      <SetPageContext
        label="/Income & Expense Report"
        context={`Income & Expense report. Total Income: $${fmt(totalIncome)}, Total Expenses: $${fmt(totalExpenses)}, Net: $${fmt(netIncome)}. ${transactions.length} transactions.`}
      />

      <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
        <Link href="/reports" className="hover:text-gray-700">Reports</Link>
        <span>/</span>
        <span className="text-gray-900">Income & Expenses</span>
      </div>
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Income & Expense Report</h1>

      {/* Filters */}
      <IncomeExpenseFilters properties={properties} csvUrl={csvUrl} />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Total Income</p>
          <p className="text-2xl font-bold text-green-600">${fmt(totalIncome)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Total Expenses</p>
          <p className="text-2xl font-bold text-red-600">${fmt(totalExpenses)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Net Income</p>
          <p className={`text-2xl font-bold ${netIncome >= 0 ? "text-green-600" : "text-red-600"}`}>
            {netIncome < 0 ? "-" : ""}${fmt(Math.abs(netIncome))}
          </p>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          No transactions found for the selected period. Try adjusting your filters.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Income Section */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 bg-green-50 border-b border-green-100">
              <h2 className="text-lg font-semibold text-green-800">Income</h2>
            </div>
            {sortedIncome.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">No income transactions found.</div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-gray-700">
                      <tr>
                        <th className="px-6 py-3 font-medium">Subcategory</th>
                        <th className="px-6 py-3 font-medium text-right">Transactions</th>
                        <th className="px-6 py-3 font-medium text-right">Total</th>
                        <th className="px-6 py-3 font-medium text-right">% of Income</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {sortedIncome.map(([key, val]) => (
                        <tr key={key} className="hover:bg-gray-50">
                          <td className="px-6 py-3 font-medium text-gray-900">
                            {getSubcategoryLabel(key)}
                          </td>
                          <td className="px-6 py-3 text-right text-gray-700">{val.count}</td>
                          <td className="px-6 py-3 text-right font-medium text-green-600">
                            ${fmt(val.total)}
                          </td>
                          <td className="px-6 py-3 text-right text-gray-500">
                            {totalIncome > 0 ? ((val.total / totalIncome) * 100).toFixed(1) : "0.0"}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-green-50 font-semibold">
                      <tr>
                        <td className="px-6 py-3 text-green-800">Total Income</td>
                        <td className="px-6 py-3 text-right text-green-800">
                          {sortedIncome.reduce((s, [, v]) => s + v.count, 0)}
                        </td>
                        <td className="px-6 py-3 text-right text-green-800">${fmt(totalIncome)}</td>
                        <td className="px-6 py-3 text-right text-green-800">100%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-gray-100">
                  {sortedIncome.map(([key, val]) => (
                    <div key={key} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{getSubcategoryLabel(key)}</p>
                        <p className="text-xs text-gray-500">{val.count} transaction{val.count !== 1 ? "s" : ""}</p>
                      </div>
                      <p className="font-medium text-green-600">${fmt(val.total)}</p>
                    </div>
                  ))}
                  <div className="px-4 py-3 flex items-center justify-between bg-green-50">
                    <p className="font-semibold text-green-800">Total Income</p>
                    <p className="font-semibold text-green-800">${fmt(totalIncome)}</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Expense Section */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 bg-red-50 border-b border-red-100">
              <h2 className="text-lg font-semibold text-red-800">Expenses</h2>
            </div>
            {sortedExpenses.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">No expense transactions found.</div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-gray-700">
                      <tr>
                        <th className="px-6 py-3 font-medium">Subcategory</th>
                        <th className="px-6 py-3 font-medium text-right">Transactions</th>
                        <th className="px-6 py-3 font-medium text-right">Total</th>
                        <th className="px-6 py-3 font-medium text-right">% of Expenses</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {sortedExpenses.map(([key, val]) => (
                        <tr key={key} className="hover:bg-gray-50">
                          <td className="px-6 py-3 font-medium text-gray-900">
                            {getSubcategoryLabel(key)}
                          </td>
                          <td className="px-6 py-3 text-right text-gray-700">{val.count}</td>
                          <td className="px-6 py-3 text-right font-medium text-red-600">
                            ${fmt(val.total)}
                          </td>
                          <td className="px-6 py-3 text-right text-gray-500">
                            {totalExpenses > 0 ? ((val.total / totalExpenses) * 100).toFixed(1) : "0.0"}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-red-50 font-semibold">
                      <tr>
                        <td className="px-6 py-3 text-red-800">Total Expenses</td>
                        <td className="px-6 py-3 text-right text-red-800">
                          {sortedExpenses.reduce((s, [, v]) => s + v.count, 0)}
                        </td>
                        <td className="px-6 py-3 text-right text-red-800">${fmt(totalExpenses)}</td>
                        <td className="px-6 py-3 text-right text-red-800">100%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-gray-100">
                  {sortedExpenses.map(([key, val]) => (
                    <div key={key} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{getSubcategoryLabel(key)}</p>
                        <p className="text-xs text-gray-500">{val.count} transaction{val.count !== 1 ? "s" : ""}</p>
                      </div>
                      <p className="font-medium text-red-600">${fmt(val.total)}</p>
                    </div>
                  ))}
                  <div className="px-4 py-3 flex items-center justify-between bg-red-50">
                    <p className="font-semibold text-red-800">Total Expenses</p>
                    <p className="font-semibold text-red-800">${fmt(totalExpenses)}</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Net Income Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Net Income (Income - Expenses)</p>
                <p className={`text-3xl font-bold ${netIncome >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {netIncome < 0 ? "-" : ""}${fmt(Math.abs(netIncome))}
                </p>
              </div>
              {totalIncome > 0 && (
                <div className="text-right">
                  <p className="text-sm text-gray-600">Profit Margin</p>
                  <p className={`text-2xl font-bold ${netIncome >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {((netIncome / totalIncome) * 100).toFixed(1)}%
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
