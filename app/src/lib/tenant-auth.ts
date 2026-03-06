import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const COOKIE_NAME = "tenant-token";
const JWT_SECRET = new TextEncoder().encode(
  process.env.TENANT_JWT_SECRET || "dev-secret"
);

export interface TenantSession {
  contactIds: string[]; // all contact records matching this identifier
  identifier: string; // email or phone
  type: "email" | "sms";
}

export async function createTenantToken(
  session: TenantSession
): Promise<string> {
  return new SignJWT(session as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(JWT_SECRET);
}

export async function setTenantCookie(session: TenantSession) {
  const token = await createTenantToken(session);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: "/",
  });
}

export async function getTenantSession(): Promise<TenantSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as TenantSession;
  } catch {
    return null;
  }
}

export async function clearTenantCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function findContactsByIdentifier(identifier: string) {
  const isEmail = identifier.includes("@");
  const normalized = identifier.trim().toLowerCase();

  return prisma.contact.findMany({
    where: isEmail
      ? { email: { equals: normalized, mode: "insensitive" } }
      : { phone: normalized },
    include: {
      user: { select: { id: true, name: true } },
      leases: {
        where: { leaseStatus: 0 }, // active only
        include: {
          unit: {
            include: { property: { select: { id: true, name: true, address: true, city: true, state: true } } },
          },
        },
      },
    },
  });
}
