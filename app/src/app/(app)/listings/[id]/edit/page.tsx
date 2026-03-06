import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ListingForm } from "@/components/listing-form";
import { updateListing } from "@/lib/actions/listings";

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  const [listing, units] = await Promise.all([
    prisma.listing.findUnique({
      where: { id, userId: session.user.id },
      include: {
        property: { select: { name: true } },
        unit: { select: { name: true } },
      },
    }),
    prisma.unit.findMany({
      where: { property: { userId: session.user.id, archivedAt: null } },
      select: {
        id: true,
        name: true,
        price: true,
        property: { select: { name: true } },
      },
      orderBy: [{ property: { name: "asc" } }, { name: "asc" }],
    }),
  ]);

  if (!listing) notFound();

  const updateWithId = updateListing.bind(null, id);

  const formUnits = units.map((u) => ({
    id: u.id,
    name: u.name,
    propertyName: u.property.name,
    price: u.price ? Number(u.price) : null,
  }));

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/listings" className="hover:text-gray-700">
          Listings
        </Link>
        <span>/</span>
        <Link href={`/listings/${id}`} className="hover:text-gray-700">
          {listing.property.name} — {listing.unit.name}
        </Link>
        <span>/</span>
        <span className="text-gray-900">Edit</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Listing</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <ListingForm
          action={updateWithId}
          defaultValues={{
            unitId: listing.unitId,
            description: listing.description || "",
            price: Number(listing.price),
            isActive: listing.isActive,
          }}
          submitLabel="Save Changes"
          units={formUnits}
        />
      </div>
    </div>
  );
}
