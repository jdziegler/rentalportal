import { redirect } from "next/navigation";
import { getTenantSession, findContactsByIdentifier } from "@/lib/tenant-auth";
import { prisma } from "@/lib/prisma";
import TenantDocumentsClient from "./documents-client";

export default async function TenantDocumentsPage() {
  const session = await getTenantSession();
  if (!session) redirect("/tenant");

  const contacts = await findContactsByIdentifier(session.identifier);
  if (contacts.length === 0) redirect("/tenant");

  const contactIds = contacts.map((c) => c.id);

  // Get all signature requests for this tenant
  const signatures = await prisma.signature.findMany({
    where: { contactId: { in: contactIds } },
    include: {
      document: {
        select: {
          id: true,
          name: true,
          fileType: true,
          fileSize: true,
          createdAt: true,
          lease: {
            select: {
              unit: {
                select: {
                  name: true,
                  property: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const serialized = signatures.map((s) => ({
    id: s.id,
    status: s.status,
    signingToken: s.signingToken,
    signedAt: s.signedAt?.toISOString() || null,
    declinedAt: s.declinedAt?.toISOString() || null,
    createdAt: s.createdAt.toISOString(),
    document: {
      name: s.document.name,
      fileSize: s.document.fileSize,
      propertyName: s.document.lease.unit.property.name,
      unitName: s.document.lease.unit.name,
    },
  }));

  return <TenantDocumentsClient signatures={serialized} />;
}
