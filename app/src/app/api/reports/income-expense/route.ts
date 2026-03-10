import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getSubcategoryLabel } from "@/lib/transaction-categories";

const statusLabels: Record<string, string> = {
  UNPAID: "Unpaid",
  PARTIAL: "Partial",
  PAID: "Paid",
  PENDING: "Pending",
  VOIDED: "Voided",
  WAIVED: "Waived",
};

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const propertyId = searchParams.get("propertyId");
  const range = searchParams.get("range") || "this_year";
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  // Build where clause
  const where: Record<string, unknown> = { userId: session.user.id };

  if (propertyId) {
    where.propertyId = propertyId;
  }

  // Date range filter
  const now = new Date();

  if (range === "custom" && (fromParam || toParam)) {
    const dateFilter: Record<string, Date> = {};
    if (fromParam) dateFilter.gte = new Date(fromParam);
    if (toParam) {
      const toDate = new Date(toParam);
      toDate.setHours(23, 59, 59, 999);
      dateFilter.lte = toDate;
    }
    where.date = dateFilter;
  } else if (range === "this_month") {
    where.date = { gte: new Date(now.getFullYear(), now.getMonth(), 1) };
  } else if (range === "last_month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    where.date = { gte: start, lte: end };
  } else if (range === "quarter") {
    const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    where.date = { gte: quarterStart };
  } else if (range === "this_year") {
    where.date = { gte: new Date(now.getFullYear(), 0, 1) };
  } else if (range === "last_year") {
    const start = new Date(now.getFullYear() - 1, 0, 1);
    const end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    where.date = { gte: start, lte: end };
  } else if (range === "all_time") {
    // No date filter
  } else {
    // Default: this year
    where.date = { gte: new Date(now.getFullYear(), 0, 1) };
  }

  const transactions = await prisma.transaction.findMany({
    where,
    select: {
      date: true,
      category: true,
      subcategory: true,
      details: true,
      amount: true,
      status: true,
      property: { select: { name: true } },
      unit: { select: { name: true } },
    },
    orderBy: { date: "asc" },
  });

  // Build CSV
  const headers = ["Date", "Property", "Unit", "Category", "Subcategory", "Description", "Amount", "Status"];
  const rows: string[][] = [];

  let totalIncome = 0;
  let totalExpenses = 0;

  for (const t of transactions) {
    const amount = Number(t.amount);
    if (t.category === "income") {
      totalIncome += amount;
    } else {
      totalExpenses += amount;
    }

    rows.push([
      t.date.toISOString().split("T")[0],
      csvEscape(t.property?.name || ""),
      csvEscape(t.unit?.name || ""),
      t.category === "income" ? "Income" : "Expense",
      csvEscape(getSubcategoryLabel(t.subcategory) || ""),
      csvEscape(t.details || ""),
      t.category === "expense" ? `-${amount.toFixed(2)}` : amount.toFixed(2),
      statusLabels[t.status] || "Unknown",
    ]);
  }

  // Summary rows
  rows.push([]);
  rows.push(["", "", "", "", "", "Total Income", totalIncome.toFixed(2), ""]);
  rows.push(["", "", "", "", "", "Total Expenses", `-${totalExpenses.toFixed(2)}`, ""]);
  rows.push(["", "", "", "", "", "Net Income", (totalIncome - totalExpenses).toFixed(2), ""]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="income-expense-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
