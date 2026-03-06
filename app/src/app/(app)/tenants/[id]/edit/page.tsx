import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { TenantForm } from "@/components/tenant-form";
import { updateTenant } from "@/lib/actions/tenants";

export default async function EditTenantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  const tenant = await prisma.contact.findUnique({
    where: { id, userId: session.user.id, role: "tenant" },
  });

  if (!tenant) notFound();

  const updateWithId = updateTenant.bind(null, id);

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/tenants" className="hover:text-gray-700">
          Tenants
        </Link>
        <span>/</span>
        <Link href={`/tenants/${id}`} className="hover:text-gray-700">
          {tenant.firstName} {tenant.lastName}
        </Link>
        <span>/</span>
        <span className="text-gray-900">Edit</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Tenant</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <TenantForm
          action={updateWithId}
          defaultValues={{
            firstName: tenant.firstName,
            lastName: tenant.lastName,
            email: tenant.email || "",
            phone: tenant.phone || "",
            address: tenant.address || "",
            city: tenant.city || "",
            state: tenant.state || "",
            zip: tenant.zip || "",
            notes: tenant.notes || "",
          }}
          submitLabel="Save Changes"
        />
      </div>
    </div>
  );
}
