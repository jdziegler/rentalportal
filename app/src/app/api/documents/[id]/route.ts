import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readFile, unlink } from "fs/promises";
import { join } from "path";

// GET /api/documents/[id] — download a document
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const doc = await prisma.leaseDocument.findUnique({
    where: { id },
    include: { lease: { select: { userId: true } } },
  });

  if (!doc || doc.lease.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filePath = join(process.cwd(), doc.filePath);
  const buffer = await readFile(filePath);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": doc.fileType,
      "Content-Disposition": `inline; filename="${doc.name}"`,
      "Content-Length": String(buffer.length),
    },
  });
}

// DELETE /api/documents/[id] — delete a document
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const doc = await prisma.leaseDocument.findUnique({
    where: { id },
    include: { lease: { select: { userId: true } } },
  });

  if (!doc || doc.lease.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Delete file from disk
  try {
    await unlink(join(process.cwd(), doc.filePath));
  } catch {
    // File may already be gone
  }

  // Delete DB record (cascades to signatures)
  await prisma.leaseDocument.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
