"use client";

import { useEffect, useState } from "react";
import { Activity, Users } from "lucide-react";
import { useRealtimeStore } from "@/web/hooks/useRealtimeStore";

/**
 * Live MMO population card driven by coarse `game.player.*` bus events.
 * Falls back to polling `/api/game/server-status` when no realtime events yet.
 */
export function ServerStatusCard({
  pollFallback = true,
  className = "",
}: {
  pollFallback?: boolean;
  className?: string;
}) {
  const mmoPlayerCount = useRealtimeStore((s) => s.mmoPlayerCount);
  const mmoOnlineByUserId = useRealtimeStore((s) => s.mmoOnlineByUserId);
  const [polledPlayers, setPolledPlayers] = useState<number | null>(null);
  const [status, setStatus] = useState<"online" | "offline">("offline");

  useEffect(() => {
    if (!pollFallback) return;
    let cancelled = false;

    async function fetchStatus() {
      try {
        const res = await fetch("/api/game/server-status", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setPolledPlayers(typeof data.players === "number" ? data.players : 0);
        setStatus(data.status === "online" ? "online" : "offline");
      } catch {
        if (!cancelled) setStatus("offline");
      }
    }

    fetchStatus();
    const interval = setInterval(fetchStatus, 8000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pollFallback]);

  const realtimeCount = Object.keys(mmoOnlineByUserId).length;
  const players =
    realtimeCount > 0 || mmoPlayerCount > 0
      ? mmoPlayerCount
      : polledPlayers ?? 0;

  return (
    <div className={`border border-border/40 rounded-lg p-4 space-y-3 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
          <Activity className="h-4 w-4" />
          Saints Realm
        </div>
        <span
          className={`text-xs font-semibold ${
            status === "online" || players > 0 ? "text-emerald-500" : "text-red-500"
          }`}
        >
          {status === "online" || players > 0 ? "ONLINE" : "OFFLINE"}
        </span>
      </div>
      <div className="flex items-end gap-2">
        <Users className="h-5 w-5 text-muted-foreground mb-1" />
        <span className="text-3xl font-bold">{players}</span>
        <span className="text-sm text-muted-foreground mb-1">players</span>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Live via realtime bus · coarse status only (no movement ticks)
      </p>
    </div>
  );
}
