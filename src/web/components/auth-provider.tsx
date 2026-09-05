"use client";

import { SessionProvider } from "serapht-auth/react";
import { Session } from "serapht-auth";

export function AuthProvider({ children, session }: { children: React.ReactNode; session?: Session | null }) {
  // Disable refetchOnWindowFocus to prevent endless JWTSessionError spam in Docker logs if a session cookie is stale
  return <SessionProvider basePath="/api/auth" session={session} refetchOnWindowFocus={false}>{children}</SessionProvider>;
}
