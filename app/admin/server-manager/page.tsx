"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Server, Play, Square, RefreshCw, ExternalLink, AlertTriangle } from "lucide-react";
import { getServerStatus, startTxAdmin, stopTxAdmin } from "./actions";

type ServerState = {
  installed: boolean;
  running: boolean;
  txAdminUrl: string;
};

export default function ServerManagerPage() {
  const [state, setState] = useState<ServerState>({ installed: false, running: false, txAdminUrl: "" });
  const [loading, setLoading] = useState<string | null>(null);
  const [iframeReady, setIframeReady] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const refresh = useCallback(async () => {
    const s = await getServerStatus();
    setState(s);
    if (!s.running) setIframeReady(false);
  }, []);

  useEffect(() => {
    refresh();
    
    if (!autoRefresh) return;
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh, autoRefresh]);

  // When txAdmin starts, poll until the iframe is reachable
  useEffect(() => {
    if (!state.running || iframeReady) return;

    const timer = setInterval(() => {
      const img = new Image();
      img.onload = () => { setIframeReady(true); clearInterval(timer); };
      img.onerror = () => { setIframeReady(true); clearInterval(timer); }; // favicon may 404 but page is up
      img.src = state.txAdminUrl + "/favicon.ico?t=" + Date.now();
    }, 2000);

    return () => clearInterval(timer);
  }, [state.running, state.txAdminUrl, iframeReady]);

  async function handleStart() {
    setLoading("start");
    const res = await startTxAdmin();
    if (!res.success) alert(res.message);
    await refresh();
    setLoading(null);
  }

  async function handleStop() {
    setLoading("stop");
    const res = await stopTxAdmin();
    if (!res.success) alert(res.message);
    setIframeReady(false);
    await refresh();
    setLoading(null);
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Server className="h-8 w-8 text-orange-400" />
            FiveM Server Manager
          </h1>
          <p className="text-muted-foreground mt-1">
            Start txAdmin and manage your FiveM server without leaving the dashboard.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Badge */}
          <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-lg border border-border text-sm font-medium">
            {state.running ? (
              <><span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" /> <span className="text-green-400">Running</span></>
            ) : state.installed ? (
              <><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> <span className="text-red-400">Offline</span></>
            ) : (
              <><span className="h-2.5 w-2.5 rounded-full bg-zinc-500" /> <span className="text-zinc-400">Not Installed</span></>
            )}
          </div>

          {/* Controls */}
          {state.installed && !state.running && (
            <Button onClick={handleStart} disabled={loading === "start"} className="gap-2 bg-green-600 hover:bg-green-700">
              {loading === "start" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Start txAdmin
            </Button>
          )}
          {state.running && (
            <>
              <Button onClick={handleStop} disabled={loading === "stop"} variant="destructive" className="gap-2">
                {loading === "stop" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
                Stop
              </Button>
              <a href={state.txAdminUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="icon" title="Open in new tab">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
            </>
          )}
          <div className="flex items-center gap-2 border border-border/50 bg-card px-3 py-1.5 rounded-md">
            <Switch 
              id="auto-refresh" 
              checked={autoRefresh} 
              onCheckedChange={setAutoRefresh} 
            />
            <Label htmlFor="auto-refresh" className="text-sm font-medium cursor-pointer">
              Auto-Refresh
            </Label>
          </div>
          <Button variant="outline" size="icon" onClick={refresh} title="Refresh status">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Not Installed State */}
      {!state.installed && (
        <Card className="border-dashed border-2 border-border/60">
          <CardContent className="py-16 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto" />
            <h2 className="text-xl font-semibold">Server Artifacts Not Found</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              FXServer.exe was not detected at <code className="text-xs bg-muted px-2 py-1 rounded">C:\SaintsFiveM\server</code>.
              Download the latest Windows server artifact from the official FiveM website and extract it to this directory.
            </p>
            <a
              href="https://runtime.fivem.net/artifacts/fivem/build_server_windows/master/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" className="gap-2 mt-2">
                <ExternalLink className="h-4 w-4" /> Download Artifacts
              </Button>
            </a>
          </CardContent>
        </Card>
      )}

      {/* Waiting for txAdmin to boot */}
      {state.installed && state.running && !iframeReady && (
        <Card>
          <CardContent className="py-16 text-center space-y-4">
            <RefreshCw className="h-10 w-10 text-blue-400 mx-auto animate-spin" />
            <h2 className="text-lg font-semibold">Starting txAdmin...</h2>
            <p className="text-muted-foreground">Waiting for the txAdmin web interface to become available. This usually takes 5-15 seconds.</p>
          </CardContent>
        </Card>
      )}

      {/* txAdmin iframe */}
      {state.running && iframeReady && (
        <div className="rounded-lg border border-border overflow-hidden shadow-lg" style={{ height: "calc(100vh - 200px)" }}>
          <iframe
            src={state.txAdminUrl}
            className="w-full h-full border-0"
            title="txAdmin Panel"
            allow="clipboard-read; clipboard-write"
          />
        </div>
      )}

      {/* Offline idle state */}
      {state.installed && !state.running && (
        <Card>
          <CardContent className="py-16 text-center space-y-4">
            <Server className="h-12 w-12 text-zinc-500 mx-auto" />
            <h2 className="text-lg font-semibold">Server is Offline</h2>
            <p className="text-muted-foreground">Click <strong>Start txAdmin</strong> above to launch the server and manage it from here.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
