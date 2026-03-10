import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DeleteUnitButton } from "./delete-button";
import { SetPageContext } from "@/components/set-page-context";

const unitTypes: Record<string, string> = {
  APARTMENT: "Apartment",
  HOUSE: "House",
  ROOM: "Room",
};

export default async function UnitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  const unit = await prisma.unit.findUnique({
    where: { id, property: { userId: session.user.id } },
    include: {
      property: { select: { id: true, name: true } },
      leases: {
        where: { leaseStatus: "ACTIVE" },
        include: { contact: { select: { id: true, firstName: true, lastName: true } } },
        take: 1,
      },
    },
  });

  if (!unit) notFound();

  const activeLease = unit.leases[0] ?? null;

  // Calculate days vacant
  let vacantDays = 0;
  if (!unit.isRented) {
    const lastLease = await prisma.lease.findFirst({
      where: { unitId: id, leaseStatus: { in: ["EXPIRED", "TERMINATED"] } },
      orderBy: { updatedAt: "desc" },
      select: { endDate: true, updatedAt: true },
    });
    if (lastLease) {
      const vacantSince = lastLease.endDate || lastLease.updatedAt;
      vacantDays = Math.floor((Date.now() - vacantSince.getTime()) / 86400000);
    }
  }

  // Recent transactions for this unit
  const recentTransactions = await prisma.transaction.findMany({
    where: { unitId: id, userId: session.user.id },
    orderBy: { date: "desc" },
    take: 5,
    include: { contact: { select: { id: true, firstName: true, lastName: true } } },
  });

  return (
    <div>
      <SetPageContext label={`/${unit.name}`} context={`Unit detail: "${unit.name}" at property "${unit.property.name}". ${unit.bedrooms ?? "?"}bd/${unit.bathrooms ?? "?"}ba, rent $${unit.price ?? "N/A"}/mo. ${unit.isRented ? `Occupied — tenant: ${activeLease?.contact.firstName} ${activeLease?.contact.lastName}` : "Vacant"}. Unit ID: ${unit.id}. Lease and transaction details visible on screen.`} />
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/units" className="hover:text-gray-700">
              Units
            </Link>
            <span>/</span>
            <span className="text-gray-900">{unit.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{unit.name}</h1>
          <p className="text-gray-600 mt-1">
            <Link
              href={`/properties/${unit.property.id}`}
              className="text-indigo-600 hover:underline"
            >
              {unit.property.name}
            </Link>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/units/${id}/edit`}>Edit</Link>
          </Button>
          <DeleteUnitButton id={id} name={unit.name} />
        </div>
      </div>

      {/* Details and Lease */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Details card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Details</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-600">Type</dt>
              <dd className="text-gray-900 font-medium">
                {unitTypes[unit.type] || "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Bedrooms</dt>
              <dd className="text-gray-900">{unit.bedrooms ?? "\u2014"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Bathrooms</dt>
              <dd className="text-gray-900">{unit.bathrooms ?? "\u2014"}</dd>
            </div>
            {unit.size && (
              <div className="flex justify-between">
                <dt className="text-gray-600">Size</dt>
                <dd className="text-gray-900">{unit.size} sqft</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-600">Monthly Rent</dt>
              <dd className="text-gray-900 font-medium">
                {unit.price ? `$${Number(unit.price).toLocaleString()}` : "\u2014"}
              </dd>
            </div>
            {unit.deposit && (
              <div className="flex justify-between">
                <dt className="text-gray-600">Deposit</dt>
                <dd className="text-gray-900">
                  ${Number(unit.deposit).toLocaleString()}
                </dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-600">Pets Allowed</dt>
              <dd className="text-gray-900">{unit.petsAllowed ? "Yes" : "No"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Status</dt>
              <dd>
                <Badge
                  variant="secondary"
                  className={
                    unit.isRented
                      ? "bg-green-100 text-green-700 hover:bg-green-100"
                      : "bg-yellow-100 text-yellow-700 hover:bg-yellow-100"
                  }
                >
                  {unit.isRented ? "Occupied" : "Vacant"}
                </Badge>
              </dd>
            </div>
            {!unit.isRented && vacantDays > 0 && (
              <div className="flex justify-between">
                <dt className="text-gray-600">Days Vacant</dt>
                <dd className={`font-medium ${vacantDays > 30 ? "text-red-600" : vacantDays > 14 ? "text-yellow-600" : "text-gray-900"}`}>
                  {vacantDays} days
                </dd>
              </div>
            )}
          </dl>
          {unit.description && (
            <>
              <Separator className="my-4" />
              <p className="text-sm text-gray-700">{unit.description}</p>
            </>
          )}
        </div>

        {/* Right: Active Lease */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Active Lease
          </h2>
          {activeLease ? (
            <>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-600">Tenant</dt>
                  <dd>
                    <Link href={`/tenants/${activeLease.contactId}`} className="text-gray-900 font-medium hover:text-indigo-600">
                      {activeLease.contact.firstName} {activeLease.contact.lastName}
                    </Link>
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Rent Amount</dt>
                  <dd className="text-gray-900">
                    ${Number(activeLease.rentAmount).toLocaleString()}/mo
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Lease Start</dt>
                  <dd className="text-gray-900">
                    {activeLease.startDate.toLocaleDateString()}
                  </dd>
                </div>
                {activeLease.endDate && (
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Lease End</dt>
                    <dd className="text-gray-900">
                      {activeLease.endDate.toLocaleDateString()}
                    </dd>
                  </div>
                )}
              </dl>
              <div className="mt-4">
                <Link href={`/leases/${activeLease.id}`} className="text-sm text-indigo-600 hover:underline">
                  View Lease →
                </Link>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">
              No active lease for this unit.
            </p>
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
              <Link href={`/transactions?unitId=${id}`}>View All</Link>
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
                      <Link href={`/transactions/${t.id}`} className="text-gray-900 font-medium hover:text-indigo-600">
                        {t.details || "\u2014"}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-gray-700">
                      {t.contact
                        ? <Link href={`/tenants/${t.contact.id}`} className="text-gray-900 font-medium hover:text-indigo-600">{t.contact.firstName} {t.contact.lastName}</Link>
                        : "\u2014"}
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
