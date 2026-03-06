"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function PortalLinkButton({ email, phone }: { email?: string | null; phone?: string | null }) {
  const [copied, setCopied] = useState(false);
  const portalUrl = typeof window !== "undefined"
    ? `${window.location.origin}/tenant`
    : "/tenant";

  async function handleCopy() {
    await navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const identifier = email || phone;

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={handleCopy}>
        {copied ? "Copied!" : "Copy Portal Link"}
      </Button>
      {identifier && email && (
        <Button variant="outline" size="sm" asChild>
          <a
            href={`mailto:${email}?subject=Access%20Your%20Tenant%20Portal&body=You%20can%20access%20your%20tenant%20portal%20to%20pay%20rent%2C%20submit%20maintenance%20requests%2C%20and%20message%20your%20landlord%20at%3A%0A%0A${encodeURIComponent(portalUrl)}%0A%0ASign%20in%20with%20your%20email%20address%20${encodeURIComponent(email)}.`}
          >
            Email Portal Link
          </a>
        </Button>
      )}
    </div>
  );
}

export function PaymentLinkButton({ paymentToken }: { paymentToken: string | null }) {
  const [copied, setCopied] = useState(false);

  if (!paymentToken) return null;

  const paymentUrl = typeof window !== "undefined"
    ? `${window.location.origin}/tenant`
    : "/tenant";

  async function handleCopy() {
    await navigator.clipboard.writeText(paymentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
    >
      {copied ? "Copied!" : "Copy payment link"}
    </button>
  );
}
