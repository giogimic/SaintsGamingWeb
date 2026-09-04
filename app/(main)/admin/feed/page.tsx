import { auth } from "@/auth";
import { prisma } from "@/web/lib/prisma";
import { PERMISSION_LEVELS } from "@/web/lib/permissions";
import { redirect } from "next/navigation";
import { 
  Share2, Flame, Pin, ShieldAlert, 
  Trash2, Eye, MessageSquare, Heart, Bookmark
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/web/components/ui/card";
import { Badge } from "@/web/components/ui/badge";
import { Button } from "@/web/components/ui/button";
import { togglePinPost, toggleCopyrightStrike, deleteSocialPost } from "./actions";

export const metadata = {
  title: "Social Feed Moderation | Saints Gaming Admin",
};

export default async function AdminSocialFeedPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const viewer = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissionLevel: true, isWriter: true },
  });

  if (!viewer || (viewer.permissionLevel < PERMISSION_LEVELS.MODERATOR && !viewer.isWriter)) {
    redirect("/not-found");
  }

  // Fetch recent social posts with author and reaction counts
  const posts = await prisma.socialPost.findMany({
    take: 40,
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { username: true, email: true, image: true } },
      _count: { select: { reactions: true, bookmarks: true, replies: true } },
    },
  });

  const totalPostCount = await prisma.socialPost.count();
  const flaggedCount = await prisma.socialPost.count({
    where: { OR: [{ copyrightStrike: true }, { throttleStatus: { not: null } }] },
  });
  const pinnedCount = await prisma.socialPost.count({ where: { isPinned: true } });

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Community &amp; Content</span>
            <span className="text-xs text-muted-foreground/40">•</span>
            <span className="text-xs text-[#cbb26a] font-mono">The Feed</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-foreground">
            <Share2 className="h-8 w-8 text-primary" />
            Social Feed Moderation
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Moderate community clips, pin trending moments, manage copyright strikes, and review originality scores.
          </p>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card/40 border-border/50 sg-glass">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-mono uppercase">Total Posts</CardDescription>
            <CardTitle className="text-2xl font-mono font-bold text-primary">{totalPostCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card/40 border-border/50 sg-glass">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-mono uppercase">Pinned Highlights</CardDescription>
            <CardTitle className="text-2xl font-mono font-bold text-amber-400">{pinnedCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card/40 border-border/50 sg-glass">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-mono uppercase">Flagged / Striked</CardDescription>
            <CardTitle className="text-2xl font-mono font-bold text-red-400">{flaggedCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Posts Table */}
      <Card className="bg-card/40 border-border/50 sg-glass">
        <CardHeader className="pb-3 border-b border-border/30">
          <CardTitle className="text-base flex items-center gap-2">
            <Flame className="h-5 w-5 text-amber-400" /> Recent Social Posts ({posts.length})
          </CardTitle>
          <CardDescription>Order by latest published. Select actions to pin, flag, or remove.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-muted/40 text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3 font-semibold">Author</th>
                  <th className="px-4 py-3 font-semibold">Content</th>
                  <th className="px-4 py-3 font-semibold">Engagement</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {posts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground italic">
                      No social posts published yet.
                    </td>
                  </tr>
                ) : (
                  posts.map((post) => (
                    <tr key={post.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 align-top font-semibold text-foreground">
                        <div className="font-bold">{post.author.username}</div>
                        <div className="text-[10px] text-muted-foreground">{new Date(post.createdAt).toLocaleDateString()}</div>
                      </td>
                      <td className="px-4 py-3 align-top max-w-xs">
                        <p className="text-xs text-foreground line-clamp-2">{post.body}</p>
                        {post.mediaUrl && (
                          <span className="inline-block mt-1 text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800">
                            Attached Media
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top font-mono text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {post.viewCount}</span>
                          <span className="flex items-center gap-1"><Heart className="h-3 w-3 text-red-400" /> {post._count.reactions}</span>
                          <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3 text-blue-400" /> {post._count.replies}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex gap-1 flex-wrap">
                          {post.isPinned && (
                            <Badge variant="default" className="text-[9px] bg-amber-500/20 text-amber-400 border-amber-500/30">
                              Pinned
                            </Badge>
                          )}
                          {post.copyrightStrike ? (
                            <Badge variant="destructive" className="text-[9px]">
                              Strike Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] text-emerald-400 border-emerald-500/30">
                              Good Standing
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top text-right space-x-1">
                        <form action={async () => { "use server"; await togglePinPost(post.id, post.isPinned); }} className="inline">
                          <Button size="sm" variant="ghost" type="submit" className="h-7 text-xs px-2" title={post.isPinned ? "Unpin" : "Pin"}>
                            <Pin className={`h-3.5 w-3.5 ${post.isPinned ? "text-amber-400 fill-amber-400" : "text-muted-foreground"}`} />
                          </Button>
                        </form>
                        <form action={async () => { "use server"; await toggleCopyrightStrike(post.id, post.copyrightStrike); }} className="inline">
                          <Button size="sm" variant="ghost" type="submit" className="h-7 text-xs px-2 text-muted-foreground hover:text-red-400" title="Toggle Copyright Strike">
                            <ShieldAlert className="h-3.5 w-3.5" />
                          </Button>
                        </form>
                        <form action={async () => { "use server"; await deleteSocialPost(post.id); }} className="inline">
                          <Button size="sm" variant="ghost" type="submit" className="h-7 text-xs px-2 text-destructive hover:bg-destructive/10" title="Delete Post">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </form>
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
