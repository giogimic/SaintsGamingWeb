import { prisma } from "@/lib/prisma";
import { Database, Trash2, CheckCircle2 } from "lucide-react";
import { clearExpiredSessions, clearAllNotifications, nukeAllThreads, seedDummyThreads } from "./actions";
import { Button } from "@/components/ui/button";
import { DummyContentButton } from "./dummy-content-button";

export const metadata = { title: "Dev - Database Health" };

export default async function DevDatabasePage() {
 const [
 userCount,
 threadCount,
 replyCount,
 ticketCount,
 newsCount,
 sessionCount,
 modpackCount
 ] = await Promise.all([
 prisma.user.count(),
 prisma.thread.count(),
 prisma.reply.count(),
 prisma.supportTicket.count(),
 prisma.newsArticle.count(),
 prisma.session.count(),
 prisma.modpack.count(),
 ]);

 const stats = [
 { label: "Users", count: userCount },
 { label: "Forum Threads", count: threadCount },
 { label: "Forum Replies", count: replyCount },
 { label: "Support Tickets", count: ticketCount },
 { label: "News Articles", count: newsCount },
 { label: "Active Sessions", count: sessionCount },
 { label: "Modpacks", count: modpackCount },
 ];

 return (
 <div className="space-y-8">
 <div>
 <h1 className="text-2xl font-bold flex items-center gap-2">
 <Database className="h-6 w-6" /> Database Health
 </h1>
 <p className="text-muted-foreground mt-1">Live table statistics and raw data management.</p>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
 {stats.map((stat, i) => (
 <div key={i} className="border border-border/40 p-4 rounded-lg bg-card hover:bg-muted transition-colors">
 <div className="text-sm text-muted-foreground mb-1">{stat.label}</div>
 <div className="text-3xl font-bold text-primary">{stat.count.toLocaleString()}</div>
 </div>
 ))}
 </div>

 <div className="space-y-4 pt-6 border-t border-border/40">
 <h2 className="text-xl font-bold">Maintenance Actions</h2>
 
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="border border-border/40 p-6 rounded-lg bg-card space-y-4">
 <h3 className="font-bold">Sessions</h3>
 <p className="text-sm text-muted-foreground">Clear all expired JWT and OAuth sessions from the database to save space.</p>
 <form action={async () => {
 "use server";
 await clearExpiredSessions();
 }}>
 <Button type="submit" variant="outline" className="w-full border-border/40 text-foreground hover:bg-green-900/50 hover:text-primary">
 <Trash2 className="mr-2 h-4 w-4" /> Purge Expired Sessions
 </Button>
 </form>
 </div>

 <div className="border border-border/40 p-6 rounded-lg bg-card space-y-4">
 <h3 className="font-bold">Notifications</h3>
 <p className="text-sm text-muted-foreground">Hard delete all notifications for all users. (Warning: Destructive)</p>
 <form action={async () => {
 "use server";
 await clearAllNotifications();
 }}>
 <Button type="submit" variant="outline" className="w-full border-border/40 text-foreground hover:bg-green-900/50 hover:text-primary">
 <Trash2 className="mr-2 h-4 w-4" /> Clear All Notifications
 </Button>
 </form>
 </div>
  </div>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
      <div className="border border-border/40 p-6 rounded-lg bg-card space-y-4">
        <h3 className="font-bold">Dummy Data Generation</h3>
        <p className="text-sm text-muted-foreground">Inject dummy test content into the database to help with UI debugging and pagination testing.</p>
        <DummyContentButton />
        <form action={async () => {
          "use server";
          await seedDummyThreads();
        }}>
          <Button type="submit" variant="outline" className="w-full border-border/40 text-foreground hover:bg-green-900/50 hover:text-primary mt-2">
            <Database className="mr-2 h-4 w-4" /> Inject Dummy Threads (x5)
          </Button>
        </form>
      </div>

    <div className="border border-border/40 p-6 rounded-lg bg-card space-y-4">
      <h3 className="font-bold">Purge Threads</h3>
      <p className="text-sm text-muted-foreground">Hard delete all forum threads (and cascading replies). Useful for cleaning up injected test data.</p>
      <form action={async () => {
        "use server";
        await nukeAllThreads();
      }}>
        <Button type="submit" variant="outline" className="w-full border-border/40 text-foreground hover:bg-green-900/50 hover:text-primary">
          <Trash2 className="mr-2 h-4 w-4" /> Nuke All Threads
        </Button>
      </form>
    </div>
  </div>
 </div>

 <div className="mt-8 p-4 border border-border/40 rounded bg-card flex items-start gap-3 text-sm">
 <CheckCircle2 className="h-5 w-5 text-foreground shrink-0 mt-0.5" />
 <div>
 <span className="font-bold">Database Connection: OK</span>
 <p className="text-muted-foreground mt-1">Prisma Client is successfully connected to the SQLite file database at <code className="bg-green-950/50 px-1 rounded">./prisma/dev.db</code>.</p>
 </div>
 </div>
 </div>
 );
}
