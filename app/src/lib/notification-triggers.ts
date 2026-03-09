/**
 * Scheduled notification triggers — called by the daily cron job.
 * Handles rent reminders, overdue notices, and lease expiration alerts.
 */

import { prisma } from "@/lib/db";
import { sendNotification } from "@/lib/notifications";

export interface NotificationCronResult {
  rentReminders: number;
  overdueNotices: number;
  leaseExpiryAlerts: number;
  errors: string[];
}

/**
 * Run all scheduled notification checks.
 * Called daily by /api/cron/notifications.
 */
export async function runNotificationCron(): Promise<NotificationCronResult> {
  const result: NotificationCronResult = {
    rentReminders: 0,
    overdueNotices: 0,
    leaseExpiryAlerts: 0,
    errors: [],
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ── 1. Rent Reminders (3 days before due) ──
  try {
    const reminderDate = new Date(today);
    reminderDate.setDate(reminderDate.getDate() + 3);

    // Find unpaid rent charges due in 3 days
    const upcomingCharges = await prisma.transaction.findMany({
      where: {
        source: "auto_rent",
        status: { in: [0, 2] }, // unpaid or partial
        balance: { gt: 0 },
        date: {
          gte: new Date(reminderDate.getFullYear(), reminderDate.getMonth(), reminderDate.getDate()),
          lt: new Date(reminderDate.getFullYear(), reminderDate.getMonth(), reminderDate.getDate() + 1),
        },
      },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        lease: {
          select: {
            userId: true,
            unit: { select: { name: true, property: { select: { name: true } } } },
          },
        },
      },
    });

    for (const txn of upcomingCharges) {
      if (!txn.contact || !txn.lease) continue;

      // Check we haven't already sent a reminder for this transaction today
      const alreadySent = await prisma.notificationLog.findFirst({
        where: {
          contactId: txn.contact.id,
          type: "rent_reminder",
          createdAt: { gte: today },
        },
      });
      if (alreadySent) continue;

      try {
        await sendNotification({
          userId: txn.lease.userId,
          contactId: txn.contact.id,
          type: "rent_reminder",
          data: {
            tenantName: `${txn.contact.firstName} ${txn.contact.lastName}`,
            propertyName: txn.lease.unit?.property?.name || "Property",
            unitName: txn.lease.unit?.name || "Unit",
            rentAmount: Number(txn.balance),
            dueDate: txn.date.toLocaleDateString(),
            daysUntilDue: 3,
          },
          email: txn.contact.email,
          phone: txn.contact.phone,
        });
        result.rentReminders++;
      } catch (err) {
        result.errors.push(`Reminder for ${txn.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } catch (err) {
    result.errors.push(`Rent reminders: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ── 2. Overdue Notices (1 day after due) ──
  try {
    const overdueDate = new Date(today);
    overdueDate.setDate(overdueDate.getDate() - 1);

    const overdueCharges = await prisma.transaction.findMany({
      where: {
        source: "auto_rent",
        status: { in: [0, 2] },
        balance: { gt: 0 },
        date: {
          gte: new Date(overdueDate.getFullYear(), overdueDate.getMonth(), overdueDate.getDate()),
          lt: new Date(overdueDate.getFullYear(), overdueDate.getMonth(), overdueDate.getDate() + 1),
        },
      },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        lease: {
          select: {
            userId: true,
            unit: { select: { name: true, property: { select: { name: true } } } },
          },
        },
      },
    });

    for (const txn of overdueCharges) {
      if (!txn.contact || !txn.lease) continue;

      const alreadySent = await prisma.notificationLog.findFirst({
        where: {
          contactId: txn.contact.id,
          type: "rent_overdue",
          createdAt: { gte: today },
        },
      });
      if (alreadySent) continue;

      try {
        await sendNotification({
          userId: txn.lease.userId,
          contactId: txn.contact.id,
          type: "rent_overdue",
          data: {
            tenantName: `${txn.contact.firstName} ${txn.contact.lastName}`,
            propertyName: txn.lease.unit?.property?.name || "Property",
            unitName: txn.lease.unit?.name || "Unit",
            rentAmount: Number(txn.balance),
            dueDate: txn.date.toLocaleDateString(),
            daysOverdue: 1,
          },
          email: txn.contact.email,
          phone: txn.contact.phone,
        });
        result.overdueNotices++;
      } catch (err) {
        result.errors.push(`Overdue for ${txn.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } catch (err) {
    result.errors.push(`Overdue notices: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ── 3. Lease Expiration Alerts (30, 60, 90 days) ──
  try {
    for (const daysOut of [30, 60, 90]) {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + daysOut);

      const expiringLeases = await prisma.lease.findMany({
        where: {
          leaseStatus: 0,
          leaseType: 1, // fixed-term only
          rentTo: {
            gte: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()),
            lt: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1),
          },
        },
        include: {
          contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          unit: { select: { name: true, property: { select: { name: true } } } },
        },
      });

      for (const lease of expiringLeases) {
        const alreadySent = await prisma.notificationLog.findFirst({
          where: {
            contactId: lease.contact.id,
            type: "lease_expiring",
            createdAt: { gte: today },
          },
        });
        if (alreadySent) continue;

        try {
          await sendNotification({
            userId: lease.userId,
            contactId: lease.contact.id,
            type: "lease_expiring",
            data: {
              tenantName: `${lease.contact.firstName} ${lease.contact.lastName}`,
              propertyName: lease.unit?.property?.name || "Property",
              unitName: lease.unit?.name || "Unit",
              leaseEndDate: lease.rentTo?.toLocaleDateString() || "",
              daysUntilExpiry: daysOut,
            },
            email: lease.contact.email,
            phone: lease.contact.phone,
          });
          result.leaseExpiryAlerts++;
        } catch (err) {
          result.errors.push(`Lease expiry ${lease.id}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }
  } catch (err) {
    result.errors.push(`Lease expiry: ${err instanceof Error ? err.message : String(err)}`);
  }

  return result;
}
