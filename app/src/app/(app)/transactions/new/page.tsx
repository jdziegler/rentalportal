import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { TransactionForm } from "@/components/transaction-form";
import { createTransaction } from "@/lib/actions/transactions";

export default async function NewTransactionPage({
  searchParams,
}: {
  searchParams: Promise<{
    propertyId?: string;
    contactId?: string;
    category?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { propertyId, contactId, category } = await searchParams;

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

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/transactions" className="hover:text-gray-700">
          Transactions
        </Link>
        <span>/</span>
        <span className="text-gray-900">New</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Add Transaction
      </h1>
      <div className="bg-white rounded-lg shadow p-6">
        <TransactionForm
          action={createTransaction}
          defaultValues={{
            propertyId: propertyId || "",
            contactId: contactId || "",
            category: category || "income",
          }}
          submitLabel="Create Transaction"
          properties={properties}
          tenants={tenants}
        />
      </div>
    </div>
  );
}
