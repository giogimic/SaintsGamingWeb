"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

export function SystemUpdater() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const handleUpdate = async () => {
    if (!confirm("Are you sure you want to update the system? This will pull the latest code from Git and may restart the server, causing temporary downtime.")) {
      return;
    }

    setIsUpdating(true);
    setStatus(null);
    
    try {
      const res = await fetch("/api/admin/system/update", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to trigger update");
      }

      setStatus({ type: 'success', message: data.message });

      // Keep it in updating state to prevent multiple clicks
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
        <RefreshCw className="h-5 w-5" /> System Update
      </h2>
      
      <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-md">
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-medium text-amber-500">Live Server Modification</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Clicking this button will execute the root <code>update.sh</code> (or <code>update.bat</code>) script. 
              By default, this pulls the latest changes from Git, installs dependencies, rebuilds the site, and restarts the web service. 
              You may experience a brief period of downtime.
            </p>
          </div>
        </div>
      </div>

      {status && (
        <div className={`p-4 rounded-md border flex items-start gap-3 ${status.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-destructive/10 border-destructive/20 text-destructive'}`}>
          {status.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
          )}
          <div className="font-medium">{status.message}</div>
        </div>
      )}

      <Button 
        onClick={handleUpdate} 
        disabled={isUpdating}
        variant={isUpdating ? "outline" : "default"}
        className="w-full sm:w-auto"
      >
        {isUpdating ? (
          <>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Update in Progress...
          </>
        ) : (
          "Run System Update"
        )}
      </Button>
    </div>
  );
}
