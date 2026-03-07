import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTeamMembers, createTeamForUser } from "@/lib/permissions";

// GET /api/team — get current user's team
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const team = await getTeamMembers(session.user.id);
  if (!team) {
    return NextResponse.json({ team: null });
  }

  return NextResponse.json({ team });
}

// POST /api/team — create a team
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await request.json();
  if (!name) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  const team = await createTeamForUser(session.user.id, name);
  return NextResponse.json({ team }, { status: 201 });
}
