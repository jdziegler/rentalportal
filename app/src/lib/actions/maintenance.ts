"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function getUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

export async function createMaintenanceRequest(formData: FormData) {
  const userId = await getUserId();

  const propertyId = formData.get("propertyId") as string;
  const unitId = (formData.get("unitId") as string) || null;
  const contactId = (formData.get("contactId") as string) || null;

  // Verify property belongs to user
  const property = await prisma.property.findUnique({
    where: { id: propertyId, userId },
  });
  if (!property) throw new Error("Property not found");

  const request = await prisma.maintenanceRequest.create({
    data: {
      userId,
      propertyId,
      unitId,
      contactId,
      title: formData.get("title") as string,
      description: (formData.get("description") as string) || null,
      priority: parseInt(formData.get("priority") as string) || 1,
      category: (formData.get("category") as string) || null,
    },
  });

  revalidatePath("/maintenance");
  redirect(`/maintenance/${request.id}?toast=Request+created`);
}

export async function updateMaintenanceRequest(
  id: string,
  formData: FormData
) {
  const userId = await getUserId();

  await prisma.maintenanceRequest.update({
    where: { id, userId },
    data: {
      title: formData.get("title") as string,
      description: (formData.get("description") as string) || null,
      priority: parseInt(formData.get("priority") as string) || 1,
      category: (formData.get("category") as string) || null,
      propertyId: formData.get("propertyId") as string,
      unitId: (formData.get("unitId") as string) || null,
      contactId: (formData.get("contactId") as string) || null,
    },
  });

  revalidatePath(`/maintenance/${id}`);
  revalidatePath("/maintenance");
  redirect(`/maintenance/${id}?toast=Request+updated`);
}

export async function updateMaintenanceStatus(id: string, status: number) {
  const userId = await getUserId();

  await prisma.maintenanceRequest.update({
    where: { id, userId },
    data: {
      status,
      completedAt: status === 2 ? new Date() : null,
    },
  });

  revalidatePath(`/maintenance/${id}`);
  revalidatePath("/maintenance");
}

export async function deleteMaintenanceRequest(id: string) {
  const userId = await getUserId();

  await prisma.maintenanceRequest.delete({
    where: { id, userId },
  });

  revalidatePath("/maintenance");
  redirect("/maintenance?toast=Request+deleted");
}
