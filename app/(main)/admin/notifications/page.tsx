import { auth } from "@/auth";
import { prisma } from "@/web/lib/prisma";
import { PERMISSION_LEVELS } from "@/web/lib/permissions";
import { redirect } from "next/navigation";
import { 
  Bell, Megaphone, Send, Trash2, 
  Users, Sparkles, CheckCircle2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { broadcastSystemNotification, deleteOldNotifications } from "./actions";

export const metadata = {
  title: "Notifications & Broadcasts | Saints Gaming Admin",
};

export default async function AdminNotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const viewer = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissionLevel: true, isWriter: true },
  });

  if (!viewer || viewer.permissionLevel < PERMISSION_LEVELS.ADMIN) {
    redirect("/not-found");
  }

  // Fetch recent broadcast notifications and counts
  const [totalNotifications, unreadCount, recentNotifications, totalUsers] = await Promise.all([
    prisma.notification.count(),
    prisma.notification.count({ where: { isRead: false } }),
    prisma.notification.findMany({
      take: 30,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { username: true } } },
    }),
    prisma.user.count(),
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Game Servers &amp; Infrastructure</span>
            <span className="text-xs text-muted-foreground/40">•</span>
            <span className="text-xs text-[#cbb26a] font-mono">Push Alerts</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-foreground">
            <Bell className="h-8 w-8 text-primary" />
            System Broadcasts &amp; Notifications
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Broadcast platform-wide notifications, event announcements, and maintenance alerts to all members or staff.
          </p>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card/40 border-border/50 sg-glass">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-mono uppercase">Total Notifications Sent</CardDescription>
            <CardTitle className="text-2xl font-mono font-bold text-primary">{totalNotifications}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card/40 border-border/50 sg-glass">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-mono uppercase">Unread Queue</CardDescription>
            <CardTitle className="text-2xl font-mono font-bold text-amber-400">{unreadCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card/40 border-border/50 sg-glass">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-mono uppercase">Registered Recipients</CardDescription>
            <CardTitle className="text-2xl font-mono font-bold text-emerald-400">{totalUsers} Users</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Broadcast Form and Recent List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Send Broadcast Card */}
        <div className="lg:col-span-1">
          <Card className="bg-card/40 border-border/50 sg-glass sticky top-6">
            <CardHeader className="pb-3 border-b border-border/30">
              <CardTitle className="text-base flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary" /> Send New Broadcast
              </CardTitle>
              <CardDescription>Dispatch an in-app alert to player notification inboxes.</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <form action={broadcastSystemNotification} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="title" className="text-xs font-bold uppercase font-mono">Notification Title</Label>
                  <Input id="title" name="title" required placeholder="e.g. Double XP Weekend Active!" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="message" className="text-xs font-bold uppercase font-mono">Message Body</Label>
                  <textarea 
                    id="message" 
                    name="message" 
                    required 
                    rows={3} 
                    className="w-full text-xs p-2.5 rounded-lg border border-border/50 bg-background/50 focus:outline-none focus:border-primary/50 text-foreground"
                    placeholder="e.g. Join the lobby now for 2x XP and increased rare beast encounter rates until Sunday midnight!" 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="link" className="text-xs font-bold uppercase font-mono">Target URL Link (Optional)</Label>
                  <Input id="link" name="link" placeholder="e.g. /news/double-xp-weekend or /lobby" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="targetGroup" className="text-xs font-bold uppercase font-mono">Recipient Group</Label>
                  <select 
                    id="targetGroup" 
                    name="targetGroup" 
                    className="w-full text-xs p-2.5 rounded-lg border border-border/50 bg-background/50 focus:outline-none focus:border-primary/50 text-foreground"
                  >
                    <option value="ALL">All Registered Members ({totalUsers})</option>
                    <option value="STAFF">Staff &amp; Moderation Only</option>
                    <option value="VIP">VIP &amp; Founder Patrons Only</option>
                  </select>
                </div>
                <Button type="submit" className="w-full gap-2 shadow-md">
                  <Send className="h-4 w-4" /> Dispatch Broadcast
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Recent Notifications Table */}
        <div className="lg:col-span-2">
          <Card className="bg-card/40 border-border/50 sg-glass">
            <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-border/30">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="h-5 w-5 text-amber-400" /> Recent In-App Alerts ({recentNotifications.length})
                </CardTitle>
                <CardDescription>Latest alerts delivered to user inboxes.</CardDescription>
              </div>
              <form action={async () => { "use server"; await deleteOldNotifications(30); }}>
                <Button variant="ghost" size="sm" type="submit" className="text-xs text-muted-foreground hover:text-red-400">
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Purge &gt;30d
                </Button>
              </form>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-muted/40 text-muted-foreground uppercase">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Recipient</th>
                      <th className="px-4 py-2.5 font-semibold">Title &amp; Message</th>
                      <th className="px-4 py-2.5 font-semibold">Status</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Sent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {recentNotifications.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-muted-foreground italic">
                          No notifications recorded yet.
                        </td>
                      </tr>
                    ) : (
                      recentNotifications.map((n) => (
                        <tr key={n.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-2.5 align-top font-semibold text-foreground">
                            {n.user.username}
                          </td>
                          <td className="px-4 py-2.5 align-top max-w-sm space-y-1">
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className="text-[9px] font-mono">
                                {n.type}
                              </Badge>
                            </div>
                            <p className="text-muted-foreground text-xs">{n.message}</p>
                            {n.link && (
                              <span className="text-[10px] font-mono text-cyan-400 underline block mt-0.5">{n.link}</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 align-top">
                            <Badge variant={n.isRead ? "secondary" : "default"} className={`text-[9px] ${!n.isRead ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : ""}`}>
                              {n.isRead ? "Read" : "Unread"}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 align-top text-right font-mono text-[11px] text-muted-foreground">
                            {new Date(n.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

    </div>
  );
}
