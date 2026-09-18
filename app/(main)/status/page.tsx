"use client";

import useSWR from "swr";
import { Server, Users, Clock, Wifi, WifiOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/web/components/ui/card";

interface EnrichedServer {
  id: string;
  name: string;
  type: string;
  game: string;
  ip: string;
  port: number;
  isActive: boolean;
  status: "online" | "offline" | "maintenance";
  players: number;
  maxPlayers: number;
  ping: number;
}

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
});

export default function StatusPage() {
  const { data, error, isLoading } = useSWR<{ servers: EnrichedServer[] }>("/api/servers/status", fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
          <Server className="h-8 w-8 text-primary" />
          Server Status
        </h1>
        <p className="text-muted-foreground">Live status of all Saints Gaming servers.</p>
      </div>

      {isLoading && !data ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 animate-pulse">
          {[1, 2, 3].map(i => (
            <Card key={i} className="bg-card/40 border-border/50">
              <CardHeader className="pb-2"><div className="h-4 w-32 bg-muted rounded"></div></CardHeader>
              <CardContent><div className="h-8 w-20 bg-muted rounded"></div></CardContent>
            </Card>
          ))}
        </div>
      ) : error || !data ? (
        <Card className="bg-destructive/10 border-destructive/20 text-center py-12">
          <CardContent>
            <Server className="h-12 w-12 text-destructive mx-auto mb-4 opacity-50" />
            <h2 className="text-xl font-semibold">Unable to Fetch Server Status</h2>
            <p className="text-muted-foreground mt-2">Please try again in a moment.</p>
          </CardContent>
        </Card>
      ) : data.servers.length === 0 ? (
        <Card className="bg-card/40 border-border/50 text-center py-12">
          <CardContent>
            <Server className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-xl font-semibold">No Servers Registered</h2>
            <p className="text-muted-foreground mt-2">Game servers will appear here once they are configured.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {data.servers.map((server) => (
            <Card key={server.id} className={`bg-card/40 border-border/50 transition-all ${server.status === 'online' ? 'border-green-500/30' : server.status === 'maintenance' ? 'border-yellow-500/30 opacity-80' : 'border-destructive/20 opacity-70'}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {server.status === 'online' ? (
                      <Wifi className="h-4 w-4 text-green-400" />
                    ) : (
                      <WifiOff className="h-4 w-4 text-destructive" />
                    )}
                    {server.name}
                  </CardTitle>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    server.status === 'online' ? 'bg-green-500/20 text-green-400' : 
                    server.status === 'maintenance' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-destructive/20 text-destructive'
                  }`}>
                    {server.status === 'online' ? 'Online' : server.status === 'maintenance' ? 'Maintenance' : 'Offline'}
                  </span>
                </div>
                <CardDescription>{server.game} • {server.ip}:{server.port}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    <span className="font-mono">{server.players}/{server.maxPlayers}</span>
                  </div>
                  {server.status === 'online' && server.ping > 0 && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span className="font-mono text-xs">{server.ping}ms</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
