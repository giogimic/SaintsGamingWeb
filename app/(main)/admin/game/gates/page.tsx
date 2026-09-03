"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { 
  DoorOpen, DoorClosed, CheckCircle2, AlertTriangle, 
  Layers, MapPin, RefreshCw, Power, ShieldCheck, 
  Eye, Compass, ArrowRight, ArrowLeftRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Switch } from "@/shared/ui/switch";
import { Badge } from "@/shared/ui/badge";
import { Label } from "@/shared/ui/label";
import { toast } from "sonner";
import Link from "next/link";

interface MapSummary {
  id: string;
  name: string;
  version: number;
  totalGates: number;
  activeGates: number;
  disabledGates: number;
}

interface GateItem {
  id: string;
  position: { x: number; y: number };
  width: number;
  height: number;
  targetMapId: string;
  targetSpawn: { x: number; y: number };
  category?: string;
  name?: string;
  bidirectional?: boolean;
  disabled?: boolean;
}

export default function AdminGatesPage() {
  const [maps, setMaps] = useState<MapSummary[]>([]);
  const [selectedMapId, setSelectedMapId] = useState<string>("");
  const [selectedMapData, setSelectedMapData] = useState<{
    mapId: string;
    mapName: string;
    mapVersion: number;
    gates: GateItem[];
  } | null>(null);

  const [loadingMaps, setLoadingMaps] = useState(true);
  const [loadingGates, setLoadingGates] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  const loadMaps = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/gates", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load maps");
      const data = await res.json();
      const list = data.maps || [];
      setMaps(list);
      if (list.length > 0 && !selectedMapId) {
        setSelectedMapId(list[0].id);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load map list");
    } finally {
      setLoadingMaps(false);
    }
  }, [selectedMapId]);

  const loadMapGates = useCallback(async (mapId: string) => {
    if (!mapId) return;
    setLoadingGates(true);
    try {
      const res = await fetch(`/api/admin/gates?mapId=${encodeURIComponent(mapId)}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load map gates");
      const data = await res.json();
      setSelectedMapData(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load gates for map");
    } finally {
      setLoadingGates(false);
    }
  }, []);

  useEffect(() => {
    loadMaps();
  }, [loadMaps]);

  useEffect(() => {
    if (selectedMapId) {
      loadMapGates(selectedMapId);
    }
  }, [selectedMapId, loadMapGates]);

  const handleToggleGate = async (gateId: string, currentDisabled: boolean) => {
    setActionBusy(gateId);
    try {
      const res = await fetch("/api/admin/gates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mapId: selectedMapId,
          gateId,
          disabled: !currentDisabled,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to toggle gate");
      toast.success(currentDisabled ? "Gate opened & enabled!" : "Gate closed & disabled!");
      await loadMapGates(selectedMapId);
      await loadMaps();
    } catch (err: any) {
      toast.error(err.message || "Action failed");
    } finally {
      setActionBusy(null);
    }
  };

  const handleBulkToggle = async (disableAll: boolean) => {
    setActionBusy("bulk");
    try {
      const res = await fetch("/api/admin/gates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mapId: selectedMapId,
          all: true,
          disabled: disableAll,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update gates");
      toast.success(disableAll ? "All gates closed & disabled!" : "All gates opened & active!");
      await loadMapGates(selectedMapId);
      await loadMaps();
    } catch (err: any) {
      toast.error(err.message || "Bulk action failed");
    } finally {
      setActionBusy(null);
    }
  };

  const totalMapGates = selectedMapData?.gates.length || 0;
  const activeGatesCount = selectedMapData?.gates.filter((g) => !g.disabled).length || 0;
  const disabledGatesCount = totalMapGates - activeGatesCount;

  // Mini-map bounds calculation
  const miniMapBounds = useMemo(() => {
    if (!selectedMapData?.gates || selectedMapData.gates.length === 0) {
      return { minX: 0, maxX: 30, minY: 0, maxY: 30 };
    }
    const xs = selectedMapData.gates.map((g) => g.position.x);
    const ys = selectedMapData.gates.map((g) => g.position.y);
    const minX = Math.max(0, Math.min(...xs) - 2);
    const maxX = Math.max(...xs, 20) + 2;
    const minY = Math.max(0, Math.min(...ys) - 2);
    const maxY = Math.max(...ys, 20) + 2;
    return { minX, maxX, minY, maxY };
  }, [selectedMapData]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">World &amp; Game Operations</span>
            <span className="text-xs text-muted-foreground/40">•</span>
            <span className="text-xs text-[#cbb26a] font-mono">Realtime Gateways</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-3 text-foreground">
            <DoorOpen className="h-7 w-7 text-primary" />
            Gateway &amp; Warp Management
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Start, stop, and route warp gates across the MMO world. Disabled gates block player transit and are removed from runtime target evaluation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/dev/sync">
            <Button variant="outline" size="sm" className="text-xs gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              Sync Queue
            </Button>
          </Link>
        </div>
      </div>

      {/* Map Selector & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Map List Sidebar */}
        <Card className="lg:col-span-1 bg-card/40 border-border/50 sg-glass">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Select World Map ({maps.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 max-h-[500px] overflow-y-auto space-y-1">
            {loadingMaps ? (
              <div className="p-4 text-xs text-center text-muted-foreground">Loading maps...</div>
            ) : maps.length === 0 ? (
              <div className="p-4 text-xs text-center text-muted-foreground">No maps registered.</div>
            ) : (
              maps.map((m) => {
                const isSelected = m.id === selectedMapId;
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMapId(m.id)}
                    className={`w-full text-left p-2.5 rounded-lg transition-colors flex items-center justify-between text-xs ${
                      isSelected
                        ? "bg-primary/20 text-primary font-bold border border-primary/30"
                        : "hover:bg-muted/40 text-foreground"
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="truncate font-semibold">{m.name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{m.id}</div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted">
                        {m.activeGates}/{m.totalGates}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Right: Selected Map Gates & Mini-map */}
        <div className="lg:col-span-3 space-y-6">
          {/* Top Status Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="border border-border/40 p-4 rounded-xl bg-card/40 sg-glass">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground uppercase font-mono">Total Gates</span>
                <Layers className="h-4 w-4 text-primary" />
              </div>
              <div className="text-2xl font-bold font-mono text-foreground">{totalMapGates}</div>
              <span className="text-[11px] text-muted-foreground">Registered on this map</span>
            </div>

            <div className="border border-border/40 p-4 rounded-xl bg-card/40 sg-glass">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground uppercase font-mono">Active (Open)</span>
                <DoorOpen className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-400">{activeGatesCount}</div>
              <span className="text-[11px] text-muted-foreground">Players can step &amp; travel</span>
            </div>

            <div className="border border-border/40 p-4 rounded-xl bg-card/40 sg-glass">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground uppercase font-mono">Disabled (Closed)</span>
                <DoorClosed className="h-4 w-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-amber-400">{disabledGatesCount}</div>
              <span className="text-[11px] text-muted-foreground">Blocked in live game</span>
            </div>
          </div>

          {/* Gate Controls Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-border/40 bg-card/30 sg-glass">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground">Active Map:</span>
              <span className="text-xs font-bold text-foreground">{selectedMapData?.mapName || selectedMapId}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                v{selectedMapData?.mapVersion || 1}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkToggle(false)}
                disabled={actionBusy === "bulk" || totalMapGates === 0 || disabledGatesCount === 0}
                className="text-xs h-7 text-emerald-400 hover:text-emerald-300"
              >
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Open All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkToggle(true)}
                disabled={actionBusy === "bulk" || totalMapGates === 0 || activeGatesCount === 0}
                className="text-xs h-7 text-amber-400 hover:text-amber-300"
              >
                <DoorClosed className="h-3 w-3 mr-1" />
                Close All
              </Button>
            </div>
          </div>

          {/* Gate List Table */}
          <Card className="bg-card/40 border-border/50 sg-glass">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" /> Registered Warp Gates
              </CardTitle>
              <CardDescription className="text-xs">
                Toggle a gate to immediately close or open travel between regions.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-border/40 bg-muted/30 text-muted-foreground font-mono">
                      <th className="px-4 py-2.5">Gate ID / Name</th>
                      <th className="px-4 py-2.5">Origin (X, Y)</th>
                      <th className="px-4 py-2.5">Destination Map</th>
                      <th className="px-4 py-2.5">Target Spawn</th>
                      <th className="px-4 py-2.5">Category</th>
                      <th className="px-4 py-2.5 text-center">Status</th>
                      <th className="px-4 py-2.5 text-right">Gate Control</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20 font-mono">
                    {loadingGates ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                          Loading gates...
                        </td>
                      </tr>
                    ) : totalMapGates === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                          No warp gates found on this map. Add gates in World Studio using the Logic palette.
                        </td>
                      </tr>
                    ) : (
                      selectedMapData?.gates.map((gate) => {
                        const isBusy = actionBusy === gate.id;
                        const isClosed = Boolean(gate.disabled);
                        return (
                          <tr key={gate.id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3">
                              <div className="font-bold text-foreground flex items-center gap-1.5">
                                {isClosed ? (
                                  <DoorClosed className="h-3.5 w-3.5 text-amber-400" />
                                ) : (
                                  <DoorOpen className="h-3.5 w-3.5 text-emerald-400" />
                                )}
                                <span>{gate.name || gate.id}</span>
                              </div>
                              <div className="text-[10px] text-muted-foreground">{gate.id}</div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-1.5 py-0.5 rounded bg-muted text-foreground">
                                [{gate.position.x}, {gate.position.y}]
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1 text-primary font-bold">
                                <span>{gate.targetMapId}</span>
                                {gate.bidirectional && (
                                  <span title="Bidirectional warp">
                                    <ArrowLeftRight className="h-3 w-3 text-muted-foreground" />
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              ({gate.targetSpawn?.x ?? 0}, {gate.targetSpawn?.y ?? 0})
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="text-[10px] font-mono">
                                {gate.category || "MAP"}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {isClosed ? (
                                <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px]">
                                  Closed / Disabled
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">
                                  Active / Open
                                </Badge>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Label htmlFor={`gate-${gate.id}`} className="text-[10px] text-muted-foreground cursor-pointer">
                                  {isClosed ? "Enable" : "Disable"}
                                </Label>
                                <Switch
                                  id={`gate-${gate.id}`}
                                  checked={!isClosed}
                                  disabled={isBusy}
                                  onCheckedChange={() => handleToggleGate(gate.id, isClosed)}
                                />
                              </div>
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
        </div>
      </div>
    </div>
  );
}
