import { NextResponse } from "next/server";
import { getTenantSession, findContactsByIdentifier } from "@/lib/tenant-auth";

export async function GET() {
  const session = await getTenantSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const contacts = await findContactsByIdentifier(session.identifier);

  return NextResponse.json({
    authenticated: true,
    identifier: session.identifier,
    type: session.type,
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
