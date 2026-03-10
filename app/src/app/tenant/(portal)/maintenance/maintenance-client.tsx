"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface LeaseInfo {
  id: string;
  unitId: string;
  unitName: string;
  propertyId: string;
  propertyName: string;
}

interface RequestInfo {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  category: string | null;
  propertyName: string;
  unitName: string | null;
  createdAt: string;
}

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  LOW: { label: "Low", color: "bg-gray-100 text-gray-600" },
  MEDIUM: { label: "Medium", color: "bg-yellow-100 text-yellow-700" },
  HIGH: { label: "High", color: "bg-orange-100 text-orange-700" },
  URGENT: { label: "Urgent", color: "bg-red-100 text-red-700" },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  OPEN: { label: "Open", color: "bg-blue-100 text-blue-700" },
  IN_PROGRESS: { label: "In Progress", color: "bg-yellow-100 text-yellow-700" },
  COMPLETED: { label: "Completed", color: "bg-green-100 text-green-700" },
  CANCELLED: { label: "Cancelled", color: "bg-gray-100 text-gray-500" },
};

const CATEGORIES = [
  "plumbing",
  "electrical",
  "hvac",
  "appliance",
  "pest_control",
  "structural",
  "landscaping",
  "general",
  "other",
];

export default function MaintenanceClient({
  leases,
  requests,
}: {
  leases: LeaseInfo[];
  requests: RequestInfo[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState("MEDIUM");
  const [selectedLease, setSelectedLease] = useState(leases[0]?.id || "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !selectedLease) return;

    setError("");
    setSubmitting(true);

    const lease = leases.find((l) => l.id === selectedLease);
    if (!lease) return;

    try {
      const res = await fetch("/api/tenant/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          category,
          priority,
          propertyId: lease.propertyId,
          unitId: lease.unitId,
          leaseId: lease.id,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to submit request");
        return;
      }

      setTitle("");
      setDescription("");
      setCategory("general");
      setPriority("MEDIUM");
      setShowForm(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Maintenance Requests</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
        >
          {showForm ? "Cancel" : "New Request"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
          {leases.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <select
                value={selectedLease}
                onChange={(e) => setSelectedLease(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {leases.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.propertyName} - {l.unitName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Leaky faucet in bathroom"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue in detail..."
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || !title.trim()}
            className="w-full bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Request"}
          </button>
        </form>
      )}

      {requests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">No maintenance requests yet.</p>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700"
            >
              Submit your first request
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          {requests.map((r) => {
            const priority = PRIORITY_LABELS[r.priority] || PRIORITY_LABELS["MEDIUM"];
            const status = STATUS_LABELS[r.status] || STATUS_LABELS["OPEN"];
            return (
              <div key={r.id} className="px-4 py-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{r.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {r.propertyName}{r.unitName ? ` - ${r.unitName}` : ""} &middot;{" "}
                      {new Date(r.createdAt).toLocaleDateString()}
                    </p>
                    {r.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{r.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priority.color}`}>
                      {priority.label}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
