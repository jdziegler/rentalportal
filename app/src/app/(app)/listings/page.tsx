import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ListingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const listings = await prisma.listing.findMany({
    where: { userId: session.user.id },
    include: {
      property: { select: { name: true } },
      unit: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Listings</h1>
        <Link
          href="/listings/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          Create Listing
        </Link>
      </div>
      {listings.length === 0 ? (
        <p className="text-gray-500">No listings yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((l) => (
            <Link
              key={l.id}
              href={`/listings/${l.id}`}
              className="bg-white rounded-lg shadow hover:shadow-md transition overflow-hidden"
            >
              <div className="p-6">
                <h3 className="font-semibold text-lg mb-1 text-gray-900">
                  {l.property.name} — {l.unit.name}
                </h3>
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                  {l.description || "No description"}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold text-blue-600">
                    ${Number(l.price).toFixed(0)}/mo
                  </span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      l.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {l.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
