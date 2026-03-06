import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";

// Create Stripe Connect account and return onboarding link
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
  });

  let connectId = user.stripeConnectId;

  if (!connectId) {
    const account = await stripe.accounts.create({
      type: "express",
      email: user.email,
      metadata: { userId: user.id },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
        us_bank_account_ach_payments: { requested: true },
      },
    });
    connectId = account.id;
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeConnectId: connectId },
    });
  }

  const accountLink = await stripe.accountLinks.create({
    account: connectId,
    refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/payments?refresh=true`,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/payments?success=true`,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: accountLink.url });
}

// Check Connect account status
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
  });

  if (!user.stripeConnectId) {
    return NextResponse.json({ status: "not_connected" });
  }

  const account = await stripe.accounts.retrieve(user.stripeConnectId);

  let balance = null;
  let payouts = null;

  if (account.details_submitted && account.payouts_enabled) {
    try {
      const bal = await stripe.balance.retrieve({
        stripeAccount: user.stripeConnectId,
      });
      balance = {
        available: bal.available
          .filter((b) => b.currency === "usd")
          .reduce((sum, b) => sum + b.amount, 0),
        pending: bal.pending
          .filter((b) => b.currency === "usd")
          .reduce((sum, b) => sum + b.amount, 0),
      };

      const recentPayouts = await stripe.payouts.list(
        { limit: 5 },
        { stripeAccount: user.stripeConnectId }
      );
      payouts = recentPayouts.data.map((p) => ({
        id: p.id,
        amount: p.amount,
        status: p.status,
        arrivalDate: p.arrival_date,
        method: p.method,
      }));
    } catch (err) {
      console.error("Failed to fetch Connect balance/payouts:", err);
    }
  }

  return NextResponse.json({
    status: account.details_submitted ? "verified" : "pending",
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    balance,
    payouts,
  });
}
