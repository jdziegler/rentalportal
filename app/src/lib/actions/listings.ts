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

export async function createListing(formData: FormData) {
  const userId = await getUserId();

  const unitId = formData.get("unitId") as string;

  // Look up the unit to get propertyId
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    include: { property: { select: { userId: true, id: true } } },
  });
  if (!unit || unit.property.userId !== userId) throw new Error("Unit not found");

  const listing = await prisma.listing.create({
    data: {
      userId,
      propertyId: unit.property.id,
      unitId,
      description: (formData.get("description") as string) || null,
      price: parseFloat(formData.get("price") as string) || 0,
      isActive: formData.get("isActive") === "on",
    },
  });

  revalidatePath("/listings");
  redirect(`/listings/${listing.id}?toast=Listing+created`);
}

export async function updateListing(id: string, formData: FormData) {
  const userId = await getUserId();

  const unitId = formData.get("unitId") as string;

  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    include: { property: { select: { userId: true, id: true } } },
  });
  if (!unit || unit.property.userId !== userId) throw new Error("Unit not found");

  await prisma.listing.update({
    where: { id, userId },
    data: {
      propertyId: unit.property.id,
      unitId,
      description: (formData.get("description") as string) || null,
      price: parseFloat(formData.get("price") as string) || 0,
      isActive: formData.get("isActive") === "on",
    },
  });

  revalidatePath(`/listings/${id}`);
  revalidatePath("/listings");
  redirect(`/listings/${id}?toast=Listing+updated`);
}

export async function toggleListingActive(id: string, isActive: boolean) {
  const userId = await getUserId();

  await prisma.listing.update({
    where: { id, userId },
    data: { isActive },
  });

  revalidatePath(`/listings/${id}`);
  revalidatePath("/listings");
}

export async function deleteListing(id: string) {
  const userId = await getUserId();

  await prisma.listing.delete({
    where: { id, userId },
  });

  revalidatePath("/listings");
  redirect("/listings?toast=Listing+deleted");
}
