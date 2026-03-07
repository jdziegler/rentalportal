"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Report = {
  id: string;
  type: string;
  status: string;
  score: number | null;
  summary: string;
  createdAt: string;
};

type ScreeningReq = {
  id: string;
  status: string;
  provider: string;
  consentToken: string;
  consentedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  reports: Report[];
};

const reqStatusStyles: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700 hover:bg-gray-100",
  consent_sent: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
  processing: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  completed: "bg-green-100 text-green-700 hover:bg-green-100",
  failed: "bg-red-100 text-red-700 hover:bg-red-100",
  expired: "bg-gray-100 text-gray-500 hover:bg-gray-100",
};

const reportStatusStyles: Record<string, string> = {
  clear: "bg-green-100 text-green-700",
  review: "bg-yellow-100 text-yellow-700",
  alert: "bg-red-100 text-red-700",
};

const reportTypeLabels: Record<string, string> = {
  credit: "Credit Check",
  criminal: "Criminal Background",
  eviction: "Eviction History",
};

function ScoreBar({ score }: { score: number }) {
  const pct = ((score - 300) / 550) * 100;
  const color =
    score >= 700 ? "bg-green-500" : score >= 600 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className={`h-2 rounded-full ${color}`}
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}

export default function TenantScreening({ contactId }: { contactId: string }) {
  const [requests, setRequests] = useState<ScreeningReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/screening?contactId=${contactId}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setRequests(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [contactId]);

  async function handleRequest() {
    setRequesting(true);
    setError(null);

    const res = await fetch("/api/screening", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
    } else {
      // Refresh
      const listRes = await fetch(`/api/screening?contactId=${contactId}`);
      const list = await listRes.json();
      if (Array.isArray(list)) setRequests(list);
    }
    setRequesting(false);
  }

  function copyConsentLink(token: string) {
    const url = `${window.location.origin}/screening/consent?token=${token}`;
    navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="mt-6 bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Tenant Screening
        </h2>
        <Button size="sm" onClick={handleRequest} disabled={requesting}>
          {requesting ? "Requesting..." : "Request Screening"}
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium">
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : requests.length === 0 ? (
        <p className="text-sm text-gray-500">
          No screening requests yet. Click &quot;Request Screening&quot; to run a
          background check.
        </p>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div
              key={req.id}
              className="border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge className={reqStatusStyles[req.status]}>
                    {req.status.replace("_", " ")}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {new Date(req.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {req.status === "consent_sent" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyConsentLink(req.consentToken)}
                    className="text-xs"
                  >
                    {copied === req.consentToken
                      ? "Copied!"
                      : "Copy Consent Link"}
                  </Button>
                )}
                {req.reports.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setExpanded(expanded === req.id ? null : req.id)
                    }
                    className="text-xs"
                  >
                    {expanded === req.id ? "Hide Reports" : "View Reports"}
                  </Button>
                )}
              </div>

              {/* Reports */}
              {expanded === req.id && req.reports.length > 0 && (
                <div className="mt-3 border-t pt-3 space-y-3">
                  {req.reports.map((report) => (
                    <div
                      key={report.id}
                      className="bg-gray-50 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {reportTypeLabels[report.type] || report.type}
                        </span>
                        <Badge
                          className={`text-xs ${reportStatusStyles[report.status]}`}
                        >
                          {report.status}
                        </Badge>
                      </div>
                      {report.score && (
                        <div className="mb-2">
                          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                            <span>Score: {report.score}</span>
                            <span>300 - 850</span>
                          </div>
                          <ScoreBar score={report.score} />
                        </div>
                      )}
                      <p className="text-sm text-gray-600">{report.summary}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
