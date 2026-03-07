import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import TeamManagement from "./team-client";

export default async function TeamSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return <TeamManagement />;
}
