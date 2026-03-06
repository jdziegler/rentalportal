import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { MaintenanceForm } from "@/components/maintenance-form";
import { createMaintenanceRequest } from "@/lib/actions/maintenance";

export default async function NewMaintenancePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [properties, units, tenants] = await Promise.all([
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

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/maintenance" className="hover:text-gray-700">
          Maintenance
        </Link>
        <span>/</span>
        <span className="text-gray-900">New Request</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        New Maintenance Request
      </h1>
      <div className="bg-white rounded-lg shadow p-6">
        <MaintenanceForm
          action={createMaintenanceRequest}
          submitLabel="Create Request"
          properties={properties}
          units={units}
          tenants={tenants}
        />
      </div>
    </div>
  );
}
