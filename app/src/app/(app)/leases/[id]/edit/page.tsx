import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { LeaseForm } from "@/components/lease-form";
import { updateLease } from "@/lib/actions/leases";

export default async function EditLeasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  const lease = await prisma.lease.findUnique({
    where: { id, userId: session.user.id },
    include: {
      unit: {
        select: { name: true, property: { select: { name: true } } },
      },
    },
  });

  if (!lease) notFound();

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

  const updateWithId = updateLease.bind(null, id);

  const propertyName = lease.unit.property.name;
  const unitName = lease.unit.name;
  const leaseName = lease.name || `${propertyName} - ${unitName}`;

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/leases" className="hover:text-gray-700">
          Leases
        </Link>
        <span>/</span>
        <Link href={`/leases/${id}`} className="hover:text-gray-700">
          {leaseName}
        </Link>
        <span>/</span>
        <span className="text-gray-900">Edit</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Lease</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <LeaseForm
          action={updateWithId}
          defaultValues={{
            unitId: lease.unitId,
            contactId: lease.contactId,
            leaseType: lease.leaseType,
            rentAmount: Number(lease.rentAmount),
            rentDueDay: lease.rentDueDay,
            gracePeriod: lease.gracePeriod,
            rentFrom: lease.rentFrom.toISOString().split("T")[0],
            rentTo: lease.rentTo
              ? lease.rentTo.toISOString().split("T")[0]
              : "",
            deposit: lease.deposit ? Number(lease.deposit) : undefined,
            name: lease.name || "",
            lateFeeEnabled: lease.lateFeeEnabled,
            lateFeeType: lease.lateFeeType,
            lateFeeAmount: Number(lease.lateFeeAmount),
            lateFeeAccrual: lease.lateFeeAccrual,
            lateFeeMaxAmount: lease.lateFeeMaxAmount ? Number(lease.lateFeeMaxAmount) : null,
          }}
          submitLabel="Save Changes"
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
