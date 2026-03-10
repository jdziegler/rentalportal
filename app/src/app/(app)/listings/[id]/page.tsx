import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DeleteListingButton } from "./delete-button";
import { ToggleActiveButton } from "./toggle-active-button";
import { SetPageContext } from "@/components/set-page-context";

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  const listing = await prisma.listing.findUnique({
    where: { id, userId: session.user.id },
    include: {
      property: { select: { id: true, name: true, address: true, city: true, state: true } },
      unit: {
        select: {
          id: true,
          name: true,
          bedrooms: true,
          bathrooms: true,
          size: true,
          price: true,
          features: true,
          petsAllowed: true,
        },
      },
    },
  });

  if (!listing) notFound();

  return (
    <div>
      <SetPageContext
        label={`/${listing.property.name} — ${listing.unit.name}`}
        context={`Listing for ${listing.property.name} — ${listing.unit.name}. Price: $${Number(listing.price)}/mo. Status: ${listing.isActive ? "Active" : "Inactive"}. ${listing.description || "No description."}`}
      />
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/listings" className="hover:text-gray-700">
              Listings
            </Link>
            <span>/</span>
            <span className="text-gray-900">
              {listing.property.name} — {listing.unit.name}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {listing.property.name} — {listing.unit.name}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge
              variant="secondary"
              className={
                listing.isActive
                  ? "bg-green-100 text-green-700 hover:bg-green-100"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-100"
              }
            >
              {listing.isActive ? "Active" : "Inactive"}
            </Badge>
            <span className="text-2xl font-bold text-indigo-600">
              ${Number(listing.price).toFixed(0)}/mo
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <ToggleActiveButton id={id} isActive={listing.isActive} />
          <Button variant="outline" asChild>
            <Link href={`/listings/${id}/edit`}>Edit</Link>
          </Button>
          <DeleteListingButton id={id} />
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Description */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Description
          </h2>
          {listing.description ? (
            <div
              className="text-gray-700 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: listing.description }}
            />
          ) : (
            <p className="text-gray-500 italic">No description provided.</p>
          )}
        </div>

        {/* Info sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Property
            </h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600">Property</dt>
                <dd>
                  <Link
                    href={`/properties/${listing.property.id}`}
                    className="text-indigo-600 hover:underline"
                  >
                    {listing.property.name}
                  </Link>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Unit</dt>
                <dd>
                  <Link
                    href={`/units/${listing.unit.id}`}
                    className="text-indigo-600 hover:underline"
                  >
                    {listing.unit.name}
                  </Link>
                </dd>
              </div>
              {listing.property.address && (
                <div className="flex justify-between">
                  <dt className="text-gray-600">Address</dt>
                  <dd className="text-gray-900 text-right">
                    {[listing.property.address, listing.property.city, listing.property.state]
                      .filter(Boolean)
                      .join(", ")}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Unit Details
            </h2>
            <dl className="space-y-3 text-sm">
              {listing.unit.bedrooms != null && (
                <div className="flex justify-between">
                  <dt className="text-gray-600">Bedrooms</dt>
                  <dd className="text-gray-900">{listing.unit.bedrooms}</dd>
                </div>
              )}
              {listing.unit.bathrooms != null && (
                <div className="flex justify-between">
                  <dt className="text-gray-600">Bathrooms</dt>
                  <dd className="text-gray-900">{listing.unit.bathrooms}</dd>
                </div>
              )}
              {listing.unit.size != null && (
                <div className="flex justify-between">
                  <dt className="text-gray-600">Size</dt>
                  <dd className="text-gray-900">{listing.unit.size} sq ft</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray-600">Pets Allowed</dt>
                <dd className="text-gray-900">
                  {listing.unit.petsAllowed ? "Yes" : "No"}
                </dd>
              </div>
            </dl>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600">Created</dt>
                <dd className="text-gray-900">
                  {listing.createdAt.toLocaleDateString()}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Updated</dt>
                <dd className="text-gray-900">
                  {listing.updatedAt.toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
