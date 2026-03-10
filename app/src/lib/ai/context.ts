import { prisma } from "@/lib/db";

const LEASE_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  EXPIRED: "Expired",
  TERMINATED: "Terminated",
};

const TX_STATUS_LABEL: Record<string, string> = {
  UNPAID: "Unpaid",
  PAID: "Paid",
  PARTIAL: "Partial",
  PENDING: "Pending",
  WAIVED: "Waived",
  VOIDED: "Voided",
};

const MX_STATUS_LABEL: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const MX_PRIORITY_LABEL: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export async function loadPortfolioContext(userId: string): Promise<string> {
  const [properties, recentTransactions, maintenanceRequests] =
    await Promise.all([
      prisma.property.findMany({
        where: { userId, archivedAt: null },
        include: {
          units: {
            include: {
              leases: {
                where: { leaseStatus: "ACTIVE" },
                include: {
                  contact: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      email: true,
                      phone: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.transaction.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        take: 50,
        select: {
          id: true,
          category: true,
          amount: true,
          date: true,
          status: true,
          details: true,
          note: true,
          source: true,
          billingPeriod: true,
          property: { select: { name: true } },
          unit: { select: { name: true } },
          contact: { select: { firstName: true, lastName: true } },
          lease: { select: { id: true } },
        },
      }),
      prisma.maintenanceRequest.findMany({
        where: { userId, status: { in: ["OPEN", "IN_PROGRESS"] } },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          title: true,
          description: true,
          priority: true,
          status: true,
          category: true,
          property: { select: { name: true } },
          unit: { select: { name: true } },
          contact: { select: { firstName: true, lastName: true } },
          createdAt: true,
        },
      }),
    ]);

  const lines: string[] = [];

  if (properties.length === 0) {
    lines.push("No properties on file.");
    return lines.join("\n");
  }

  lines.push(`**Portfolio: ${properties.length} properties**\n`);

  for (const prop of properties) {
    lines.push(
      `### ${prop.name} — ${prop.address}, ${prop.city}, ${prop.state} ${prop.zip}`,
    );
    lines.push(`- Property ID: ${prop.id}`);
    lines.push(`- Units: ${prop.units.length}`);

    for (const unit of prop.units) {
      lines.push(`\n  **Unit: ${unit.name}** (ID: ${unit.id})`);
      if (unit.bedrooms !== null)
        lines.push(`  - ${unit.bedrooms} bed / ${unit.bathrooms ?? "?"} bath`);
      if (unit.price) lines.push(`  - Listed rent: $${unit.price}`);
      lines.push(`  - Occupied: ${unit.isRented ? "Yes" : "No"}`);

      for (const lease of unit.leases) {
        lines.push(`\n    **Active Lease** (ID: ${lease.id})`);
        lines.push(
          `    - Tenant: ${lease.contact.firstName} ${lease.contact.lastName} (ID: ${lease.contact.id})`,
        );
        if (lease.contact.email)
          lines.push(`    - Email: ${lease.contact.email}`);
        if (lease.contact.phone)
          lines.push(`    - Phone: ${lease.contact.phone}`);
        lines.push(`    - Rent: $${lease.rentAmount}/mo, due day ${lease.rentDueDay}`);
        lines.push(
          `    - Lease: ${lease.startDate.toISOString().split("T")[0]} to ${lease.endDate ? lease.endDate.toISOString().split("T")[0] : "month-to-month"}`,
        );
        lines.push(
          `    - Status: ${LEASE_STATUS_LABEL[lease.leaseStatus] ?? "Unknown"}`,
        );
        lines.push(`    - Grace period: ${lease.gracePeriod} days`);
        if (lease.lateFeeEnabled) {
          lines.push(
            `    - Late fee: ${lease.lateFeeType === "flat" ? `$${lease.lateFeeAmount}` : `${lease.lateFeeAmount}%`} (${lease.lateFeeAccrual})`,
          );
        }
      }
    }
    lines.push("");
  }

  if (recentTransactions.length > 0) {
    lines.push("\n### Recent Transactions (last 50)\n");
    for (const tx of recentTransactions) {
      const who = tx.contact
        ? ` — ${tx.contact.firstName} ${tx.contact.lastName}`
        : "";
      const where = [tx.property?.name, tx.unit?.name]
        .filter(Boolean)
        .join(" / ");
      lines.push(
        `- **${tx.details ?? tx.category}** (ID: ${tx.id}): $${tx.amount} [${TX_STATUS_LABEL[tx.status] ?? "Unknown"}] ${tx.date.toISOString().split("T")[0]}${where ? ` @ ${where}` : ""}${who}${tx.note ? ` — "${tx.note}"` : ""}`,
      );
    }
  }

  if (maintenanceRequests.length > 0) {
    lines.push("\n### Open Maintenance Requests\n");
    for (const mx of maintenanceRequests) {
      const where = [mx.property?.name, mx.unit?.name]
        .filter(Boolean)
        .join(" / ");
      const who = mx.contact
        ? ` — reported by ${mx.contact.firstName} ${mx.contact.lastName}`
        : "";
      lines.push(
        `- **${mx.title}** (ID: ${mx.id}): [${MX_STATUS_LABEL[mx.status] ?? "Unknown"}] [${MX_PRIORITY_LABEL[mx.priority] ?? "Medium"}] @ ${where}${who} — opened ${mx.createdAt.toISOString().split("T")[0]}`,
      );
    }
  }

  return lines.join("\n");
}
