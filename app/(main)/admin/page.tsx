import { prisma } from "@/web/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import { 
  LayoutDashboard, Database, Radio, Sparkles, AlertCircle, 
  CheckCircle2, Clock, Users, ArrowUpRight, Plus, Newspaper, 
  Gamepad2, Server, LifeBuoy, Monitor, ShieldAlert, Cpu
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { auth } from "@/auth";
import { PERMISSION_LEVELS, hasPermission, getRoleName, getRoleColor } from "@/web/lib/permissions";
import { getVisibleAdminModules } from "@/web/lib/admin-modules";

export const metadata = {
  title: "Command Center | Saints Gaming Admin",
};

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const viewer = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, permissionLevel: true, isWriter: true, username: true, email: true },
  });
  if (!viewer) redirect("/not-found");
  const level = viewer.permissionLevel;
  const isWriter = viewer.isWriter;

  if (level < PERMISSION_LEVELS.MODERATOR && !isWriter) {
    redirect("/not-found");
  }

  // Fetch core operational metrics in parallel
  const [
    userCount,
    bannedUserCount,
    newsCount,
    draftNewsCount,
    pendingStreamCount,
    openTicketCount,
    categoryCount,
    threadCount,
    gameCharacterCount,
    gameQuestCount,
    gameAssetCount,
    worldMapCount,
    creatureCount,
    gameServerCount,
    recentUsers,
    recentNews,
    recentTickets,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isBanned: true } }),
    prisma.newsArticle.count(),
    prisma.newsArticle.count({ where: { isPublished: false } }),
    prisma.streamProfile.count({ where: { isApproved: false } }),
    prisma.supportTicket.count({ where: { status: "OPEN" } }),
    prisma.forumCategory.count(),
    prisma.thread.count(),
    prisma.gameCharacter.count(),
    prisma.gameQuest.count(),
    prisma.gameAsset.count(),
    prisma.worldMap.count(),
    prisma.creatureTemplate.count(),
    prisma.gameServer.count(),
    prisma.user.findMany({
      take: 4,
      orderBy: { createdAt: "desc" },
      select: { id: true, username: true, email: true, createdAt: true, permissionLevel: true, isWriter: true },
    }),
    prisma.newsArticle.findMany({
      take: 3,
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, isPublished: true, createdAt: true, author: { select: { username: true } } },
    }),
    prisma.supportTicket.findMany({
      take: 3,
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, status: true, category: true, updatedAt: true, author: { select: { username: true } } },
    }),
  ]);

  // Determine active database provider
  const dbProvider = process.env.DB_PROVIDER?.toLowerCase() === "mysql" || process.env.DATABASE_URL?.startsWith("mysql://")
    ? "MariaDB / MySQL"
    : "SQLite (Local)";

  // Action alerts requiring operator attention
  const actionAlerts = [
    {
      id: "pending-streams",
      title: "Stream Approvals Pending",
      count: pendingStreamCount,
      description: `${pendingStreamCount} community live stream submissions awaiting review.`,
      href: "/admin/streams",
      severity: "warning",
      visible: pendingStreamCount > 0 && hasPermission(level, PERMISSION_LEVELS.MODERATOR),
    },
    {
      id: "open-tickets",
      title: "Open Support Tickets",
      count: openTicketCount,
      description: `${openTicketCount} unresolved support inquiries or appeals in queue.`,
      href: "/admin/tickets",
      severity: "info",
      visible: openTicketCount > 0 && hasPermission(level, PERMISSION_LEVELS.MODERATOR),
    },
    {
      id: "draft-articles",
      title: "Unpublished Drafts",
      count: draftNewsCount,
      description: `${draftNewsCount} news announcements currently in draft stage.`,
      href: "/admin/news",
      severity: "info",
      visible: draftNewsCount > 0 && (hasPermission(level, PERMISSION_LEVELS.ADMIN) || isWriter),
    },
    {
      id: "banned-accounts",
      title: "Banned Member Accounts",
      count: bannedUserCount,
      description: `${bannedUserCount} restricted user accounts on file.`,
      href: "/admin/users",
      severity: "neutral",
      visible: bannedUserCount > 0 && hasPermission(level, PERMISSION_LEVELS.ADMIN),
    },
  ].filter((a) => a.visible);

  const visibleModules = getVisibleAdminModules(level, isWriter);

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in duration-300">
      
      {/* ─── 1. TOP HEADER & OPERATIONAL IDENTITY ─────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Admin OS Command Center</span>
            <span className="text-xs text-muted-foreground/40">•</span>
            <Badge variant="outline" className={`${getRoleColor(level)} bg-background text-[11px] font-mono`}>
              {isWriter && level < 200 ? "Official Writer" : getRoleName(level)}
            </Badge>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-foreground">
            <LayoutDashboard className="h-8 w-8 text-primary" />
            Platform Command Center
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Welcome back! Here&apos;s what&apos;s happening across Saints Gaming right now — live server health, community alerts, and quick shortcuts.
          </p>
        </div>

        {/* Global Quick Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" asChild className="gap-2 border-primary/30 text-primary hover:bg-primary/10">
            <Link href="/admin/activity">
              <Clock className="h-4 w-4" /> Activity Log
            </Link>
          </Button>
          {(hasPermission(level, PERMISSION_LEVELS.ADMIN) || isWriter) && (
            <Button size="sm" asChild className="gap-2">
              <Link href="/admin/news/new">
                <Plus className="h-4 w-4" /> New Article
              </Link>
            </Button>
          )}
          {hasPermission(level, PERMISSION_LEVELS.ADMIN) && (
            <Button size="sm" variant="secondary" asChild className="gap-2 border border-border/50">
              <Link href="/studio">
                <Sparkles className="h-4 w-4 text-amber-400" /> Launch Studio
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* ─── 2. SYSTEM HEALTH STRIP ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border/50 bg-card/40 sg-glass space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-muted-foreground flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-primary" /> Database
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-sm font-bold text-foreground truncate">{dbProvider}</div>
          <div className="text-[11px] text-muted-foreground">{threadCount} threads • {userCount} users</div>
        </div>

        <div className="p-4 rounded-xl border border-border/50 bg-card/40 sg-glass space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-muted-foreground flex items-center gap-1.5">
              <Radio className="h-3.5 w-3.5 text-emerald-400" /> Socket.IO
            </span>
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="text-sm font-bold text-foreground">Realtime Bus Active</div>
          <div className="text-[11px] text-muted-foreground">Cluster heartbeat nominal</div>
        </div>

        <div className="p-4 rounded-xl border border-border/50 bg-card/40 sg-glass space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-muted-foreground flex items-center gap-1.5">
              <Gamepad2 className="h-3.5 w-3.5 text-purple-400" /> MMO Engine
            </span>
            <CheckCircle2 className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-sm font-bold text-foreground">{worldMapCount} Custom Maps</div>
          <div className="text-[11px] text-muted-foreground">{gameCharacterCount} Saints heroes registered</div>
        </div>

        <div className="p-4 rounded-xl border border-border/50 bg-card/40 sg-glass space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-muted-foreground flex items-center gap-1.5">
              <Server className="h-3.5 w-3.5 text-amber-400" /> Dedicated Servers
            </span>
            <span className="text-xs font-mono text-amber-400">{gameServerCount} Live</span>
          </div>
          <div className="text-sm font-bold text-foreground">Multi-Game Fleet</div>
          <div className="text-[11px] text-muted-foreground">Palworld &amp; FiveM txAdmin</div>
        </div>
      </div>

      {/* ─── 3. ACTION ALERTS SECTION ─────────────────────────────────────────── */}
      {actionAlerts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-400" /> Action Required
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {actionAlerts.map((alert) => (
              <Link key={alert.id} href={alert.href} className="group block">
                <Card className="h-full bg-card/40 hover:bg-card/70 border-border/50 hover:border-primary/40 transition-all sg-glass">
                  <CardContent className="p-4 flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                          {alert.title}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{alert.description}</p>
                    </div>
                    <Badge variant="secondary" className="font-mono text-xs shrink-0 bg-primary/10 text-primary border-primary/20">
                      {alert.count}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ─── 4. LIVE OPERATIONS & GAME TELEMETRY ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: World & MMO Live Operations */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-card/40 border-border/50 sg-glass">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Gamepad2 className="h-5 w-5 text-emerald-400" /> Live MMO &amp; World Operations
                </CardTitle>
                <CardDescription>Real-time game database assets and world configuration state.</CardDescription>
              </div>
              {hasPermission(level, PERMISSION_LEVELS.DEVELOPER) && (
                <Button variant="ghost" size="sm" asChild className="text-xs gap-1">
                  <Link href="/admin/game">
                    Manage <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3 rounded-lg bg-background/50 border border-border/40 text-center">
                  <div className="text-2xl font-bold text-emerald-400 font-mono">{gameCharacterCount}</div>
                  <div className="text-xs text-muted-foreground mt-1">Saints Characters</div>
                </div>
                <div className="p-3 rounded-lg bg-background/50 border border-border/40 text-center">
                  <div className="text-2xl font-bold text-cyan-400 font-mono">{creatureCount}</div>
                  <div className="text-xs text-muted-foreground mt-1">Beast Species</div>
                </div>
                <div className="p-3 rounded-lg bg-background/50 border border-border/40 text-center">
                  <div className="text-2xl font-bold text-purple-400 font-mono">{gameQuestCount}</div>
                  <div className="text-xs text-muted-foreground mt-1">Active Quests</div>
                </div>
                <div className="p-3 rounded-lg bg-background/50 border border-border/40 text-center">
                  <div className="text-2xl font-bold text-amber-400 font-mono">{gameAssetCount}</div>
                  <div className="text-xs text-muted-foreground mt-1">Pixel Sprites</div>
                </div>
              </div>

              {/* World Studio Launcher Banner */}
              {hasPermission(level, PERMISSION_LEVELS.ADMIN) && (
                <div className="mt-4 p-4 rounded-xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-primary" /> Integrated 2.5D World Studio
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Paint terrain tiles, place NPCs, attach logic triggers, and link map atlas portals.
                    </p>
                  </div>
                  <Button size="sm" asChild className="shrink-0 gap-1.5 shadow-md">
                    <Link href="/studio">Launch Studio</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Access Matrix */}
          <Card className="bg-card/40 border-border/50 sg-glass">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Operational Modules Quick Access</CardTitle>
              <CardDescription>Direct navigation to authorized modules.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {visibleModules.slice(0, 9).map((mod) => {
                  const Icon = mod.icon;
                  return (
                    <Link
                      key={mod.id}
                      href={mod.href}
                      className="p-3 rounded-lg border border-border/40 bg-background/40 hover:bg-muted/50 hover:border-primary/30 transition-all flex items-center gap-3 group"
                    >
                      <div className="p-2 rounded-md bg-muted/60 text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold truncate group-hover:text-primary transition-colors">
                          {mod.label}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">{mod.description}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Timeline & Community Activity */}
        <div className="space-y-6">
          
          {/* Recent News Articles */}
          <Card className="bg-card/40 border-border/50 sg-glass">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Newspaper className="h-4 w-4 text-primary" /> Recent Announcements
              </CardTitle>
              {(hasPermission(level, PERMISSION_LEVELS.ADMIN) || isWriter) && (
                <Link href="/admin/news" className="text-xs text-primary hover:underline">
                  View all ({newsCount})
                </Link>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {recentNews.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">No news articles published yet.</p>
              ) : (
                recentNews.map((article) => (
                  <div key={article.id} className="text-xs space-y-1 pb-2 border-b border-border/30 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold truncate">{article.title}</span>
                      <Badge variant={article.isPublished ? "outline" : "secondary"} className="text-[9px] px-1 py-0 shrink-0">
                        {article.isPublished ? "Live" : "Draft"}
                      </Badge>
                    </div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <span>By {article.author?.username || "Staff"}</span>
                      <span>•</span>
                      <span>{new Date(article.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Recent Support Tickets */}
          {hasPermission(level, PERMISSION_LEVELS.MODERATOR) && (
            <Card className="bg-card/40 border-border/50 sg-glass">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <LifeBuoy className="h-4 w-4 text-primary" /> Support Activity
                </CardTitle>
                <Link href="/admin/tickets" className="text-xs text-primary hover:underline">
                  Queue ({openTicketCount})
                </Link>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentTickets.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2">No support tickets recorded.</p>
                ) : (
                  recentTickets.map((ticket) => (
                    <div key={ticket.id} className="text-xs space-y-1 pb-2 border-b border-border/30 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold truncate">{ticket.title}</span>
                        <Badge 
                          variant="outline" 
                          className={`text-[9px] px-1 py-0 shrink-0 ${ticket.status === 'OPEN' ? 'border-green-500/30 text-green-400 bg-green-500/10' : ''}`}
                        >
                          {ticket.status}
                        </Badge>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        User: {ticket.author.username} • {new Date(ticket.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {/* Newest Community Registrations */}
          {hasPermission(level, PERMISSION_LEVELS.ADMIN) && (
            <Card className="bg-card/40 border-border/50 sg-glass">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" /> Newest Members
                </CardTitle>
                <Link href="/admin/users" className="text-xs text-primary hover:underline">
                  Directory ({userCount})
                </Link>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {recentUsers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between text-xs pb-2 border-b border-border/30 last:border-0 last:pb-0">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{u.username || u.email}</div>
                      <div className="text-[10px] text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</div>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${getRoleColor(u.permissionLevel)} font-mono`}>
                      {u.isWriter ? "Writer" : getRoleName(u.permissionLevel)}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

        </div>
      </div>

    </div>
  );
}
