import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { MaintenanceForm } from "@/components/maintenance-form";
import { updateMaintenanceRequest } from "@/lib/actions/maintenance";

export default async function EditMaintenancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  const [request, properties, units, tenants] = await Promise.all([
    prisma.maintenanceRequest.findUnique({
      where: { id, userId: session.user.id },
    }),
    prisma.property.findMany({
      where: { userId: session.user.id, archivedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.unit.findMany({
      where: { property: { userId: session.user.id } },
      select: { id: true, name: true, propertyId: true },
      orderBy: { name: "asc" },
    }),
    prisma.contact.findMany({
      where: { userId: session.user.id, role: "tenant" },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { lastName: "asc" },
    }),
  ]);

  if (!request) notFound();

  const updateWithId = updateMaintenanceRequest.bind(null, id);

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/maintenance" className="hover:text-gray-700">
          Maintenance
        </Link>
        <span>/</span>
        <Link href={`/maintenance/${id}`} className="hover:text-gray-700">
          {request.title}
        </Link>
        <span>/</span>
        <span className="text-gray-900">Edit</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Request</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <MaintenanceForm
          action={updateWithId}
          defaultValues={{
            title: request.title,
            description: request.description || "",
            priority: request.priority,
            category: request.category || "general",
            propertyId: request.propertyId,
            unitId: request.unitId || "",
            contactId: request.contactId || "",
          }}
          submitLabel="Save Changes"
          properties={properties}
          units={units}
          tenants={tenants}
        />
      </div>
    </div>
  );
}
