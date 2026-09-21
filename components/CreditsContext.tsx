"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface CreditsState {
  credits: number | null;
  plan: string | null;
  refresh: () => Promise<void>;
  /** Apply a balance the server just returned, without a round trip. */
  set: (credits: number) => void;
}

const Context = createContext<CreditsState>({
  credits: null,
  plan: null,
  refresh: async () => {},
  set: () => {},
});

export function CreditsProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [credits, setCredits] = useState<number | null>(null);
  const [plan, setPlan] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (status !== "authenticated") return;
    try {
      const response = await fetch("/api/me", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      setCredits(data.credits);
      setPlan(data.plan);
    } catch {
      /* offline — keep the last known balance */
    }
  }, [status]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <Context.Provider value={{ credits, plan, refresh, set: setCredits }}>
      {children}
    </Context.Provider>
  );
}

export function useCredits() {
  return useContext(Context);
}
