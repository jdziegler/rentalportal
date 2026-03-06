import { redirect } from "next/navigation";
import { getTenantSession } from "@/lib/tenant-auth";
import TenantPortalShell from "./portal-shell";

export default async function TenantPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getTenantSession();
  if (!session) {
    redirect("/tenant");
  }

  return <TenantPortalShell session={session}>{children}</TenantPortalShell>;
}
