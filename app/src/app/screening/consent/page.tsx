"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";

function ConsentPageInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [info, setInfo] = useState<{
    id: string;
    status: string;
    tenantName: string;
    landlordName: string;
    expiresAt: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("No consent token provided");
      setLoading(false);
      return;
    }
    fetch(`/api/screening/consent?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setInfo(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load");
        setLoading(false);
      });
  }, [token]);

  async function handleConsent() {
    setSubmitting(true);
    const res = await fetch("/api/screening/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    const data = await res.json();
    if (res.ok) {
      setResult("consented");
    } else {
      setError(data.error || "Failed to submit consent");
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 max-w-md text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 max-w-md text-center">
          <div className="text-4xl mb-4">{"\u2705"}</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Consent Submitted
          </h1>
          <p className="text-gray-600">
            Thank you. Your background screening is being processed. Results
            will be shared with your landlord. You may close this page.
          </p>
        </div>
      </div>
    );
  }

  if (info?.status !== "consent_sent") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 max-w-md text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            {info?.status === "completed"
              ? "Screening Complete"
              : info?.status === "expired"
                ? "Link Expired"
                : "Already Processed"}
          </h1>
          <p className="text-gray-600">
            This screening request has already been {info?.status}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-lg font-bold text-gray-900">PropertyPilot</h1>
          <p className="text-sm text-gray-500">Tenant Screening Consent</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Background Check Authorization
          </h2>

          <p className="text-sm text-gray-700 mb-4">
            <strong>{info.landlordName}</strong> has requested a tenant
            screening for <strong>{info.tenantName}</strong>. This includes:
          </p>

          <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1 mb-6">
            <li>Credit history and score</li>
            <li>Criminal background check</li>
            <li>Eviction history</li>
          </ul>

          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 mb-6 text-xs text-gray-600">
            <p className="font-medium text-gray-900 mb-2">
              Fair Credit Reporting Act Disclosure
            </p>
            <p>
              By clicking &quot;I Consent&quot;, you authorize the collection and
              review of your consumer report information. This report may include
              credit history, criminal records, and eviction history. You have the
              right to dispute any inaccurate information. A copy of your rights
              under the FCRA is available at{" "}
              <span className="text-blue-600">
                consumer.ftc.gov
              </span>
              .
            </p>
          </div>

          {info.expiresAt && (
            <p className="text-xs text-gray-500 mb-4">
              This consent link expires on{" "}
              {new Date(info.expiresAt).toLocaleDateString()}.
            </p>
          )}

          <button
            onClick={handleConsent}
            disabled={submitting}
            className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {submitting ? "Processing..." : "I Consent to Background Screening"}
          </button>
        </div>
      </main>
    </div>
  );
}

export default function ScreeningConsentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <p className="text-gray-500">Loading...</p>
        </div>
      }
    >
      <ConsentPageInner />
    </Suspense>
  );
}
