import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DeleteTenantButton } from "./delete-button";
import { SetPageContext } from "@/components/set-page-context";
import MessagesSection from "./messages-section";
import { PortalLinkButton, PaymentLinkButton } from "./portal-link-button";
import TenantScreening from "@/components/tenant-screening";
import { TRANSACTION_STATUS, statusLabels as txStatusLabels, statusStyles as txStatusStyles } from "@/lib/transaction-status";
import { getSubcategoryLabel, getSubcategoryColor } from "@/lib/transaction-categories";

const statusLabels: Record<string, string> = {
  PENDING: "Pending",
  INVITED: "Invited",
  ACTIVE: "Active",
  INACTIVE: "Inactive",
};

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  INVITED: "bg-blue-100 text-blue-700",
  ACTIVE: "bg-green-100 text-green-700",
  INACTIVE: "bg-gray-100 text-gray-500",
};

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  const tenant = await prisma.contact.findUnique({
    where: { id, userId: session.user.id, role: "tenant" },
  });

  if (!tenant) notFound();

  const leaseSelect = {
    id: true,
    rentAmount: true,
    startDate: true,
    endDate: true,
    paymentToken: true,
    leaseType: true,
    unit: {
      select: {
        id: true,
        name: true,
        property: { select: { id: true, name: true } },
      },
    },
  } as const;

  // Primary leases (where this contact is the main tenant)
  const primaryLeases = await prisma.lease.findMany({
    where: { contactId: id, userId: session.user.id, leaseStatus: "ACTIVE" },
    select: leaseSelect,
  });

  // Co-tenant leases (via join table, where not primary)
  const coTenantEntries = await prisma.leaseTenant.findMany({
    where: { contactId: id, isPrimary: false, lease: { leaseStatus: "ACTIVE", userId: session.user.id } },
    select: { lease: { select: leaseSelect } },
  });

  // Merge and dedup
  const primaryIds = new Set(primaryLeases.map((l) => l.id));
  const leases = [
    ...primaryLeases,
    ...coTenantEntries.map((lt) => lt.lease).filter((l) => !primaryIds.has(l.id)),
  ];

  // Balance summary: total charges vs total paid
  const balanceAgg = await prisma.transaction.aggregate({
    where: {
      contactId: id,
      userId: session.user.id,
      category: "income",
      status: { in: ["UNPAID", "PAID", "PARTIAL", "PENDING"] }, // exclude voided/waived
    },
    _sum: { amount: true, paidAmount: true, balance: true },
  });

  const totalCharged = Number(balanceAgg._sum.amount || 0);
  const totalPaid = Number(balanceAgg._sum.paidAmount || 0);
  const totalBalance = Number(balanceAgg._sum.balance || 0);

  // Messages
  const messages = await prisma.message.findMany({
    where: { userId: session.user.id, contactId: id },
    orderBy: { createdAt: "asc" },
    select: { id: true, body: true, sender: true, createdAt: true, readAt: true },
  });

  const serializedMessages = messages.map((m) => ({
    id: m.id,
    body: m.body,
    sender: m.sender,
    createdAt: m.createdAt.toISOString(),
    readAt: m.readAt?.toISOString() || null,
  }));

  // Overdue candidates: unpaid/partial income transactions for this tenant
  const overdueCandiatesPromise = prisma.transaction.findMany({
    where: {
      contactId: id,
      userId: session.user.id,
      category: "income",
      status: { in: [TRANSACTION_STATUS.UNPAID, TRANSACTION_STATUS.PARTIAL] },
    },
    include: {
      property: { select: { id: true, name: true } },
      unit: { select: { name: true } },
      lease: { select: { gracePeriod: true } },
    },
    orderBy: { date: "asc" },
  });

  const recentTransactionsPromise = prisma.transaction.findMany({
    where: { contactId: id, userId: session.user.id },
    include: {
      property: { select: { id: true, name: true } },
    },
    orderBy: { date: "desc" },
    take: 5,
  });

  const [overdueCandidates, recentTransactions] = await Promise.all([
    overdueCandiatesPromise,
    recentTransactionsPromise,
  ]);

  // Filter to actually overdue: past due + grace, OR late fees that are unpaid
  const today = new Date();
  const overdueTransactions = overdueCandidates.filter((t) => {
    // Late fees are inherently overdue if unpaid (check subcategory and details fallback)
    const isLateFee = t.subcategory === "late_fee" || (t.details?.toLowerCase().includes("late fee") ?? false);
    if (isLateFee) return true;
    // For other charges: past due date + grace period
    const grace = t.lease?.gracePeriod ?? 5;
    const dueDate = new Date(t.date);
    dueDate.setDate(dueDate.getDate() + grace);
    return dueDate < today;
  });

  const totalOverdue = overdueTransactions.reduce(
    (sum, t) => sum + Number(t.balance),
    0
  );

  const fullName = `${tenant.firstName} ${tenant.lastName}`;
  const address = [tenant.address, tenant.city, tenant.state, tenant.zip]
    .filter(Boolean)
    .join(", ");

  return (
    <div>
      <SetPageContext label={`/${fullName}`} context={`Tenant detail: ${fullName} (ID: ${tenant.id}). Email: ${tenant.email ?? "N/A"}, Phone: ${tenant.phone ?? "N/A"}. ${leases.length} active lease(s)${leases.length > 0 ? `: ${leases.map(l => `${l.unit.property.name} / ${l.unit.name} — $${Number(l.rentAmount)}/mo`).join("; ")}` : ""}. Contact details, leases, and recent transactions visible on screen.`} />
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/tenants" className="hover:text-gray-700">
              Tenants
            </Link>
            <span>/</span>
            <span className="text-gray-900">{fullName}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{fullName}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <PortalLinkButton email={tenant.email} phone={tenant.phone} />
          <Button variant="outline" asChild>
            <Link href={`/tenants/${id}/edit`}>Edit</Link>
          </Button>
          <DeleteTenantButton id={id} name={fullName} />
        </div>
      </div>

      {/* Balance Summary */}
      {totalCharged > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">
              ${totalCharged.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-gray-600">Total Charged</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              ${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-gray-600">Total Paid</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className={`text-2xl font-bold ${totalBalance > 0 ? "text-red-600" : "text-gray-900"}`}>
              ${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-gray-600">Balance Owed</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Details Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Details</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-600">Name</dt>
              <dd className="text-gray-900 font-medium">{fullName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Status</dt>
              <dd>
                <Badge
                  variant="secondary"
                  className={leases.length > 0 ? statusColors["ACTIVE"] : statusColors["INACTIVE"]}
                >
                  {leases.length > 0 ? "Active" : "Inactive"}
                </Badge>
              </dd>
            </div>
            {tenant.email && (
              <div className="flex justify-between">
                <dt className="text-gray-600">Email</dt>
                <dd className="text-gray-900">{tenant.email}</dd>
              </div>
            )}
            {tenant.phone && (
              <div className="flex justify-between">
                <dt className="text-gray-600">Phone</dt>
                <dd className="text-gray-900">{tenant.phone}</dd>
              </div>
            )}
            {address && (
              <div className="flex justify-between">
                <dt className="text-gray-600">Address</dt>
                <dd className="text-gray-900 text-right">{address}</dd>
              </div>
            )}
          </dl>
          {tenant.notes && (
            <>
              <Separator className="my-4" />
              <p className="text-sm text-gray-700">{tenant.notes}</p>
            </>
          )}
        </div>

        {/* Active Leases */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow overflow-x-auto">
          <div className="p-6 pb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Active Leases
            </h2>
          </div>
          {leases.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-gray-500">
              No active leases for this tenant.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-700">
                <tr>
                  <th className="px-6 py-3 font-medium">Property</th>
                  <th className="px-6 py-3 font-medium">Unit</th>
                  <th className="px-6 py-3 font-medium">Rent</th>
                  <th className="px-6 py-3 font-medium">Start</th>
                  <th className="px-6 py-3 font-medium">End</th>
                  <th className="px-6 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leases.map((lease) => (
                  <tr key={lease.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3">
                      {lease.unit?.property ? (
                        <Link href={`/properties/${lease.unit.property.id}`} className="text-blue-600 hover:underline font-medium">
                          {lease.unit.property.name}
                        </Link>
                      ) : "—"}
                    </td>
                    <td className="px-6 py-3">
                      {lease.unit ? (
                        <Link href={`/units/${lease.unit.id}`} className="text-blue-600 hover:underline">
                          {lease.unit.name}
                        </Link>
                      ) : "—"}
                    </td>
                    <td className="px-6 py-3">
                      <Link href={`/leases/${lease.id}`} className="text-blue-600 hover:underline font-medium">
                        ${Number(lease.rentAmount).toLocaleString()}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-gray-700">
                      {lease.startDate.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3 text-gray-700">
                      {lease.endDate
                        ? lease.endDate.toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-6 py-3">
                      <PaymentLinkButton paymentToken={lease.paymentToken} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Overdue Transactions */}
      {overdueTransactions.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow overflow-x-auto border-l-4 border-red-500">
          <div className="flex items-center justify-between p-6 pb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-red-700">
                Overdue
              </h2>
              <Badge variant="secondary" className="bg-red-100 text-red-700">
                {overdueTransactions.length} item{overdueTransactions.length !== 1 ? "s" : ""} &middot; ${totalOverdue.toFixed(2)}
              </Badge>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/transactions?contactId=${id}&status=overdue&range=all_time`}>View All</Link>
            </Button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-red-50 text-left text-red-800">
              <tr>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Details</th>
                <th className="px-6 py-3 font-medium">Property</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Amount</th>
                <th className="px-6 py-3 font-medium text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-red-100">
              {overdueTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-red-50/50">
                  <td className="px-6 py-3 text-gray-700">
                    {t.date.toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <Link href={`/transactions/${t.id}`} className="text-blue-600 hover:underline font-medium">
                        {t.details || "—"}
                      </Link>
                      {t.subcategory && (
                        <Badge variant="secondary" className={`text-xs py-0 ${getSubcategoryColor(t.subcategory)}`}>
                          {getSubcategoryLabel(t.subcategory)}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-gray-700">
                    {t.propertyId && t.property ? (
                      <Link href={`/properties/${t.propertyId}`} className="text-blue-600 hover:underline">
                        {t.property.name}
                      </Link>
                    ) : "—"}
                  </td>
                  <td className="px-6 py-3">
                    <Badge
                      variant="secondary"
                      className={txStatusStyles[t.status] || "bg-gray-100 text-gray-700"}
                    >
                      {txStatusLabels[t.status] || "Unknown"}
                    </Badge>
                  </td>
                  <td className="px-6 py-3 text-right font-medium text-gray-900">
                    ${Number(t.amount).toFixed(2)}
                  </td>
                  <td className="px-6 py-3 text-right font-medium text-red-600">
                    ${Number(t.balance).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recent Transactions */}
      {recentTransactions.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow overflow-x-auto">
          <div className="flex items-center justify-between p-6 pb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Transactions
            </h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/transactions?contactId=${id}`}>View All</Link>
            </Button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-700">
              <tr>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Details</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Amount</th>
                <th className="px-6 py-3 font-medium text-right">Balance</th>
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
                      <div className="flex items-center gap-2">
                        <Link href={`/transactions/${t.id}`} className="text-blue-600 hover:underline font-medium">
                          {t.details || "—"}
                        </Link>
                        {t.subcategory && (
                          <Badge variant="secondary" className={`text-xs py-0 ${getSubcategoryColor(t.subcategory)}`}>
                            {getSubcategoryLabel(t.subcategory)}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <Badge
                        variant="secondary"
                        className={txStatusStyles[t.status] || "bg-gray-100 text-gray-700"}
                      >
                        {txStatusLabels[t.status] || "Unknown"}
                      </Badge>
                    </td>
                    <td
                      className={`px-6 py-3 text-right font-medium ${
                        isIncome ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {isIncome ? "+" : "-"}$
                      {Math.abs(Number(t.amount)).toFixed(2)}
                    </td>
                    <td className="px-6 py-3 text-right text-gray-700">
                      ${Number(t.balance).toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Tenant Screening */}
      <TenantScreening contactId={id} />

      {/* Messages */}
      <MessagesSection contactId={id} initialMessages={serializedMessages} />
    </div>
  );
}
