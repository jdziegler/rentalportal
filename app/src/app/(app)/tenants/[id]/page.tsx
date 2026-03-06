import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DeleteTenantButton } from "./delete-button";
import { SetPageContext } from "@/components/set-page-context";

const statusLabels: Record<number, string> = {
  0: "Pending",
  1: "Invited",
  2: "Active",
  3: "Inactive",
};

const statusColors: Record<number, string> = {
  0: "bg-yellow-100 text-yellow-700",
  1: "bg-blue-100 text-blue-700",
  2: "bg-green-100 text-green-700",
  3: "bg-gray-100 text-gray-500",
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

  const leases = await prisma.lease.findMany({
    where: { contactId: id, userId: session.user.id, leaseStatus: 0 },
    include: {
      unit: {
        select: {
          id: true,
          name: true,
          property: { select: { id: true, name: true } },
        },
      },
    },
  });

  const recentTransactions = await prisma.transaction.findMany({
    where: { contactId: id, userId: session.user.id },
    orderBy: { date: "desc" },
    take: 5,
  });

  const fullName = `${tenant.firstName} ${tenant.lastName}`;
  const address = [tenant.address, tenant.city, tenant.state, tenant.zip]
    .filter(Boolean)
    .join(", ");

  return (
    <div>
      <SetPageContext context={`Tenant detail: ${fullName} (ID: ${tenant.id}). Email: ${tenant.email ?? "N/A"}, Phone: ${tenant.phone ?? "N/A"}. ${leases.length} active lease(s)${leases.length > 0 ? `: ${leases.map(l => `${l.unit.property.name} / ${l.unit.name} — $${Number(l.rentAmount)}/mo`).join("; ")}` : ""}. Contact details, leases, and recent transactions visible on screen.`} />
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
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/tenants/${id}/edit`}>Edit</Link>
          </Button>
          <DeleteTenantButton id={id} name={fullName} />
        </div>
      </div>

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
                  className={statusColors[tenant.status] || ""}
                >
                  {statusLabels[tenant.status] || "Unknown"}
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
                      {lease.rentFrom.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3 text-gray-700">
                      {lease.rentTo
                        ? lease.rentTo.toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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
              <Link href={`/transactions?contactId=${id}`}>View All</Link>
            </Button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-700">
              <tr>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Details</th>
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
