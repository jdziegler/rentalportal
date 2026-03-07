/**
 * Unified notification system for email (Resend) and SMS (Twilio).
 */

import { Resend } from "resend";
import twilio from "twilio";
import { prisma } from "@/lib/db";

// ── Providers ──

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

function getTwilioClient() {
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

const FROM_EMAIL = "PropertyPilot <noreply@app2.jesseziegler.com>";

// ── Template Types ──

export type NotificationType =
  | "rent_reminder"
  | "rent_overdue"
  | "payment_received"
  | "late_fee_charged"
  | "maintenance_update"
  | "lease_expiring"
  | "new_message";

export interface NotificationData {
  // Common
  tenantName: string;
  propertyName?: string;
  unitName?: string;

  // Rent
  rentAmount?: number;
  dueDate?: string;
  daysUntilDue?: number;
  daysOverdue?: number;

  // Payment
  paymentAmount?: number;
  paymentMethod?: string;
  remainingBalance?: number;

  // Late fee
  lateFeeAmount?: number;

  // Maintenance
  requestTitle?: string;
  oldStatus?: string;
  newStatus?: string;

  // Lease
  leaseEndDate?: string;
  daysUntilExpiry?: number;

  // Message
  senderName?: string;
  messagePreview?: string;
}

// ── Templates ──

const EMAIL_TEMPLATES: Record<NotificationType, (data: NotificationData) => { subject: string; text: string }> = {
  rent_reminder: (d) => ({
    subject: `Rent Reminder: $${d.rentAmount?.toFixed(2)} due ${d.dueDate}`,
    text: `Hi ${d.tenantName},\n\nThis is a friendly reminder that your rent of $${d.rentAmount?.toFixed(2)} for ${d.propertyName} - ${d.unitName} is due on ${d.dueDate}.\n\nPlease log in to your tenant portal to make a payment.\n\nThank you,\nPropertyPilot`,
  }),
  rent_overdue: (d) => ({
    subject: `Rent Overdue: $${d.rentAmount?.toFixed(2)} past due`,
    text: `Hi ${d.tenantName},\n\nYour rent of $${d.rentAmount?.toFixed(2)} for ${d.propertyName} - ${d.unitName} was due on ${d.dueDate} and is now ${d.daysOverdue} day(s) overdue.\n\nPlease make your payment as soon as possible to avoid late fees.\n\nThank you,\nPropertyPilot`,
  }),
  payment_received: (d) => ({
    subject: `Payment Received: $${d.paymentAmount?.toFixed(2)}`,
    text: `Hi ${d.tenantName},\n\nWe received your payment of $${d.paymentAmount?.toFixed(2)} via ${d.paymentMethod || "online payment"} for ${d.propertyName} - ${d.unitName}.\n\n${d.remainingBalance && d.remainingBalance > 0 ? `Remaining balance: $${d.remainingBalance.toFixed(2)}` : "Your account is fully paid."}\n\nThank you,\nPropertyPilot`,
  }),
  late_fee_charged: (d) => ({
    subject: `Late Fee Applied: $${d.lateFeeAmount?.toFixed(2)}`,
    text: `Hi ${d.tenantName},\n\nA late fee of $${d.lateFeeAmount?.toFixed(2)} has been applied to your account for ${d.propertyName} - ${d.unitName}.\n\nPlease log in to your tenant portal to view your balance and make a payment.\n\nThank you,\nPropertyPilot`,
  }),
  maintenance_update: (d) => ({
    subject: `Maintenance Update: ${d.requestTitle}`,
    text: `Hi ${d.tenantName},\n\nYour maintenance request "${d.requestTitle}" at ${d.propertyName} - ${d.unitName} has been updated from "${d.oldStatus}" to "${d.newStatus}".\n\nLog in to your tenant portal for details.\n\nThank you,\nPropertyPilot`,
  }),
  lease_expiring: (d) => ({
    subject: `Lease Expiring in ${d.daysUntilExpiry} days`,
    text: `Hi ${d.tenantName},\n\nYour lease for ${d.propertyName} - ${d.unitName} expires on ${d.leaseEndDate} (${d.daysUntilExpiry} days from now).\n\nPlease contact your landlord to discuss renewal options.\n\nThank you,\nPropertyPilot`,
  }),
  new_message: (d) => ({
    subject: `New Message from ${d.senderName}`,
    text: `Hi ${d.tenantName},\n\nYou have a new message from ${d.senderName}:\n\n"${d.messagePreview}"\n\nLog in to your tenant portal to reply.\n\nThank you,\nPropertyPilot`,
  }),
};

const SMS_TEMPLATES: Record<NotificationType, (data: NotificationData) => string> = {
  rent_reminder: (d) =>
    `PropertyPilot: Rent of $${d.rentAmount?.toFixed(2)} for ${d.propertyName} is due ${d.dueDate}. Log in to pay.`,
  rent_overdue: (d) =>
    `PropertyPilot: Rent of $${d.rentAmount?.toFixed(2)} is ${d.daysOverdue} day(s) overdue. Please pay ASAP to avoid late fees.`,
  payment_received: (d) =>
    `PropertyPilot: Payment of $${d.paymentAmount?.toFixed(2)} received. ${d.remainingBalance && d.remainingBalance > 0 ? `Balance: $${d.remainingBalance.toFixed(2)}` : "All paid up!"}`,
  late_fee_charged: (d) =>
    `PropertyPilot: A $${d.lateFeeAmount?.toFixed(2)} late fee was applied to your account. Log in to pay.`,
  maintenance_update: (d) =>
    `PropertyPilot: "${d.requestTitle}" updated to "${d.newStatus}". Check your portal for details.`,
  lease_expiring: (d) =>
    `PropertyPilot: Your lease for ${d.propertyName} expires in ${d.daysUntilExpiry} days (${d.leaseEndDate}). Contact your landlord.`,
  new_message: (d) =>
    `PropertyPilot: New message from ${d.senderName}: "${d.messagePreview?.slice(0, 80)}"`,
};

// ── Send Functions ──

export async function sendEmail(
  to: string,
  type: NotificationType,
  data: NotificationData
): Promise<{ success: boolean; error?: string }> {
  const template = EMAIL_TEMPLATES[type](data);
  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to,
      subject: template.subject,
      text: template.text,
    });
    return { success: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`Email send failed (${type} to ${to}):`, error);
    return { success: false, error };
  }
}

