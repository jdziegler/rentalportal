import { NextRequest, NextResponse } from "next/server";
import { getTenantSession } from "@/lib/tenant-auth";
import { prisma } from "@/lib/prisma";
import { stripe, CONNECT_FEES } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const session = await getTenantSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { transactionId, amount, paymentMethod } = await req.json();

  if (!transactionId || !amount || amount <= 0) {
    return NextResponse.json({ error: "Invalid payment details" }, { status: 400 });
  }

  if (!paymentMethod || !["card", "ach"].includes(paymentMethod)) {
    return NextResponse.json({ error: "Choose a payment method" }, { status: 400 });
  }

  // Find the transaction and verify it belongs to this tenant
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: {
      lease: {
        include: {
          contact: { select: { id: true } },
          user: { select: { stripeConnectId: true, stripeConnectOnboarded: true } },
        },
      },
    },
  });

  if (!transaction || !transaction.lease) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  if (!session.contactIds.includes(transaction.lease.contact.id)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const landlord = transaction.lease.user;
  if (!landlord.stripeConnectId || !landlord.stripeConnectOnboarded) {
    return NextResponse.json(
      { error: "Online payments are not set up for this property. Please contact your landlord." },
      { status: 400 }
    );
  }

  const amountCents = Math.round(amount * 100);

  // Calculate fee based on chosen payment method
  const applicationFee =
    paymentMethod === "ach"
      ? CONNECT_FEES.ach
      : Math.round(amountCents * (CONNECT_FEES.card_percent / 100) + CONNECT_FEES.card_fixed);

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: transaction.details || "Rent Payment",
            description: `Rent payment via ${paymentMethod === "ach" ? "bank transfer" : "card"}`,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    payment_method_types: paymentMethod === "ach" ? ["us_bank_account"] : ["card"],
    payment_intent_data: {
      application_fee_amount: applicationFee,
      transfer_data: {
        destination: landlord.stripeConnectId,
      },
      metadata: {
        transactionId: transaction.id,
        leaseId: transaction.leaseId || "",
        tenantIdentifier: session.identifier,
        paymentMethod,
      },
    },
    success_url: `${process.env.NEXTAUTH_URL}/tenant/portal?payment=success`,
    cancel_url: `${process.env.NEXTAUTH_URL}/tenant/portal?payment=cancelled`,
    metadata: {
      transactionId: transaction.id,
      type: "tenant_payment",
    },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  return NextResponse.json({ checkoutUrl: checkoutSession.url });
}
