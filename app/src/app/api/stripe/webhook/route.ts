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

  // ── Idempotency check ──
  try {
    await prisma.webhookEvent.create({
      data: { id: event.id, type: event.type },
    });
  } catch {
    // Duplicate event — already processed
    return NextResponse.json({ received: true, duplicate: true });
  }

  const obj = event.data.object as any;

  try {
    switch (event.type) {
      // ── Subscription events ──
      case "checkout.session.completed": {
        if (obj.mode === "subscription" && obj.metadata?.userId) {
          const sub = await stripe.subscriptions.retrieve(obj.subscription);
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
          const subData = sub as any;
          const customerId =
            typeof obj.customer === "string"
              ? obj.customer
              : obj.customer?.id;
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

      case "invoice.payment_failed": {
        // Subscription payment failed — log it but don't cancel yet
        // Stripe will retry and eventually cancel via subscription.deleted
        const customerId =
          typeof obj.customer === "string"
            ? obj.customer
            : obj.customer?.id;
        if (customerId) {
          console.error(
            `Invoice payment failed for customer ${customerId}, invoice ${obj.id}`
          );
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const customerId =
          typeof obj.customer === "string"
            ? obj.customer
            : obj.customer?.id;
        const user = await prisma.user.findFirst({
          where: { stripeCustomerId: customerId },
        });
        if (user) {
          const isActive =
            obj.status === "active" || obj.status === "trialing";
          await prisma.user.update({
            where: { id: user.id },
            data: {
              stripeSubscriptionId: isActive ? obj.id : null,
              stripePriceId: isActive
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
      // Uses upsert on unique stripePaymentIntentId to prevent race conditions
      case "payment_intent.succeeded": {
        const txn = await prisma.transaction.findFirst({
          where: { stripePaymentIntentId: obj.id },
        });
        if (txn) {
          const paidAmount = Number(obj.amount) / 100;

          await prisma.payment.upsert({
            where: { stripePaymentIntentId: obj.id },
            create: {
              transactionId: txn.id,
              amount: paidAmount,
              date: new Date(),
              method:
                obj.payment_method_types?.[0] === "us_bank_account"
                  ? "ach"
                  : "card",
              stripePaymentIntentId: obj.id,
              stripePaymentStatus: "succeeded",
            },
            update: {
              stripePaymentStatus: "succeeded",
              amount: paidAmount,
            },
          });

          await recalcTransactionFromPayments(txn.id);
        }
        break;
      }

      case "payment_intent.processing": {
        const txn = await prisma.transaction.findFirst({
          where: { stripePaymentIntentId: obj.id },
        });
        if (txn) {
          await prisma.payment.upsert({
            where: { stripePaymentIntentId: obj.id },
            create: {
              transactionId: txn.id,
              amount: Number(obj.amount) / 100,
              date: new Date(),
              method:
                obj.payment_method_types?.[0] === "us_bank_account"
                  ? "ach"
                  : "card",
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
              status: "PENDING",
            },
          });
        }
        break;
      }

      case "payment_intent.payment_failed":
      case "payment_intent.canceled": {
        const failedTxn = await prisma.transaction.findFirst({
          where: { stripePaymentIntentId: obj.id },
        });
        if (failedTxn) {
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

      // Handle refunds
      case "charge.refunded": {
        const paymentIntentId = obj.payment_intent;
        if (paymentIntentId) {
          const refundTxn = await prisma.transaction.findFirst({
            where: { stripePaymentIntentId: paymentIntentId },
          });
          if (refundTxn) {
            const refundAmount = Number(obj.amount_refunded) / 100;

            // Create a refund payment record
            await prisma.payment.create({
              data: {
                transactionId: refundTxn.id,
                amount: refundAmount,
                date: new Date(),
                type: "refund",
                method: "stripe",
                note: `Stripe refund for ${paymentIntentId}`,
              },
            });

            await prisma.transaction.update({
              where: { id: refundTxn.id },
              data: { stripePaymentStatus: "refunded" },
            });

            await recalcTransactionFromPayments(refundTxn.id);
          }
        }
        break;
      }
    }
  } catch (err) {
    console.error(`Webhook handler error for ${event.type}:`, err);
    // Still return 200 so Stripe doesn't retry indefinitely
    return NextResponse.json({ received: true, error: true });
  }

  return NextResponse.json({ received: true });
}
