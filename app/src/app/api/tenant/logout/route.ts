import { NextResponse } from "next/server";
import { clearTenantCookie } from "@/lib/tenant-auth";

export async function POST() {
  await clearTenantCookie();
  return NextResponse.json({ success: true });
}
