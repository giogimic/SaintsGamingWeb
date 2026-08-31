"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { RefreshCw, AlertTriangle, CheckCircle2, XCircle, Zap, Database, Layers, RotateCcw, Sparkles } from "lucide-react";

type UpdateProfile = "auto" | "quick" | "app" | "db" | "full" | "restart";

export function SystemUpdater({ isDocker = false }: { isDocker?: boolean }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateType, setUpdateType] = useState<UpdateProfile>("auto");
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
      description: "Pulls the latest code and performs a rapid hot-restart. Skips full package installs and Next.js / Docker container rebuilds.",
    },
    {
      id: "app",
      label: "Application Rebuild",
      icon: Layers,
      badge: "UI / Logic",
      description: "Pulls code, updates npm dependencies, and recompiles the Next.js production bundle. Skips database migrations.",
    },
    {
      id: "db",
      label: "Database Migration & Assets",
      icon: Database,
      badge: "Schema & Maps",
      description: "Pulls code, pushes Prisma schema migrations, and synchronizes game assets. Skips Next.js bundle rebuilds.",
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

  const handleUpdate = async () => {
    const selected = profiles.find(p => p.id === updateType);
    if (!confirm(`Are you sure you want to execute a ${selected?.label || updateType} update? The server may restart shortly.`)) {
      return;
    }

    setIsUpdating(true);
    setStatus(null);
    
    try {
      const res = await fetch("/api/admin/system/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updateType }),
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

  return (
    <div className="space-y-4 pt-6 border-t mt-6">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <RefreshCw className="h-5 w-5 text-primary" /> System Update & Maintenance
      </h2>
      
      {isDocker ? (
        <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-md">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-medium text-destructive">Disabled in Web UI (Docker Host Environment)</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We detected that your application is running inside a container. 
                Running the web-based updater from within the web container can interrupt the active build. 
                Please perform updates by running <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">./update.sh --type={updateType}</code> directly in your host machine terminal.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-md">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="font-medium text-amber-500">Live Server Update</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Select an update profile below. When you trigger the update, the system will execute <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">update.sh --type={updateType}</code> (or <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">update.bat {updateType}</code>) on the host.
                </p>
              </div>
            </div>
          </div>

          {/* Profile Selector Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {profiles.map((p) => {
              const Icon = p.icon;
              const isSelected = updateType === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setUpdateType(p.id)}
                  disabled={isUpdating}
                  className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between gap-2 ${
                    isSelected
                      ? "bg-primary/15 border-primary shadow-sm ring-1 ring-primary/30"
                      : "bg-card/40 border-border/50 hover:bg-card/70 hover:border-border"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 font-bold text-xs">
                        <Icon className={`w-4 h-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                        <span>{p.label}</span>
                      </div>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${isSelected ? "bg-primary text-primary-foreground font-bold" : "bg-muted text-muted-foreground"}`}>
                        {p.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {p.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {status && (
        <div className={`p-4 rounded-md border flex items-start gap-3 ${status.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-destructive/10 border-destructive/20 text-destructive'}`}>
          {status.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
          )}
          <div className="font-medium text-sm">{status.message}</div>
        </div>
      )}

      {!isDocker && (
        <Button 
          onClick={handleUpdate} 
          disabled={isUpdating}
          variant={isUpdating ? "outline" : "default"}
          className="w-full sm:w-auto font-bold"
        >
          {isUpdating ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Executing {updateType.toUpperCase()} Update...
            </>
          ) : (
            `Run System Update (${updateType.toUpperCase()})`
          )}
        </Button>
      )}
    </div>
  );
}
