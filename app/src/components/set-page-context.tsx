"use client";

import { useEffect } from "react";
import { useSetPageContext } from "@/lib/ai/page-context";

/**
 * Drop this into any page to tell the AI chatbot what the user is viewing.
 *
 * @param label - Short label shown in chat widget (e.g. "/Dashboard", "/John Smith")
 * @param context - Detailed description sent to the AI agent
 */
export function SetPageContext({ label, context }: { label: string; context: string }) {
  const setData = useSetPageContext();
  useEffect(() => {
    setData({ label, description: context });
    return () => setData(null);
  }, [label, context, setData]);
  return null;
}
