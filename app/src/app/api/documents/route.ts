import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import { join, extname } from "path";

const UPLOAD_DIR = join(process.cwd(), "uploads");
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// POST /api/documents — upload a document to a lease
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const leaseId = formData.get("leaseId") as string | null;

  if (!file || !leaseId) {
    return NextResponse.json(
      { error: "file and leaseId are required" },
      { status: 400 }
    );
  }

  // Verify lease belongs to user
  const lease = await prisma.lease.findUnique({
    where: { id: leaseId, userId: session.user.id },
    select: { id: true, contactId: true },
  });
  if (!lease) {
    return NextResponse.json({ error: "Lease not found" }, { status: 404 });
  }

  // Validate file
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "File type not allowed. Use PDF, JPG, PNG, WebP, or Word." },
      { status: 400 }
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum 10MB." },
      { status: 400 }
    );
  }

  // Create user upload directory
  const userDir = join(UPLOAD_DIR, session.user.id);
  await mkdir(userDir, { recursive: true });

  // Save file
  const ext = extname(file.name) || ".pdf";
  const docId = crypto.randomUUID();
  const fileName = `${docId}${ext}`;
  const filePath = join(userDir, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  // Create DB record
  const document = await prisma.leaseDocument.create({
    data: {
      leaseId,
      userId: session.user.id,
      name: file.name,
      fileType: file.type,
      fileSize: file.size,
      filePath: `uploads/${session.user.id}/${fileName}`,
    },
  });

  return NextResponse.json(document, { status: 201 });
}

// GET /api/documents?leaseId=xxx — list documents for a lease
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const leaseId = request.nextUrl.searchParams.get("leaseId");
  if (!leaseId) {
    return NextResponse.json(
      { error: "leaseId is required" },
      { status: 400 }
    );
  }

  // Verify lease belongs to user
  const lease = await prisma.lease.findUnique({
    where: { id: leaseId, userId: session.user.id },
    select: { id: true },
  });
  if (!lease) {
    return NextResponse.json({ error: "Lease not found" }, { status: 404 });
  }

  const documents = await prisma.leaseDocument.findMany({
    where: { leaseId },
    include: {
      signatures: {
        include: {
          contact: { select: { firstName: true, lastName: true, email: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(documents);
}
