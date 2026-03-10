"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PropertyType } from "@prisma/client";

async function getUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

export async function createProperty(formData: FormData) {
  const userId = await getUserId();

  const property = await prisma.property.create({
    data: {
      userId,
      name: formData.get("name") as string,
      type: ((formData.get("type") as string) || "MULTI_FAMILY") as PropertyType,
      address: formData.get("address") as string,
      city: formData.get("city") as string,
      state: formData.get("state") as string,
      zip: formData.get("zip") as string,
      county: (formData.get("county") as string) || null,
      country: (formData.get("country") as string) || "US",
      year: (formData.get("year") as string) || null,
      description: (formData.get("description") as string) || null,
    },
  });

  revalidatePath("/properties");
  redirect(`/properties/${property.id}?toast=Property+created`);
}

export async function updateProperty(id: string, formData: FormData) {
  const userId = await getUserId();

  await prisma.property.update({
    where: { id, userId },
    data: {
      name: formData.get("name") as string,
      type: ((formData.get("type") as string) || "MULTI_FAMILY") as PropertyType,
      address: formData.get("address") as string,
      city: formData.get("city") as string,
      state: formData.get("state") as string,
      zip: formData.get("zip") as string,
      county: (formData.get("county") as string) || null,
      country: (formData.get("country") as string) || "US",
      year: (formData.get("year") as string) || null,
      description: (formData.get("description") as string) || null,
    },
  });

  revalidatePath(`/properties/${id}`);
  revalidatePath("/properties");
  redirect(`/properties/${id}?toast=Property+updated`);
}

export async function deleteProperty(id: string) {
  const userId = await getUserId();

  await prisma.property.delete({
    where: { id, userId },
  });

  revalidatePath("/properties");
  redirect("/properties?toast=Property+deleted");
}

export async function archiveProperty(id: string) {
  const userId = await getUserId();

  await prisma.property.update({
    where: { id, userId },
    data: { archivedAt: new Date() },
  });

  revalidatePath(`/properties/${id}`);
  revalidatePath("/properties");
}
