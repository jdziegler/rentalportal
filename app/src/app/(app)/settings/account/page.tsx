import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      _count: {
        select: {
          properties: true,
          contacts: true,
          leases: true,
          transactions: true,
          listings: true,
        },
      },
    },
  });

  if (!user) redirect("/login");

  const rows = [
    { label: "User ID", value: user.id },
    { label: "Name", value: user.name || "—" },
    { label: "Email", value: user.email },
    { label: "Email Verified", value: user.emailVerified ? user.emailVerified.toLocaleDateString() : "No" },
    { label: "Created", value: user.createdAt.toLocaleDateString() },
    { label: "Stripe Customer ID", value: user.stripeCustomerId || "—" },
    { label: "Stripe Subscription", value: user.stripeSubscriptionId || "—" },
    { label: "Stripe Plan", value: user.stripePriceId || "Free" },
    {
      label: "Billing Period End",
      value: user.stripeCurrentPeriodEnd
        ? user.stripeCurrentPeriodEnd.toLocaleDateString()
        : "—",
    },
    { label: "Stripe Connect ID", value: user.stripeConnectId || "—" },
    {
      label: "Connect Onboarded",
      value: user.stripeConnectOnboarded ? "Yes" : "No",
    },
  ];

  const stats = [
    { label: "Properties", count: user._count.properties },
    { label: "Contacts", count: user._count.contacts },
    { label: "Leases", count: user._count.leases },
    { label: "Transactions", count: user._count.transactions },
    { label: "Listings", count: user._count.listings },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Account</h1>

      <div className="bg-white rounded-lg shadow overflow-x-auto mb-8">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b last:border-b-0">
                <td className="px-6 py-3 text-gray-700 font-medium w-56">
                  {row.label}
                </td>
                <td className="px-6 py-3 text-gray-900 font-mono text-xs">
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="text-lg font-semibold mb-4 text-gray-900">Data Summary</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{s.count}</p>
            <p className="text-sm text-gray-700">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
