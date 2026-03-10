import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contactId = request.nextUrl.searchParams.get("contactId");
  if (!contactId) {
    return NextResponse.json({ error: "contactId required" }, { status: 400 });
  }

  const tenant = await prisma.contact.findUnique({
    where: { id: contactId, userId: session.user.id, role: "tenant" },
    select: { firstName: true, lastName: true },
  });

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const transactions = await prisma.transaction.findMany({
    where: { contactId, userId: session.user.id },
    include: {
      property: { select: { name: true } },
      unit: { select: { name: true } },
    },
    orderBy: { date: "asc" },
  });

  const statusLabels: Record<string, string> = {
    UNPAID: "Unpaid", PARTIAL: "Partial", PAID: "Paid", PENDING: "Pending", VOIDED: "Voided", WAIVED: "Waived",
  };

  const headers = ["Date", "Description", "Category", "Property", "Unit", "Status", "Amount", "Paid", "Balance"];

  const rows = transactions.map((t) => [
    t.date.toISOString().split("T")[0],
    csvEscape(t.details || ""),
    t.category,
    csvEscape(t.property?.name || ""),
    csvEscape(t.unit?.name || ""),
    statusLabels[t.status] || "Unknown",
    Number(t.amount).toFixed(2),
    Number(t.paidAmount).toFixed(2),
    Number(t.balance).toFixed(2),
  ]);

  const tenantName = `${tenant.firstName} ${tenant.lastName}`;
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="statement-${tenantName.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
