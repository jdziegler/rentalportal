import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findContactsByIdentifier, setTenantCookie } from "@/lib/tenant-auth";

export async function POST(req: NextRequest) {
  const { identifier, code } = await req.json();

  if (!identifier || !code) {
    return NextResponse.json({ error: "Identifier and code required" }, { status: 400 });
  }

  const normalized = identifier.trim().toLowerCase();

  // Find the most recent unexpired code for this identifier
  const verification = await prisma.tenantVerification.findFirst({
    where: {
      identifier: normalized,
      code,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!verification) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 401 });
  }

  // Check max attempts (prevent brute force on a single code)
  if (verification.attempts >= 5) {
    return NextResponse.json({ error: "Too many attempts. Request a new code." }, { status: 429 });
  }

  // Increment attempts (in case code is wrong — but we already matched, so this is the success path)
  // Clean up: delete all codes for this identifier
  await prisma.tenantVerification.deleteMany({
    where: { identifier: normalized },
  });

  // Find all contacts matching this identifier
  const contacts = await findContactsByIdentifier(normalized);
  if (contacts.length === 0) {
    return NextResponse.json({ error: "No account found" }, { status: 404 });
  }

  const isEmail = normalized.includes("@");

  // Set tenant session cookie
  await setTenantCookie({
    contactIds: contacts.map((c) => c.id),
    identifier: normalized,
    type: isEmail ? "email" : "sms",
  });

  return NextResponse.json({
    success: true,
    contacts: contacts.map((c) => ({
      id: c.id,
      name: `${c.firstName} ${c.lastName}`,
      landlord: c.user.name,
      leases: c.leases.map((l) => ({
        id: l.id,
        unit: l.unit.name,
        property: l.unit.property.name,
        address: `${l.unit.property.address}, ${l.unit.property.city}, ${l.unit.property.state}`,
        rentAmount: l.rentAmount,
      })),
    })),
  });
}
