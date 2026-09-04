import { auth } from "@/auth";
import { prisma } from "@/web/lib/prisma";
import { PERMISSION_LEVELS } from "@/web/lib/permissions";
import { redirect } from "next/navigation";
import { 
  Flag, CheckCircle2, XCircle, AlertTriangle, 
  MessageSquare, User
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/web/components/ui/card";
import { Badge } from "@/web/components/ui/badge";
import { Button } from "@/web/components/ui/button";
import Link from "next/link";
import { updateReportStatus } from "./actions";

export const metadata = {
  title: "Moderation Queue & Reports | Saints Gaming Admin",
};

export default async function AdminReportsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const viewer = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissionLevel: true, isWriter: true },
  });

  if (!viewer || (viewer.permissionLevel < PERMISSION_LEVELS.MODERATOR && !viewer.isWriter)) {
    redirect("/not-found");
  }

  // Fetch reports with reporters and reported entities
  const reports = await prisma.report.findMany({
    take: 50,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      reporter: { select: { username: true, email: true } },
      thread: { select: { id: true, title: true, slug: true } },
      reply: { select: { id: true, body: true, thread: { select: { slug: true } } } },
    },
  });

  const pendingCount = await prisma.report.count({ where: { status: "PENDING" } });
  const resolvedCount = await prisma.report.count({ where: { status: "RESOLVED" } });
  const dismissedCount = await prisma.report.count({ where: { status: "DISMISSED" } });

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Community &amp; Content</span>
            <span className="text-xs text-muted-foreground/40">•</span>
            <span className="text-xs text-[#cbb26a] font-mono">Triage Queue</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-foreground">
            <Flag className="h-8 w-8 text-primary" />
            Moderation Queue &amp; Reports
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Review user-submitted violation flags on forum threads, replies, and community posts.
          </p>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card/40 border-border/50 sg-glass">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-mono uppercase">Pending Triage</CardDescription>
            <CardTitle className="text-2xl font-mono font-bold text-amber-400">{pendingCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card/40 border-border/50 sg-glass">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-mono uppercase">Resolved Actions</CardDescription>
            <CardTitle className="text-2xl font-mono font-bold text-emerald-400">{resolvedCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card/40 border-border/50 sg-glass">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-mono uppercase">Dismissed Reports</CardDescription>
            <CardTitle className="text-2xl font-mono font-bold text-muted-foreground">{dismissedCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Reports Table */}
      <Card className="bg-card/40 border-border/50 sg-glass">
        <CardHeader className="pb-3 border-b border-border/30">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-400" /> Flagged Content Queue ({reports.length})
          </CardTitle>
          <CardDescription>Review report reason and take moderation actions.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-muted/40 text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3 font-semibold">Reported Target</th>
                  <th className="px-4 py-3 font-semibold">Reason</th>
                  <th className="px-4 py-3 font-semibold">Reporter</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {reports.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground italic">
                      No reports in the moderation queue. Everything looks clean!
                    </td>
                  </tr>
                ) : (
                  reports.map((rep) => (
                    <tr key={rep.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 align-top font-semibold text-foreground max-w-xs">
                        {rep.thread ? (
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase font-mono block">Forum Thread:</span>
                            <Link href={`/forum/${rep.thread.slug}`} target="_blank" className="font-bold text-primary hover:underline line-clamp-1">
                              {rep.thread.title}
                            </Link>
                          </div>
                        ) : rep.reply ? (
                          <div>
                            <span className="text-[10px] text-muted-foreground uppercase font-mono block">Thread Reply:</span>
                            <p className="text-xs text-foreground line-clamp-2 italic">&ldquo;{rep.reply.body}&rdquo;</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">General Content Flag</span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top max-w-xs">
                        <p className="text-xs text-slate-200">{rep.reason}</p>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {new Date(rep.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top font-mono text-xs text-muted-foreground">
                        {rep.reporter.username}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <Badge 
                          variant={rep.status === "PENDING" ? "default" : (rep.status === "RESOLVED" ? "secondary" : "outline")}
                          className={rep.status === "PENDING" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : (rep.status === "RESOLVED" ? "text-emerald-400" : "")}
                        >
                          {rep.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 align-top text-right space-x-1">
                        {rep.status === "PENDING" ? (
                          <>
                            <form action={async () => { "use server"; await updateReportStatus(rep.id, "RESOLVED"); }} className="inline">
                              <Button size="sm" variant="outline" type="submit" className="h-7 text-xs px-2 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10">
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Resolve
                              </Button>
                            </form>
                            <form action={async () => { "use server"; await updateReportStatus(rep.id, "DISMISSED"); }} className="inline">
                              <Button size="sm" variant="ghost" type="submit" className="h-7 text-xs px-2 text-muted-foreground hover:text-slate-300">
                                <XCircle className="h-3.5 w-3.5 mr-1" /> Dismiss
                              </Button>
                            </form>
                          </>
                        ) : (
                          <span className="text-[11px] font-mono text-muted-foreground">Actioned</span>
                        )}
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
  );
}
