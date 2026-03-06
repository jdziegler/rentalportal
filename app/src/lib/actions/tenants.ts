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

export async function createTenant(formData: FormData) {
  const userId = await getUserId();

  const tenant = await prisma.contact.create({
    data: {
      userId,
      role: "tenant",
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      email: (formData.get("email") as string) || null,
      phone: (formData.get("phone") as string) || null,
      address: (formData.get("address") as string) || null,
      city: (formData.get("city") as string) || null,
      state: (formData.get("state") as string) || null,
      zip: (formData.get("zip") as string) || null,
      notes: (formData.get("notes") as string) || null,
    },
  });

  revalidatePath("/tenants");
  redirect(`/tenants/${tenant.id}?toast=Tenant+created`);
}

export async function updateTenant(id: string, formData: FormData) {
  const userId = await getUserId();

  await prisma.contact.update({
    where: { id, userId },
    data: {
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      email: (formData.get("email") as string) || null,
      phone: (formData.get("phone") as string) || null,
      address: (formData.get("address") as string) || null,
      city: (formData.get("city") as string) || null,
      state: (formData.get("state") as string) || null,
      zip: (formData.get("zip") as string) || null,
      notes: (formData.get("notes") as string) || null,
    },
  });

  revalidatePath(`/tenants/${id}`);
  revalidatePath("/tenants");
  redirect(`/tenants/${id}?toast=Tenant+updated`);
}

export async function deleteTenant(id: string) {
  const userId = await getUserId();

  await prisma.contact.delete({
    where: { id, userId },
  });

  revalidatePath("/tenants");
  redirect("/tenants?toast=Tenant+deleted");
}
