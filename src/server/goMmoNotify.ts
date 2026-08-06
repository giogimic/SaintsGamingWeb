/**
 * Server-side notify so Go live shards reload after Next `/api/maps` persist.
 * Prefers GO_MMO_INTERNAL_URL (Docker host gateway), else NEXT_PUBLIC_GO_MMO_URL.
 */
export function goMmoInternalBase(): string | undefined {
  const raw = (
    process.env.GO_MMO_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_GO_MMO_URL ||
    ""
  ).trim();
  if (!raw) return undefined;
  return raw.replace(/\/+$/, "");
}

export async function notifyGoMapSynced(payload: {
  id: string;
  name?: string;
  gridData?: unknown;
  npcsData?: unknown;
  tileLayersData?: unknown;
  tilesetsData?: unknown;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const base = goMmoInternalBase();
  if (!base) {
    return { ok: true, skipped: true };
  }
  const secret =
    process.env.GO_MMO_INTERNAL_SECRET ||
    process.env.SAINTS_INTERNAL_SECRET ||
    process.env.AUTH_SECRET ||
    "";
  if (!secret) {
    console.warn("[goMmoNotify] AUTH_SECRET missing — cannot sync map to Go");
    return { ok: false, error: "missing secret" };
  }

  const body = {
    id: payload.id,
    mapId: payload.id,
    name: payload.name || payload.id,
    gridData: payload.gridData ?? [],
    npcsData: payload.npcsData ?? [],
    tileLayersData: payload.tileLayersData ?? [],
    tilesetsData: payload.tilesetsData ?? [],
  };

  try {
    const res = await fetch(`${base}/api/internal/sync-map`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn(`[goMmoNotify] sync-map ${res.status}: ${text.slice(0, 200)}`);
      return { ok: false, error: `http ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[goMmoNotify] sync-map failed:", msg);
    return { ok: false, error: msg };
  }
}
