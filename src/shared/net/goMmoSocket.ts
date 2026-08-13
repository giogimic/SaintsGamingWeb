/**
 * Lobby / Studio realtime socket target.
 *
 * When `NEXT_PUBLIC_GO_MMO_URL` is set (e.g. http://127.0.0.1:3001), the
 * lobby game socket connects to the Go MMO backend. Forum RealtimeProvider
 * stays on the Next.js origin (unchanged).
 *
 * Studio map CRUD still uses Next `/api/maps` (Prisma). After save we also
 * emit `content_reload` so the Go live world stays in sync.
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

export type ContentReloadEvent =
  | { type: "map"; mapId: string; version: number; at: string }
  | { type: "map_entities"; mapId: string; version: number; at: string }
  | { type: "loot"; id?: string; gameId?: string; version?: number; at: string }
  | { type: "item"; id?: string; slug?: string; at: string }
  | { type: "quest"; id?: string; slug?: string; at: string }
  | { type: "dialogue"; id?: string; at: string }
  | { type: "creature"; id?: string; slug?: string; at: string }
  | { type: "ability"; id?: string; at: string }
  | { type: "status"; id?: string; at: string }
  | { type: "skill"; id?: string; at: string }
  | { type: "class"; id?: string; at: string }
  | { type: "shop"; id?: string; at: string }
  | { type: "recipe"; id?: string; at: string }
  | { type: "logic_tile"; tileId?: number; at: string }
  | { type: "asset"; id?: string; at: string }
  | { type: "economy_modifier"; id?: string; at: string }
  | { type: "world_event"; id?: string; at: string }
  | { type: "cutscene"; id?: string; at: string }
  | { type: "package"; id?: string; at: string }
  | { type: "flush_all_caches"; at: string };
