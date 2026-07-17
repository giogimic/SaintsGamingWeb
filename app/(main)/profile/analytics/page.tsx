import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BarChart, Heart, MessageSquare, Share, Eye, Bookmark, TrendingUp, Award, DollarSign, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { appealSocialPost } from "@/app/actions/social";

export default async function AnalyticsHub() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const [postsCount, totalViewsData, totalLikesData, totalSharesData, totalRepliesData, totalBookmarksData] = await Promise.all([
    prisma.socialPost.count({ where: { authorId: userId, parentId: null } }),
    prisma.socialPost.aggregate({
      where: { authorId: userId },
      _sum: { viewCount: true, shareCount: true }
    }),
    prisma.socialReaction.count({
      where: { post: { authorId: userId } }
    }),
    prisma.socialPost.aggregate({
      where: { authorId: userId },
      _sum: { shareCount: true, revenueEarned: true }
    }),
    prisma.socialPost.count({
      where: { parent: { authorId: userId } }
    }),
    prisma.socialBookmark.count({
      where: { post: { authorId: userId } }
    })
  ]);

  const totalViews = totalViewsData._sum.viewCount || 0;
  const totalShares = totalSharesData._sum.shareCount || 0;
  const totalRevenue = totalSharesData._sum.revenueEarned || 0;
  const totalLikes = totalLikesData;
  const totalReplies = totalRepliesData;
  const totalBookmarks = totalBookmarksData;

  // Fetch top-performing posts
  const topPosts = await prisma.socialPost.findMany({
    where: { authorId: userId, parentId: null },
    orderBy: { viewCount: "desc" },
    take: 15,
    include: {
      reactions: true,
      _count: { select: { replies: true, bookmarks: true } },
    }
  });

  const postsWithAnalytics = topPosts.map(post => {
    const totalEngagement = post.reactions.length + post._count.replies + post.shareCount;
    const engagementRate = post.viewCount > 0
      ? ((totalEngagement / post.viewCount) * 100)
      : 0;

    return {
      id: post.id,
      body: post.body,
      mediaUrl: post.mediaUrl,
      createdAt: post.createdAt,
      viewCount: post.viewCount,
      shareCount: post.shareCount,
      revenueEarned: post.revenueEarned,
      throttleStatus: post.throttleStatus,
      flagReason: post.flagReason,
      originalityScore: post.originalityScore,
      likesCount: post.reactions.length,
      repliesCount: post._count.replies,
      bookmarksCount: post._count.bookmarks,
      engagementRate: Math.round(engagementRate * 100) / 100,
    };
  });

  // Overall engagement rate
  const overallEngagement = totalViews > 0
    ? (((totalLikes + totalReplies + totalShares) / totalViews) * 100)
    : 0;

  return (
    <div className="w-full px-4 md:px-8 py-8 xl:px-12 animate-in fade-in">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/profile"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Profile</Link>
        </Button>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BarChart className="w-8 h-8 text-primary" />
          Engagement Hub
        </h1>
        <p className="text-muted-foreground mt-1">Review your overall reach and content interactions.</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" /> Views
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalViews.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-red-500" /> Likes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLikes.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-blue-500" /> Replies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReplies.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Share className="w-3.5 h-3.5 text-green-500" /> Shares
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalShares.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5 text-yellow-500" /> Saved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBookmarks.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-green-500" /> Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-primary" /> Eng. Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(overallEngagement * 100) / 100}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Top Posts Table */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            Top-Performing Posts
          </CardTitle>
          <CardDescription>
            Your {postsCount} posts ranked by total views. Engagement rate = (likes + replies + shares) ÷ views.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {postsWithAnalytics.length === 0 ? (
            <div className="text-center py-12 bg-muted/10 rounded-xl border border-border/50 border-dashed">
              <BarChart className="w-12 h-12 mx-auto mb-4 opacity-20 text-primary" />
              <p className="text-muted-foreground font-medium">No posts yet. Start posting to see your analytics!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-muted-foreground">
                    <th className="text-left py-3 px-2 font-medium">#</th>
                    <th className="text-left py-3 px-2 font-medium">Post</th>
                    <th className="text-right py-3 px-2 font-medium">
                      <span className="flex items-center justify-end gap-1"><Eye className="w-3.5 h-3.5" /> Views</span>
                    </th>
                    <th className="text-right py-3 px-2 font-medium">
                      <span className="flex items-center justify-end gap-1"><Heart className="w-3.5 h-3.5" /> Likes</span>
                    </th>
                    <th className="text-right py-3 px-2 font-medium">
                      <span className="flex items-center justify-end gap-1"><MessageSquare className="w-3.5 h-3.5" /> Replies</span>
                    </th>
                    <th className="text-right py-3 px-2 font-medium">
                      <span className="flex items-center justify-end gap-1"><Share className="w-3.5 h-3.5" /> Shares</span>
                    </th>
                    <th className="text-right py-3 px-2 font-medium">
                      <span className="flex items-center justify-end gap-1"><TrendingUp className="w-3.5 h-3.5" /> Eng. %</span>
                    </th>
                    <th className="text-right py-3 px-2 font-medium">Revenue</th>
                    <th className="text-right py-3 px-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {postsWithAnalytics.map((post, idx) => (
                    <tr key={post.id} className="border-b border-border/30 hover:bg-muted/5 transition-colors">
                      <td className="py-3 px-2 font-mono text-muted-foreground text-xs">{idx + 1}</td>
                      <td className="py-3 px-2 max-w-[300px]">
                        <Link href={`/profile/inbox?post=${post.id}`} className="hover:text-primary transition-colors">
                          <p className="line-clamp-2 text-sm leading-snug">
                            {post.body || (post.mediaUrl ? "[Media Post]" : "[Empty]")}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                          </p>
                        </Link>
                      </td>
                      <td className="py-3 px-2 text-right font-mono tabular-nums">{post.viewCount.toLocaleString()}</td>
                      <td className="py-3 px-2 text-right font-mono tabular-nums">{post.likesCount}</td>
                      <td className="py-3 px-2 text-right font-mono tabular-nums">{post.repliesCount}</td>
                      <td className="py-3 px-2 text-right font-mono tabular-nums">{post.shareCount}</td>
                      <td className="py-3 px-2 text-right">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          post.engagementRate >= 10
                            ? 'bg-green-500/10 text-green-500'
                            : post.engagementRate >= 5
                              ? 'bg-yellow-500/10 text-yellow-500'
                              : 'bg-muted text-muted-foreground'
                        }`}>
                          {post.engagementRate}%
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right font-mono text-green-500">${post.revenueEarned.toFixed(2)}</td>
                      <td className="py-3 px-2 text-right">
                        {post.throttleStatus ? (
                          <div className="flex flex-col items-end gap-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-destructive/10 text-destructive border border-destructive/20">
                              <AlertTriangle className="w-3 h-3" />
                              {post.throttleStatus}
                            </span>
                            <form action={appealSocialPost.bind(null, post.id)}>
                              <button type="submit" className="text-[10px] text-muted-foreground hover:text-primary transition-colors hover:underline">
                                Appeal Decision
                              </button>
                            </form>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-500/10 text-green-500 border border-green-500/20">
                            Active
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
