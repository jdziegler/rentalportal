"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  id: string;
  body: string;
  sender: string;
  createdAt: string;
  readAt: string | null;
}

export default function MessagesSection({
  contactId,
  initialMessages,
}: {
  contactId: string;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;

    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, body: body.trim() }),
      });

      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) => [
          ...prev,
          { ...msg, createdAt: msg.createdAt, sender: "landlord", readAt: null },
        ]);
        setBody("");
      }
    } finally {
      setSending(false);
    }
  }

  const unreadCount = messages.filter(
    (m) => m.sender === "tenant" && !m.readAt
  ).length;

  return (
    <div className="mt-6 bg-white rounded-lg shadow">
      <div className="p-6 pb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Messages
          {unreadCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-600 rounded-full">
              {unreadCount}
            </span>
          )}
        </h2>
      </div>

      <div className="px-6 max-h-[300px] overflow-y-auto space-y-2">
        {messages.length === 0 ? (
          <p className="text-sm text-gray-400 py-4">
            No messages yet. Start a conversation below.
          </p>
        ) : (
          messages.map((m) => {
            const isLandlord = m.sender === "landlord";
            return (
              <div
                key={m.id}
                className={`flex ${isLandlord ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                    isLandlord
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <p
                    className={`text-xs mt-1 ${
                      isLandlord ? "text-blue-200" : "text-gray-400"
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

      <form onSubmit={handleSend} className="p-4 border-t border-gray-200 flex gap-2">
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
    </div>
  );
}
