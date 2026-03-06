import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { TenantForm } from "@/components/tenant-form";
import { createTenant } from "@/lib/actions/tenants";

export default async function NewTenantPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/tenants" className="hover:text-gray-700">
          Tenants
        </Link>
        <span>/</span>
        <span className="text-gray-900">New</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add Tenant</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <TenantForm action={createTenant} submitLabel="Create Tenant" />
      </div>
    </div>
  );
}
