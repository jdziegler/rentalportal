import { redirect } from "next/navigation";
import { getTenantSession, findContactsByIdentifier } from "@/lib/tenant-auth";
import { prisma } from "@/lib/prisma";
import PayRentClient from "./pay-rent-client";

export default async function TenantPayPage() {
  const session = await getTenantSession();
  if (!session) redirect("/tenant");

  const contacts = await findContactsByIdentifier(session.identifier);
  if (contacts.length === 0) redirect("/tenant");

  const contactIds = contacts.map((c) => c.id);

  // Get all active leases for this tenant
  const leases = await prisma.lease.findMany({
    where: {
      contactId: { in: contactIds },
      leaseStatus: 0,
    },
    include: {
      unit: {
        include: {
          property: { select: { id: true, name: true, address: true, city: true, state: true } },
        },
      },
      contact: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  // Get recent transactions for these leases
  const leaseIds = leases.map((l) => l.id);
  const transactions = await prisma.transaction.findMany({
    where: {
      leaseId: { in: leaseIds },
      category: "income",
    },
    orderBy: { date: "desc" },
    take: 20,
    select: {
      id: true,
      amount: true,
      paid: true,
      balance: true,
      status: true,
      date: true,
      details: true,
      subcategory: true,
      leaseId: true,
    },
  });

  const serializedLeases = leases.map((l) => ({
    id: l.id,
    rentAmount: Number(l.rentAmount),
    rentDueDay: l.rentDueDay,
    unitName: l.unit.name,
    propertyName: l.unit.property.name,
    address: `${l.unit.property.address}, ${l.unit.property.city}, ${l.unit.property.state}`,
    tenantName: `${l.contact.firstName} ${l.contact.lastName}`,
    paymentToken: l.paymentToken,
  }));

  const serializedTransactions = transactions.map((t) => ({
    id: t.id,
    amount: Number(t.amount),
    paid: Number(t.paid),
    balance: Number(t.balance),
    status: t.status,
    date: t.date.toISOString(),
    details: t.details,
    subcategory: t.subcategory,
    leaseId: t.leaseId,
  }));

  return (
    <PayRentClient leases={serializedLeases} transactions={serializedTransactions} />
  );
}
