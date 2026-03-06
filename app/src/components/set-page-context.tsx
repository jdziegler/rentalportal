"use client";

import { useEffect } from "react";
import { useSetPageContext } from "@/lib/ai/page-context";

/**
 * Drop this into any page to tell the AI chatbot what the user is viewing.
 * Server components can render this with a context string prop.
 */
export function SetPageContext({ context }: { context: string }) {
  const setContext = useSetPageContext();
  useEffect(() => {
    setContext(context);
    return () => setContext("");
  }, [context, setContext]);
  return null;
}
