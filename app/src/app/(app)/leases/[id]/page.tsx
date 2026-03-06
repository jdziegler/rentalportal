import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DeleteLeaseButton } from "./delete-button";
import { terminateLease, renewLease } from "@/lib/actions/leases";
import { SetPageContext } from "@/components/set-page-context";

const leaseTypeLabels: Record<number, string> = {
  1: "Fixed",
  2: "Month-to-Month",
};

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

export default async function LeaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  const lease = await prisma.lease.findUnique({
    where: { id, userId: session.user.id },
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
  });

  if (!lease) notFound();

  const propertyName = lease.unit.property.name;
  const unitName = lease.unit.name;
  const tenantName = `${lease.contact.firstName} ${lease.contact.lastName}`;
  const leaseName = lease.name || `${propertyName} - ${unitName}`;

  // Recent transactions for this lease
  const recentTransactions = await prisma.transaction.findMany({
    where: { leaseId: id, userId: session.user.id },
    orderBy: { date: "desc" },
    take: 5,
    include: { contact: { select: { firstName: true, lastName: true } } },
  });

  const terminateWithId = terminateLease.bind(null, id);
  const renewWithId = renewLease.bind(null, id);

  const leaseStatusLabel = leaseStatusLabels[lease.leaseStatus] ?? "Unknown";

  return (
    <div>
      <SetPageContext label={`/${leaseName}`} context={`Lease detail: "${leaseName}" — ${leaseStatusLabel}. Tenant: ${tenantName} (ID: ${lease.contact.id}). Property: ${propertyName}, Unit: ${unitName}. Rent: $${Number(lease.rentAmount).toLocaleString()}/mo, due day ${lease.rentDueDay}, grace ${lease.gracePeriod} days. Period: ${lease.rentFrom.toISOString().split("T")[0]} to ${lease.rentTo ? lease.rentTo.toISOString().split("T")[0] : "month-to-month"}. Lease ID: ${lease.id}. Full details and recent transactions visible on screen.`} />
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/leases" className="hover:text-gray-700">
              Leases
            </Link>
            <span>/</span>
            <span className="text-gray-900">
              {propertyName} - {unitName}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{leaseName}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge
              className={
                leaseStatusStyles[lease.leaseStatus] ||
                "bg-gray-100 text-gray-700"
              }
            >
              {leaseStatusLabels[lease.leaseStatus] || "Unknown"}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/leases/${id}/edit`}>Edit</Link>
          </Button>
          {lease.leaseStatus === 0 && (
            <>
              <form action={renewWithId}>
                <Button type="submit" variant="outline">
                  Renew
                </Button>
              </form>
              <form action={terminateWithId}>
                <Button type="submit" variant="outline">
                  Terminate
                </Button>
              </form>
            </>
          )}
          <DeleteLeaseButton id={id} name={leaseName} />
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Lease Details card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Lease Details
          </h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-600">Lease Type</dt>
              <dd className="text-gray-900 font-medium">
                {leaseTypeLabels[lease.leaseType] || "Unknown"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Status</dt>
              <dd className="text-gray-900 font-medium">
                {leaseStatusLabels[lease.leaseStatus] || "Unknown"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Rent Amount</dt>
              <dd className="text-gray-900 font-medium">
                ${Number(lease.rentAmount).toFixed(2)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Due Day</dt>
              <dd className="text-gray-900">
                {lease.rentDueDay}{ordinalSuffix(lease.rentDueDay)} of each month
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Grace Period</dt>
              <dd className="text-gray-900">
                {lease.gracePeriod} days
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Start Date</dt>
              <dd className="text-gray-900">
                {lease.rentFrom.toLocaleDateString()}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">End Date</dt>
              <dd className="text-gray-900">
                {lease.rentTo?.toLocaleDateString() || "---"}
              </dd>
            </div>
            {lease.deposit && (
              <div className="flex justify-between">
                <dt className="text-gray-600">Deposit</dt>
                <dd className="text-gray-900">
                  ${Number(lease.deposit).toFixed(2)}
                </dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-600">Currency</dt>
              <dd className="text-gray-900">{lease.currency}</dd>
            </div>
          </dl>

          {/* Late Fee Config */}
          <div className="border-t mt-4 pt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Late Fees</h3>
            {lease.lateFeeEnabled ? (
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-600">Type</dt>
                  <dd className="text-gray-900">
                    {lease.lateFeeType === "percentage"
                      ? `${Number(lease.lateFeeAmount)}% of rent`
                      : `$${Number(lease.lateFeeAmount).toFixed(2)} flat`}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Accrual</dt>
                  <dd className="text-gray-900">
                    {lease.lateFeeAccrual === "daily" ? "Daily" : "One-time"}
                  </dd>
                </div>
                {lease.lateFeeMaxAmount && (
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Max Amount</dt>
                    <dd className="text-gray-900">
                      ${Number(lease.lateFeeMaxAmount).toFixed(2)}
                    </dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="text-sm text-gray-500">Not configured</p>
            )}
          </div>
        </div>

        {/* Right: Property/Unit & Tenant info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Property / Unit */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Property / Unit
            </h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600">Property</dt>
                <dd>
                  <Link
                    href={`/properties/${lease.unit.property.id}`}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    {propertyName}
                  </Link>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Unit</dt>
                <dd>
                  <Link
                    href={`/units/${lease.unit.id}`}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    {unitName}
                  </Link>
                </dd>
              </div>
            </dl>
          </div>

          {/* Tenant */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Tenant
            </h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600">Name</dt>
                <dd>
                  <Link
                    href={`/tenants/${lease.contact.id}`}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    {tenantName}
                  </Link>
                </dd>
              </div>
              {lease.contact.email && (
                <div className="flex justify-between">
                  <dt className="text-gray-600">Email</dt>
                  <dd className="text-gray-900">{lease.contact.email}</dd>
                </div>
              )}
              {lease.contact.phone && (
                <div className="flex justify-between">
                  <dt className="text-gray-600">Phone</dt>
                  <dd className="text-gray-900">{lease.contact.phone}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      {recentTransactions.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow overflow-x-auto">
          <div className="flex items-center justify-between p-6 pb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Transactions
            </h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/transactions?leaseId=${id}`}>View All</Link>
            </Button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-700">
              <tr>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Details</th>
                <th className="px-6 py-3 font-medium">Contact</th>
                <th className="px-6 py-3 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentTransactions.map((t) => {
                const isIncome = t.category === "income";
                return (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-gray-700">
                      {t.date.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3">
                      <Link href={`/transactions/${t.id}`} className="text-blue-600 hover:underline font-medium">
                        {t.details || "—"}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-gray-700">
                      {t.contact
                        ? `${t.contact.firstName} ${t.contact.lastName}`
                        : "—"}
                    </td>
                    <td
                      className={`px-6 py-3 text-right font-medium ${
                        isIncome ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {isIncome ? "+" : "-"}$
                      {Math.abs(Number(t.amount)).toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ordinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
