"use client";

import useSWR from "swr";
import { Server, Users, Clock, Map as MapIcon, ShieldAlert, HeartPulse, Wrench } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface ServerStatus {
  server: {
    hostname: string;
    online: boolean;
    players: number;
    maxClients: number;
    uptime: string;
    mapname: string;
  };
  jobs: {
    police: number;
    ems: number;
    mechanic: number;
    taxi: number;
  };
}

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
});

export default function StatusPage() {
  const { data: status, error, isLoading } = useSWR<ServerStatus>("/api/fivem/status", fetcher, {
    refreshInterval: 60000,
    revalidateOnFocus: true,
  });

  // Remove FiveM color codes like ^2, ^7
  const cleanHostname = (name: string) => name.replace(/\^[0-9]/g, "");

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
          <Server className="h-8 w-8 text-primary" />
          Server Status
        </h1>
        <p className="text-muted-foreground">Real-time telemetry from the Saints Gaming Roleplay server.</p>
      </div>

      {isLoading && !status ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 animate-pulse">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="bg-card/40 border-border/50">
              <CardHeader className="pb-2"><div className="h-4 w-24 bg-muted rounded"></div></CardHeader>
              <CardContent><div className="h-8 w-16 bg-muted rounded"></div></CardContent>
            </Card>
          ))}
        </div>
      ) : error || !status ? (
        <Card className="bg-destructive/10 border-destructive/20 text-center py-12">
          <CardContent>
            <Server className="h-12 w-12 text-destructive mx-auto mb-4 opacity-50" />
            <h2 className="text-xl font-bold text-destructive mb-2">Server Offline</h2>
            <p className="text-destructive/80">Could not connect to the game server. It might be down for maintenance.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className="bg-card/40 border-primary/20 overflow-hidden">
            <div className="bg-primary/10 px-6 py-4 border-b border-primary/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                  <span className="font-bold text-green-500">ONLINE</span>
                </div>
                <h2 className="text-xl font-bold">{cleanHostname(status.server.hostname)}</h2>
              </div>
              <div className="flex items-center gap-2 bg-background/50 px-4 py-2 rounded-lg border border-border/50">
                <Users className="h-5 w-5 text-muted-foreground" />
                <span className="font-mono text-xl font-bold">
                  {status.server.players} <span className="text-muted-foreground text-sm">/ {status.server.maxClients}</span>
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border/50">
              <div className="p-6 flex flex-col items-center justify-center text-center">
                <Clock className="h-6 w-6 text-muted-foreground mb-2" />
                <div className="text-sm text-muted-foreground mb-1">Uptime</div>
                <div className="text-lg font-bold">{status.server.uptime}</div>
              </div>
              <div className="p-6 flex flex-col items-center justify-center text-center">
                <MapIcon className="h-6 w-6 text-muted-foreground mb-2" />
                <div className="text-sm text-muted-foreground mb-1">Current Map</div>
                <div className="text-lg font-bold">{status.server.mapname}</div>
              </div>
              <div className="p-6 flex flex-col items-center justify-center text-center col-span-1 md:col-span-2 bg-muted/20">
                <div className="text-sm text-muted-foreground mb-3 font-bold">Emergency Services on Duty</div>
                <div className="flex gap-6">
                  <div className="flex flex-col items-center">
                    <ShieldAlert className="h-6 w-6 text-blue-500 mb-1" />
                    <span className="font-bold text-blue-400">{status.jobs.police} LEO</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <HeartPulse className="h-6 w-6 text-red-500 mb-1" />
                    <span className="font-bold text-red-400">{status.jobs.ems} EMS</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <Wrench className="h-6 w-6 text-yellow-500 mb-1" />
                    <span className="font-bold text-yellow-400">{status.jobs.mechanic} MECH</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
