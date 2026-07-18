import { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSION_LEVELS } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { MessageSquare, Users, Flag, TrendingUp, Hash } from "lucide-react";

export const metadata: Metadata = {
  title: "Forum Analytics | UCP",
  description: "High-level forum analytics dashboard",
};

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissionLevel: true },
  });

  if (!user || user.permissionLevel < PERMISSION_LEVELS.MODERATOR) {
    redirect("/");
  }

  // Gather stats
  const totalThreads = await prisma.thread.count();
  const totalReplies = await prisma.reply.count();
  const totalUsers = await prisma.user.count();
  const activeReports = await prisma.report.count({
    where: { status: "PENDING" }
  });

  // Most used hashtags
  const topTags = await prisma.hashtag.findMany({
    take: 10,
    orderBy: {
      threads: {
        _count: "desc"
      }
    },
    include: {
      _count: {
        select: { threads: true }
      }
    }
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Forum Analytics</h1>
        <p className="text-muted-foreground mt-2">
          A bird&apos;s-eye view of community engagement and content.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Stat Cards */}
        <div className="bg-card/40 sg-glass border border-border/50 rounded-xl p-6 flex flex-col items-center justify-center text-center">
          <MessageSquare className="h-8 w-8 text-primary mb-2" />
          <p className="text-sm text-muted-foreground font-semibold">Total Threads</p>
          <p className="text-3xl font-black">{totalThreads}</p>
        </div>

        <div className="bg-card/40 sg-glass border border-border/50 rounded-xl p-6 flex flex-col items-center justify-center text-center">
          <TrendingUp className="h-8 w-8 text-green-500 mb-2" />
          <p className="text-sm text-muted-foreground font-semibold">Total Replies</p>
          <p className="text-3xl font-black">{totalReplies}</p>
        </div>

        <div className="bg-card/40 sg-glass border border-border/50 rounded-xl p-6 flex flex-col items-center justify-center text-center">
          <Users className="h-8 w-8 text-blue-500 mb-2" />
          <p className="text-sm text-muted-foreground font-semibold">Total Users</p>
          <p className="text-3xl font-black">{totalUsers}</p>
        </div>

        <div className="bg-card/40 sg-glass border border-border/50 rounded-xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Flag className="h-24 w-24" />
          </div>
          <Flag className={`h-8 w-8 mb-2 ${activeReports > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
          <p className="text-sm text-muted-foreground font-semibold">Active Reports</p>
          <p className={`text-3xl font-black ${activeReports > 0 ? "text-amber-500" : "text-foreground"}`}>{activeReports}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Popular Tags */}
        <div className="bg-card/40 sg-glass border border-border/50 rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Hash className="h-5 w-5 text-primary" /> Popular Tags
          </h3>
          <div className="space-y-3">
            {topTags.map((tag) => (
              <div key={tag.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/30">
                <span className="font-semibold text-primary">#{tag.name}</span>
                <span className="text-sm text-muted-foreground">{tag._count.threads} threads</span>
              </div>
            ))}
            {topTags.length === 0 && (
              <p className="text-sm text-muted-foreground">No tags used yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
