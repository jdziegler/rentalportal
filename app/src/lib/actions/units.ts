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

export async function createUnit(formData: FormData) {
  const userId = await getUserId();

  const propertyId = formData.get("propertyId") as string;

  // Verify property belongs to user
  const property = await prisma.property.findUnique({
    where: { id: propertyId, userId },
  });
  if (!property) throw new Error("Property not found");

  const unit = await prisma.unit.create({
    data: {
      propertyId,
      name: formData.get("name") as string,
      type: parseInt(formData.get("type") as string) || 1,
      bedrooms: formData.get("bedrooms") ? parseInt(formData.get("bedrooms") as string) : null,
      bathrooms: formData.get("bathrooms") ? parseInt(formData.get("bathrooms") as string) : null,
      size: formData.get("size") ? parseInt(formData.get("size") as string) : null,
      price: formData.get("price") ? parseFloat(formData.get("price") as string) : null,
      deposit: formData.get("deposit") ? parseFloat(formData.get("deposit") as string) : null,
      description: (formData.get("description") as string) || null,
      petsAllowed: formData.get("petsAllowed") === "on",
    },
  });

  revalidatePath("/units");
  revalidatePath(`/properties/${propertyId}`);
  redirect(`/units/${unit.id}?toast=Unit+created`);
}

export async function updateUnit(id: string, formData: FormData) {
  const userId = await getUserId();

  await prisma.unit.update({
    where: { id, property: { userId } },
    data: {
      propertyId: formData.get("propertyId") as string,
      name: formData.get("name") as string,
      type: parseInt(formData.get("type") as string) || 1,
      bedrooms: formData.get("bedrooms") ? parseInt(formData.get("bedrooms") as string) : null,
      bathrooms: formData.get("bathrooms") ? parseInt(formData.get("bathrooms") as string) : null,
      size: formData.get("size") ? parseInt(formData.get("size") as string) : null,
      price: formData.get("price") ? parseFloat(formData.get("price") as string) : null,
      deposit: formData.get("deposit") ? parseFloat(formData.get("deposit") as string) : null,
      description: (formData.get("description") as string) || null,
      petsAllowed: formData.get("petsAllowed") === "on",
    },
  });

  revalidatePath(`/units/${id}`);
  revalidatePath("/units");
  redirect(`/units/${id}?toast=Unit+updated`);
}

export async function deleteUnit(id: string) {
  const userId = await getUserId();

  await prisma.unit.delete({
    where: { id, property: { userId } },
  });

  revalidatePath("/units");
  redirect("/units?toast=Unit+deleted");
}
