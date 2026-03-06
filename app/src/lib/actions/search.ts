"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type SearchResult = {
  id: string;
  type: "property" | "unit" | "tenant" | "lease" | "transaction" | "maintenance";
  title: string;
  subtitle: string;
  href: string;
};

export async function globalSearch(query: string): Promise<SearchResult[]> {
  const session = await auth();
  if (!session?.user?.id) return [];
  if (!query || query.length < 2) return [];

  const userId = session.user.id;
  const q = `%${query}%`;

  const [properties, units, tenants, leases] = await Promise.all([
    prisma.property.findMany({
      where: {
        userId,
        archivedAt: null,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { address: { contains: query, mode: "insensitive" } },
          { city: { contains: query, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, address: true, city: true },
      take: 5,
    }),
    prisma.unit.findMany({
      where: {
        property: { userId },
        OR: [
          { name: { contains: query, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, property: { select: { name: true } } },
      take: 5,
    }),
    prisma.contact.findMany({
      where: {
        userId,
        role: "tenant",
        OR: [
          { firstName: { contains: query, mode: "insensitive" } },
          { lastName: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
          { phone: { contains: query, mode: "insensitive" } },
        ],
      },
      select: { id: true, firstName: true, lastName: true, email: true },
      take: 5,
    }),
    prisma.lease.findMany({
      where: {
        userId,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { contact: { firstName: { contains: query, mode: "insensitive" } } },
          { contact: { lastName: { contains: query, mode: "insensitive" } } },
        ],
      },
      select: {
        id: true,
        name: true,
        unit: { select: { name: true, property: { select: { name: true } } } },
        contact: { select: { firstName: true, lastName: true } },
      },
      take: 5,
    }),
  ]);

  // Separate query — maintenanceRequest may not exist on cached prisma instance
  let maintenance: { id: string; title: string; property: { name: string } }[] = [];
  try {
    maintenance = await prisma.maintenanceRequest.findMany({
      where: {
        userId,
        OR: [
          { title: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        title: true,
        property: { select: { name: true } },
      },
      take: 5,
    });
  } catch {
    // Model may not be available yet if server hasn't restarted
  }

  const results: SearchResult[] = [];

  for (const p of properties) {
    results.push({
      id: p.id,
      type: "property",
      title: p.name,
      subtitle: [p.address, p.city].filter(Boolean).join(", "),
      href: `/properties/${p.id}`,
    });
  }

  for (const u of units) {
    results.push({
      id: u.id,
      type: "unit",
      title: u.name,
      subtitle: u.property.name,
      href: `/units/${u.id}`,
    });
  }

  for (const t of tenants) {
    results.push({
      id: t.id,
      type: "tenant",
      title: `${t.firstName} ${t.lastName}`,
      subtitle: t.email || "No email",
      href: `/tenants/${t.id}`,
    });
  }

  for (const l of leases) {
    results.push({
      id: l.id,
      type: "lease",
      title: l.name || `${l.unit.property.name} — ${l.unit.name}`,
      subtitle: `${l.contact.firstName} ${l.contact.lastName}`,
      href: `/leases/${l.id}`,
    });
  }

  for (const m of maintenance) {
    results.push({
      id: m.id,
      type: "maintenance",
      title: m.title,
      subtitle: m.property.name,
      href: `/maintenance/${m.id}`,
    });
  }

  return results;
}
