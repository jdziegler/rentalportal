"use client";

import { useEffect, useState } from "react";

interface Payout {
  id: string;
  amount: number;
  status: string;
  arrivalDate: number;
  method: string;
}

interface ConnectStatus {
  status: string;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  balance?: { available: number; pending: number } | null;
  payouts?: Payout[] | null;
}

export default function PaymentsSettingsPage() {
  const [connectStatus, setConnectStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") setMessage("Stripe account connected!");
    if (params.get("refresh") === "true") setMessage("Please complete onboarding.");

    fetch("/api/stripe/connect")
      .then((r) => r.json())
      .then(setConnectStatus);
  }, []);

  async function handleConnect() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/connect", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(false);
    }
  }

  async function handleDashboard() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/connect/dashboard", {
        method: "POST",
      });
      const data = await res.json();
      if (data.url) window.open(data.url, "_blank");
    } finally {
      setLoading(false);
    }
  }

  const isVerified = connectStatus?.status === "verified";

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Payment Settings</h1>

      {message && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg mb-6">
          {message}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-2 text-gray-900">
          Stripe Connect — Rent Collection
        </h2>
        <p className="text-gray-600 text-sm mb-4">
          Connect your Stripe account to collect rent payments from tenants via
          ACH bank transfer or credit/debit card.
        </p>

        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm font-medium">Status:</span>
          {!connectStatus ? (
            <span className="text-gray-400 text-sm">Loading...</span>
          ) : isVerified ? (
            <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
              Connected & Verified
            </span>
          ) : connectStatus.status === "pending" ? (
            <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-medium">
              Pending Verification
            </span>
          ) : (
            <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-medium">
              Not Connected
            </span>
          )}
        </div>

        {isVerified && (
          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-500">Charges</p>
              <p className="font-medium text-gray-900">
                {connectStatus.chargesEnabled ? "Enabled" : "Disabled"}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-500">Payouts</p>
              <p className="font-medium text-gray-900">
                {connectStatus.payoutsEnabled ? "Enabled" : "Disabled"}
              </p>
            </div>
          </div>
        )}

        {isVerified && connectStatus?.balance && (
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <p className="text-sm text-green-600 mb-1">Available Balance</p>
              <p className="text-2xl font-bold text-green-700">
                ${(connectStatus.balance.available / 100).toFixed(2)}
              </p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <p className="text-sm text-yellow-600 mb-1">Pending</p>
              <p className="text-2xl font-bold text-yellow-700">
                ${(connectStatus.balance.pending / 100).toFixed(2)}
              </p>
            </div>
          </div>
        )}

        {isVerified && connectStatus?.payouts && connectStatus.payouts.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Recent Payouts</h3>
            <div className="bg-gray-50 rounded-lg divide-y divide-gray-200">
              {connectStatus.payouts.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      ${(p.amount / 100).toFixed(2)}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                      p.status === "paid"
                        ? "bg-green-100 text-green-700"
                        : p.status === "in_transit"
                          ? "bg-blue-100 text-blue-700"
                          : p.status === "pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-gray-100 text-gray-600"
                    }`}>
                      {p.status.replace("_", " ")}
                    </span>
                  </div>
                  <span className="text-gray-500">
                    {new Date(p.arrivalDate * 1000).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          {!isVerified ? (
            <button
              onClick={handleConnect}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading
                ? "Loading..."
                : connectStatus?.status === "pending"
                  ? "Continue Onboarding"
                  : "Connect Stripe Account"}
            </button>
          ) : (
            <>
              <button
                onClick={handleDashboard}
                disabled={loading}
                className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
              >
                Open Stripe Dashboard
              </button>
              <button
                onClick={handleConnect}
                disabled={loading}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                Update Account
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-2 text-gray-900">Fee Structure</h2>
        <p className="text-gray-600 text-sm mb-4">
          Fees are charged to the tenant (payer) on each transaction.
        </p>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
            <div>
              <p className="font-medium text-gray-900">ACH Bank Transfer</p>
              <p className="text-gray-500">Direct bank-to-bank transfer</p>
            </div>
            <p className="font-semibold text-gray-900">$1.95 flat</p>
          </div>
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
            <div>
              <p className="font-medium text-gray-900">Credit / Debit Card</p>
              <p className="text-gray-500">Visa, Mastercard, Amex</p>
            </div>
            <p className="font-semibold text-gray-900">3.5% + $0.30</p>
          </div>
        </div>
      </div>
    </div>
  );
}
