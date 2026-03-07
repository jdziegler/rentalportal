import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createScreeningRequest } from "@/lib/screening";

// POST /api/screening — create a screening request for a tenant
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { contactId } = await request.json();
  if (!contactId) {
    return NextResponse.json({ error: "contactId required" }, { status: 400 });
  }

  // Verify contact belongs to user
  const contact = await prisma.contact.findUnique({
    where: { id: contactId, userId: session.user.id },
  });
  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  try {
    const req = await createScreeningRequest(session.user.id, contactId);
    return NextResponse.json(req, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 409 });
  }
}

// GET /api/screening?contactId=xxx — list screening requests for a tenant
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contactId = request.nextUrl.searchParams.get("contactId");
  if (!contactId) {
    return NextResponse.json({ error: "contactId required" }, { status: 400 });
  }

  const requests = await prisma.screeningRequest.findMany({
    where: { userId: session.user.id, contactId },
    include: { reports: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(requests);
}
