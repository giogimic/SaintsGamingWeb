import { auth } from "@/auth";
import { prisma } from "@/web/lib/prisma";
import { PERMISSION_LEVELS } from "@/web/lib/permissions";
import { redirect } from "next/navigation";
import { 
  Trophy, Medal, Sparkles, TrendingUp, 
  Award, ArrowUpRight, Crown, Flame
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import Link from "next/link";

export const metadata = {
  title: "Leaderboard Management | Saints Gaming Admin",
};

export default async function AdminLeaderboardsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const viewer = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissionLevel: true, isWriter: true },
  });

  if (!viewer || viewer.permissionLevel < PERMISSION_LEVELS.ADMIN) {
    redirect("/not-found");
  }

  // Fetch top XP rankings, top coin holders, and active tiers
  const [topXpUsers, topCoinsUsers, tierCount, totalUsers] = await Promise.all([
    prisma.user.findMany({
      take: 25,
      orderBy: [{ level: "desc" }, { xp: "desc" }],
      select: {
        id: true,
        username: true,
        level: true,
        xp: true,
        isVIP: true,
        isFounder: true,
        createdAt: true,
        role: { select: { name: true, color: true } },
      },
    }),
    prisma.user.findMany({
      take: 10,
      orderBy: { coins: "desc" },
      select: { id: true, username: true, coins: true },
    }),
    prisma.levelTier.count(),
    prisma.user.count(),
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Identity, Progression &amp; Economy</span>
            <span className="text-xs text-muted-foreground/40">•</span>
            <span className="text-xs text-[#cbb26a] font-mono">Rankings &amp; Standings</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-foreground">
            <Trophy className="h-8 w-8 text-primary" />
            Community Leaderboard &amp; Standings
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Inspect top contributing community members, forum experience points (XP), player level distributions, and wealth rankings.
          </p>
        </div>
        <Button asChild className="gap-2 shadow-md">
          <Link href="/forum/leaderboard" target="_blank">
            <ArrowUpRight className="h-4 w-4" /> Open Public Leaderboard
          </Link>
        </Button>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card/40 border-border/50 sg-glass">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-mono uppercase">Top Level Champion</CardDescription>
            <CardTitle className="text-2xl font-mono font-bold text-amber-400">
              {topXpUsers[0]?.username || "None"} (Lvl {topXpUsers[0]?.level || 1})
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card/40 border-border/50 sg-glass">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-mono uppercase">Progression Tiers</CardDescription>
            <CardTitle className="text-2xl font-mono font-bold text-cyan-400">{tierCount} Configured</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card/40 border-border/50 sg-glass">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-mono uppercase">Ranked Member Pool</CardDescription>
            <CardTitle className="text-2xl font-mono font-bold text-emerald-400">{totalUsers} Users</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Leaderboard Table */}
      <Card className="bg-card/40 border-border/50 sg-glass">
        <CardHeader className="pb-3 border-b border-border/30">
          <CardTitle className="text-base flex items-center gap-2">
            <Medal className="h-5 w-5 text-amber-400" /> Top Community Members by Level &amp; XP ({topXpUsers.length})
          </CardTitle>
          <CardDescription>Official leaderboard rankings rendered across the forum.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-muted/40 text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-3 font-semibold text-center w-16">Rank</th>
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold text-center">Level</th>
                <th className="px-4 py-3 font-semibold text-right">Total XP</th>
                <th className="px-4 py-3 font-semibold text-right">Member Since</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {topXpUsers.map((user, idx) => (
                <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-center font-bold font-mono">
                    {idx === 0 ? "🥇 #1" : idx === 1 ? "🥈 #2" : idx === 2 ? "🥉 #3" : `#${idx + 1}`}
                  </td>
                  <td className="px-4 py-3 font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{user.username}</span>
                      {user.role && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded bg-background/50 border border-border/50 ${user.role.color}`}>
                          {user.role.name}
                        </span>
                      )}
                      {user.isFounder && (
                        <Badge variant="outline" className="text-[9px] text-amber-400 border-amber-500/30">
                          Founder
                        </Badge>
                      )}
                      {user.isVIP && (
                        <Badge variant="outline" className="text-[9px] text-purple-400 border-purple-500/30">
                          VIP
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center font-mono font-bold text-primary">
                    Lvl {user.level}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-amber-400">
                    {user.xp.toLocaleString()} XP
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

    </div>
  );
}
