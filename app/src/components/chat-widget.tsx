"use client";

import { useState, useCallback, useRef, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePageContext, type PageContextData } from "@/lib/ai/page-context";

/** Renders markdown-style [text](/path) links as Next.js Link components */
function renderMessageText(text: string): ReactNode {
  const linkRegex = /\[([^\]]+)\]\((\/[^)]+)\)/g;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <Link
        key={match.index}
        href={match[2]}
        className="underline font-medium hover:opacity-80"
      >
        {match[1]}
      </Link>,
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  ts: number;
}

function makeHistoryKey(key: string) {
  return `${key}:messages`;
}
function makeCollapsedKey(key: string) {
  return `${key}:collapsed`;
}

function loadHistory(storageKey: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(makeHistoryKey(storageKey));
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(storageKey: string, messages: ChatMessage[]) {
  try {
    localStorage.setItem(
      makeHistoryKey(storageKey),
      JSON.stringify(messages.slice(-200)),
    );
  } catch {}
}

export function ChatWidget({ storageKey = "pp-chat" }: { storageKey?: string }) {
  const pageContextData: PageContextData | null = usePageContext();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [collapsed, setCollapsed] = useState(true);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMessages(loadHistory(storageKey));
    try {
      setCollapsed(
        localStorage.getItem(makeCollapsedKey(storageKey)) !== "false",
      );
    } catch {}
  }, [storageKey]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(makeCollapsedKey(storageKey), String(next));
      } catch {}
      if (!next) setUnread(0);
      return next;
    });
  }, [storageKey]);

  useEffect(() => {
    if (!collapsed) setTimeout(() => inputRef.current?.focus(), 80);
  }, [collapsed]);

  useEffect(() => {
    if (!collapsed) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, collapsed]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    const userMsg: ChatMessage = { role: "user", text, ts: Date.now() };
    const next = [...messages, userMsg];
    setMessages(next);
    saveHistory(storageKey, next);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          context: pageContextData?.description || undefined,
          channel: "web",
        }),
      });
      const data = (await res.json()) as {
        reply?: string;
        error?: string;
        mutated?: boolean;
        navigate?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Agent error");

      const reply: ChatMessage = {
        role: "assistant",
        text: data.reply ?? "",
        ts: Date.now(),
      };
      const withReply = [...next, reply];
      setMessages(withReply);
      saveHistory(storageKey, withReply);
      if (collapsed) setUnread((u) => u + 1);

      // Live-update the UI if the agent mutated any data
      if (data.mutated) {
        router.refresh();
      }

      // Auto-navigate if the agent returned a path
      if (data.navigate) {
        router.push(data.navigate);
      }
    } catch (err) {
      const errMsg: ChatMessage = {
        role: "assistant",
        text: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
        ts: Date.now(),
      };
      const withErr = [...next, errMsg];
      setMessages(withErr);
      saveHistory(storageKey, withErr);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, storageKey, pageContextData, collapsed, router]);

  const clearHistory = useCallback(() => {
    setMessages([]);
    try {
      localStorage.removeItem(makeHistoryKey(storageKey));
    } catch {}
  }, [storageKey]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {!collapsed && (
        <div
          className="w-[380px] max-w-[calc(100vw-3rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
          style={{ height: "480px" }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 shrink-0">
            <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
            <span className="text-sm font-semibold text-gray-900 flex-1">
              PropertyPilot AI
            </span>
            {pageContextData?.label && (
              <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md truncate max-w-[140px] shrink-0">
                {pageContextData.label}
              </span>
            )}
            {messages.length > 0 && (
              <button
                onClick={clearHistory}
                title="Clear history"
                className="p-1 text-gray-300 hover:text-gray-500 rounded transition-colors"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            )}
            <button
              onClick={toggleCollapsed}
              className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
              title="Collapse"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {messages.length === 0 && (
              <p className="text-xs text-gray-400 text-center mt-8 leading-relaxed px-4">
                Ask anything about your properties, tenants, leases,
                transactions, or maintenance requests.
              </p>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white rounded-br-sm"
                      : "bg-gray-100 text-gray-800 rounded-bl-sm"
                  }`}
                >
                  {msg.role === "assistant" ? renderMessageText(msg.text) : msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 p-3 flex gap-2 shrink-0">
            <input
              ref={inputRef}
              type="text"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-form-type="other"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendMessage();
                }
              }}
              placeholder="Ask something..."
              disabled={loading}
              className="flex-1 px-3.5 py-2 text-base sm:text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
            />
            <button
              onClick={() => {
                void sendMessage();
              }}
              disabled={loading || !input.trim()}
              className="px-3.5 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={toggleCollapsed}
        className="relative w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-700 shadow-lg flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95"
        title={collapsed ? "Open AI chat" : "Collapse"}
      >
        {collapsed ? (
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        ) : (
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        )}
        {collapsed && unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
    </div>
  );
}
