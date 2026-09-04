import { auth } from "@/auth";
import { prisma } from "@/web/lib/prisma";
import { PERMISSION_LEVELS } from "@/web/lib/permissions";
import { redirect } from "next/navigation";
import { 
  Flame, Compass, Sparkles, Clock, 
  TrendingUp, Shield, Users, Trophy
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/web/components/ui/card";
import { Badge } from "@/web/components/ui/badge";

export const metadata = {
  title: "Dungeons & World Events | Saints Gaming Admin",
};

export default async function AdminDungeonsEventsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const viewer = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissionLevel: true, isWriter: true },
  });

  if (!viewer || (viewer.permissionLevel < PERMISSION_LEVELS.DEVELOPER && !viewer.isWriter)) {
    redirect("/not-found");
  }

  // Fetch world events, simulation presets, and dungeons
  const [worldEvents, simulationPresets, dungeons, mounts] = await Promise.all([
    prisma.worldEventTemplate.findMany({
      take: 20,
      orderBy: { slug: "asc" },
    }),
    prisma.simulationPreset.findMany({
      take: 20,
      orderBy: { slug: "asc" },
    }),
    prisma.dungeonTemplate.findMany({
      take: 20,
      include: { mapReferences: true },
      orderBy: { slug: "asc" },
    }),
    prisma.mountTemplate.findMany({
      take: 20,
      orderBy: { slug: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">World &amp; MMO</span>
            <span className="text-xs text-muted-foreground/40">•</span>
            <span className="text-xs text-[#cbb26a] font-mono">Live Multipliers &amp; Raids</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-foreground">
            <Flame className="h-8 w-8 text-primary" />
            Dungeons &amp; World Events
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configure live server multipliers (Double XP, Drop Rate boosts), scheduled recurring world events, party dungeons, and mounts.
          </p>
        </div>
      </div>

      {/* Overview Stat Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-card/40 border-border/50 sg-glass">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-mono uppercase">World Events</CardDescription>
            <CardTitle className="text-2xl font-mono font-bold text-amber-400">{worldEvents.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card/40 border-border/50 sg-glass">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-mono uppercase">Simulation Presets</CardDescription>
            <CardTitle className="text-2xl font-mono font-bold text-emerald-400">{simulationPresets.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card/40 border-border/50 sg-glass">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-mono uppercase">Party Dungeons</CardDescription>
            <CardTitle className="text-2xl font-mono font-bold text-purple-400">{dungeons.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card/40 border-border/50 sg-glass">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-mono uppercase">Mount Templates</CardDescription>
            <CardTitle className="text-2xl font-mono font-bold text-cyan-400">{mounts.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Section 1: World Multipliers & Simulation Presets */}
      <Card className="bg-card/40 border-border/50 sg-glass">
        <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-border/30">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-400" /> Live Simulation Presets &amp; Multipliers
            </CardTitle>
            <CardDescription>Global server boost settings (Double XP weekends, rare loot boosts, gold multipliers).</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {simulationPresets.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-4 text-center">No simulation presets registered yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {simulationPresets.map((preset) => (
                <div key={preset.slug} className="p-3 rounded-lg border border-border/40 bg-background/50 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-foreground">{preset.name}</span>
                    <Badge variant={preset.isActive ? "default" : "outline"} className={`text-[10px] font-mono ${preset.isActive ? "bg-emerald-600 text-white" : ""}`}>
                      {preset.isActive ? "Active Boost" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-center font-mono text-xs bg-muted/30 p-2 rounded border border-border/30">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">XP</span>
                      <strong className="text-amber-400">{preset.xpMultiplier}x</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Drops</span>
                      <strong className="text-cyan-400">{preset.dropMultiplier}x</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Gold</span>
                      <strong className="text-emerald-400">{preset.goldMultiplier}x</strong>
                    </div>
                  </div>
                  {preset.description && (
                    <p className="text-[11px] text-muted-foreground">{preset.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Dungeons & Mounts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Dungeons */}
        <Card className="bg-card/40 border-border/50 sg-glass">
          <CardHeader className="pb-3 border-b border-border/30">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-5 w-5 text-purple-400" /> Party Dungeons ({dungeons.length})
            </CardTitle>
            <CardDescription>Instanced multi-map dungeon chambers, level gates, and clear conditions.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {dungeons.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-4 text-center">No party dungeons defined.</p>
            ) : (
              dungeons.map((d) => (
                <div key={d.slug} className="p-3 rounded-lg border border-border/40 bg-background/50 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-foreground">{d.name}</span>
                    <Badge variant="outline" className="text-[10px] font-mono text-purple-400 border-purple-500/30">
                      Req Lvl {d.entryLevelReq}+
                    </Badge>
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-3">
                    <span>Party: Max {d.maxPartySize} Players</span>
                    <span>•</span>
                    <span>Maps: {d.mapReferences.length} Chambers</span>
                  </div>
                  {d.description && (
                    <p className="text-[11px] text-muted-foreground">{d.description}</p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Mounts */}
        <Card className="bg-card/40 border-border/50 sg-glass">
          <CardHeader className="pb-3 border-b border-border/30">
            <CardTitle className="text-base flex items-center gap-2">
              <Compass className="h-5 w-5 text-cyan-400" /> Mount Templates ({mounts.length})
            </CardTitle>
            <CardDescription>Ridable creatures and vehicles with overland speed multipliers.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {mounts.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-4 text-center">No mount templates registered.</p>
            ) : (
              mounts.map((m) => (
                <div key={m.slug} className="p-3 rounded-lg border border-border/40 bg-background/50 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-foreground">{m.name}</span>
                    <Badge variant="secondary" className="text-[10px] font-mono">
                      {m.speedMultiplier}x Speed
                    </Badge>
                  </div>
                  <div className="flex gap-1.5 flex-wrap pt-1">
                    {m.canFly && (
                      <Badge variant="outline" className="text-[9px] text-cyan-400 border-cyan-500/30">
                        Flying Mount
                      </Badge>
                    )}
                    {m.canSwim && (
                      <Badge variant="outline" className="text-[9px] text-blue-400 border-blue-500/30">
                        Swimming / Water
                      </Badge>
                    )}
                  </div>
                  {m.description && (
                    <p className="text-[11px] text-muted-foreground">{m.description}</p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

      </div>

    </div>
  );
}
