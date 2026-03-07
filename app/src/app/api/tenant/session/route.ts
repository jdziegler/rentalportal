import { NextResponse } from "next/server";
import { getTenantSession } from "@/lib/tenant-auth";

export async function GET() {
  const session = await getTenantSession();
  if (!session) {
    return NextResponse.json({ authenticated: false });
  }
  return NextResponse.json({ authenticated: true, identifier: session.identifier });
}
