"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TenantLoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/tenant/session")
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated) {
          router.replace("/tenant/dashboard");
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm text-center">
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/tenant/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      // Navigate to verify page with identifier in query
      const params = new URLSearchParams({
        identifier: identifier.trim(),
        type: data.type,
      });
      router.push(`/tenant/verify?${params.toString()}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">Tenant Portal</h1>
          <p className="text-gray-500 text-sm mt-1">
            Enter your email or phone number to sign in
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <label
            htmlFor="identifier"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Email or Phone
          </label>
          <input
            id="identifier"
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="you@email.com or +15551234567"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
            autoFocus
          />

          {error && (
            <p className="text-red-600 text-sm mt-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !identifier.trim()}
            className="w-full mt-4 bg-blue-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Sending code..." : "Send Verification Code"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          We&apos;ll send a 6-digit code to verify your identity.
        </p>
      </div>
    </div>
  );
}
