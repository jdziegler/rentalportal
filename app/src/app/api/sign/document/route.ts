import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readFile } from "fs/promises";
import { join } from "path";

// GET /api/sign/document?token=xxx — download document for signing (no auth, token-based)
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "token required" }, { status: 400 });
  }

  const signature = await prisma.signature.findUnique({
    where: { signingToken: token },
    include: {
      document: { select: { name: true, fileType: true, filePath: true } },
    },
  });

  if (!signature) {
    return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  }

  const filePath = join(process.cwd(), signature.document.filePath);
  const buffer = await readFile(filePath);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": signature.document.fileType,
      "Content-Disposition": `inline; filename="${signature.document.name}"`,
      "Content-Length": String(buffer.length),
    },
  });
}
