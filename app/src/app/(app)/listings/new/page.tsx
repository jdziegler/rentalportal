import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ListingForm } from "@/components/listing-form";
import { createListing } from "@/lib/actions/listings";

export default async function NewListingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const units = await prisma.unit.findMany({
    where: { property: { userId: session.user.id, archivedAt: null } },
    select: {
      id: true,
      name: true,
      price: true,
      property: { select: { name: true } },
    },
    orderBy: [{ property: { name: "asc" } }, { name: "asc" }],
  });

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
        <span className="text-gray-900">New Listing</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Create Listing
      </h1>
      <div className="bg-white rounded-lg shadow p-6">
        <ListingForm
          action={createListing}
          submitLabel="Create Listing"
          units={formUnits}
        />
      </div>
    </div>
  );
}
