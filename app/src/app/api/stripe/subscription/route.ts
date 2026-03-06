import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      stripePriceId: true,
      stripeCurrentPeriodEnd: true,
      stripeSubscriptionId: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    priceId: user.stripePriceId || null,
    periodEnd: user.stripeCurrentPeriodEnd?.toISOString() || null,
    hasSubscription: !!user.stripeSubscriptionId,
  });
}
