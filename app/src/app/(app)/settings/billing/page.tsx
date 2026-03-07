"use client";

import { useEffect, useState } from "react";

type SubStatus = {
  plan: string;
  isActive: boolean;
  isPro: boolean;
  limits: { units: number; leases: number };
  periodEnd: string | null;
};

export default function BillingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<SubStatus | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true")
      setMessage("Subscription activated!");
    if (params.get("canceled") === "true") setMessage("Checkout canceled.");

    fetch("/api/stripe/subscription")
      .then((res) => res.json())
      .then((data) => setStatus(data))
      .catch(() => {});
  }, []);

  async function handleSubscribe() {
    setLoading("pro");
    try {
      const priceId = process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID;
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(null);
    }
  }

  async function handleManage() {
    setLoading("manage");
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Billing</h1>

      {message && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg mb-6">
          {message}
        </div>
      )}

      {status && (
        <div
          className={`px-4 py-3 rounded-lg mb-6 border ${
            status.isPro
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-gray-50 border-gray-200 text-gray-800"
          }`}
        >
          <p className="font-medium">
            Current plan: {status.isPro ? "Pro" : "Free"}
          </p>
          <p className="text-sm mt-1 opacity-75">
            {status.limits.units} units, {status.limits.leases} active leases
            {status.periodEnd &&
              ` \u00b7 Renews ${new Date(status.periodEnd).toLocaleDateString()}`}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Free Plan */}
        <div
          className={`bg-white rounded-lg shadow p-6 flex flex-col ${
            status && !status.isPro ? "ring-2 ring-blue-500" : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Free</h3>
            {status && !status.isPro && (
              <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
                Current Plan
              </span>
            )}
          </div>
          <p className="text-3xl font-bold mt-2 text-gray-900">
            $0<span className="text-sm text-gray-500 font-normal">/mo</span>
          </p>
          <ul className="mt-4 space-y-2 flex-1">
            {["Up to 5 units", "3 active leases", "Online rent collection", "Basic reports"].map(
              (f) => (
                <li
                  key={f}
                  className="text-sm text-gray-600 flex items-start gap-2"
                >
                  <svg
                    className="w-4 h-4 text-green-500 mt-0.5 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {f}
                </li>
              )
            )}
          </ul>
          {status && !status.isPro && (
            <div className="mt-6 text-center text-sm text-gray-500">
              Your current plan
            </div>
          )}
        </div>

        {/* Pro Plan */}
        <div
          className={`bg-white rounded-lg shadow p-6 flex flex-col ${
            status?.isPro ? "ring-2 ring-blue-500" : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Pro</h3>
            {status?.isPro && (
              <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
                Current Plan
              </span>
            )}
          </div>
          <p className="text-3xl font-bold mt-2 text-gray-900">
            $29<span className="text-sm text-gray-500 font-normal">/mo</span>
          </p>
          <ul className="mt-4 space-y-2 flex-1">
            {[
              "Up to 250 units",
              "100 active leases",
              "Everything in Free",
              "Tenant screening",
              "E-signatures",
              "Team members",
              "Priority support",
            ].map((f) => (
              <li
                key={f}
                className="text-sm text-gray-600 flex items-start gap-2"
              >
                <svg
                  className="w-4 h-4 text-green-500 mt-0.5 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {f}
              </li>
            ))}
          </ul>
          {status?.isPro ? (
            <button
              onClick={handleManage}
              disabled={loading !== null}
              className="mt-6 w-full bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
            >
              {loading === "manage" ? "Loading..." : "Manage Plan"}
            </button>
          ) : (
            <button
              onClick={handleSubscribe}
              disabled={loading !== null}
              className="mt-6 w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading === "pro" ? "Loading..." : "Upgrade to Pro"}
            </button>
          )}
        </div>
      </div>

      {status?.isPro && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-2 text-gray-900">
            Manage Subscription
          </h2>
          <p className="text-gray-600 text-sm mb-4">
            Update payment method, change plan, or cancel your subscription.
          </p>
          <button
            onClick={handleManage}
            disabled={loading !== null}
            className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50"
          >
            {loading === "manage" ? "Loading..." : "Open Billing Portal"}
          </button>
        </div>
      )}
    </div>
  );
}
