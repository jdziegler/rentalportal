"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface PageContextData {
  /** Short label shown in chat widget header, e.g. "/Dashboard", "/John Smith" */
  label: string;
  /** Detailed description sent to AI for context-aware responses */
  description: string;
}

interface PageContextValue {
  data: PageContextData | null;
  setData: (data: PageContextData | null) => void;
}

const PageContext = createContext<PageContextValue>({
  data: null,
  setData: () => {},
});

export function PageContextProvider({ children }: { children: ReactNode }) {
  const [data, setDataState] = useState<PageContextData | null>(null);
  const setData = useCallback((d: PageContextData | null) => setDataState(d), []);
  return (
    <PageContext.Provider value={{ data, setData }}>
      {children}
    </PageContext.Provider>
  );
}

export function usePageContext(): PageContextData | null {
  return useContext(PageContext).data;
}

export function useSetPageContext() {
  return useContext(PageContext).setData;
}
