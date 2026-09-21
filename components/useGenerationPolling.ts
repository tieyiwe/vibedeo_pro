"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ClientGeneration } from "@/lib/types";
import { useCredits } from "./CreditsContext";

const POLL_INTERVAL_MS = 4000;

/**
 * Keeps a list of generations fresh.
 *
 * Seedance renders asynchronously, so while any row is queued/processing we
 * poll /api/generate/status — which both refreshes Seedance and persists the
 * result — and merge what comes back.
 */
export function useGenerationPolling(initial: ClientGeneration[]) {
  const [generations, setGenerations] = useState<ClientGeneration[]>(initial);
  const { set: setCredits, refresh } = useCredits();
  const inFlight = useRef(false);

  const merge = useCallback((incoming: ClientGeneration[]) => {
    setGenerations((current) => {
      const next = [...current];
      for (const generation of incoming) {
        const index = next.findIndex((row) => row.id === generation.id);
        if (index === -1) next.unshift(generation);
        else next[index] = generation;
      }
      return next;
    });
  }, []);

  const prepend = useCallback((generation: ClientGeneration) => {
    setGenerations((current) => [generation, ...current.filter((row) => row.id !== generation.id)]);
  }, []);

  const pending = generations.some(
    (generation) => generation.status === "queued" || generation.status === "processing",
  );

  useEffect(() => {
    if (!pending) return;

    let cancelled = false;
    const tick = async () => {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        const response = await fetch("/api/generate/status", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (cancelled) return;
        if (Array.isArray(data.generations)) merge(data.generations);
        if (typeof data.credits === "number") setCredits(data.credits);
      } catch {
        /* transient — the next tick retries */
      } finally {
        inFlight.current = false;
      }
    };

    void tick();
    const timer = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [pending, merge, setCredits]);

  // A finished batch may have refunded credits; make sure the header agrees.
  useEffect(() => {
    if (!pending) void refresh();
  }, [pending, refresh]);

  return { generations, prepend, merge, pending };
}
