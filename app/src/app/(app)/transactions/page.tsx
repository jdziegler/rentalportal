import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function TransactionsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const transactions = await prisma.transaction.findMany({
    where: { userId: session.user.id },
    include: {
      property: { select: { name: true } },
      unit: { select: { name: true } },
      contact: { select: { firstName: true, lastName: true } },
    },
    orderBy: { date: "desc" },
    take: 50,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Transactions</h1>
      </div>
      {transactions.length === 0 ? (
        <p className="text-gray-500">No transactions yet.</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Details</th>
                <th className="px-6 py-3 font-medium">Property / Unit</th>
                <th className="px-6 py-3 font-medium">Contact</th>
                <th className="px-6 py-3 font-medium">Category</th>
                <th className="px-6 py-3 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.map((t) => {
                const isIncome = t.category === "income";
                return (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-600">
                      {t.date.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">{t.details || "—"}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {t.property?.name || "—"}
                      {t.unit ? ` — ${t.unit.name}` : ""}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {t.contact
                        ? `${t.contact.firstName} ${t.contact.lastName}`
                        : "—"}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{t.category}</td>
                    <td
                      className={`px-6 py-4 text-right font-medium ${
                        isIncome ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {isIncome ? "+" : "-"}$
                      {Math.abs(Number(t.amount)).toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
