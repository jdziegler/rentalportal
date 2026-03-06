import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

// Map price IDs to plan names
const priceIdToPlanName: Record<string, string> = {
  [process.env.STRIPE_STARTER_PRICE_ID || ""]: "Starter ($18/mo)",
  [process.env.STRIPE_GROWTH_PRICE_ID || ""]: "Growth ($29/mo)",
  [process.env.STRIPE_PRO_PRICE_ID || ""]: "Pro ($50/mo)",
};

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

  // Derive human-readable subscription info
  const planName = user.stripePriceId
    ? priceIdToPlanName[user.stripePriceId] || "Custom"
    : "Free";

  const subscriptionStatus = user.stripeSubscriptionId
    ? user.stripeCurrentPeriodEnd && user.stripeCurrentPeriodEnd > new Date()
      ? "Active"
      : "Expired"
    : "None";

  const connectStatus = user.stripeConnectId
    ? user.stripeConnectOnboarded
      ? "Connected"
      : "Pending onboarding"
    : "Not set up";

  const rows = [
    { label: "Name", value: user.name || "—" },
    { label: "Email", value: user.email },
    {
      label: "Email Verified",
      value: user.emailVerified
        ? user.emailVerified.toLocaleDateString()
        : "No",
    },
    { label: "Member Since", value: user.createdAt.toLocaleDateString() },
  ];

  const billingRows = [
    { label: "Plan", value: planName },
    { label: "Subscription Status", value: subscriptionStatus },
    {
      label: "Next Billing Date",
      value:
        user.stripeCurrentPeriodEnd
          ? user.stripeCurrentPeriodEnd.toLocaleDateString()
          : "—",
    },
    { label: "Rent Collection", value: connectStatus },
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

      {/* Profile */}
      <div className="bg-white rounded-lg shadow overflow-x-auto mb-8">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-700">Profile</h2>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b last:border-b-0">
                <td className="px-6 py-3 text-gray-700 font-medium w-56">
                  {row.label}
                </td>
                <td className="px-6 py-3 text-gray-900">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Billing */}
      <div className="bg-white rounded-lg shadow overflow-x-auto mb-8">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-700">
            Billing & Payments
          </h2>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {billingRows.map((row) => (
              <tr key={row.label} className="border-b last:border-b-0">
                <td className="px-6 py-3 text-gray-700 font-medium w-56">
                  {row.label}
                </td>
                <td className="px-6 py-3 text-gray-900">
                  {row.label === "Subscription Status" ? (
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        row.value === "Active"
                          ? "bg-green-100 text-green-700"
                          : row.value === "Expired"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {row.value}
                    </span>
                  ) : row.label === "Rent Collection" ? (
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        row.value === "Connected"
                          ? "bg-green-100 text-green-700"
                          : row.value === "Pending onboarding"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {row.value}
                    </span>
                  ) : (
                    row.value
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Data Summary */}
      <h2 className="text-lg font-semibold mb-4 text-gray-900">
        Data Summary
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-lg shadow p-4 text-center"
          >
            <p className="text-2xl font-bold text-gray-900">{s.count}</p>
            <p className="text-sm text-gray-700">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