export async function sendSMS(
  to: string,
  type: NotificationType,
  data: NotificationData
): Promise<{ success: boolean; error?: string }> {
  const message = SMS_TEMPLATES[type](data);
  try {
    await getTwilioClient().messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    });
    return { success: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`SMS send failed (${type} to ${to}):`, error);
    return { success: false, error };
  }
}

// ── High-Level Send with Logging ──

export async function sendNotification(params: {
  userId: string;
  contactId: string;
  type: NotificationType;
  data: NotificationData;
  email?: string | null;
  phone?: string | null;
}): Promise<{ emailSent: boolean; smsSent: boolean }> {
  let emailSent = false;
  let smsSent = false;

  // Check notification preferences
  const prefs = await prisma.notificationPreference.findUnique({
    where: {
      userId_contactId: {
        userId: params.userId,
        contactId: params.contactId,
      },
    },
  });

  const emailEnabled = prefs?.emailEnabled ?? true;
  const smsEnabled = prefs?.smsEnabled ?? false; // SMS opt-in by default

  // Check per-type preferences
  const disabledTypes = (prefs?.disabledTypes as string[]) ?? [];
  if (disabledTypes.includes(params.type)) {
    return { emailSent: false, smsSent: false };
  }

  if (params.email && emailEnabled) {
    const result = await sendEmail(params.email, params.type, params.data);
    emailSent = result.success;

    await prisma.notificationLog.create({
      data: {
        userId: params.userId,
        contactId: params.contactId,
        channel: "email",
        type: params.type,
        status: result.success ? "sent" : "failed",
        error: result.error,
        recipient: params.email,
      },
    });
  }

  if (params.phone && smsEnabled) {
    const result = await sendSMS(params.phone, params.type, params.data);
    smsSent = result.success;

    await prisma.notificationLog.create({
      data: {
        userId: params.userId,
        contactId: params.contactId,
        channel: "sms",
        type: params.type,
        status: result.success ? "sent" : "failed",
        error: result.error,
        recipient: params.phone,
      },
    });
  }

  return { emailSent, smsSent };
}

// ── Template Rendering (for testing) ──

export function renderEmailTemplate(type: NotificationType, data: NotificationData) {
  return EMAIL_TEMPLATES[type](data);
}

export function renderSMSTemplate(type: NotificationType, data: NotificationData) {
  return SMS_TEMPLATES[type](data);
}
