import { redirect } from "next/navigation";
import { getTenantSession, findContactsByIdentifier } from "@/lib/tenant-auth";
import { prisma } from "@/lib/prisma";
import MessagesClient from "./messages-client";

export default async function TenantMessagesPage() {
  const session = await getTenantSession();
  if (!session) redirect("/tenant");

  const contacts = await findContactsByIdentifier(session.identifier);
  if (contacts.length === 0) redirect("/tenant");

  const contactIds = contacts.map((c) => c.id);

  // Get all messages for this tenant's contacts
  const messages = await prisma.message.findMany({
    where: { contactId: { in: contactIds } },
    orderBy: { createdAt: "asc" },
    include: {
      lease: {
        select: {
          id: true,
          unit: {
            select: {
              name: true,
              property: { select: { name: true } },
            },
          },
        },
      },
      user: { select: { name: true } },
    },
  });

  // Get leases for context picker
  const leases = await prisma.lease.findMany({
    where: { contactId: { in: contactIds }, leaseStatus: 0 },
    include: {
      unit: {
        include: {
          property: { select: { id: true, name: true } },
        },
      },
      user: { select: { id: true, name: true } },
    },
  });

  // Mark unread messages from landlord as read
  await prisma.message.updateMany({
    where: {
      contactId: { in: contactIds },
      sender: "landlord",
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  const serializedMessages = messages.map((m) => ({
    id: m.id,
    body: m.body,
    sender: m.sender,
    createdAt: m.createdAt.toISOString(),
    landlordName: m.user.name || "Landlord",
    leaseName: m.lease
      ? `${m.lease.unit.property.name} - ${m.lease.unit.name}`
      : null,
  }));

  const serializedLeases = leases.map((l) => ({
    id: l.id,
    userId: l.userId,
    unitName: l.unit.name,
    propertyName: l.unit.property.name,
    landlordName: l.user.name || "Landlord",
    contactId: l.contactId,
  }));

  return (
    <MessagesClient
      messages={serializedMessages}
      leases={serializedLeases}
    />
  );
}
