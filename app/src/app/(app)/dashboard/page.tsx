import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const [propertyCount, unitCount, leaseCount, tenantCount] = await Promise.all(
    [
      prisma.property.count({ where: { userId } }),
      prisma.unit.count({ where: { property: { userId } } }),
      prisma.lease.count({ where: { userId, leaseStatus: 0 } }),
      prisma.contact.count({ where: { userId, role: "tenant" } }),
    ]
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Properties" value={propertyCount.toString()} />
        <StatCard title="Units" value={unitCount.toString()} />
        <StatCard title="Active Leases" value={leaseCount.toString()} />
        <StatCard title="Tenants" value={tenantCount.toString()} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Monthly Income</h2>
          <p className="text-gray-500 text-sm">Coming soon</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Transactions</h2>
          <p className="text-gray-500 text-sm">Coming soon</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  );
}
