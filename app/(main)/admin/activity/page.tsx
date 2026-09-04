import { auth } from "@/auth";
import { prisma } from "@/web/lib/prisma";
import { PERMISSION_LEVELS } from "@/web/lib/permissions";
import { redirect } from "next/navigation";
import { 
  History, Users, Newspaper, LifeBuoy, Monitor, 
  MessageSquare, Radio, CheckCircle2, Filter
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/web/components/ui/card";
import { Badge } from "@/web/components/ui/badge";
import Link from "next/link";

export const metadata = {
  title: "Platform Activity Stream | Saints Gaming Admin",
};

export default async function AdminActivityPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const viewer = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissionLevel: true, isWriter: true },
  });

  if (!viewer || (viewer.permissionLevel < PERMISSION_LEVELS.MODERATOR && !viewer.isWriter)) {
    redirect("/not-found");
  }

  // Fetch recent events across multiple domains in parallel
  const [
    recentUsers,
    recentTickets,
    recentArticles,
    recentStreams,
    recentThreads,
    recentRealtime,
  ] = await Promise.all([
    prisma.user.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      select: { id: true, username: true, email: true, createdAt: true, isBanned: true, permissionLevel: true },
    }),
    prisma.supportTicket.findMany({
      take: 10,
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, status: true, category: true, updatedAt: true, author: { select: { username: true } } },
    }),
    prisma.newsArticle.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, isPublished: true, createdAt: true, slug: true, author: { select: { username: true } } },
    }),
    prisma.streamProfile.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      select: { id: true, platform: true, channelUrl: true, isApproved: true, createdAt: true, user: { select: { username: true } } },
    }),
    prisma.thread.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, slug: true, createdAt: true, author: { select: { username: true } } },
    }),
    prisma.realtimeEvent.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      select: { id: true, eventType: true, priority: true, createdAt: true, user: { select: { username: true } } },
    }),
  ]);

  // Combine and sort events into a chronological activity feed
  type UnifiedEvent = {
    id: string;
    type: "user" | "ticket" | "news" | "stream" | "thread" | "realtime";
    title: string;
    description: string;
    timestamp: Date;
    actor: string;
    badgeText: string;
    badgeVariant: "default" | "secondary" | "outline" | "destructive";
    badgeColor?: string;
    href?: string;
  };

  const events: UnifiedEvent[] = [];

  recentUsers.forEach((u) => {
    events.push({
      id: `user-${u.id}`,
      type: "user",
      title: u.isBanned ? `User Restricted: ${u.username}` : `New Member Signup: ${u.username}`,
      description: `Account created with permission level ${u.permissionLevel} (${u.email})`,
      timestamp: u.createdAt,
      actor: u.username,
      badgeText: u.isBanned ? "Banned" : "New User",
      badgeVariant: u.isBanned ? "destructive" : "secondary",
      badgeColor: u.isBanned ? "border-red-500/30 text-red-400 bg-red-500/10" : "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
      href: "/admin/users",
    });
  });

  recentTickets.forEach((t) => {
    events.push({
      id: `ticket-${t.id}`,
      type: "ticket",
      title: `Support Ticket: ${t.title}`,
      description: `Category: ${t.category} • Status: ${t.status}`,
      timestamp: t.updatedAt,
      actor: t.author.username,
      badgeText: `Ticket: ${t.status}`,
      badgeVariant: t.status === "OPEN" ? "default" : "outline",
      badgeColor: t.status === "OPEN" ? "border-amber-500/30 text-amber-400 bg-amber-500/10" : undefined,
      href: "/admin/tickets",
    });
  });

  recentArticles.forEach((a) => {
    events.push({
      id: `news-${a.id}`,
      type: "news",
      title: `Article ${a.isPublished ? "Published" : "Drafted"}: ${a.title}`,
      description: `Slug: /news/${a.slug}`,
      timestamp: a.createdAt,
      actor: a.author.username,
      badgeText: a.isPublished ? "Article Live" : "Draft",
      badgeVariant: a.isPublished ? "secondary" : "outline",
      badgeColor: a.isPublished ? "border-blue-500/30 text-blue-400 bg-blue-500/10" : undefined,
      href: `/admin/news`,
    });
  });

  recentStreams.forEach((s) => {
    events.push({
      id: `stream-${s.id}`,
      type: "stream",
      title: `Stream Submission: ${s.user.username} (${s.platform})`,
      description: s.channelUrl,
      timestamp: s.createdAt,
      actor: s.user.username,
      badgeText: s.isApproved ? "Approved" : "Pending Stream",
      badgeVariant: s.isApproved ? "secondary" : "outline",
      badgeColor: !s.isApproved ? "border-purple-500/30 text-purple-400 bg-purple-500/10" : undefined,
      href: "/admin/streams",
    });
  });

  recentThreads.forEach((th) => {
    events.push({
      id: `thread-${th.id}`,
      type: "thread",
      title: `New Discussion: ${th.title}`,
      description: `Posted to forum by ${th.author.username}`,
      timestamp: th.createdAt,
      actor: th.author.username,
      badgeText: "Forum Thread",
      badgeVariant: "outline",
      badgeColor: "border-cyan-500/30 text-cyan-400 bg-cyan-500/10",
      href: `/forum/${th.slug}`,
    });
  });

  recentRealtime.forEach((re) => {
    events.push({
      id: `rt-${re.id}`,
      type: "realtime",
      title: `Realtime Event: ${re.eventType}`,
      description: `Priority: ${re.priority} ${re.user?.username ? `• Target: ${re.user.username}` : ""}`,
      timestamp: re.createdAt,
      actor: re.user?.username || "System",
      badgeText: re.priority,
      badgeVariant: "outline",
      badgeColor: "border-yellow-500/30 text-yellow-400 bg-yellow-500/10",
      href: "/admin/realtime",
    });
  });

  events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Overview &amp; Telemetry</span>
            <span className="text-xs text-muted-foreground/40">•</span>
            <span className="text-xs text-[#cbb26a] font-mono">Live Timeline</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-foreground">
            <History className="h-8 w-8 text-primary" />
            Platform Activity Stream &amp; Audit Trail
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            A unified, real-time chronological log of member registrations, support tickets, news articles, streams, and system events.
          </p>
        </div>
      </div>

      {/* Info Card Banner */}
      <Card className="border-primary/20 bg-primary/5 sg-glass">
        <CardContent className="p-4 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="space-y-0.5 text-xs">
            <h3 className="font-bold text-sm text-foreground">About This Stream</h3>
            <p className="text-muted-foreground">
              This feed aggregates live database activity across all major platform features. Use this to audit recent staff actions, catch new user registrations, track unresolved support tickets, or review incoming stream submissions in one convenient timeline.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Activity Timeline List */}
      <Card className="bg-card/40 border-border/50 sg-glass">
        <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-border/30">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" />
              Recent Chronological Events ({events.length})
            </CardTitle>
            <CardDescription>Latest {events.length} platform occurrences ordered by timestamp.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/30">
            {events.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground italic">
                No recent activity recorded yet.
              </div>
            ) : (
              events.map((evt) => {
                let Icon = History;
                if (evt.type === "user") Icon = Users;
                else if (evt.type === "ticket") Icon = LifeBuoy;
                else if (evt.type === "news") Icon = Newspaper;
                else if (evt.type === "stream") Icon = Monitor;
                else if (evt.type === "thread") Icon = MessageSquare;
                else if (evt.type === "realtime") Icon = Radio;

                return (
                  <div key={evt.id} className="p-4 hover:bg-muted/30 transition-colors flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-muted/60 text-muted-foreground shrink-0 mt-0.5 border border-border/40">
                        <Icon className="h-4 w-4 text-[#cbb26a]" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {evt.href ? (
                            <Link href={evt.href} className="font-bold text-sm text-foreground hover:text-primary hover:underline truncate">
                              {evt.title}
                            </Link>
                          ) : (
                            <span className="font-bold text-sm text-foreground truncate">{evt.title}</span>
                          )}
                          <Badge variant={evt.badgeVariant} className={`text-[10px] font-mono ${evt.badgeColor || ""}`}>
                            {evt.badgeText}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{evt.description}</p>
                        <div className="text-[11px] font-mono text-muted-foreground/70 flex items-center gap-2">
                          <span>Actor: <strong className="text-slate-300">{evt.actor}</strong></span>
                          <span>•</span>
                          <span>{evt.timestamp.toLocaleDateString()} at {evt.timestamp.toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>

                    {evt.href && (
                      <Link 
                        href={evt.href}
                        className="text-xs font-mono text-[#cbb26a] hover:underline shrink-0 pt-1"
                      >
                        Inspect &rarr;
                      </Link>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
