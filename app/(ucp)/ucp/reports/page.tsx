import { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSION_LEVELS } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import Link from "next/link";
import { ReportActions } from "./report-actions";

export const metadata: Metadata = {
  title: "Reports | UCP",
  description: "Moderation reports dashboard",
};

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissionLevel: true },
  });

  if (!user || user.permissionLevel < PERMISSION_LEVELS.MODERATOR) {
    redirect("/");
  }

  const reports = await prisma.report.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      reporter: {
        select: { username: true }
      },
      thread: {
        select: { id: true, title: true, slug: true }
      },
      reply: {
        select: { id: true, body: true, thread: { select: { slug: true } } }
      }
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Active Reports</h1>
        <p className="text-muted-foreground mt-2">
          Review and resolve user-submitted moderation reports.
        </p>
      </div>

      <div className="bg-card/40 sg-glass border border-border/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b border-border/50">
              <tr>
                <th className="px-6 py-4 font-medium">Reporter</th>
                <th className="px-6 py-4 font-medium">Reason</th>
                <th className="px-6 py-4 font-medium">Target</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    No reports found.
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4 font-medium">
                      <Link href={`/user/${report.reporter.username}`} className="hover:text-primary transition-colors">
                        {report.reporter.username}
                      </Link>
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate" title={report.reason}>
                      {report.reason}
                    </td>
                    <td className="px-6 py-4">
                      {report.thread ? (
                        <Link href={`/forum/t/${report.thread.slug}`} className="text-primary hover:underline">
                          Thread: {report.thread.title}
                        </Link>
                      ) : report.reply ? (
                        <Link href={`/forum/t/${report.reply.thread.slug}#reply-${report.reply.id}`} className="text-primary hover:underline">
                          Reply: {report.reply.body.substring(0, 30)}...
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">Unknown Target</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                      {format(new Date(report.createdAt), "MMM d, yyyy")}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                        report.status === "PENDING" ? "bg-amber-500/20 text-amber-500 border border-amber-500/30" : 
                        report.status === "RESOLVED" ? "bg-green-500/20 text-green-500 border border-green-500/30" : 
                        "bg-muted text-muted-foreground border border-border/50"
                      }`}>
                        {report.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <ReportActions reportId={report.id} currentStatus={report.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
