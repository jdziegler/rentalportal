import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PropertyForm } from "@/components/property-form";
import { createProperty } from "@/lib/actions/properties";

export default async function NewPropertyPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/properties" className="hover:text-gray-700">
          Properties
        </Link>
        <span>/</span>
        <span className="text-gray-900">New</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add Property</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <PropertyForm action={createProperty} submitLabel="Create Property" />
      </div>
    </div>
  );
}
