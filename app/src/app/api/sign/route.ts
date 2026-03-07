import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readFile } from "fs/promises";
import { join } from "path";

// GET /api/sign?token=xxx — get document info for signing
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "token required" }, { status: 400 });
  }

  const signature = await prisma.signature.findUnique({
    where: { signingToken: token },
    include: {
      document: { select: { id: true, name: true, fileType: true, filePath: true } },
      contact: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  if (!signature) {
    return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  }

  return NextResponse.json({
    id: signature.id,
    status: signature.status,
    documentName: signature.document.name,
    documentId: signature.document.id,
    contactName: `${signature.contact.firstName} ${signature.contact.lastName}`,
    signedAt: signature.signedAt,
    declinedAt: signature.declinedAt,
  });
}

// POST /api/sign — submit signature
export async function POST(request: NextRequest) {
  const { token, signatureData, action } = await request.json();

  if (!token) {
    return NextResponse.json({ error: "token required" }, { status: 400 });
  }

  const signature = await prisma.signature.findUnique({
    where: { signingToken: token },
  });

  if (!signature) {
    return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  }

  if (signature.status !== "pending") {
    return NextResponse.json(
      { error: `Already ${signature.status}` },
      { status: 400 }
    );
  }

  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
  const ua = request.headers.get("user-agent") || "unknown";

  if (action === "decline") {
    await prisma.signature.update({
      where: { id: signature.id },
      data: {
        status: "declined",
        declinedAt: new Date(),
        ipAddress: ip,
        userAgent: ua,
      },
    });
    return NextResponse.json({ status: "declined" });
  }

  // Sign
  if (!signatureData) {
    return NextResponse.json(
      { error: "signatureData required" },
      { status: 400 }
    );
  }

  await prisma.signature.update({
    where: { id: signature.id },
    data: {
      status: "signed",
      signedAt: new Date(),
      signatureData,
      ipAddress: ip,
      userAgent: ua,
    },
  });

  return NextResponse.json({ status: "signed" });
}
