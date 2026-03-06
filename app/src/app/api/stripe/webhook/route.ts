import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { recalcTransactionFromPayments } from "@/lib/payment-helpers";
import Stripe from "stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const obj = event.data.object as any;

  switch (event.type) {
    // ── Subscription events ──
    case "checkout.session.completed": {
      if (obj.mode === "subscription" && obj.metadata?.userId) {
        const sub = await stripe.subscriptions.retrieve(obj.subscription);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subData = sub as any;
        await prisma.user.update({
          where: { id: obj.metadata.userId },
          data: {
            stripeSubscriptionId: subData.id,
            stripePriceId: subData.items.data[0].price.id,
            stripeCurrentPeriodEnd: new Date(
              subData.items.data[0].current_period_end * 1000
            ),
          },
        });
      }

      // Tenant portal payment: link PaymentIntent to transaction
      if (obj.mode === "payment" && obj.metadata?.type === "tenant_payment") {
        const transactionId = obj.metadata.transactionId;
        const paymentIntentId = obj.payment_intent;
        if (transactionId && paymentIntentId) {
          await prisma.transaction.update({
            where: { id: transactionId },
            data: {
              stripePaymentIntentId: paymentIntentId,
              stripePaymentStatus: "processing",
            },
          });
        }
      }
      break;
    }

    case "invoice.paid": {
      const subscriptionId =
        obj.subscription || obj.parent?.subscription_details?.subscription;
      if (subscriptionId) {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subData = sub as any;
        const customerId =
          typeof obj.customer === "string" ? obj.customer : obj.customer?.id;
        const user = await prisma.user.findFirst({
          where: { stripeCustomerId: customerId },
        });
        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              stripeCurrentPeriodEnd: new Date(
                subData.items.data[0].current_period_end * 1000
              ),
            },
          });
        }
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const customerId =
        typeof obj.customer === "string" ? obj.customer : obj.customer?.id;
      const user = await prisma.user.findFirst({
        where: { stripeCustomerId: customerId },
      });
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            stripeSubscriptionId:
              obj.status === "active" ? obj.id : null,
            stripePriceId:
              obj.status === "active"
                ? obj.items.data[0].price.id
                : null,
            stripeCurrentPeriodEnd: new Date(
              obj.items.data[0].current_period_end * 1000
            ),
          },
        });
      }
      break;
    }

    // ── Connect events ──
    case "account.updated": {
      if (obj.details_submitted && obj.charges_enabled) {
        await prisma.user.updateMany({
          where: { stripeConnectId: obj.id },
          data: { stripeConnectOnboarded: true },
        });
      }
      break;
    }

    // ── Payment events (rent collection) ──
    case "payment_intent.succeeded": {
      const txn = await prisma.transaction.findFirst({
        where: { stripePaymentIntentId: obj.id },
      });
      if (txn) {
        const paidAmount = Number(obj.amount) / 100;

        // Create a Payment record
        await prisma.payment.upsert({
          where: { stripePaymentIntentId: obj.id },
          create: {
            transactionId: txn.id,
            amount: paidAmount,
            date: new Date(),
            method: obj.payment_method_types?.[0] === "us_bank_account" ? "ach" : "card",
            stripePaymentIntentId: obj.id,
            stripePaymentStatus: "succeeded",
          },
          update: {
            stripePaymentStatus: "succeeded",
            amount: paidAmount,
          },
        });

        // Recalc transaction from payments
        await recalcTransactionFromPayments(txn.id);
      }
      break;
    }

    case "payment_intent.processing": {
      const txn = await prisma.transaction.findFirst({
        where: { stripePaymentIntentId: obj.id },
      });
      if (txn) {
        // Create a pending Payment record
        await prisma.payment.upsert({
          where: { stripePaymentIntentId: obj.id },
          create: {
            transactionId: txn.id,
            amount: Number(obj.amount) / 100,
            date: new Date(),
            method: obj.payment_method_types?.[0] === "us_bank_account" ? "ach" : "card",
            stripePaymentIntentId: obj.id,
            stripePaymentStatus: "processing",
          },
          update: {
            stripePaymentStatus: "processing",
          },
        });

        await prisma.transaction.update({
          where: { id: txn.id },
          data: {
            stripePaymentStatus: "processing",
            status: 3, // PENDING
          },
        });
      }
      break;
    }

    case "payment_intent.payment_failed": {
      const failedTxn = await prisma.transaction.findFirst({
        where: { stripePaymentIntentId: obj.id },
      });
      if (failedTxn) {
        // Remove the failed payment record so it doesn't count toward paid
        await prisma.payment.deleteMany({
          where: {
            stripePaymentIntentId: obj.id,
            transactionId: failedTxn.id,
          },
        });

        await prisma.transaction.update({
          where: { id: failedTxn.id },
          data: { stripePaymentStatus: "failed" },
        });

        await recalcTransactionFromPayments(failedTxn.id);
      }
      break;
    }

    // ACH payments can fail days after initially succeeding
    case "charge.failed": {
      const paymentIntentId = obj.payment_intent;
      if (paymentIntentId) {
        const achTxn = await prisma.transaction.findFirst({
          where: { stripePaymentIntentId: paymentIntentId },
        });
        if (achTxn) {
          // Remove the failed payment
          await prisma.payment.deleteMany({
            where: {
              stripePaymentIntentId: paymentIntentId,
              transactionId: achTxn.id,
            },
          });

          await prisma.transaction.update({
            where: { id: achTxn.id },
            data: { stripePaymentStatus: "failed" },
          });

          await recalcTransactionFromPayments(achTxn.id);
        }
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
