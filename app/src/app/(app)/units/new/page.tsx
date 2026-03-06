import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { UnitForm } from "@/components/unit-form";
import { createUnit } from "@/lib/actions/units";

export default async function NewUnitPage({
  searchParams,
}: {
  searchParams: Promise<{ propertyId?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { propertyId } = await searchParams;

  const properties = await prisma.property.findMany({
    where: { userId: session.user.id, archivedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/units" className="hover:text-gray-700">
          Units
        </Link>
        <span>/</span>
        <span className="text-gray-900">New</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add Unit</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <UnitForm
          action={createUnit}
          defaultValues={{ propertyId: propertyId || "" }}
          submitLabel="Create Unit"
          properties={properties}
        />
      </div>
    </div>
  );
}
