import { NextRequest, NextResponse } from "next/server";
import { findContactsByIdentifier, setTenantCookie } from "@/lib/tenant-auth";

// Dev-only: log in as a tenant by email without verification code.
// Usage: POST /api/tenant/test-login  { "identifier": "tenant@example.com" }
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const { identifier } = await req.json();
  if (!identifier) {
    return NextResponse.json({ error: "identifier required" }, { status: 400 });
  }

  const contacts = await findContactsByIdentifier(identifier);
  if (contacts.length === 0) {
    return NextResponse.json({ error: "No tenant found with that identifier" }, { status: 404 });
  }

  const isEmail = identifier.includes("@");
  await setTenantCookie({
    contactIds: contacts.map((c) => c.id),
    identifier: identifier.trim().toLowerCase(),
    type: isEmail ? "email" : "sms",
  });

  return NextResponse.json({ ok: true, contacts: contacts.length });
}
