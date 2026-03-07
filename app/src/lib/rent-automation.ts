import { prisma } from "@/lib/db";
import { stripe, CONNECT_FEES } from "@/lib/stripe";
import { sendNotification } from "@/lib/notifications";

// ── Helpers ──

function toCents(value: number): number {
  return Math.round(value * 100);
}

// ── 1. Generate Rent Charges ──

export interface RentGenerationResult {
  created: number;
  skipped: number;
  errors: string[];
}

/**
 * Creates rent charge transactions for active leases.
 * Called daily — checks if today is the configured publish day.
 * Idempotent via unique constraint [leaseId, billingPeriod, source].
 */
export async function generateRentCharges(): Promise<RentGenerationResult> {
  const today = new Date();
  const currentDay = today.getDate();

  // Get all users with their rent schedule config
  const users = await prisma.user.findMany({
    where: {
      leases: { some: { leaseStatus: 0 } },
    },
    include: {
      rentScheduleConfig: true,
    },
  });

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const user of users) {
    const publishDay = user.rentScheduleConfig?.publishDay ?? 1;

    // Only generate on the configured publish day
    if (currentDay !== publishDay) {
      continue;
    }

    // Get active leases for this user
    const leases = await prisma.lease.findMany({
      where: {
        userId: user.id,
        leaseStatus: 0,
      },
      include: {
        unit: {
          select: {
            name: true,
            property: { select: { name: true } },
          },
        },
      },
    });

    // Determine billing period — the month rent is due for
    // If publish day is before the due day, it's for the current month
    // If publish day is after the due day, it's for next month
    for (const lease of leases) {
      try {
        // Check if lease has started
        if (lease.rentFrom > today) continue;
        // Fixed-term leases with a past end date are treated as month-to-month
        // (only skip if lease was explicitly terminated/expired via leaseStatus)
        // leaseStatus is already filtered to 0 (active) in the query above

        // Determine the target month for this charge
        let targetYear = today.getFullYear();
        let targetMonth = today.getMonth(); // 0-indexed

        // If the publish day >= the rent due day, we're publishing for next month
        if (publishDay >= lease.rentDueDay) {
          targetMonth += 1;
          if (targetMonth > 11) {
            targetMonth = 0;
            targetYear += 1;
          }
        }

        const billingPeriod = `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}`;

        // Due date for this charge
        const dueDate = new Date(targetYear, targetMonth, lease.rentDueDay);

        const propertyName = lease.unit?.property?.name || "Property";
        const unitName = lease.unit?.name || "Unit";

        await prisma.transaction.create({
          data: {
            userId: user.id,
            propertyId: lease.propertyId,
            unitId: lease.unitId,
            leaseId: lease.id,
            contactId: lease.contactId,
            category: "income",
            subcategory: "rent",
            amount: lease.rentAmount,
            currency: lease.currency,
            date: dueDate,
            balance: lease.rentAmount,
            details: `Monthly rent - ${propertyName} / ${unitName}`,
            status: 0, // UNPAID
            source: "auto_rent",
            billingPeriod,
          },
        });
        created++;
      } catch (err) {
        // Unique constraint violation = already exists, skip
        if (
          err instanceof Error &&
          err.message.includes("Unique constraint")
        ) {
          skipped++;
        } else {
          errors.push(
            `Lease ${lease.id}: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }
    }
  }

  return { created, skipped, errors };
}

// ── 2. Process Auto-Payments ──

export interface AutoPayResult {
  attempted: number;
  succeeded: number;
  failed: number;
  errors: string[];
}

/**
 * Attempts to charge tenants with auto-pay enabled for unpaid rent.
 * Called daily — only processes transactions where due date <= today.
 */
export async function processAutoPayments(): Promise<AutoPayResult> {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  // Find unpaid auto-rent transactions that are due
  const transactions = await prisma.transaction.findMany({
    where: {
      source: "auto_rent",
      status: { in: [0] }, // UNPAID only (not partial, not pending)
      date: { lte: today },
      stripePaymentIntentId: null, // no payment attempted yet
    },
    include: {
      lease: {
        include: {
          autoPayConfig: true,
          user: {
            select: {
              stripeConnectId: true,
              stripeConnectOnboarded: true,
            },
          },
          unit: {
            select: {
              name: true,
              property: { select: { name: true } },
            },
          },
        },
      },
      contact: {
        select: { stripeCustomerId: true },
      },
    },
  });

  // Also find failed transactions eligible for retry
  const retryTransactions = await prisma.transaction.findMany({
    where: {
      source: "auto_rent",
      stripePaymentStatus: "failed",
      date: { lte: today },
    },
    include: {
      lease: {
        include: {
          autoPayConfig: true,
          user: {
            select: {
              stripeConnectId: true,
              stripeConnectOnboarded: true,
            },
          },
          unit: {
            select: {
              name: true,
              property: { select: { name: true } },
            },
          },
        },
      },
      contact: {
        select: { stripeCustomerId: true },
      },
    },
  });

  // Filter retries to those under max retry count
  const eligibleRetries = retryTransactions.filter(
    (t) =>
      t.lease?.autoPayConfig?.enabled &&
      t.retryCount < (t.lease.autoPayConfig.maxRetries ?? 2)
  );

  const allTransactions = [...transactions, ...eligibleRetries];

  let attempted = 0;
  let succeeded = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const txn of allTransactions) {
    const autoPay = txn.lease?.autoPayConfig;
    if (!autoPay?.enabled) continue;

    const connectId = txn.lease?.user?.stripeConnectId;
    const connectOnboarded = txn.lease?.user?.stripeConnectOnboarded;
    if (!connectId || !connectOnboarded) continue;

    const customerStripeId = txn.contact?.stripeCustomerId;
    if (!customerStripeId) continue;

    attempted++;

    try {
      const amountCents = toCents(Number(txn.amount));

      // Calculate platform fee
      let applicationFee: number;
      if (autoPay.paymentMethodType === "us_bank_account") {
        applicationFee = CONNECT_FEES.ach;
      } else {
        applicationFee =
          Math.round(amountCents * (CONNECT_FEES.card_percent / 100)) +
          CONNECT_FEES.card_fixed;
      }

      const propertyName = txn.lease?.unit?.property?.name || "Property";
      const unitName = txn.lease?.unit?.name || "Unit";

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: txn.currency.toLowerCase(),
        customer: customerStripeId,
        payment_method: autoPay.stripePaymentMethodId,
        payment_method_types: [autoPay.paymentMethodType],
        confirm: true,
        off_session: true,
        application_fee_amount: applicationFee,
        transfer_data: {
          destination: connectId,
        },
        metadata: {
          leaseId: txn.leaseId || "",
          userId: txn.userId,
          contactId: txn.contactId || "",
          transactionId: txn.id,
          source: "auto_payment",
        },
        description: `Rent payment - ${propertyName} / ${unitName}`,
      });

      // For ACH, status will be "processing" — final result via webhook
      // For card, it may already be "succeeded"
      const isPaid = paymentIntent.status === "succeeded";
      const isProcessing = paymentIntent.status === "processing";
      const payMethod =
        autoPay.paymentMethodType === "us_bank_account" ? "ach" : "card";

      // Create a Payment record
      await prisma.payment.create({
        data: {
          transactionId: txn.id,
          amount: Number(txn.amount),
          date: new Date(),
          method: payMethod,
          stripePaymentIntentId: paymentIntent.id,
          stripePaymentStatus: paymentIntent.status,
          note: "Auto-pay",
        },
      });

      await prisma.transaction.update({
        where: { id: txn.id },
        data: {
          stripePaymentIntentId: paymentIntent.id,
          stripePaymentStatus: paymentIntent.status,
          paymentMethod: payMethod,
          status: isPaid ? 2 : isProcessing ? 3 : 0,
          paid: isPaid ? txn.amount : 0,
          balance: isPaid ? 0 : txn.amount,
          paidAt: isPaid ? new Date() : null,
          retryCount: { increment: txn.stripePaymentStatus === "failed" ? 1 : 0 },
        },
      });

      if (isPaid) succeeded++;
    } catch (err) {
      failed++;

      // Update retry count on failure
      await prisma.transaction.update({
        where: { id: txn.id },
        data: {
          stripePaymentStatus: "failed",
          retryCount: { increment: 1 },
        },
      });

      errors.push(
        `Transaction ${txn.id}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return { attempted, succeeded, failed, errors };
}

// ── 3. Assess Late Fees ──

export interface LateFeeResult {
  created: number;
  skipped: number;
  errors: string[];
}

/**
 * Creates late fee transactions for overdue rent charges.
 * Called daily — checks grace period per lease.
 */
export async function assessLateFees(): Promise<LateFeeResult> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find unpaid/partial auto-rent transactions
  const overdueTransactions = await prisma.transaction.findMany({
    where: {
      source: "auto_rent",
      status: { in: [0, 1] }, // UNPAID or PARTIAL
      balance: { gt: 0 },
    },
    include: {
      contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      lease: {
        select: {
          id: true,
          userId: true,
          propertyId: true,
          unitId: true,
          contactId: true,
          gracePeriod: true,
          currency: true,
          lateFeeEnabled: true,
          lateFeeType: true,
          lateFeeAmount: true,
          lateFeeAccrual: true,
          lateFeeMaxAmount: true,
          unit: {
            select: {
              name: true,
              property: { select: { name: true } },
            },
          },
        },
      },
      lateFees: {
        select: { amount: true, source: true },
      },
    },
  });

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const txn of overdueTransactions) {
    const lease = txn.lease;
    if (!lease?.lateFeeEnabled) continue;

    // Check if past grace period
    const dueDate = new Date(txn.date);
    dueDate.setHours(0, 0, 0, 0);
    const graceDeadline = new Date(dueDate);
    graceDeadline.setDate(graceDeadline.getDate() + (lease.gracePeriod ?? 5));

    if (today <= graceDeadline) continue;

    // Calculate fee amount
    let feeAmount: number;
    if (lease.lateFeeType === "percentage") {
      feeAmount = Number(txn.amount) * (Number(lease.lateFeeAmount) / 100);
    } else {
      feeAmount = Number(lease.lateFeeAmount);
    }

    if (feeAmount <= 0) continue;

    // Check existing late fees for this transaction
    const existingFeeTotal = txn.lateFees
      .filter((f) => f.source === "auto_late_fee")
      .reduce((sum, f) => sum + Number(f.amount), 0);

    if (lease.lateFeeAccrual === "one_time") {
      // Already assessed a late fee? Skip.
      if (existingFeeTotal > 0) {
        skipped++;
        continue;
      }
    } else {
      // Daily accrual — check max cap
      const maxAmount = lease.lateFeeMaxAmount
        ? Number(lease.lateFeeMaxAmount)
        : Infinity;

      if (existingFeeTotal >= maxAmount) {
        skipped++;
        continue;
      }

      // Cap the fee to not exceed max
      feeAmount = Math.min(feeAmount, maxAmount - existingFeeTotal);
      if (feeAmount <= 0) {
        skipped++;
        continue;
      }

      // For daily accrual, check if we already assessed today
      const todayStr = today.toISOString().split("T")[0];
      const existingToday = await prisma.transaction.findFirst({
        where: {
          parentId: txn.id,
          source: "auto_late_fee",
          createdAt: {
            gte: new Date(todayStr),
            lt: new Date(
              new Date(todayStr).getTime() + 24 * 60 * 60 * 1000
            ),
          },
        },
      });

      if (existingToday) {
        skipped++;
        continue;
      }
    }

    try {
      const propertyName = lease.unit?.property?.name || "Property";
      const unitName = lease.unit?.name || "Unit";
      const billingPeriod = txn.billingPeriod;

      await prisma.transaction.create({
        data: {
          userId: lease.userId,
          propertyId: lease.propertyId,
          unitId: lease.unitId,
          leaseId: lease.id,
          contactId: lease.contactId,
          category: "income",
          subcategory: "late_fee",
          amount: feeAmount,
          balance: feeAmount,
          currency: lease.currency,
          date: today,
          details: `Late fee - ${propertyName} / ${unitName}`,
          status: 0, // UNPAID
          source: "auto_late_fee",
          billingPeriod,
          parentId: txn.id,
        },
      });
      created++;

      // Notify tenant of late fee (fire-and-forget)
      if (txn.contact) {
        sendNotification({
          userId: lease.userId,
          contactId: txn.contact.id,
          type: "late_fee_charged",
          data: {
            tenantName: `${txn.contact.firstName} ${txn.contact.lastName}`,
            propertyName,
            unitName,
            lateFeeAmount: feeAmount,
          },
          email: txn.contact.email,
          phone: txn.contact.phone,
        }).catch((err) => console.error("Late fee notification failed:", err));
      }
    } catch (err) {
      errors.push(
        `Transaction ${txn.id}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return { created, skipped, errors };
}
