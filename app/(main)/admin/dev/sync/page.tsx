"use client";

import { useEffect, useState, useCallback } from "react";
import { 
  RefreshCw, CheckCircle2, AlertTriangle, XCircle, Clock, 
  Layers, Database, ArrowRight, Play, Sparkles, ShieldAlert 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { toast } from "sonner";
import { DevSubNav } from "../dev-sub-nav";

interface MapSyncItem {
  id: string;
  name: string;
  version: number;
  updatedAt: string;
  lastSyncedVersion: number;
  lastSyncedAt: string | null;
  status: "SYNCED" | "STALE" | "PENDING" | "FAILED";
  pendingCount: number;
}

interface SyncLogEntry {
  id: string;
  mapId: string;
  version: number;
  status: string;
  syncedBy: string | null;
  syncedAt: string | null;
  error: string | null;
  createdAt: string;
}

export default function AdminSyncPage() {
  const [maps, setMaps] = useState<MapSyncItem[]>([]);
  const [recentEntries, setRecentEntries] = useState<SyncLogEntry[]>([]);
  const [syncMode, setSyncMode] = useState<string>("hybrid");
  const [loading, setLoading] = useState(true);
  const [busyMapId, setBusyMapId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/sync", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load sync status");
      const data = await res.json();
      setMaps(data.maps || []);
      setRecentEntries(data.recentEntries || []);
      if (data.syncMode) setSyncMode(data.syncMode);
    } catch (err: any) {
      toast.error(err.message || "Failed to load sync data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 6000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleSyncSingle = async (mapId: string) => {
    setBusyMapId(mapId);
    try {
      const res = await fetch("/api/admin/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapId }),
      });
      if (!res.ok) throw new Error("Sync enqueue failed");
      toast.success(`Enqueued sync for ${mapId}`);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Sync failed");
    } finally {
      setBusyMapId(null);
    }
  };

  const handleBulkSync = async () => {
    setBulkBusy(true);
    try {
      const res = await fetch("/api/admin/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bulk sync failed");
      toast.success(data.message || `Enqueued ${data.enqueuedCount} maps for sync!`);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Bulk sync failed");
    } finally {
      setBulkBusy(false);
    }
  };

  const totalMaps = maps.length;
  const syncedMaps = maps.filter((m) => m.status === "SYNCED").length;
  const staleMaps = maps.filter((m) => m.status === "STALE").length;
  const pendingMaps = maps.filter((m) => m.status === "PENDING").length;
  const failedMaps = maps.filter((m) => m.status === "FAILED").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Developer Operations</span>
            <span className="text-xs text-muted-foreground/40">•</span>
            <span className="text-xs text-[#cbb26a] font-mono">Pull-Based Synchronization</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-3 text-foreground">
            <RefreshCw className="h-7 w-7 text-primary" />
            Studio Map Sync Queue
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track map versions across the database and Go MMO shards. Shards pull updates asynchronously from this queue.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={handleBulkSync}
            disabled={bulkBusy || (staleMaps === 0 && failedMaps === 0)}
            className="text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
          >
            <Play className="h-3.5 w-3.5 mr-1.5" />
            Sync All Stale ({staleMaps + failedMaps})
          </Button>
        </div>
      </div>

      <DevSubNav />

      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="border border-border/40 p-4 rounded-xl bg-card/40 sg-glass">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground uppercase font-mono">Total Maps</span>
            <Layers className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-bold font-mono text-foreground">{totalMaps}</div>
          <span className="text-[11px] text-muted-foreground">Registered in WorldMap</span>
        </div>

        <div className="border border-border/40 p-4 rounded-xl bg-card/40 sg-glass">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground uppercase font-mono">Up-to-Date</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">{syncedMaps}</div>
          <span className="text-[11px] text-muted-foreground">Shards match DB version</span>
        </div>

        <div className="border border-border/40 p-4 rounded-xl bg-card/40 sg-glass">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground uppercase font-mono">Stale / Pending</span>
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">
            {staleMaps + pendingMaps}
          </div>
          <span className="text-[11px] text-muted-foreground">{pendingMaps} queued, {staleMaps} unsynced</span>
        </div>

        <div className="border border-border/40 p-4 rounded-xl bg-card/40 sg-glass">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground uppercase font-mono">Sync Mode</span>
            <Sparkles className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-lg font-bold font-mono uppercase text-purple-400">{syncMode}</div>
          <span className="text-[11px] text-muted-foreground">Pull polling + Eager push</span>
        </div>
      </div>

      {/* Map Synchronization Grid */}
      <Card className="bg-card/40 border-border/50 sg-glass">
        <CardHeader className="pb-3 border-b border-border/40 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" /> Map Versions &amp; Shard Alignment
            </CardTitle>
            <CardDescription className="text-xs">
              Every save in World Studio bumps the DB version and registers in this pull queue.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-border/40 bg-muted/30 text-muted-foreground">
                  <th className="px-4 py-2.5 font-mono">Map ID &amp; Name</th>
                  <th className="px-4 py-2.5 font-mono text-center">DB Version</th>
                  <th className="px-4 py-2.5 font-mono text-center">Synced Version</th>
                  <th className="px-4 py-2.5 font-mono">Status</th>
                  <th className="px-4 py-2.5 font-mono">Last Synchronized</th>
                  <th className="px-4 py-2.5 font-mono text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20 font-mono">
                {maps.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      {loading ? "Loading maps..." : "No world maps configured yet."}
                    </td>
                  </tr>
                ) : (
                  maps.map((map) => {
                    const isBusy = busyMapId === map.id;
                    return (
                      <tr key={map.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-bold text-foreground">{map.name}</div>
                          <div className="text-[10px] text-muted-foreground">{map.id}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-0.5 rounded bg-muted text-foreground font-bold">
                            v{map.version}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded font-bold ${
                            map.lastSyncedVersion === map.version
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}>
                            v{map.lastSyncedVersion || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {map.status === "SYNCED" && (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1 text-[10px]">
                              <CheckCircle2 className="h-3 w-3" /> Synced
                            </Badge>
                          )}
                          {map.status === "STALE" && (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 gap-1 text-[10px]">
                              <AlertTriangle className="h-3 w-3" /> Stale
                            </Badge>
                          )}
                          {map.status === "PENDING" && (
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30 gap-1 text-[10px]">
                              <Clock className="h-3 w-3 animate-spin" /> Pending ({map.pendingCount})
                            </Badge>
                          )}
                          {map.status === "FAILED" && (
                            <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30 gap-1 text-[10px]">
                              <XCircle className="h-3 w-3" /> Failed
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-[11px]">
                          {map.lastSyncedAt ? new Date(map.lastSyncedAt).toLocaleString() : "Never"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSyncSingle(map.id)}
                            disabled={isBusy || map.status === "PENDING"}
                            className="h-7 text-[11px] gap-1"
                          >
                            <RefreshCw className={`h-3 w-3 ${isBusy ? "animate-spin" : ""}`} />
                            Sync Now
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Sync Queue Activity Log */}
      <Card className="bg-card/40 border-border/50 sg-glass">
        <CardHeader className="pb-3 border-b border-border/40">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-400" /> Recent Pull Queue Activity &amp; Audit Trail
          </CardTitle>
          <CardDescription className="text-xs">
            Log of recent map synchronization events, shard pull requests, and acknowledgments.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[300px]">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-border/40 bg-muted/30 text-muted-foreground">
                  <th className="px-4 py-2 font-mono">Timestamp</th>
                  <th className="px-4 py-2 font-mono">Map</th>
                  <th className="px-4 py-2 font-mono">Version</th>
                  <th className="px-4 py-2 font-mono">Status</th>
                  <th className="px-4 py-2 font-mono">Triggered By</th>
                  <th className="px-4 py-2 font-mono">Details / Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20 font-mono text-[11px]">
                {recentEntries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                      No sync records recorded yet.
                    </td>
                  </tr>
                ) : (
                  recentEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-muted/10">
                      <td className="px-4 py-2 text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-2 font-bold text-foreground">{entry.mapId}</td>
                      <td className="px-4 py-2">v{entry.version}</td>
                      <td className="px-4 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          entry.status === "SYNCED" ? "bg-emerald-500/10 text-emerald-400" :
                          entry.status === "PENDING" ? "bg-blue-500/10 text-blue-400" :
                          "bg-red-500/10 text-red-400"
                        }`}>
                          {entry.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {entry.syncedBy ? `User ${entry.syncedBy.slice(0, 8)}...` : "System Auto"}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground truncate max-w-[200px]">
                        {entry.error ? (
                          <span className="text-red-400">{entry.error}</span>
                        ) : entry.syncedAt ? (
                          `Synced in ${(new Date(entry.syncedAt).getTime() - new Date(entry.createdAt).getTime())}ms`
                        ) : (
                          "Waiting for shard poll..."
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
