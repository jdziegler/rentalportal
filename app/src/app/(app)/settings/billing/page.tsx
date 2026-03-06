"use client";

import { useEffect, useState } from "react";

const plans = [
  {
    key: "starter",
    name: "Starter",
    price: "$18",
    priceEnvKey: "NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID",
    features: ["Up to 25 units", "10 leases", "Online rent collection", "1 GB storage"],
  },
  {
    key: "growth",
    name: "Growth",
    price: "$29",
    priceEnvKey: "NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID",
    features: ["Up to 75 units", "30 leases", "Everything in Starter", "10 GB storage"],
  },
  {
    key: "pro",
    name: "Pro",
    price: "$50",
    priceEnvKey: "NEXT_PUBLIC_STRIPE_PRO_PRICE_ID",
    features: ["Up to 250 units", "60 leases", "Everything in Growth", "25 GB storage"],
  },
];

// Map Stripe price IDs to plan keys for current plan detection
const priceIdToPlan: Record<string, string> = {
  [process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID || ""]: "starter",
  [process.env.NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID || ""]: "growth",
  [process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || ""]: "pro",
};

export default function BillingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [periodEnd, setPeriodEnd] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") setMessage("Subscription activated!");
    if (params.get("canceled") === "true") setMessage("Checkout canceled.");

    // Fetch current subscription info
    fetch("/api/stripe/subscription")
      .then((res) => res.json())
      .then((data) => {
        if (data.priceId) {
          setCurrentPlan(priceIdToPlan[data.priceId] || null);
        }
        if (data.periodEnd) {
          setPeriodEnd(new Date(data.periodEnd).toLocaleDateString());
        }
      })
      .catch(() => {});
  }, []);

  async function handleSubscribe(planKey: string) {
    setLoading(planKey);
    try {
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

      {currentPlan && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-6">
          <p className="font-medium">
            Current plan: {plans.find((p) => p.key === currentPlan)?.name}
          </p>
          {periodEnd && (
            <p className="text-sm text-green-700 mt-1">
              Next billing date: {periodEnd}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {plans.map((plan) => {
          const isCurrent = currentPlan === plan.key;
          return (
            <div
              key={plan.key}
              className={`bg-white rounded-lg shadow p-6 flex flex-col ${
                isCurrent ? "ring-2 ring-blue-500" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {plan.name}
                </h3>
                {isCurrent && (
                  <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    Current Plan
                  </span>
                )}
              </div>
              <p className="text-3xl font-bold mt-2 text-gray-900">
                {plan.price}
                <span className="text-sm text-gray-500 font-normal">/mo</span>
              </p>
              <ul className="mt-4 space-y-2 flex-1">
                {plan.features.map((f) => (
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
              {isCurrent ? (
                <button
                  onClick={handleManage}
                  disabled={loading !== null}
                  className="mt-6 w-full bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
                >
                  {loading === "manage" ? "Loading..." : "Manage Plan"}
                </button>
              ) : (
                <button
                  onClick={() => handleSubscribe(plan.key)}
                  disabled={loading !== null}
                  className="mt-6 w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading === plan.key
                    ? "Loading..."
                    : currentPlan
                      ? "Switch Plan"
                      : "Subscribe"}
                </button>
              )}
            </div>
          );
        })}
      </div>

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
    </div>
  );
}
