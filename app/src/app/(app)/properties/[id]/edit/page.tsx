import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { PropertyForm } from "@/components/property-form";
import { updateProperty } from "@/lib/actions/properties";

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  const property = await prisma.property.findUnique({
    where: { id, userId: session.user.id },
  });

  if (!property) notFound();

  const updateWithId = updateProperty.bind(null, id);

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/properties" className="hover:text-gray-700">
          Properties
        </Link>
        <span>/</span>
        <Link href={`/properties/${id}`} className="hover:text-gray-700">
          {property.name}
        </Link>
        <span>/</span>
        <span className="text-gray-900">Edit</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Property</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <PropertyForm
          action={updateWithId}
          defaultValues={{
            name: property.name,
            type: property.type,
            address: property.address || "",
            city: property.city || "",
            state: property.state || "",
            zip: property.zip || "",
            county: property.county || "",
            country: property.country || "US",
            year: property.year || "",
            description: property.description || "",
          }}
          submitLabel="Save Changes"
        />
      </div>
    </div>
  );
}
