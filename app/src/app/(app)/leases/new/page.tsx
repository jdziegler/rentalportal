import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LeaseForm } from "@/components/lease-form";
import { createLease } from "@/lib/actions/leases";

export default async function NewLeasePage({
  searchParams,
}: {
  searchParams: Promise<{ unitId?: string; contactId?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { unitId, contactId } = await searchParams;

  const units = await prisma.unit.findMany({
    where: { property: { userId: session.user.id } },
    select: { id: true, name: true, property: { select: { name: true } } },
    orderBy: { property: { name: "asc" } },
  });

  const tenants = await prisma.contact.findMany({
    where: { userId: session.user.id, role: "tenant" },
    select: { id: true, firstName: true, lastName: true },
    orderBy: { firstName: "asc" },
  });

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/leases" className="hover:text-gray-700">
          Leases
        </Link>
        <span>/</span>
        <span className="text-gray-900">New</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add Lease</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <LeaseForm
          action={createLease}
          defaultValues={{
            unitId: unitId || undefined,
            contactId: contactId || undefined,
          }}
          submitLabel="Create Lease"
          units={units.map((u) => ({
            id: u.id,
            name: u.name,
            propertyName: u.property.name,
          }))}
          tenants={tenants}
        />
      </div>
    </div>
  );
}
