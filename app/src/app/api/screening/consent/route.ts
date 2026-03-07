import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { processConsent } from "@/lib/screening";

// GET /api/screening/consent?token=xxx — get consent request info
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "token required" }, { status: 400 });
  }

  const req = await prisma.screeningRequest.findUnique({
    where: { consentToken: token },
    include: {
      contact: { select: { firstName: true, lastName: true } },
      user: { select: { name: true } },
    },
  });

  if (!req) {
    return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  }

  return NextResponse.json({
    id: req.id,
    status: req.status,
    tenantName: `${req.contact.firstName} ${req.contact.lastName}`,
    landlordName: req.user.name || "Your landlord",
    expiresAt: req.expiresAt?.toISOString(),
  });
}

// POST /api/screening/consent — tenant gives consent
export async function POST(request: NextRequest) {
  const { token } = await request.json();
  if (!token) {
    return NextResponse.json({ error: "token required" }, { status: 400 });
  }

  try {
    const result = await processConsent(token);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
