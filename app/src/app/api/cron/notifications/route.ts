import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { runNotificationCron } from "@/lib/notification-triggers";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const log = await prisma.cronJobLog.create({
    data: { jobType: "notifications", status: "started" },
  });

  try {
    const result = await runNotificationCron();

    await prisma.cronJobLog.update({
      where: { id: log.id },
      data: {
        status: result.errors.length > 0 ? "completed_with_errors" : "completed",
        details: JSON.parse(JSON.stringify(result)),
        completedAt: new Date(),
      },
    });

    return NextResponse.json(result);
  } catch (err) {
    await prisma.cronJobLog.update({
      where: { id: log.id },
      data: {
        status: "failed",
        details: { error: err instanceof Error ? err.message : String(err) },
        completedAt: new Date(),
      },
    });

    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
