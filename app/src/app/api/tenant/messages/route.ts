import { NextRequest, NextResponse } from "next/server";
import { getTenantSession } from "@/lib/tenant-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getTenantSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { body, leaseId, userId, contactId } = await req.json();

  if (!body?.trim() || !userId || !contactId) {
    return NextResponse.json({ error: "Message body is required" }, { status: 400 });
  }

  // Verify the contact belongs to this tenant session
  if (!session.contactIds.includes(contactId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const message = await prisma.message.create({
    data: {
      userId,
      contactId,
      leaseId: leaseId || null,
      body: body.trim(),
      sender: "tenant",
    },
  });

  return NextResponse.json({ id: message.id }, { status: 201 });
}

export async function GET() {
  const session = await getTenantSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const messages = await prisma.message.findMany({
    where: { contactId: { in: session.contactIds } },
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: { name: true } },
    },
  });

  return NextResponse.json(messages);
}
