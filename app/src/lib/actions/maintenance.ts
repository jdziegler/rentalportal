"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sendNotification } from "@/lib/notifications";

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
      priority: (formData.get("priority") as string) || "MEDIUM",
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
      priority: (formData.get("priority") as string) || "MEDIUM",
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

const MAINT_STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export async function updateMaintenanceStatus(id: string, status: string) {
  const userId = await getUserId();

  const request = await prisma.maintenanceRequest.findUnique({
    where: { id, userId },
    include: {
      contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      unit: { select: { name: true, property: { select: { name: true } } } },
    },
  });
  if (!request) throw new Error("Request not found");

  const oldStatus = request.status;

  await prisma.maintenanceRequest.update({
    where: { id, userId },
    data: {
      status,
      completedAt: status === "COMPLETED" ? new Date() : null,
    },
  });

  // Send notification to tenant if status changed and contact exists
  if (oldStatus !== status && request.contact) {
    sendNotification({
      userId,
      contactId: request.contact.id,
      type: "maintenance_update",
      data: {
        tenantName: `${request.contact.firstName} ${request.contact.lastName}`,
        propertyName: request.unit?.property?.name || "Property",
        unitName: request.unit?.name || "Unit",
        requestTitle: request.title,
        oldStatus: MAINT_STATUS_LABELS[oldStatus] || "Unknown",
        newStatus: MAINT_STATUS_LABELS[status] || "Unknown",
      },
      email: request.contact.email,
      phone: request.contact.phone,
    }).catch((err) => console.error("Maintenance notification failed:", err));
  }

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
