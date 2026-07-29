"use client";

import { useEffect, useState } from "react";
import { Server, Users, Activity, Play, StopCircle, RefreshCw } from "lucide-react";

interface ServerStatus {
  players: number;
  capacity: number;
  status: 'online' | 'offline';
}

export default function LobbyManagementPage() {
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

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Server className="h-8 w-8 text-primary" /> Lobby & Server Management
        </h1>
        <button 
          onClick={fetchStatus}
          className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-md transition-colors text-sm font-medium"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 text-muted-foreground mb-4">
            <Activity className="h-5 w-5" />
            <h3 className="font-semibold text-sm uppercase tracking-wider">Status</h3>
          </div>
          <div className="flex items-end gap-3">
            <span className={`text-3xl font-black ${status.status === 'online' ? 'text-emerald-500' : 'text-red-500'}`}>
              {status.status.toUpperCase()}
            </span>
            <span className="text-xs text-muted-foreground mb-1">
              Last check: {lastUpdated.toLocaleTimeString()}
            </span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 text-muted-foreground mb-4">
            <Users className="h-5 w-5" />
            <h3 className="font-semibold text-sm uppercase tracking-wider">Players Online</h3>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-black text-foreground">{status.players}</span>
            <span className="text-lg text-muted-foreground mb-1">/ {status.capacity}</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 text-muted-foreground mb-4">
            <Server className="h-5 w-5" />
            <h3 className="font-semibold text-sm uppercase tracking-wider">Server Control</h3>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-900/50 hover:bg-red-900 text-red-200 rounded-md transition-colors opacity-50 cursor-not-allowed" disabled>
              <StopCircle className="h-4 w-4" /> Stop
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-900/50 hover:bg-emerald-900 text-emerald-200 rounded-md transition-colors opacity-50 cursor-not-allowed" disabled>
              <Play className="h-4 w-4" /> Start
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Service controlled by Docker/PM2. Use host terminal to restart.
          </p>
        </div>
      </div>
      
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <h3 className="font-bold mb-4">Standalone Map Editor Removed</h3>
        <p className="text-sm text-muted-foreground">
          The standalone world map editor has been removed from the dev panel. 
          Please use the integrated in-game editor (press '`' in-game if you have Developer permissions) to edit maps, place NPCs, and build logic tiles.
        </p>
      </div>
    </div>
  );
}
