import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { getSubscriptionStatus } from "@/lib/subscription";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const status = await getSubscriptionStatus(session.user.id);

  return NextResponse.json({
    plan: status.plan,
    isActive: status.isActive,
    isPro: status.isPro,
    limits: status.limits,
    periodEnd: status.periodEnd?.toISOString() || null,
  });
}
