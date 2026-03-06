import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateCode, findContactsByIdentifier } from "@/lib/tenant-auth";
import { Resend } from "resend";
import twilio from "twilio";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

function getTwilioClient() {
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

export async function POST(req: NextRequest) {
  const { identifier } = await req.json();

  if (!identifier || typeof identifier !== "string") {
    return NextResponse.json({ error: "Email or phone required" }, { status: 400 });
  }

  const normalized = identifier.trim().toLowerCase();
  const isEmail = normalized.includes("@");

  // Check if any contacts exist with this identifier
  const contacts = await findContactsByIdentifier(normalized);
  if (contacts.length === 0) {
    // Don't reveal whether the identifier exists — return success anyway
    return NextResponse.json({ success: true, type: isEmail ? "email" : "sms" });
  }

  // Rate limit: max 5 codes per hour per identifier
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentCount = await prisma.tenantVerification.count({
    where: {
      identifier: normalized,
      createdAt: { gte: oneHourAgo },
    },
  });
  if (recentCount >= 5) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429 }
    );
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Store verification code
  await prisma.tenantVerification.create({
    data: {
      identifier: normalized,
      code,
      type: isEmail ? "email" : "sms",
      expiresAt,
    },
  });

  // Send code
  try {
    if (isEmail) {
      await getResend().emails.send({
        from: "PropertyPilot <noreply@app2.jesseziegler.com>",
        to: normalized,
        subject: "Your verification code",
        text: `Your PropertyPilot verification code is: ${code}\n\nThis code expires in 10 minutes.`,
      });
    } else {
      await getTwilioClient().messages.create({
        body: `Your PropertyPilot verification code is: ${code}. Expires in 10 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: normalized,
      });
    }
  } catch (err) {
    console.error("Failed to send verification code:", err);
    return NextResponse.json(
      { error: "Failed to send code. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, type: isEmail ? "email" : "sms" });
}
