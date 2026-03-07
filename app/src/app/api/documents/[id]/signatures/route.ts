import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// POST /api/documents/[id]/signatures — request signature from tenant
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: documentId } = await params;
  const { contactId } = await request.json();

  if (!contactId) {
    return NextResponse.json(
      { error: "contactId is required" },
      { status: 400 }
    );
  }

  // Verify document belongs to user
  const doc = await prisma.leaseDocument.findUnique({
    where: { id: documentId },
    include: { lease: { select: { userId: true } } },
  });
  if (!doc || doc.lease.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Check if signature request already exists
  const existing = await prisma.signature.findUnique({
    where: { documentId_contactId: { documentId, contactId } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Signature already requested" },
      { status: 409 }
    );
  }

  const signature = await prisma.signature.create({
    data: { documentId, contactId },
    include: {
      contact: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  return NextResponse.json(signature, { status: 201 });
}
