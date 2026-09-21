"use client";

import { SessionProvider } from "next-auth/react";
import { CreditsProvider } from "./CreditsContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CreditsProvider>{children}</CreditsProvider>
    </SessionProvider>
  );
}
