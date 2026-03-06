"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface PageContextValue {
  context: string;
  setContext: (context: string) => void;
}

const PageContext = createContext<PageContextValue>({
  context: "",
  setContext: () => {},
});

export function PageContextProvider({ children }: { children: ReactNode }) {
  const [context, setContextState] = useState("");
  const setContext = useCallback((c: string) => setContextState(c), []);
  return (
    <PageContext.Provider value={{ context, setContext }}>
      {children}
    </PageContext.Provider>
  );
}

export function usePageContext() {
  return useContext(PageContext).context;
}

export function useSetPageContext() {
  return useContext(PageContext).setContext;
}
