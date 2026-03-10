import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DeleteTransactionButton } from "./delete-button";
import { TransactionActions } from "./transaction-actions";
import { PaymentHistory } from "./payment-history";
import { statusLabels, statusStyles } from "@/lib/transaction-status";
import { getSubcategoryLabel, getSubcategoryColor } from "@/lib/transaction-categories";
import { SetPageContext } from "@/components/set-page-context";

const paymentMethods: Record<string, string> = {
  cash: "Cash",
  check: "Check",
  ach: "ACH",
  card: "Card",
  other: "Other",
};

export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  const transaction = await prisma.transaction.findUnique({
    where: { id, userId: session.user.id },
    include: {
      property: { select: { id: true, name: true } },
      unit: { select: { id: true, name: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
      payments: {
        orderBy: { date: "desc" },
      },
    },
  });

  if (!transaction) notFound();

  const isIncome = transaction.category === "income";
  const amount = Number(transaction.amount);
  const paid = Number(transaction.paidAmount);
  const balance = Number(transaction.balance);

  return (
    <div>
      <SetPageContext label={`/${transaction.details ?? "Transaction"}`} context={`Transaction detail: ${transaction.details ?? transaction.category} — $${amount.toLocaleString()} (${isIncome ? "Income" : "Expense"}). Status: ${statusLabels[transaction.status] ?? "Unknown"}, paid: $${paid.toLocaleString()}, balance: $${balance.toLocaleString()}. Date: ${transaction.date.toISOString().split("T")[0]}. ${transaction.property ? `Property: ${transaction.property.name}` : ""}${transaction.unit ? `, Unit: ${transaction.unit.name}` : ""}${transaction.contact ? `. Tenant: ${transaction.contact.firstName} ${transaction.contact.lastName}` : ""}. ${transaction.payments.length} payment(s) recorded. Transaction ID: ${transaction.id}.`} />
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/transactions" className="hover:text-gray-700">
              Transactions
            </Link>
            <span>/</span>
            <span className="text-gray-900">{transaction.details || `#${id.slice(0, 8)}`}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {transaction.details || `Transaction #${id.slice(0, 8)}`}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge
              variant="secondary"
              className={statusStyles[transaction.status] || "bg-gray-100 text-gray-700"}
            >
              {statusLabels[transaction.status] || "Unknown"}
            </Badge>
            <Badge
              variant="secondary"
              className={
                isIncome
                  ? "bg-green-100 text-green-700 hover:bg-green-100"
                  : "bg-red-100 text-red-700 hover:bg-red-100"
              }
            >
              {transaction.category}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href={`/transactions/${id}/edit`}>Edit</Link>
          </Button>
          <DeleteTransactionButton id={id} />
        </div>
      </div>

      {/* Details + Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Transaction Details + Payment History */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Details</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600">Category</dt>
                <dd>
                  <Badge
                    variant="secondary"
                    className={
                      isIncome
                        ? "bg-green-100 text-green-700 hover:bg-green-100"
                        : "bg-red-100 text-red-700 hover:bg-red-100"
                    }
                  >
                    {transaction.category}
                  </Badge>
                </dd>
              </div>
              {transaction.subcategory && (
                <div className="flex justify-between">
                  <dt className="text-gray-600">Type</dt>
                  <dd>
                    <Badge variant="secondary" className={getSubcategoryColor(transaction.subcategory)}>
                      {getSubcategoryLabel(transaction.subcategory)}
                    </Badge>
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray-600">Status</dt>
                <dd>
                  <Badge
                    variant="secondary"
                    className={statusStyles[transaction.status] || "bg-gray-100 text-gray-700"}
                  >
                    {statusLabels[transaction.status] || "Unknown"}
                  </Badge>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Amount</dt>
                <dd
                  className={`font-medium ${
                    isIncome ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {isIncome ? "+" : "-"}$
                  {Math.abs(amount).toFixed(2)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Paid</dt>
                <dd className="text-gray-900 font-medium">
                  ${paid.toFixed(2)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Balance</dt>
                <dd className={`font-medium ${balance > 0 ? "text-orange-600" : "text-gray-900"}`}>
                  ${balance.toFixed(2)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Due Date</dt>
                <dd className="text-gray-900">
                  {transaction.date.toLocaleDateString()}
                </dd>
              </div>
              {transaction.paidAt && (
                <div className="flex justify-between">
                  <dt className="text-gray-600">Paid In Full</dt>
                  <dd className="text-gray-900">
                    {transaction.paidAt.toLocaleDateString()}
                  </dd>
                </div>
              )}
              {transaction.source && (
                <div className="flex justify-between">
                  <dt className="text-gray-600">Source</dt>
                  <dd className="text-gray-900">
                    {transaction.source === "auto_rent"
                      ? "Auto-generated rent"
                      : transaction.source === "auto_late_fee"
                        ? "Auto-generated late fee"
                        : transaction.source}
                  </dd>
                </div>
              )}
              {transaction.details && (
                <div className="flex justify-between">
                  <dt className="text-gray-600">Description</dt>
                  <dd className="text-gray-900">{transaction.details}</dd>
                </div>
              )}
              {transaction.note && (
                <>
                  <Separator className="my-4" />
                  <p className="text-sm text-gray-700">{transaction.note}</p>
                </>
              )}
            </dl>
          </div>

          {/* Payment History */}
          <PaymentHistory
            payments={transaction.payments.map((p) => ({
              id: p.id,
              amount: Number(p.amount),
              date: p.date.toISOString(),
              method: p.method,
              note: p.note,
              type: p.type,
              stripePaymentIntentId: p.stripePaymentIntentId,
            }))}
            transactionId={id}
            transactionStatus={transaction.status}
          />
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Actions */}
          <TransactionActions
            id={id}
            status={transaction.status}
            amount={amount}
            paid={paid}
            balance={balance}
          />

          {/* Linked entities */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Linked Records
            </h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600">Property</dt>
                <dd>
                  {transaction.property ? (
                    <Link
                      href={`/properties/${transaction.property.id}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {transaction.property.name}
                    </Link>
                  ) : (
                    <span className="text-gray-500">--</span>
                  )}
                </dd>
              </div>
              {transaction.unit && (
                <div className="flex justify-between">
                  <dt className="text-gray-600">Unit</dt>
                  <dd>
                    <Link
                      href={`/units/${transaction.unit.id}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {transaction.unit.name}
                    </Link>
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray-600">Contact</dt>
                <dd>
                  {transaction.contact ? (
                    <Link
                      href={`/tenants/${transaction.contact.id}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {transaction.contact.firstName}{" "}
                      {transaction.contact.lastName}
                    </Link>
                  ) : (
                    <span className="text-gray-500">--</span>
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
