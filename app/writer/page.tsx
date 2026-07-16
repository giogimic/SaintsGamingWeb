import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Newspaper, Send, Clock } from "lucide-react";

export const metadata = { title: "Writer - Dashboard" };

export default async function WriterDashboard() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const publishedCount = await prisma.newsArticle.count({
    where: { 
      authorId: session.user.id,
      isPublished: true,
      publishedAt: { lte: new Date() }
    }
  });

  const scheduledCount = await prisma.newsArticle.count({
    where: { 
      authorId: session.user.id,
      isPublished: true,
      publishedAt: { gt: new Date() }
    }
  });

  const draftCount = await prisma.newsArticle.count({
    where: { 
      authorId: session.user.id,
      isPublished: false
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Writer Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back. Here is an overview of your articles.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card/40 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Published Articles</CardTitle>
            <Newspaper className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{publishedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Live on the site</p>
          </CardContent>
        </Card>

        <Card className="bg-card/40 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Scheduled Articles</CardTitle>
            <Clock className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scheduledCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting release time</p>
          </CardContent>
        </Card>

        <Card className="bg-card/40 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
            <Send className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{draftCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Private and unpublished</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
