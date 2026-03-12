import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { applyDueRentIncreases, generateRentCharges } from "@/lib/rent-automation";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const log = await prisma.cronJobLog.create({
    data: { jobType: "rent_generation", status: "started" },
  });

  try {
    // Apply any due rent increases before generating charges
    const increaseResult = await applyDueRentIncreases();

    const result = await generateRentCharges();

    await prisma.cronJobLog.update({
      where: { id: log.id },
      data: {
        status: result.errors.length > 0 ? "completed_with_errors" : "completed",
        details: JSON.parse(JSON.stringify(result)),
        completedAt: new Date(),
      },
    });

    return NextResponse.json({ ...result, rentIncreases: increaseResult });
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
