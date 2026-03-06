"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

interface MessageInfo {
  id: string;
  body: string;
  sender: string;
  createdAt: string;
  landlordName: string;
  leaseName: string | null;
}

interface LeaseInfo {
  id: string;
  userId: string;
  unitName: string;
  propertyName: string;
  landlordName: string;
  contactId: string;
}

export default function MessagesClient({
  messages,
  leases,
}: {
  messages: MessageInfo[];
  leases: LeaseInfo[];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [selectedLease, setSelectedLease] = useState(leases[0]?.id || "");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentLease = leases.find((l) => l.id === selectedLease);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || !currentLease) return;

    setError("");
    setSending(true);

    try {
      const res = await fetch("/api/tenant/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: body.trim(),
          leaseId: currentLease.id,
          userId: currentLease.userId,
          contactId: currentLease.contactId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to send message");
        return;
      }

      setBody("");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  }

  if (leases.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No active leases found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Messages</h2>
        {leases.length > 1 && (
          <select
            value={selectedLease}
            onChange={(e) => setSelectedLease(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
          >
            {leases.map((l) => (
              <option key={l.id} value={l.id}>
                {l.propertyName} - {l.unitName} ({l.landlordName})
              </option>
            ))}
          </select>
        )}
      </div>

      {currentLease && (
        <p className="text-sm text-gray-500">
          Conversation with {currentLease.landlordName} about {currentLease.propertyName} - {currentLease.unitName}
        </p>
      )}

      {/* Messages thread */}
      <div className="bg-white rounded-lg border border-gray-200 min-h-[300px] max-h-[500px] overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-[200px]">
            <p className="text-sm text-gray-400">No messages yet. Start a conversation below.</p>
          </div>
        ) : (
          messages.map((m) => {
            const isTenant = m.sender === "tenant";
            return (
              <div
                key={m.id}
                className={`flex ${isTenant ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 ${
                    isTenant
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  {!isTenant && (
                    <p className="text-xs font-medium mb-0.5 text-gray-500">
                      {m.landlordName}
                    </p>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{m.body}</p>
                  <p
                    className={`text-xs mt-1 ${
                      isTenant ? "text-blue-200" : "text-gray-400"
                    }`}
                  >
                    {new Date(m.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Send message form */}
      <form onSubmit={handleSend} className="flex gap-2">
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={sending || !body.trim()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
        >
          {sending ? "..." : "Send"}
        </button>
      </form>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
