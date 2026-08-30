"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, Radio, ShieldAlert, Unplug, RefreshCw } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { DevSubNav } from "../dev/dev-sub-nav";

type Metrics = {
  totalEmits: number;
  failedValidations: number;
  connectedUsers: number;
  rooms: number;
};

type CriticalEvent = {
  id: string;
  eventType: string;
  userId: string | null;
  priority: string;
  createdAt: string;
};

type DashboardState = {
  ready: boolean;
  message?: string;
  circuitBreakerOpen?: boolean;
  metrics: Metrics | null;
  recentCriticalEvents: CriticalEvent[];
};

export default function AdminRealtimePage() {
  const [data, setData] = useState<DashboardState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [disconnectUserId, setDisconnectUserId] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/admin/realtime", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Failed to load realtime status (${res.status})`);
      }
      const json = (await res.json()) as DashboardState;
      setData(json);
    } catch (err: any) {
      setError(err.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  async function setCircuitBreaker(open: boolean) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/realtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setCircuitBreaker", open }),
      });
      if (!res.ok) throw new Error("Failed to update circuit breaker");
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function disconnectUser() {
    if (!disconnectUserId.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/realtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "disconnectUser",
          userId: disconnectUserId.trim(),
          reason: "Force disconnect from Admin Realtime Dashboard",
        }),
      });
      if (!res.ok) throw new Error("Failed to disconnect user");
      setDisconnectUserId("");
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      <div className="flex items-start justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Overview &amp; Telemetry</span>
            <span className="text-xs text-muted-foreground/40">•</span>
            <span className="text-xs text-[#cbb26a] font-mono">WebSockets</span>
          </div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Radio className="h-6 w-6 text-primary" /> Realtime Platform &amp; Bus
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Monitor active player connections, live Socket.io events, and emergency traffic controls.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading || busy}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <DevSubNav />

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && !data ? (
        <p className="text-sm text-muted-foreground">Loading realtime status…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <MetricCard
              icon={<Activity className="h-4 w-4" />}
              label="Socket Gateway"
              value={data?.ready ? "Healthy" : "Offline"}
              hint={data?.message || "Socket.io cluster listening on port 3000"}
            />
            <MetricCard
              icon={<Radio className="h-4 w-4" />}
              label="Connected Players"
              value={String(data?.metrics?.connectedUsers ?? "—")}
              hint="Active WebSocket sessions currently online"
            />
            <MetricCard
              icon={<Activity className="h-4 w-4" />}
              label="Broadcast Messages"
              value={String(data?.metrics?.totalEmits ?? "—")}
              hint="Total realtime packets transmitted"
            />
            <MetricCard
              icon={<ShieldAlert className="h-4 w-4" />}
              label="Failed Validations"
              value={String(data?.metrics?.failedValidations ?? "—")}
              hint="Payloads rejected by Zod schemas"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="border border-border/40 rounded-lg overflow-hidden bg-card/40 sg-glass">
              <div className="bg-muted px-4 py-3 border-b border-border/40 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-400" />
                <h2 className="font-bold">Emergency Circuit Breaker</h2>
              </div>
              <div className="p-4 space-y-4 text-sm">
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Think of this as an emergency pause button. If a bug or spam burst is flooding the server, opening the breaker temporarily halts live broadcasts while keeping players connected and queuing up CRITICAL events so nothing gets lost.
                </p>
                <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/40">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">Current State:</span>
                    <strong className={`font-mono text-xs ${data?.circuitBreakerOpen ? "text-amber-400" : "text-emerald-400"}`}>
                      {data?.circuitBreakerOpen ? "PAUSED (Open)" : "LIVE (Closed)"}
                    </strong>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!data?.ready || busy || data?.circuitBreakerOpen}
                      onClick={() => setCircuitBreaker(true)}
                      className="text-xs"
                    >
                      Pause Traffic
                    </Button>
                    <Button
                      size="sm"
                      disabled={!data?.ready || busy || !data?.circuitBreakerOpen}
                      onClick={() => setCircuitBreaker(false)}
                      className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
                    >
                      Resume Normal
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            <section className="border border-border/40 rounded-lg overflow-hidden bg-card/40 sg-glass">
              <div className="bg-muted px-4 py-3 border-b border-border/40 flex items-center gap-2">
                <Unplug className="h-4 w-4 text-primary" />
                <h2 className="font-bold">Force Socket Disconnect</h2>
              </div>
              <div className="p-4 space-y-3 text-sm">
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Immediately drops all active WebSocket sessions for a specific user ID. Useful if a client is stuck in an infinite packet loop or needs an immediate forced reconnect.
                </p>
                <div className="flex gap-2 pt-1">
                  <input
                    className="flex-1 h-9 rounded-md border border-border bg-background px-3 text-xs font-mono"
                    placeholder="Enter User ID (e.g. clxxx...)"
                    value={disconnectUserId}
                    onChange={(e) => setDisconnectUserId(e.target.value)}
                  />
                  <Button size="sm" variant="destructive" disabled={!data?.ready || busy || !disconnectUserId.trim()} onClick={disconnectUser} className="text-xs">
                    Drop Sockets
                  </Button>
                </div>
              </div>
            </section>
          </div>

          <section className="border border-border/40 rounded-lg overflow-hidden">
            <div className="bg-muted px-4 py-3 border-b border-border/40 flex items-center justify-between">
              <h2 className="font-bold">Recent CRITICAL Events</h2>
              <span className="text-xs text-muted-foreground">
                Rooms: {data?.metrics?.rooms ?? "—"}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 text-left text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Type</th>
                    <th className="px-4 py-2 font-medium">User</th>
                    <th className="px-4 py-2 font-medium">Priority</th>
                    <th className="px-4 py-2 font-medium">When</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.recentCriticalEvents ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-muted-foreground">
                        No persisted realtime events yet.
                      </td>
                    </tr>
                  ) : (
                    data!.recentCriticalEvents.map((event) => (
                      <tr key={event.id} className="border-b border-border/20">
                        <td className="px-4 py-2 font-mono text-xs">{event.eventType}</td>
                        <td className="px-4 py-2 font-mono text-xs">{event.userId ?? "—"}</td>
                        <td className="px-4 py-2">{event.priority}</td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {new Date(event.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="border border-border/40 rounded-lg p-4 space-y-2">
      <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-semibold">{value}</div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
