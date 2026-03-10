import { redirect } from "next/navigation";
import { getTenantSession, findContactsByIdentifier } from "@/lib/tenant-auth";
import { prisma } from "@/lib/prisma";
import MaintenanceClient from "./maintenance-client";

export default async function TenantMaintenancePage() {
  const session = await getTenantSession();
  if (!session) redirect("/tenant");

  const contacts = await findContactsByIdentifier(session.identifier);
  if (contacts.length === 0) redirect("/tenant");

  const contactIds = contacts.map((c) => c.id);

  // Get leases (for property/unit context when creating requests)
  const leases = await prisma.lease.findMany({
    where: { contactId: { in: contactIds }, leaseStatus: "ACTIVE" },
    include: {
      unit: {
        include: {
          property: { select: { id: true, name: true } },
        },
      },
    },
  });

  // Get maintenance requests for this tenant's contacts
  const requests = await prisma.maintenanceRequest.findMany({
    where: { contactId: { in: contactIds } },
    orderBy: { createdAt: "desc" },
    include: {
      property: { select: { name: true } },
      unit: { select: { name: true } },
    },
  });

  const serializedLeases = leases.map((l) => ({
    id: l.id,
    unitId: l.unitId,
    unitName: l.unit.name,
    propertyId: l.unit.property.id,
    propertyName: l.unit.property.name,
  }));

  const serializedRequests = requests.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    priority: r.priority,
    status: r.status,
    category: r.category,
    propertyName: r.property.name,
    unitName: r.unit?.name || null,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <MaintenanceClient leases={serializedLeases} requests={serializedRequests} />
  );
}
