import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/screening/[id] — get screening request with reports
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const req = await prisma.screeningRequest.findUnique({
    where: { id },
    include: {
      reports: { orderBy: { type: "asc" } },
      contact: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  if (!req || req.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(req);
}
