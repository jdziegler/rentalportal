import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";

// Dev-only: create a real database session for a test user by email.
// Usage: POST /api/auth/test-login  { "email": "newuser@test.com" }
// Returns a redirect to /dashboard with the session cookie set.
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const { email } = await req.json();
  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Create a database session (same as Auth.js PrismaAdapter does)
  const sessionToken = randomUUID();
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      sessionToken,
      userId: user.id,
      expires,
    },
  });

  // Auth.js uses __Secure-authjs.session-token when AUTH_URL is https,
  // and authjs.session-token otherwise. Set both to cover all cases.
  const response = NextResponse.json({ ok: true, userId: user.id });
  const cookieOpts = { path: "/", httpOnly: true, sameSite: "lax" as const, expires };
  response.cookies.set("authjs.session-token", sessionToken, cookieOpts);
  response.cookies.set("__Secure-authjs.session-token", sessionToken, {
    ...cookieOpts,
    secure: true,
  });

  return response;
}
