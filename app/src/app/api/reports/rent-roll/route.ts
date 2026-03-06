import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const leases = await prisma.lease.findMany({
    where: { userId: session.user.id, leaseStatus: 0 },
    include: {
      unit: {
        select: {
          name: true,
          property: { select: { name: true } },
        },
      },
      contact: {
        select: { firstName: true, lastName: true, email: true, phone: true },
      },
    },
    orderBy: [
      { unit: { property: { name: "asc" } } },
      { unit: { name: "asc" } },
    ],
  });

  // Get balances per lease
  const leaseIds = leases.map((l) => l.id);
  const balances = await prisma.transaction.groupBy({
    by: ["leaseId"],
    where: {
      leaseId: { in: leaseIds },
      userId: session.user.id,
      category: "income",
      status: { in: [0, 1] },
    },
    _sum: { balance: true },
  });

  const balanceMap = new Map(
    balances.map((b) => [b.leaseId, Number(b._sum.balance || 0)])
  );

  const headers = [
    "Property",
    "Unit",
    "Tenant",
    "Email",
    "Phone",
    "Rent Amount",
    "Due Day",
    "Lease Start",
    "Lease End",
    "Outstanding Balance",
  ];

  const rows = leases.map((l) => [
    csvEscape(l.unit.property.name),
    csvEscape(l.unit.name),
    csvEscape(`${l.contact.firstName} ${l.contact.lastName}`),
    csvEscape(l.contact.email || ""),
    csvEscape(l.contact.phone || ""),
    Number(l.rentAmount).toFixed(2),
    l.rentDueDay.toString(),
    l.rentFrom.toISOString().split("T")[0],
    l.rentTo ? l.rentTo.toISOString().split("T")[0] : "Month-to-Month",
    (balanceMap.get(l.id) || 0).toFixed(2),
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="rent-roll-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
