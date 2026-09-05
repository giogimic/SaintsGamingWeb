"use client";

import { useState } from "react";
import { Button } from "@/web/components/ui/button";
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Zap,
  Database,
  Layers,
  RotateCcw,
  Sparkles,
  Trash2,
  ShieldCheck,
  X,
  AlertOctagon,
} from "lucide-react";

type UpdateProfile = "auto" | "quick" | "app" | "db" | "full" | "restart";

export function SystemUpdater({ isDocker = false }: { isDocker?: boolean }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateType, setUpdateType] = useState<UpdateProfile>("auto");
  const [dataRetention, setDataRetention] = useState<"keep" | "wipe">("keep");
  const [showWipeConfirmModal, setShowWipeConfirmModal] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const profiles: { id: UpdateProfile; label: string; icon: any; badge: string; description: string }[] = [
    {
      id: "auto",
      label: "Smart Auto-Detect (Recommended)",
      icon: Sparkles,
      badge: "Fast & Smart",
      description: "Inspects incoming git commits to detect if dependencies, database schemas, or app code changed. Skips rebuilds when not required.",
    },
    {
      id: "quick",
      label: "Quick Sync & Restart",
      icon: Zap,
      badge: "~5 Seconds",
      description: "Pulls the latest code and performs a rapid hot-restart. Skips full package installs and Serapht.js / Docker container rebuilds.",
    },
    {
      id: "app",
      label: "Application Rebuild",
      icon: Layers,
      badge: "UI / Logic",
      description: "Pulls code, updates npm dependencies, and recompiles the Serapht.js production bundle. Skips database migrations.",
    },
    {
      id: "db",
      label: "Database Migration & Assets",
      icon: Database,
      badge: "Schema & Maps",
      description: "Pulls code, pushes Prisma schema migrations, and synchronizes game assets. Skips Serapht.js bundle rebuilds.",
    },
    {
      id: "full",
      label: "Full Clean Rebuild",
      icon: RefreshCw,
      badge: "Complete Rebuild",
      description: "Performs an exhaustive rebuild with disk cache pruning, database backup, Prisma migration, and full Docker web rebuild.",
    },
    {
      id: "restart",
      label: "Restart Services Only",
      icon: RotateCcw,
      badge: "No Git Pull",
      description: "Restarts active Docker containers or PM2 worker processes without fetching new code from Git.",
    },
  ];

  const triggerUpdateExecution = async (wipeData: boolean) => {
    setIsUpdating(true);
    setStatus(null);
    setShowWipeConfirmModal(false);

    try {
      const res = await fetch("/api/admin/system/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updateType,
          wipeGameData: wipeData,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to trigger update");
      }

      setStatus({ type: 'success', message: data.message });

      setTimeout(() => {
        setStatus({ type: 'success', message: "System Restarting: Please wait a moment and refresh the page manually." });
      }, 5000);

    } catch (error: any) {
      setStatus({ type: 'error', message: error.message });
      setIsUpdating(false);
    }
  };

  const handleUpdateClick = () => {
    if (dataRetention === "wipe") {
      setShowWipeConfirmModal(true);
      return;
    }

    const selected = profiles.find(p => p.id === updateType);
    if (!confirm(`Are you sure you want to execute a ${selected?.label || updateType} update? The server may restart shortly.`)) {
      return;
    }

    triggerUpdateExecution(false);
  };

  return (
    <div className="space-y-4 pt-4 border-t border-border/40 mt-4 text-xs font-mono">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold flex items-center gap-2 text-foreground">
          <RefreshCw className="h-4 w-4 text-primary" /> System Update &amp; Maintenance
        </h2>
        <span className="text-[10px] px-2 py-0.5 rounded bg-primary/10 border border-primary/30 text-primary">
          Live Server Control
        </span>
      </div>
      
      {isDocker ? (
        <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-lg">
          <div className="flex gap-2.5">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-bold text-destructive text-xs">Disabled in Web UI (Docker Host Environment)</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Running the web-based updater from inside a container can interrupt the active build. 
                Please run <code className="text-xs bg-muted/60 px-1 py-0.5 rounded">./update.sh --type={updateType}</code> directly on your host machine.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Profile Selector Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {profiles.map((p) => {
              const Icon = p.icon;
              const isSelected = updateType === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setUpdateType(p.id)}
                  disabled={isUpdating}
                  className={`p-2.5 rounded-lg border text-left transition-all relative flex flex-col justify-between gap-1.5 cursor-pointer ${
                    isSelected
                      ? "bg-primary/15 border-primary shadow-sm ring-1 ring-primary/30"
                      : "bg-[#0a1628]/60 border-border/40 hover:bg-[#0a1628]/90 hover:border-primary/40"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="truncate">{p.label}</span>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded ${isSelected ? "bg-primary text-primary-foreground font-bold" : "bg-muted/80 text-muted-foreground"}`}>
                        {p.badge}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">
                      {p.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Data Retention Options Box */}
          <div className="p-3 rounded-lg bg-[#050b14]/80 border border-border/40 space-y-2">
            <div className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-primary" />
              <span>Database &amp; Game Content Option</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDataRetention("keep")}
                disabled={isUpdating}
                className={`p-2 rounded-md border flex items-start gap-2 text-left transition-all cursor-pointer ${
                  dataRetention === "keep"
                    ? "bg-primary/15 border-primary ring-1 ring-primary/30 text-foreground"
                    : "bg-[#0a1628]/40 border-border/40 text-muted-foreground hover:bg-[#0a1628]/70"
                }`}
              >
                <ShieldCheck className={`w-4 h-4 shrink-0 mt-0.5 ${dataRetention === "keep" ? "text-primary" : "text-muted-foreground"}`} />
                <div>
                  <div className="font-bold text-xs flex items-center gap-1">
                    <span>Keep Game Data</span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-green-500/20 text-green-400 font-normal">Default</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Preserves all characters, custom maps, player inventories, and accounts.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDataRetention("wipe")}
                disabled={isUpdating}
                className={`p-2 rounded-md border flex items-start gap-2 text-left transition-all cursor-pointer ${
                  dataRetention === "wipe"
                    ? "bg-destructive/15 border-destructive ring-1 ring-destructive/30 text-foreground"
                    : "bg-[#0a1628]/40 border-border/40 text-muted-foreground hover:bg-[#0a1628]/70"
                }`}
              >
                <Trash2 className={`w-4 h-4 shrink-0 mt-0.5 ${dataRetention === "wipe" ? "text-destructive" : "text-muted-foreground"}`} />
                <div>
                  <div className="font-bold text-xs text-destructive flex items-center gap-1">
                    <span>Wipe Game Data with Update</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Clears player data &amp; maps, re-seeding realm with fresh defaults.
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {status && (
        <div className={`p-3 rounded-lg border flex items-start gap-2.5 ${status.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-destructive/10 border-destructive/20 text-destructive'}`}>
          {status.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
          )}
          <div className="font-medium text-xs">{status.message}</div>
        </div>
      )}

      {!isDocker && (
        <div className="flex items-center gap-2 pt-1">
          <Button 
            onClick={handleUpdateClick} 
            disabled={isUpdating}
            variant={dataRetention === "wipe" ? "destructive" : "default"}
            className="w-full sm:w-auto font-bold text-xs h-9 px-4 cursor-pointer"
          >
            {isUpdating ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin" />
                Executing {updateType.toUpperCase()} Update...
              </>
            ) : (
              `Run ${updateType.toUpperCase()} Update ${dataRetention === "wipe" ? "(Wipe Data)" : ""}`
            )}
          </Button>
        </div>
      )}

      {/* Double Confirmation Modal when Wipe Game Data is Selected */}
      {showWipeConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#050b14] border border-destructive/40 rounded-xl p-4 shadow-2xl space-y-3 font-mono">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <div className="flex items-center gap-2 text-destructive font-bold text-sm">
                <AlertOctagon className="w-5 h-5 text-destructive" />
                <span>Confirm Game Data Wipe</span>
              </div>
              <button
                type="button"
                onClick={() => setShowWipeConfirmModal(false)}
                className="p-1 text-muted-foreground hover:text-white rounded transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to <strong className="text-destructive font-bold">wipe all game data</strong> during this update?
            </p>

            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-2.5 text-[11px] text-destructive space-y-1">
              <div>⚠️ <strong>This will permanently erase:</strong></div>
              <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                <li>All player characters and active creature parties</li>
                <li>Inventories, equipment, and gold balances</li>
                <li>Custom maps and active world edits</li>
                <li>Quest logs and encounter records</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowWipeConfirmModal(false)}
                className="text-xs h-8"
              >
                Cancel (Keep Data)
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => triggerUpdateExecution(true)}
                className="text-xs h-8 font-bold"
              >
                Yes, Wipe &amp; Update
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
