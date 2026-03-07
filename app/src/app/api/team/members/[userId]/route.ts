import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { removeTeamMember, updateMemberRole, type Role } from "@/lib/permissions";

// PATCH /api/team/members/[userId] — update member role
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await params;
  const { role } = await request.json();

  const team = await prisma.team.findFirst({
    where: { ownerId: session.user.id },
  });
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  // Can't change owner's role
  if (userId === session.user.id) {
    return NextResponse.json(
      { error: "Cannot change your own role" },
      { status: 400 }
    );
  }

  const updated = await updateMemberRole(team.id, userId, role as Role);
  return NextResponse.json(updated);
}

// DELETE /api/team/members/[userId] — remove member
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await params;

  const team = await prisma.team.findFirst({
    where: { ownerId: session.user.id },
  });
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  // Can't remove yourself as owner
  if (userId === session.user.id) {
    return NextResponse.json(
      { error: "Cannot remove yourself" },
      { status: 400 }
    );
  }

  await removeTeamMember(team.id, userId);
  return NextResponse.json({ ok: true });
}
