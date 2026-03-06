import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/messages?contactId=xxx — list messages for a contact
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contactId = req.nextUrl.searchParams.get("contactId");
  if (!contactId) {
    return NextResponse.json({ error: "contactId is required" }, { status: 400 });
  }

  // Verify contact belongs to this user
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, userId: session.user.id },
  });
  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const messages = await prisma.message.findMany({
    where: { userId: session.user.id, contactId },
    orderBy: { createdAt: "asc" },
  });

  // Mark tenant messages as read
  await prisma.message.updateMany({
    where: {
      userId: session.user.id,
      contactId,
      sender: "tenant",
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  return NextResponse.json(messages);
}

// POST /api/messages — send a message as landlord
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { contactId, leaseId, body } = await req.json();

  if (!contactId || !body?.trim()) {
    return NextResponse.json({ error: "contactId and body are required" }, { status: 400 });
  }

  // Verify contact belongs to this user
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, userId: session.user.id },
  });
  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const message = await prisma.message.create({
    data: {
      userId: session.user.id,
      contactId,
      leaseId: leaseId || null,
      body: body.trim(),
      sender: "landlord",
    },
  });

  return NextResponse.json(message, { status: 201 });
}
