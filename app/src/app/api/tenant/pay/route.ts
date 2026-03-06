import { NextRequest, NextResponse } from "next/server";
import { getTenantSession } from "@/lib/tenant-auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const session = await getTenantSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { transactionId, amount } = await req.json();

  if (!transactionId || !amount || amount <= 0) {
    return NextResponse.json({ error: "Invalid payment details" }, { status: 400 });
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

  // Verify the tenant owns this transaction
  if (!session.contactIds.includes(transaction.lease.contact.id)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Check if landlord has Stripe Connect set up
  const landlord = transaction.lease.user;
  if (!landlord.stripeConnectId || !landlord.stripeConnectOnboarded) {
    return NextResponse.json(
      { error: "Online payments are not set up for this property. Please contact your landlord." },
      { status: 400 }
    );
  }

  // Create Stripe Checkout session
  const amountCents = Math.round(amount * 100);

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: transaction.details || "Rent Payment",
            description: "Rent payment",
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    payment_method_types: ["card", "us_bank_account"],
    payment_intent_data: {
      application_fee_amount: Math.round(amountCents * 0.035 + 30), // 3.5% + $0.30
      transfer_data: {
        destination: landlord.stripeConnectId,
      },
      metadata: {
        transactionId: transaction.id,
        leaseId: transaction.leaseId || "",
        tenantIdentifier: session.identifier,
      },
    },
    success_url: `${process.env.NEXTAUTH_URL}/tenant/portal?payment=success`,
    cancel_url: `${process.env.NEXTAUTH_URL}/tenant/portal?payment=cancelled`,
    metadata: {
      transactionId: transaction.id,
      type: "tenant_payment",
    },
  } as any);

  return NextResponse.json({ checkoutUrl: checkoutSession.url });
}
