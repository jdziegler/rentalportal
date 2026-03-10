import { prisma } from "@/lib/db";

const LEASE_STATUS: Record<number, string> = {
  0: "Active",
  1: "Expired",
  2: "Terminated",
};

const TX_STATUS: Record<number, string> = {
  0: "Unpaid",
  1: "Paid",
  2: "Partial",
  3: "Pending",
};

const MX_STATUS: Record<number, string> = {
  0: "Open",
  1: "In Progress",
  2: "Completed",
  3: "Cancelled",
};

const MX_PRIORITY: Record<number, string> = {
  0: "Low",
  1: "Medium",
  2: "High",
  3: "Urgent",
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
                where: { leaseStatus: 0 },
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
        where: { userId, status: { in: [0, 1] } },
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
          `    - Lease: ${lease.rentFrom.toISOString().split("T")[0]} to ${lease.rentTo ? lease.rentTo.toISOString().split("T")[0] : "month-to-month"}`,
        );
        lines.push(
          `    - Status: ${LEASE_STATUS[lease.leaseStatus] ?? "Unknown"}`,
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
        `- **${tx.details ?? tx.category}** (ID: ${tx.id}): $${tx.amount} [${TX_STATUS[tx.status] ?? "Unknown"}] ${tx.date.toISOString().split("T")[0]}${where ? ` @ ${where}` : ""}${who}${tx.note ? ` — "${tx.note}"` : ""}`,
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
        `- **${mx.title}** (ID: ${mx.id}): [${MX_STATUS[mx.status] ?? "Unknown"}] [${MX_PRIORITY[mx.priority] ?? "Medium"}] @ ${where}${who} — opened ${mx.createdAt.toISOString().split("T")[0]}`,
      );
    }
  }

  return lines.join("\n");
}
