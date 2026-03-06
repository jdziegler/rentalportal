"use client";

import { useEffect, useState } from "react";

const plans = [
  {
    key: "starter",
    name: "Starter",
    price: "$18",
    features: ["Up to 25 units", "10 leases", "Online rent collection", "1 GB storage"],
  },
  {
    key: "growth",
    name: "Growth",
    price: "$29",
    features: ["Up to 75 units", "30 leases", "Everything in Starter", "10 GB storage"],
  },
  {
    key: "pro",
    name: "Pro",
    price: "$50",
    features: ["Up to 250 units", "60 leases", "Everything in Growth", "25 GB storage"],
  },
];

export default function BillingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") setMessage("Subscription activated!");
    if (params.get("canceled") === "true") setMessage("Checkout canceled.");
  }, []);

  async function handleSubscribe(planKey: string) {
    setLoading(planKey);
    try {
      const priceEnvMap: Record<string, string> = {
        starter: "NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID",
        growth: "NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID",
        pro: "NEXT_PUBLIC_STRIPE_PRO_PRICE_ID",
      };
      // Price IDs are passed from env vars exposed to client
      const priceId =
        planKey === "starter"
          ? process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID
          : planKey === "growth"
            ? process.env.NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID
            : process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID;

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setLoading(null);
    }
  }

  async function handleManage() {
    setLoading("manage");
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {plans.map((plan) => (
          <div
            key={plan.key}
            className="bg-white rounded-lg shadow p-6 flex flex-col"
          >
            <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
            <p className="text-3xl font-bold mt-2 text-gray-900">
              {plan.price}
              <span className="text-sm text-gray-500 font-normal">/mo</span>
            </p>
            <ul className="mt-4 space-y-2 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="text-sm text-gray-600 flex items-start gap-2">
                  <svg className="w-4 h-4 text-green-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleSubscribe(plan.key)}
              disabled={loading !== null}
              className="mt-6 w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading === plan.key ? "Loading..." : "Subscribe"}
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-2 text-gray-900">Manage Subscription</h2>
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
    </div>
  );
}
