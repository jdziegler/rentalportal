import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DeletePropertyButton } from "./delete-button";
import { SetPageContext } from "@/components/set-page-context";

const propertyTypes: Record<string, string> = {
  SINGLE_FAMILY: "Single Family",
  MULTI_FAMILY: "Multi-Family",
  COMMERCIAL: "Commercial",
};

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  const property = await prisma.property.findUnique({
    where: { id, userId: session.user.id },
    include: {
      units: {
        include: {
          leases: {
            where: { leaseStatus: "ACTIVE" },
            include: { contact: { select: { id: true, firstName: true, lastName: true } } },
            take: 1,
          },
        },
        orderBy: { name: "asc" },
      },
      _count: {
        select: { transactions: true, listings: true },
      },
    },
  });

  if (!property) notFound();

  const occupiedCount = property.units.filter((u) => u.isRented).length;
  const totalUnits = property.units.length;
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedCount / totalUnits) * 100) : 0;
  const totalRent = property.units.reduce(
    (sum, u) => sum + (u.isRented && u.price ? Number(u.price) : 0),
    0
  );

  // Recent transactions for this property
  const recentTransactions = await prisma.transaction.findMany({
    where: { propertyId: id, userId: session.user.id },
    orderBy: { date: "desc" },
    take: 5,
    include: { contact: { select: { id: true, firstName: true, lastName: true } } },
  });

  return (
    <div>
      <SetPageContext label={`/${property.name}`} context={`Property detail: "${property.name}" at ${property.address}, ${property.city}, ${property.state} ${property.zip}. ${totalUnits} units, ${occupancyRate}% occupied, $${totalRent.toLocaleString()}/mo total rent. Property ID: ${property.id}. Unit details, transactions, and listings visible on screen.`} />
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/properties" className="hover:text-gray-700">
              Properties
            </Link>
            <span>/</span>
            <span className="text-gray-900">{property.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{property.name}</h1>
          <p className="text-gray-600 mt-1">
            {[property.address, property.city, property.state, property.zip]
              .filter(Boolean)
              .join(", ")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/properties/${id}/edit`}>Edit</Link>
          </Button>
          <DeletePropertyButton id={id} name={property.name} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Units</p>
          <p className="text-2xl font-bold text-gray-900">{totalUnits}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Occupancy</p>
          <p className="text-2xl font-bold text-gray-900">{occupancyRate}%</p>
          <p className="text-xs text-gray-500">
            {occupiedCount}/{totalUnits} occupied
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Monthly Rent</p>
          <p className="text-2xl font-bold text-gray-900">
            ${totalRent.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Transactions</p>
          <p className="text-2xl font-bold text-gray-900">
            {property._count.transactions}
          </p>
        </div>
      </div>

      {/* Property Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Details card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Details</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-600">Type</dt>
              <dd className="text-gray-900 font-medium">
                {propertyTypes[property.type] || "Unknown"}
              </dd>
            </div>
            {property.year && (
              <div className="flex justify-between">
                <dt className="text-gray-600">Year Built</dt>
                <dd className="text-gray-900">{property.year}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-600">Currency</dt>
              <dd className="text-gray-900">{property.currency}</dd>
            </div>
            {property.county && (
              <div className="flex justify-between">
                <dt className="text-gray-600">County</dt>
                <dd className="text-gray-900">{property.county}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-600">Listings</dt>
              <dd className="text-gray-900">{property._count.listings}</dd>
            </div>
          </dl>
          {property.description && (
            <>
              <Separator className="my-4" />
              <p className="text-sm text-gray-700">{property.description}</p>
            </>
          )}
        </div>

        {/* Right: Units table */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow overflow-x-auto">
          <div className="flex items-center justify-between p-6 pb-4">
            <h2 className="text-lg font-semibold text-gray-900">Units</h2>
            <Button size="sm" asChild>
              <Link href={`/units/new?propertyId=${id}`}>Add Unit</Link>
            </Button>
          </div>
          {property.units.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-gray-500">
              No units yet. Add your first unit to get started.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-700">
                <tr>
                  <th className="px-6 py-3 font-medium">Unit</th>
                  <th className="px-6 py-3 font-medium">Bed/Bath</th>
                  <th className="px-6 py-3 font-medium">Rent</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Tenant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {property.units.map((u) => {
                  const activeLease = u.leases[0];
                  return (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3">
                        <Link
                          href={`/units/${u.id}`}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          {u.name}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-gray-700">
                        {u.bedrooms ?? "—"} / {u.bathrooms ?? "—"}
                      </td>
                      <td className="px-6 py-3 text-gray-900 font-medium">
                        {u.price ? `$${Number(u.price).toLocaleString()}` : "—"}
                      </td>
                      <td className="px-6 py-3">
                        <Badge
                          variant={u.isRented ? "default" : "secondary"}
                          className={
                            u.isRented
                              ? "bg-green-100 text-green-700 hover:bg-green-100"
                              : "bg-yellow-100 text-yellow-700 hover:bg-yellow-100"
                          }
                        >
                          {u.isRented ? "Occupied" : "Vacant"}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-gray-700">
                        {activeLease ? (
                          <Link
                            href={`/tenants/${activeLease.contact.id}`}
                            className="text-blue-600 hover:underline"
                          >
                            {activeLease.contact.firstName} {activeLease.contact.lastName}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
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
              <Link href={`/transactions?propertyId=${id}`}>View All</Link>
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
                      <Link
                        href={`/transactions/${t.id}`}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {t.details || "—"}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-gray-700">
                      {t.contact ? (
                        <Link
                          href={`/tenants/${t.contact.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {t.contact.firstName} {t.contact.lastName}
                        </Link>
                      ) : (
                        "—"
                      )}
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
