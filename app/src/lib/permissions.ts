import { prisma } from "@/lib/db";

// ── Role Definitions ──

export const ROLES = {
  owner: {
    label: "Owner",
    description: "Full access to all features",
    level: 100,
  },
  manager: {
    label: "Manager",
    description: "Manage properties, tenants, leases, and transactions",
    level: 75,
  },
  viewer: {
    label: "Viewer",
    description: "View-only access to all data",
    level: 25,
  },
  maintenance: {
    label: "Maintenance",
    description: "View and manage maintenance requests only",
    level: 10,
  },
} as const;

export type Role = keyof typeof ROLES;

// ── Permission Matrix ──

type Action =
  | "properties:read"
  | "properties:write"
  | "tenants:read"
  | "tenants:write"
  | "leases:read"
  | "leases:write"
  | "transactions:read"
  | "transactions:write"
  | "maintenance:read"
  | "maintenance:write"
  | "listings:read"
  | "listings:write"
  | "reports:read"
  | "settings:read"
  | "settings:write"
  | "team:read"
  | "team:manage"
  | "screening:read"
  | "screening:write"
  | "documents:read"
  | "documents:write";

const ROLE_PERMISSIONS: Record<Role, Action[]> = {
  owner: [
    "properties:read", "properties:write",
    "tenants:read", "tenants:write",
    "leases:read", "leases:write",
    "transactions:read", "transactions:write",
    "maintenance:read", "maintenance:write",
    "listings:read", "listings:write",
    "reports:read",
    "settings:read", "settings:write",
    "team:read", "team:manage",
    "screening:read", "screening:write",
    "documents:read", "documents:write",
  ],
  manager: [
    "properties:read", "properties:write",
    "tenants:read", "tenants:write",
    "leases:read", "leases:write",
    "transactions:read", "transactions:write",
    "maintenance:read", "maintenance:write",
    "listings:read", "listings:write",
    "reports:read",
    "settings:read",
    "team:read",
    "screening:read", "screening:write",
    "documents:read", "documents:write",
  ],
  viewer: [
    "properties:read",
    "tenants:read",
    "leases:read",
    "transactions:read",
    "maintenance:read",
    "listings:read",
    "reports:read",
    "team:read",
    "screening:read",
    "documents:read",
  ],
  maintenance: [
    "maintenance:read", "maintenance:write",
    "properties:read",
    "tenants:read",
  ],
};

// ── Permission Checking ──

export function hasPermission(role: Role, action: Action): boolean {
  return ROLE_PERMISSIONS[role]?.includes(action) ?? false;
}

export function getPermissions(role: Role): Action[] {
  return ROLE_PERMISSIONS[role] || [];
}

export function canWrite(role: Role, resource: string): boolean {
  return hasPermission(role, `${resource}:write` as Action);
}

export function canRead(role: Role, resource: string): boolean {
  return hasPermission(role, `${resource}:read` as Action);
}

// ── Team Resolution ──

export async function getUserRole(
  userId: string,
  teamOwnerId: string
): Promise<Role | null> {
  // If user is the team owner, they're an owner
  if (userId === teamOwnerId) return "owner";

  // Check team membership
  const membership = await prisma.teamMember.findFirst({
    where: {
      userId,
      team: { ownerId: teamOwnerId },
    },
    select: { role: true },
  });

  return (membership?.role as Role) || null;
}

export async function getTeamMembers(ownerId: string) {
  const team = await prisma.team.findFirst({
    where: { ownerId },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      },
      invites: {
        where: { status: "pending" },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return team;
}

export async function createTeamForUser(userId: string, name: string) {
  return prisma.team.create({
    data: {
      name,
      ownerId: userId,
      members: {
        create: { userId, role: "owner" },
      },
    },
    include: { members: true },
  });
}

export async function inviteTeamMember(
  teamId: string,
  email: string,
  role: Role = "viewer"
) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  return prisma.teamInvite.create({
    data: { teamId, email, role, expiresAt },
  });
}

export async function acceptInvite(token: string, userId: string) {
  const invite = await prisma.teamInvite.findUnique({
    where: { token },
  });

  if (!invite) throw new Error("Invalid invite");
  if (invite.status !== "pending") throw new Error("Invite already used");
  if (invite.expiresAt < new Date()) {
    await prisma.teamInvite.update({
      where: { id: invite.id },
      data: { status: "expired" },
    });
    throw new Error("Invite has expired");
  }

  // Create membership and mark invite accepted
  await prisma.$transaction([
    prisma.teamMember.create({
      data: {
        teamId: invite.teamId,
        userId,
        role: invite.role,
      },
    }),
    prisma.teamInvite.update({
      where: { id: invite.id },
      data: { status: "accepted", acceptedAt: new Date() },
    }),
  ]);

  return { teamId: invite.teamId, role: invite.role };
}

export async function removeTeamMember(teamId: string, userId: string) {
  return prisma.teamMember.delete({
    where: { teamId_userId: { teamId, userId } },
  });
}

export async function updateMemberRole(
  teamId: string,
  userId: string,
  role: Role
) {
  return prisma.teamMember.update({
    where: { teamId_userId: { teamId, userId } },
    data: { role },
  });
}
