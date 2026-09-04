import { prisma } from "@/web/lib/prisma";
import { 
  Terminal, Globe, Lock, Shield, Server, FileJson, 
  Gamepad2, Link as LinkIcon, Cpu, Database, Activity, RefreshCw, Code, Radio 
} from "lucide-react";
import Link from "next/link";
import { DevActions } from "./dev-actions";
import { DevSubNav } from "./dev-sub-nav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/web/components/ui/card";
import { ADMIN_CATEGORIES, ADMIN_MODULES } from "@/web/lib/admin-modules";

export const metadata = {
  title: "Developer Console | Saints Gaming Admin",
};

export default async function DevDashboard() {
  const [userCount, threadCount, charCount, gameCharCount, questCount, assetCount, mapCount] = await Promise.all([
    prisma.user.count(),
    prisma.thread.count(),
    prisma.character.count(),
    prisma.gameCharacter.count(),
    prisma.gameQuest.count(),
    prisma.gameAsset.count(),
    prisma.worldMap.count(),
  ]);

  const PUBLIC_ROUTES = [
    { path: "/", desc: "Landing Page & Community Showcase" },
    { path: "/home", desc: "Main Community Feed" },
    { path: "/gaming-news", desc: "Aggregated RSS News Hub" },
    { path: "/modpacks", desc: "Modpack Directory & Client Downloads" },
    { path: "/servers", desc: "Live Server List" },
    { path: "/streams", desc: "Live Streams Index" },
    { path: "/forum", desc: "Community Forums & Boards" },
    { path: "/lobby", desc: "The Lobby Game Client" },
  ];

  const USER_ROUTES = [
    { path: "/profile", desc: "User Profile & Statistics" },
    { path: "/profile/inbox", desc: "Social Activity Feed" },
    { path: "/support", desc: "Support & Ticketing Center" },
    { path: "/ucp", desc: "FiveM User Control Panel" },
  ];

  const API_ENDPOINTS = [
    { path: "/api/auth/*", method: "ALL", desc: "NextAuth Authentication Handlers" },
    { path: "/api/admin/realtime", method: "ALL", desc: "Realtime Socket.io Bus & Metrics" },
    { path: "/api/maps", method: "GET/POST", desc: "World Map & Atlas CRUD" },
    { path: "/api/assets/upload", method: "POST", desc: "Pixel Art & Texture Uploads" },
    { path: "/api/loot/tables", method: "GET/POST", desc: "MMO Loot Tables API" },
    { path: "/api/dev/tasks", method: "POST", desc: "Background Cron & Sync Trigger" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      
      {/* Page Header */}
      <div className="border-b border-border/40 pb-4">
        <h1 className="text-3xl font-extrabold flex items-center gap-3 text-foreground tracking-tight">
          <Terminal className="h-8 w-8 text-primary" /> Developer Console &amp; System Index
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Technical diagnostics, full architecture sitemap, REST endpoints, and developer operations.
        </p>
      </div>

      {/* Navigation Sub-Tabs */}
      <DevSubNav />

      {/* Quick Diagnostics Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="border border-border/40 p-4 rounded-xl bg-card/40 sg-glass">
          <div className="flex items-center gap-2 mb-1 text-xs text-muted-foreground uppercase font-mono">
            <Gamepad2 className="h-4 w-4 text-emerald-400" /> MMO Characters
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">{gameCharCount}</div>
        </div>
        <div className="border border-border/40 p-4 rounded-xl bg-card/40 sg-glass">
          <div className="flex items-center gap-2 mb-1 text-xs text-muted-foreground uppercase font-mono">
            <Activity className="h-4 w-4 text-purple-400" /> Custom Maps
          </div>
          <div className="text-2xl font-bold font-mono text-purple-400">{mapCount}</div>
        </div>
        <div className="border border-border/40 p-4 rounded-xl bg-card/40 sg-glass">
          <div className="flex items-center gap-2 mb-1 text-xs text-muted-foreground uppercase font-mono">
            <FileJson className="h-4 w-4 text-amber-400" /> Quests &amp; Assets
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">{questCount} / {assetCount}</div>
        </div>
        <div className="border border-border/40 p-4 rounded-xl bg-card/40 sg-glass">
          <div className="flex items-center gap-2 mb-1 text-xs text-muted-foreground uppercase font-mono">
            <Database className="h-4 w-4 text-primary" /> Users &amp; Threads
          </div>
          <div className="text-2xl font-bold font-mono text-primary">{userCount} / {threadCount}</div>
        </div>
      </div>

      {/* Main Grid: Architecture Sitemap & REST Endpoints */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        
        {/* Left Column: Frontend App Architecture */}
        <div className="space-y-6">
          
          {/* Admin Control Center Modules */}
          <Card className="bg-card/40 border-border/50 sg-glass">
            <CardHeader className="pb-3 bg-muted/30 border-b border-border/40 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" /> Admin Control Center Sitemap
                </CardTitle>
                <CardDescription>Canonical registered modules ({ADMIN_MODULES.length})</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[380px] overflow-y-auto divide-y divide-border/30">
                {ADMIN_MODULES.map((mod) => {
                  const Icon = mod.icon;
                  const cat = ADMIN_CATEGORIES[mod.category];
                  return (
                    <div key={mod.id} className="p-3 hover:bg-muted/30 transition-colors flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
                        <Link href={mod.href} className="font-semibold text-foreground hover:underline truncate">
                          {mod.label}
                        </Link>
                        <span className="text-[10px] text-muted-foreground hidden sm:inline">({cat.label})</span>
                      </div>
                      <code className="text-[11px] text-muted-foreground font-mono shrink-0">{mod.href}</code>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Public & App Routes */}
          <Card className="bg-card/40 border-border/50 sg-glass">
            <CardHeader className="pb-3 bg-muted/30 border-b border-border/40">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Globe className="h-4 w-4 text-emerald-400" /> Public &amp; App Pages
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/30 text-xs">
                {PUBLIC_ROUTES.map((route, i) => (
                  <div key={i} className="p-3 hover:bg-muted/30 transition-colors flex items-center justify-between gap-3">
                    <Link href={route.path} className="font-semibold text-primary hover:underline flex items-center gap-1.5">
                      <LinkIcon className="h-3 w-3 shrink-0" /> {route.path}
                    </Link>
                    <span className="text-muted-foreground text-[11px] truncate">{route.desc}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Right Column: API Reference & CLI Shortcuts */}
        <div className="space-y-6">
          
          {/* Key REST Endpoints */}
          <Card className="bg-card/40 border-border/50 sg-glass">
            <CardHeader className="pb-3 bg-muted/30 border-b border-border/40">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Server className="h-4 w-4 text-purple-400" /> Key API Endpoints
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/30 text-xs">
                {API_ENDPOINTS.map((endpoint, i) => (
                  <div key={i} className="p-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        {endpoint.method}
                      </span>
                      <code className="text-xs font-mono font-bold text-foreground">{endpoint.path}</code>
                    </div>
                    <div className="text-[11px] text-muted-foreground pl-1">{endpoint.desc}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* CLI & Maintenance Actions */}
          <Card className="bg-card/40 border-border/50 sg-glass">
            <CardHeader className="pb-3 bg-muted/30 border-b border-border/40">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Terminal className="h-4 w-4 text-amber-400" /> CLI &amp; Fast Actions
              </CardTitle>
              <CardDescription>Execute rapid database and server-side utilities.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <DevActions />
            </CardContent>
          </Card>

        </div>

      </div>

    </div>
  );
}
