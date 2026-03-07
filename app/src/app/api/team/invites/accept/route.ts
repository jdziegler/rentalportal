import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { acceptInvite } from "@/lib/permissions";

// POST /api/team/invites/accept — accept an invite
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await request.json();
  if (!token) {
    return NextResponse.json({ error: "token required" }, { status: 400 });
  }

  try {
    const result = await acceptInvite(token, session.user.id);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
