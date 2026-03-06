import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { TransactionForm } from "@/components/transaction-form";
import { updateTransaction } from "@/lib/actions/transactions";

export default async function EditTransactionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  const transaction = await prisma.transaction.findUnique({
    where: { id, userId: session.user.id },
  });

  if (!transaction) notFound();

  const [properties, tenants] = await Promise.all([
    prisma.property.findMany({
      where: { userId: session.user.id, archivedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.contact.findMany({
      where: { userId: session.user.id },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
  ]);

  const updateWithId = updateTransaction.bind(null, id);

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/transactions" className="hover:text-gray-700">
          Transactions
        </Link>
        <span>/</span>
        <Link href={`/transactions/${id}`} className="hover:text-gray-700">
          #{id.slice(0, 8)}
        </Link>
        <span>/</span>
        <span className="text-gray-900">Edit</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Edit Transaction
      </h1>
      <div className="bg-white rounded-lg shadow p-6">
        <TransactionForm
          action={updateWithId}
          defaultValues={{
            category: transaction.category,
            subcategory: transaction.subcategory || "",
            amount: Number(transaction.amount).toString(),
            date: transaction.date.toISOString().split("T")[0],
            details: transaction.details || "",
            note: transaction.note || "",
            propertyId: transaction.propertyId || "",
            unitId: transaction.unitId || "",
            contactId: transaction.contactId || "",
            paymentMethod: transaction.paymentMethod || "",
            status: transaction.status.toString(),
          }}
          submitLabel="Save Changes"
          properties={properties}
          tenants={tenants}
        />
      </div>
    </div>
  );
}
