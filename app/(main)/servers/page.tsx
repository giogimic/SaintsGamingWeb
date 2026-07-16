"use client";

import { useEffect, useState } from "react";
import { Copy, Server, Users, Activity, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GameServer {
  id: string;
  name: string;
  game: string;
  ip: string;
  port: number;
  isActive: boolean;
  status: "online" | "offline" | "maintenance";
  players: number;
  maxPlayers: number;
  ping: number;
}

export default function ServersPage() {
  const [servers, setServers] = useState<GameServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/servers/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.servers) setServers(data.servers);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching servers:", err);
        setLoading(false);
      });
  }, []);

  const handleCopy = (ip: string, port: number, id: string) => {
    navigator.clipboard.writeText(`${ip}:${port}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="container mx-auto py-12 px-4 max-w-7xl sg-page-enter">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-extrabold tracking-tight mb-4 sg-text-gradient">
          Official Servers
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Join our massive 24/7 dedicated servers. Real-time stats are displayed below.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {servers.map((server) => (
            <div key={server.id} className="sg-3d-card rounded-xl p-6 flex flex-col relative overflow-hidden">
              
              {/* Background Glow */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold">{server.name}</h3>
                  <p className="text-muted-foreground flex items-center gap-2 mt-1">
                    <Server className="w-4 h-4" /> {server.game}
                  </p>
                </div>
                
                {/* Status Indicator */}
                <div className="flex items-center gap-2 bg-background/50 px-3 py-1 rounded-full border border-border/50">
                  {server.status === "online" ? (
                    <>
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                      </span>
                      <span className="text-xs font-semibold text-green-500">Online</span>
                    </>
                  ) : server.status === "maintenance" ? (
                    <>
                      <Wrench className="w-4 h-4 text-orange-500" />
                      <span className="text-xs font-semibold text-orange-500">Maintenance</span>
                    </>
                  ) : (
                    <>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                      <span className="text-xs font-semibold text-red-500">Offline</span>
                    </>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6 bg-background/50 p-4 rounded-lg border border-border/50">
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                    <Users className="w-4 h-4" /> Players
                  </span>
                  <span className="text-lg font-semibold">
                    {server.players} <span className="text-muted-foreground text-sm">/ {server.maxPlayers}</span>
                  </span>
                  {/* Progress Bar */}
                  <div className="w-full bg-background rounded-full h-1.5 mt-2">
                    <div 
                      className="bg-primary h-1.5 rounded-full transition-all duration-1000" 
                      style={{ width: `${(server.players / server.maxPlayers) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                    <Activity className="w-4 h-4" /> Ping
                  </span>
                  <span className="text-lg font-semibold">{server.ping}ms</span>
                </div>
              </div>

              {/* Connection Info & DaisyUI Mockup */}
              <div className="mt-auto">
                <div className="mockup-code text-sm w-full">
                  <pre data-prefix="$"><code>connect {server.ip}:{server.port}</code></pre>
                  {copiedId === server.id && (
                    <pre data-prefix=">" className="text-success text-green-500"><code>Copied to clipboard!</code></pre>
                  )}
                </div>
                <Button 
                  className="w-full mt-4" 
                  variant="secondary"
                  onClick={() => handleCopy(server.ip, server.port, server.id)}
                  disabled={server.status === "maintenance"}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  {copiedId === server.id ? "Copied!" : "Copy IP"}
                </Button>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
