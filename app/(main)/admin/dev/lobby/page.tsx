"use client";

import { useEffect, useState } from "react";
import { Server, Users, Activity, Play, StopCircle, RefreshCw } from "lucide-react";
import { useAppStore } from "@/shared/store/useAppStore";
import { ServerStatusCard } from "@/web/components/realtime/ServerStatusCard";

interface ServerStatus {
  players: number;
  capacity: number;
  status: 'online' | 'offline';
}

export default function LobbyManagementPage() {
  const mmoPlayerCount = useAppStore((s) => s.mmoPlayerCount);
  const [status, setStatus] = useState<ServerStatus>({ players: 0, capacity: 500, status: 'offline' });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/game/server-status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        setLastUpdated(new Date());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (mmoPlayerCount < 0) return;
    setStatus((prev) => ({
      ...prev,
      players: mmoPlayerCount > 0 ? mmoPlayerCount : prev.players,
      status: mmoPlayerCount > 0 ? "online" : prev.status,
    }));
    setLastUpdated(new Date());
  }, [mmoPlayerCount]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      <div className="flex items-start justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">World &amp; MMO</span>
            <span className="text-xs text-muted-foreground/40">â€¢</span>
            <span className="text-xs text-[#cbb26a] font-mono">Gateway Telemetry</span>
          </div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Server className="h-8 w-8 text-primary" /> Lobby &amp; MMO Gateway
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Live player occupancy, Go MMO destination gateway status, and TS GameEngine cluster heartbeat.
          </p>
        </div>
        <button 
          onClick={fetchStatus}
          className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-md transition-colors text-xs font-mono"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card/40 border border-border/50 rounded-xl p-6 sg-glass">
          <div className="flex items-center gap-3 text-muted-foreground mb-4">
            <Activity className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-xs uppercase tracking-wider">Gateway Status</h3>
          </div>
          <div className="flex items-end gap-3">
            <span className={`text-3xl font-black font-mono ${status.status === 'online' ? 'text-emerald-400' : 'text-red-400'}`}>
              {status.status.toUpperCase()}
            </span>
            <span className="text-xs text-muted-foreground mb-1">
              Last check: {lastUpdated.toLocaleTimeString()}
            </span>
          </div>
        </div>

        <div className="bg-card/40 border border-border/50 rounded-xl p-6 sg-glass">
          <div className="flex items-center gap-3 text-muted-foreground mb-4">
            <Users className="h-5 w-5 text-cyan-400" />
            <h3 className="font-semibold text-xs uppercase tracking-wider">Players In Lobby</h3>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-black font-mono text-foreground">{status.players}</span>
            <span className="text-sm text-muted-foreground mb-1">/ {status.capacity} max cap</span>
          </div>
        </div>

        <div className="bg-card/40 border border-border/50 rounded-xl p-6 sg-glass">
          <div className="flex items-center gap-3 text-muted-foreground mb-4">
            <Server className="h-5 w-5 text-amber-400" />
            <h3 className="font-semibold text-xs uppercase tracking-wider">Gateway Control</h3>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-900/40 text-red-300 rounded-md transition-colors opacity-50 cursor-not-allowed text-xs font-mono" disabled>
              <StopCircle className="h-4 w-4" /> Stop
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-900/40 text-emerald-300 rounded-md transition-colors opacity-50 cursor-not-allowed text-xs font-mono" disabled>
              <Play className="h-4 w-4" /> Start
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 text-center">
            Service managed by Node.js server lifecycle / PM2.
          </p>
        </div>
      </div>
      
      <ServerStatusCard />
    </div>
  );
}
