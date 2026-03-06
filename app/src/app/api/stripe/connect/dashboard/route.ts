import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
  });

  if (!user.stripeConnectId) {
    return NextResponse.json(
      { error: "No Connect account" },
      { status: 400 }
    );
  }

  const loginLink = await stripe.accounts.createLoginLink(
    user.stripeConnectId
  );

  return NextResponse.json({ url: loginLink.url });
}
