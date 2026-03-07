import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { inviteTeamMember, type Role } from "@/lib/permissions";

// POST /api/team/invites — invite a team member
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email, role } = await request.json();
  if (!email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  // Find or create team
  let team = await prisma.team.findFirst({
    where: { ownerId: session.user.id },
  });
  if (!team) {
    team = await prisma.team.create({
      data: {
        name: `${session.user.name || "My"} Team`,
        ownerId: session.user.id,
        members: { create: { userId: session.user.id, role: "owner" } },
      },
    });
  }

  // Check if already a member
  const existingMember = await prisma.teamMember.findFirst({
    where: {
      teamId: team.id,
      user: { email: email.toLowerCase() },
    },
  });
  if (existingMember) {
    return NextResponse.json(
      { error: "User is already a team member" },
      { status: 409 }
    );
  }

  // Check for existing pending invite
  const existingInvite = await prisma.teamInvite.findFirst({
    where: { teamId: team.id, email: email.toLowerCase(), status: "pending" },
  });
  if (existingInvite) {
    return NextResponse.json(
      { error: "Invite already pending for this email" },
      { status: 409 }
    );
  }

  const invite = await inviteTeamMember(
    team.id,
    email.toLowerCase(),
    (role as Role) || "viewer"
  );

  return NextResponse.json(invite, { status: 201 });
}
