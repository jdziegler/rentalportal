import { NextRequest, NextResponse } from "next/server";
import { getTenantSession } from "@/lib/tenant-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getTenantSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { title, description, category, priority, propertyId, unitId, leaseId } = await req.json();

  if (!title || !propertyId) {
    return NextResponse.json({ error: "Title and property are required" }, { status: 400 });
  }

  // Verify the lease belongs to this tenant
  const lease = await prisma.lease.findFirst({
    where: {
      id: leaseId,
      contactId: { in: session.contactIds },
    },
  });

  if (!lease) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const request = await prisma.maintenanceRequest.create({
    data: {
      userId: lease.userId,
      propertyId,
      unitId: unitId || null,
      contactId: lease.contactId,
      title,
      description: description || null,
      category: category || "general",
      priority: priority ?? 1,
      status: 0,
    },
  });

  return NextResponse.json({ id: request.id }, { status: 201 });
}

export async function GET() {
  const session = await getTenantSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const requests = await prisma.maintenanceRequest.findMany({
    where: { contactId: { in: session.contactIds } },
    orderBy: { createdAt: "desc" },
    include: {
      property: { select: { name: true } },
      unit: { select: { name: true } },
    },
  });

  return NextResponse.json(requests);
}
