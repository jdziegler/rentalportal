import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { buildCSV, csvResponse, formatDate, formatCurrency } from "@/lib/export";
import { getSubcategoryLabel } from "@/lib/transaction-categories";

const STATUS_LABELS: Record<number, string> = {
  0: "Unpaid", 1: "Partial", 2: "Paid", 3: "Voided", 4: "Waived",
};

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contactId = request.nextUrl.searchParams.get("contactId");
  if (!contactId) {
    return NextResponse.json({ error: "contactId is required" }, { status: 400 });
  }

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, userId: session.user.id },
  });
  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const transactions = await prisma.transaction.findMany({
    where: { userId: session.user.id, contactId },
    include: {
      property: { select: { name: true } },
      unit: { select: { name: true } },
    },
    orderBy: { date: "asc" },
  });

  const tenantName = `${contact.firstName} ${contact.lastName}`;

  const headers = [
    "Date", "Property", "Unit", "Category", "Subcategory",
    "Description", "Amount", "Paid", "Balance", "Status",
  ];

  const rows = transactions.map((t) => [
    formatDate(t.date),
    t.property?.name || "",
    t.unit?.name || "",
    t.category === "income" ? "Income" : "Expense",
    getSubcategoryLabel(t.subcategory) || "",
    t.details || "",
    formatCurrency(Number(t.amount)),
    formatCurrency(Number(t.paid)),
    formatCurrency(Number(t.balance)),
    STATUS_LABELS[t.status] || "Unknown",
  ]);

  // Add summary
  const totalCharged = transactions.reduce((s, t) => s + Number(t.amount), 0);
  const totalPaid = transactions.reduce((s, t) => s + Number(t.paid), 0);
  const totalBalance = transactions.reduce((s, t) => s + Number(t.balance), 0);

  rows.push([]);
  rows.push(["", "", "", "", "", "Total Charged", formatCurrency(totalCharged), "", "", ""]);
  rows.push(["", "", "", "", "", "Total Paid", "", formatCurrency(totalPaid), "", ""]);
  rows.push(["", "", "", "", "", "Total Balance", "", "", formatCurrency(totalBalance), ""]);

  const csv = buildCSV(headers, rows);
  const safeName = tenantName.replace(/[^a-zA-Z0-9]/g, "-");
  return csvResponse(csv, `tenant-ledger-${safeName}-${formatDate(new Date())}.csv`);
}
