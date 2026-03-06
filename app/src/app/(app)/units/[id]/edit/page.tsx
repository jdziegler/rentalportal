import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { UnitForm } from "@/components/unit-form";
import { updateUnit } from "@/lib/actions/units";

export default async function EditUnitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  const unit = await prisma.unit.findUnique({
    where: { id, property: { userId: session.user.id } },
  });

  if (!unit) notFound();

  const properties = await prisma.property.findMany({
    where: { userId: session.user.id, archivedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const updateWithId = updateUnit.bind(null, id);

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/units" className="hover:text-gray-700">
          Units
        </Link>
        <span>/</span>
        <Link href={`/units/${id}`} className="hover:text-gray-700">
          {unit.name}
        </Link>
        <span>/</span>
        <span className="text-gray-900">Edit</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Unit</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <UnitForm
          action={updateWithId}
          defaultValues={{
            name: unit.name,
            propertyId: unit.propertyId,
            type: unit.type,
            bedrooms: unit.bedrooms,
            bathrooms: unit.bathrooms,
            size: unit.size,
            price: unit.price ? Number(unit.price) : null,
            deposit: unit.deposit ? Number(unit.deposit) : null,
            description: unit.description || "",
            petsAllowed: unit.petsAllowed,
          }}
          submitLabel="Save Changes"
          properties={properties}
        />
      </div>
    </div>
  );
}
