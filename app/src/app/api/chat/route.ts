import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { handleChat } from "@/lib/ai/agent";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    message?: string;
    context?: string;
    sessionId?: string;
    channel?: string;
  };

  if (!body.message?.trim()) {
    return NextResponse.json(
      { error: "Message is required" },
      { status: 400 },
    );
  }

  try {
    const sessionId = body.sessionId ?? session.user.id;
    const channel = body.channel ?? "web";
    const result = await handleChat(
      session.user.id,
      sessionId,
      body.message,
      channel,
      body.context,
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/chat] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Agent error" },
      { status: 500 },
    );
  }
}
