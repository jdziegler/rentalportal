import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { buildCSV, csvResponse, formatDate, formatCurrency } from "@/lib/export";
import { getSubcategoryLabel } from "@/lib/transaction-categories";

const STATUS_LABELS: Record<string, string> = {
  UNPAID: "Unpaid", PARTIAL: "Partial", PAID: "Paid", PENDING: "Pending", VOIDED: "Voided", WAIVED: "Waived",
};

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const propertyId = params.get("propertyId");
  const category = params.get("category"); // "income" | "expense" | null (all)
  const status = params.get("status"); // number or null
  const dateFrom = params.get("dateFrom");
  const dateTo = params.get("dateTo");

  // Build query
  const where: Record<string, unknown> = { userId: session.user.id };
  if (propertyId) where.propertyId = propertyId;
  if (category) where.category = category;
  if (status) where.status = status;

  const dateFilter: Record<string, Date> = {};
  if (dateFrom) dateFilter.gte = new Date(dateFrom);
  if (dateTo) {
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);
    dateFilter.lte = to;
  }
  if (Object.keys(dateFilter).length > 0) where.date = dateFilter;

  const transactions = await prisma.transaction.findMany({
    where,
    include: {
      property: { select: { name: true } },
      unit: { select: { name: true } },
      contact: { select: { firstName: true, lastName: true } },
    },
    orderBy: { date: "asc" },
  });

  const headers = [
    "Date", "Property", "Unit", "Tenant", "Category", "Subcategory",
    "Description", "Amount", "Paid", "Balance", "Status", "Payment Method",
  ];

  const rows = transactions.map((t) => [
    formatDate(t.date),
    t.property?.name || "",
    t.unit?.name || "",
    t.contact ? `${t.contact.firstName} ${t.contact.lastName}` : "",
    t.category === "income" ? "Income" : "Expense",
    getSubcategoryLabel(t.subcategory) || "",
    t.details || "",
    formatCurrency(Number(t.amount)),
    formatCurrency(Number(t.paidAmount)),
    formatCurrency(Number(t.balance)),
    STATUS_LABELS[t.status] || "Unknown",
    t.paymentMethod || "",
  ]);

  const csv = buildCSV(headers, rows);
  const dateStr = formatDate(new Date());
  return csvResponse(csv, `transactions-${dateStr}.csv`);
}
