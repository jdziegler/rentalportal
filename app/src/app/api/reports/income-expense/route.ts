import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const months = parseInt(searchParams.get("months") || "12");

  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: session.user.id,
      date: { gte: startDate },
    },
    select: {
      date: true,
      category: true,
      amount: true,
      property: { select: { name: true } },
    },
  });

  // Group by property + month
  const data = new Map<string, { income: number; expense: number }>();
  const properties = new Set<string>();

  for (const t of transactions) {
    const monthKey = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, "0")}`;
    const propName = t.property?.name || "Unassigned";
    const key = `${monthKey}|${propName}`;
    properties.add(propName);

    const entry = data.get(key) || { income: 0, expense: 0 };
    if (t.category === "income") {
      entry.income += Number(t.amount);
    } else {
      entry.expense += Number(t.amount);
    }
    data.set(key, entry);
  }

  // Build sorted months list
  const monthSet = new Set<string>();
  for (const key of data.keys()) {
    monthSet.add(key.split("|")[0]);
  }
  const sortedMonths = [...monthSet].sort();
  const sortedProperties = [...properties].sort();

  const headers = ["Month", "Property", "Income", "Expenses", "Net"];
  const rows: string[][] = [];

  for (const month of sortedMonths) {
    for (const prop of sortedProperties) {
      const entry = data.get(`${month}|${prop}`);
      if (!entry) continue;
      const net = entry.income - entry.expense;
      rows.push([
        month,
        csvEscape(prop),
        entry.income.toFixed(2),
        entry.expense.toFixed(2),
        net.toFixed(2),
      ]);
    }
  }

  // Totals row
  const totalIncome = [...data.values()].reduce((s, e) => s + e.income, 0);
  const totalExpense = [...data.values()].reduce((s, e) => s + e.expense, 0);
  rows.push([
    "TOTAL",
    "",
    totalIncome.toFixed(2),
    totalExpense.toFixed(2),
    (totalIncome - totalExpense).toFixed(2),
  ]);

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
