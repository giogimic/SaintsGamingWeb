/**
 * Lobby / Studio realtime socket target.
 *
 * When `NEXT_PUBLIC_GO_MMO_URL` is set (e.g. http://127.0.0.1:3001), the
 * lobby game socket connects to the Go MMO backend. Forum RealtimeProvider
 * stays on the Next.js origin (unchanged).
 *
 * Studio map CRUD still uses Next `/api/maps` (Prisma). After save we also
 * emit `admin_save_map` so the Go live world stays in sync.
 */

export function goMmoPublicUrl(): string | undefined {
  const raw = (process.env.NEXT_PUBLIC_GO_MMO_URL || "").trim();
  if (!raw) return undefined;
  return raw.replace(/\/+$/, "");
}

export function isGoMmoSocketEnabled(): boolean {
  return Boolean(goMmoPublicUrl());
}

/** Socket.IO auth handshake — Go accepts plain account id or `dev:<id>` when GO_MMO_DEV_AUTH=true. */
export function lobbySocketAuth(accountId: string): { token: string } {
  return { token: accountId };
}

export type LobbySocketConnect = {
  /** Absolute URL for Go, or undefined for same-origin Next/TS socket. */
  url: string | undefined;
  options: {
    auth: { token: string };
    reconnection: boolean;
    reconnectionAttempts: number;
    reconnectionDelay: number;
    reconnectionDelayMax: number;
    withCredentials?: boolean;
    path?: string;
  };
};

export function lobbySocketConnect(accountId: string): LobbySocketConnect {
  const url = goMmoPublicUrl();
  return {
    url,
    options: {
      auth: lobbySocketAuth(accountId),
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
      ...(url
        ? {
            withCredentials: true,
            path: "/socket.io/",
          }
        : {}),
    },
  };
}
