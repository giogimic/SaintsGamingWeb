"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Trash2 } from "lucide-react";
import { clearEntireCache, clearPathCache } from "./actions";

export function SystemClient() {
  const [path, setPath] = useState("");
  const [isClearing, setIsClearing] = useState(false);

  const handleClearAll = async () => {
    setIsClearing(true);
    try {
      const res = await clearEntireCache();
      if (res.success) alert(res.message);
    } catch (e: any) {
      alert(e.message || "Failed to clear cache");
    }
    setIsClearing(false);
  };

  const handleClearPath = async () => {
    if (!path) return;
    setIsClearing(true);
    try {
      const res = await clearPathCache(path);
      if (res.success) alert(res.message);
    } catch (e: any) {
      alert(e.message || "Failed to clear cache");
    }
    setIsClearing(false);
  };

  return (
    <div className="space-y-6">
      <div className="border border-border/40 p-6 rounded-lg bg-card space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-blue-400" /> Cache Control
        </h2>
        <p className="text-sm text-muted-foreground">
          Next.js uses an aggressive App Router Data Cache. If you change a record in the database directly or experience stale data, you can forcefully purge the cache here without restarting the server.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 pt-2">
          <Button onClick={handleClearAll} disabled={isClearing} variant="destructive">
            <Trash2 className="h-4 w-4 mr-2" /> Purge Entire App Cache
          </Button>
          
          <div className="flex gap-2 w-full max-w-md">
            <Input 
              placeholder="e.g. /home, /admin/users" 
              value={path}
              onChange={(e) => setPath(e.target.value)}
            />
            <Button onClick={handleClearPath} disabled={isClearing || !path} variant="outline">
              Purge Path
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
