import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripe, CONNECT_FEES } from "@/lib/stripe";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { leaseId, paymentMethod } = await req.json();
  if (!leaseId) {
    return NextResponse.json({ error: "Missing leaseId" }, { status: 400 });
  }

  const lease = await prisma.lease.findUniqueOrThrow({
    where: { id: leaseId },
    include: {
      user: true,
      contact: true,
      unit: { include: { property: true } },
    },
  });

  if (!lease.user.stripeConnectId || !lease.user.stripeConnectOnboarded) {
    return NextResponse.json(
      { error: "Landlord has not set up payment collection" },
      { status: 400 }
    );
  }

  const amountCents = Math.round(Number(lease.rentAmount) * 100);

  // Calculate platform fee based on payment method
  let applicationFee: number;
  if (paymentMethod === "us_bank_account") {
    applicationFee = CONNECT_FEES.ach;
  } else {
    applicationFee =
      Math.round(amountCents * (CONNECT_FEES.card_percent / 100)) +
      CONNECT_FEES.card_fixed;
  }

  const paymentMethodTypes =
    paymentMethod === "us_bank_account"
      ? ["us_bank_account"]
      : ["card"];

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: lease.currency.toLowerCase(),
    payment_method_types: paymentMethodTypes,
    application_fee_amount: applicationFee,
    transfer_data: {
      destination: lease.user.stripeConnectId,
    },
    metadata: {
      leaseId: lease.id,
      userId: lease.userId,
      contactId: lease.contactId,
      propertyId: lease.unit.propertyId,
      unitId: lease.unitId,
    },
    description: `Rent payment - ${lease.unit.property.name} / ${lease.unit.name}`,
  });

  // Create pending transaction record
  await prisma.transaction.create({
    data: {
      userId: lease.userId,
      propertyId: lease.unit.propertyId,
      unitId: lease.unitId,
      leaseId: lease.id,
      contactId: lease.contactId,
      category: "income",
      amount: Number(lease.rentAmount),
      currency: lease.currency,
      date: new Date(),
      details: `Rent payment - ${lease.unit.name}`,
      stripePaymentIntentId: paymentIntent.id,
      stripePaymentStatus: "pending",
      paymentMethod: paymentMethod === "us_bank_account" ? "ach" : "card",
      status: 0,
    },
  });

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}
