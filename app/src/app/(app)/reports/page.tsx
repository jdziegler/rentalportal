import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SetPageContext } from "@/components/set-page-context";

const reports = [
  {
    name: "Rent Roll",
    description: "All active leases with rent amounts, tenant info, and outstanding balances.",
    href: "/api/reports/rent-roll",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  },
  {
    name: "Income & Expenses",
    description: "Monthly income and expenses broken down by property. Filter by date range.",
    href: "/reports/income-expense",
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  },
  {
    name: "Tenant Statement",
    description: "All charges and payments for a specific tenant. Select tenant to generate.",
    href: "/reports/tenant-statement",
    icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8m13 0l-3 3m0 0l-3-3m3 3V4",
  },
];

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div>
      <SetPageContext label="/Reports" context="Reports page with available report types: Rent Roll (CSV), Income & Expenses (CSV), Tenant Statement." />
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Reports</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => (
          <Link
            key={report.name}
            href={report.href}
            className="bg-white rounded-lg shadow p-6 hover:ring-2 hover:ring-blue-200 transition-shadow group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={report.icon} />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600">
                {report.name}
              </h2>
            </div>
            <p className="text-sm text-gray-600">{report.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
