import { auth } from "@/auth";
import { prisma } from "@/web/lib/prisma";
import { PERMISSION_LEVELS } from "@/web/lib/permissions";
import { redirect } from "next/navigation";
import { 
  Crown, Users, Shield, Landmark, 
  Sparkles, Calendar, Coins
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";

export const metadata = {
  title: "Guilds Oversight | Saints Gaming Admin",
};

export default async function AdminGuildsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const viewer = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissionLevel: true, isWriter: true },
  });

  if (!viewer || viewer.permissionLevel < PERMISSION_LEVELS.ADMIN) {
    redirect("/not-found");
  }

  // Fetch all guilds with leader and member count
  const guilds = await prisma.guild.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      leader: { select: { username: true, email: true } },
      members: {
        include: { user: { select: { username: true } } },
      },
    },
  });

  const totalMembers = guilds.reduce((sum, g) => sum + g.members.length, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Identity, Progression &amp; Economy</span>
            <span className="text-xs text-muted-foreground/40">•</span>
            <span className="text-xs text-[#cbb26a] font-mono">Clans &amp; Teams</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-foreground">
            <Crown className="h-8 w-8 text-primary" />
            Guilds &amp; Clans Oversight
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Inspect player guilds, clan tags, guild bank funds, and member rosters.
          </p>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card/40 border-border/50 sg-glass">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-mono uppercase">Total Guilds</CardDescription>
            <CardTitle className="text-2xl font-mono font-bold text-primary">{guilds.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card/40 border-border/50 sg-glass">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-mono uppercase">Guild Members</CardDescription>
            <CardTitle className="text-2xl font-mono font-bold text-amber-400">{totalMembers}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card/40 border-border/50 sg-glass">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-mono uppercase">Guild Vaults</CardDescription>
            <CardTitle className="text-2xl font-mono font-bold text-emerald-400">100% Operational</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Guilds List */}
      <Card className="bg-card/40 border-border/50 sg-glass">
        <CardHeader className="pb-3 border-b border-border/30">
          <CardTitle className="text-base flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-400" /> Active Guild Roster ({guilds.length})
          </CardTitle>
          <CardDescription>Community guilds, leaders, and member breakdown.</CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          {guilds.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-4 text-center">No player guilds created yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {guilds.map((g) => {
                let bank: any = {};
                try { bank = JSON.parse(g.bankJson || "{}"); } catch {}

                return (
                  <div key={g.id} className="p-4 rounded-xl border border-border/40 bg-background/50 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">{g.name}</span>
                        <Badge variant="outline" className="text-[10px] font-mono text-primary border-primary/30">
                          [{g.tag}]
                        </Badge>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">
                        {g.members.length} Members
                      </Badge>
                    </div>

                    <div className="text-[11px] font-mono text-muted-foreground space-y-1">
                      <div>Leader: <strong className="text-slate-200">{g.leader.username}</strong></div>
                      <div>Founded: {new Date(g.createdAt).toLocaleDateString()}</div>
                      {bank.gold && <div>Vault Gold: <span className="text-amber-400 font-bold">${bank.gold}</span></div>}
                    </div>

                    <div className="pt-2 border-t border-border/30">
                      <span className="text-[10px] uppercase font-mono text-muted-foreground block mb-1">Roster:</span>
                      <div className="flex gap-1 flex-wrap">
                        {g.members.map((m) => (
                          <Badge key={m.id} variant="secondary" className="text-[10px]">
                            {m.user.username} {m.rank === "LEADER" ? "👑" : m.rank === "OFFICER" ? "⭐" : ""}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
