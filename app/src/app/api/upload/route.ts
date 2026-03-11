import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() || "bin";
  const filename = `${randomUUID()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const uploadDir = join(process.cwd(), "public", "uploads");
  await writeFile(join(uploadDir, filename), bytes);

  const upload = await prisma.upload.create({
    data: {
      userId: session.user.id,
      filename: file.name,
      url: `/uploads/${filename}`,
      size: file.size,
      mimeType: file.type,
    },
  });

  return NextResponse.json({ id: upload.id, url: upload.url });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { url } = await req.json();
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  // Find and verify ownership
  const upload = await prisma.upload.findFirst({
    where: { url, userId: session.user.id },
  });

  if (!upload) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Delete file from disk
  const filePath = join(process.cwd(), "public", upload.url);
  try {
    await unlink(filePath);
  } catch {
    // File may already be gone
  }

  // Delete DB record
  await prisma.upload.delete({ where: { id: upload.id } });

  return NextResponse.json({ ok: true });
}
