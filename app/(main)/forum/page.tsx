import { prisma } from "@/web/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import { 
  MessageSquare, Lock, Folder, 
  Search, Trophy, Sparkles, Flame, ShieldAlert,
  Gamepad2, Newspaper, HelpCircle, Layers, ArrowUpRight,
  TrendingUp, Users, Activity, Video, Heart, Eye, ArrowRight, Globe, Play
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { auth } from "@/auth";
import { canAccessRestrictedBoard } from "@/web/lib/forum-access";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";

import { constructPageMetadata } from "@/web/lib/seo";

export const metadata = constructPageMetadata({
  title: "Forums",
  description: "Official discussion boards, game news, world building, and community updates.",
  path: "/forum",
});


export default async function ForumIndexPage() {
  const categories = await prisma.forumCategory.findMany({
    orderBy: { order: "asc" },
    include: {
      subcategories: {
        orderBy: { order: "asc" },
        include: {
          _count: {
            select: { threads: true }
          },
          threads: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: {
              author: { select: { username: true, image: true } }
            }
          }
        }
      }
    }
  });

  const session = await auth();
  let dbUser = null;
  if (session?.user?.id) {
    dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { permissionLevel: true, isWriter: true, isVIP: true, isFounder: true, isTrusted: true }
    });
  }

  const boardUser = dbUser
    ? {
        permissionLevel: dbUser.permissionLevel || 0,
        isWriter: dbUser.isWriter,
        isVIP: dbUser.isVIP,
        isFounder: dbUser.isFounder,
        isTrusted: dbUser.isTrusted,
      }
    : null;

  const visibleCategories = categories
    .filter((item) => canAccessRestrictedBoard(item, boardUser))
    .map((cat) => ({
      ...cat,
      subcategories: cat.subcategories.filter((item) =>
        canAccessRestrictedBoard(item, boardUser)
      ),
    }));

  // Calculate high-level stats
  const totalBoards = visibleCategories.reduce((acc, cat) => acc + cat.subcategories.length, 0);
  const totalThreads = visibleCategories.reduce(
    (acc, cat) => acc + cat.subcategories.reduce((subAcc, sub) => subAcc + sub._count.threads, 0),
    0
  );

  // Fetch recent trending threads across visible boards
  const recentThreads = await prisma.thread.findMany({
    take: 4,
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { username: true } },
      subcategory: { select: { name: true, slug: true } },
      _count: { select: { replies: true } }
    }
  });

  // Fetch latest Nexus News dispatches to enrich community hub
  const nexusNews = await prisma.newsArticle.findMany({
    take: 3,
    where: { publishedAt: { not: null } },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      coverImage: true,
      publishedAt: true,
      author: { select: { username: true } },
    },
  });

  // Fetch latest Community Video Feed highlights
  const feedPosts = await prisma.socialPost.findMany({
    take: 3,
    where: { parentId: null },
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { id: true, username: true, image: true } },
      _count: { select: { reactions: true } },
    },
  });

  // Icon helper for category flair
  const getCategoryIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("news") || lower.includes("announcement")) return <Newspaper className="h-6 w-6 text-blue-400" />;
    if (lower.includes("mmo") || lower.includes("game") || lower.includes("battle")) return <Gamepad2 className="h-6 w-6 text-emerald-400" />;
    if (lower.includes("support") || lower.includes("help") || lower.includes("bug")) return <HelpCircle className="h-6 w-6 text-amber-400" />;
    return <Layers className="h-6 w-6 text-primary" />;
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      
      {/* ─── SLEEK HEADER & SEARCH BAR ────────────────────────────────────── */}
      <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-mono font-bold uppercase tracking-wider">
            <Sparkles className="h-3 w-3" /> Community Forums
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Saints <span className="sg-text-gradient">Gaming Forums</span>
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
            Dispatches, patch notes, world building, guides, and MMO updates. Connect with developers and fellow Saints.
          </p>
        </div>

        {/* Search & Fast Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
          <form action="/forum/search" method="GET" className="flex items-center gap-2 flex-1 sm:w-72">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input 
                name="q"
                placeholder="Search threads, guides, authors..." 
                className="pl-9 bg-background/80 border-border/60 rounded-xl h-9 text-xs focus-visible:ring-primary/40"
              />
            </div>
            <Button type="submit" size="sm" className="h-9 px-3.5 rounded-xl font-medium shadow-sm">
              Search
            </Button>
          </form>

          <div className="flex items-center gap-1.5">
            <Button asChild variant="outline" size="sm" className="rounded-xl border-border/60 bg-background/50 hover:bg-background/80 h-9 text-xs">
              <Link href="/forum/search" className="flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 text-primary" /> All
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="rounded-xl border-border/60 bg-background/50 hover:bg-background/80 h-9 text-xs">
              <Link href="/forum/leaderboard" className="flex items-center gap-1">
                <Trophy className="h-3.5 w-3.5 text-amber-400" /> Leaderboard
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* ─── COMMUNITY SPOTLIGHT (NEXUS DISPATCHES & FEED CLIPS) ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Latest Nexus Dispatches */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Newspaper className="h-4 w-4 text-primary" /> Nexus Dispatches
            </h2>
            <Link href="/hub" className="text-xs text-primary hover:underline flex items-center gap-1">
              The Nexus <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {nexusNews.map((news) => (
              <Link key={news.id} href={`/news/${news.slug}`} className="group h-full block">
                <div className="h-full bg-card/40 hover:bg-card/70 transition-all duration-200 border border-border/50 hover:border-primary/40 rounded-xl overflow-hidden flex flex-col sg-glass p-3">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono mb-1.5">
                    <span className="text-primary font-bold">News</span>
                    <span>·</span>
                    <span>{news.publishedAt ? format(new Date(news.publishedAt), "MMM d") : "Recent"}</span>
                  </div>
                  <h3 className="font-bold text-xs text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug flex-1">
                    {news.title}
                  </h3>
                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-border/30 text-[10px] text-muted-foreground">
                    <span className="truncate max-w-[90px]">by {news.author.username}</span>
                    <span className="text-primary font-semibold flex items-center group-hover:translate-x-0.5 transition-transform">
                      Read <ArrowRight className="h-2.5 w-2.5 ml-0.5" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Right Column: Community Video Feed Highlights */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Flame className="h-4 w-4 text-amber-500" /> Feed Highlights
            </h2>
            <Link href="/feed" className="text-xs text-primary hover:underline flex items-center gap-1">
              Explore Feed <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {feedPosts.map((post) => (
              <Link key={post.id} href="/feed" className="group h-full block">
                <div className="h-full bg-card/40 hover:bg-card/70 transition-all duration-200 border border-border/50 hover:border-primary/40 rounded-xl overflow-hidden flex flex-col sg-glass p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Avatar className="h-4 w-4 border border-border/40">
                      <AvatarImage src={post.author?.image || ""} />
                      <AvatarFallback className="text-[8px]">
                        {post.author?.username?.substring(0, 2).toUpperCase() || "SG"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[10px] font-bold text-foreground truncate max-w-[80px]">
                      {post.author?.username || "Player"}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-tight flex-1">
                    {post.body || "Community gaming highlight & clip."}
                  </p>
                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-border/30 text-[10px] text-muted-foreground font-mono">
                    <span className="flex items-center gap-1 text-amber-400">
                      <Heart className="h-2.5 w-2.5 fill-amber-400/30" /> {post._count?.reactions || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-2.5 w-2.5" /> {post.viewCount || 0}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ─── RECENT DISCUSSIONS STRIP ──────────────────────────────────────── */}
      {recentThreads.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" /> Recent Discussions
            </h3>
            <Link href="/forum/search" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentThreads.map((t) => (
              <Link 
                key={t.id} 
                href={`/forum/t/${t.slug}`} 
                className="group p-4 rounded-2xl border border-border/40 bg-card/40 hover:bg-card/70 hover:border-primary/40 transition-all shadow-sm flex flex-col justify-between"
              >
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-primary/80 px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 inline-block mb-2 font-mono">
                    {t.subcategory.name}
                  </span>
                  <h4 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors text-foreground">
                    {t.title}
                  </h4>
                </div>
                <div className="mt-3 pt-3 border-t border-border/30 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="truncate max-w-[120px]">by {t.author.username}</span>
                  <span className="flex items-center gap-1 font-mono">
                    <MessageSquare className="h-3 w-3 text-primary" /> {t._count.replies}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Main Forum Categories Section */}
      {visibleCategories.length === 0 ? (
        <div className="text-center py-20 bg-card/30 rounded-3xl border border-border/50 backdrop-blur-md">
          <MessageSquare className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-2xl font-bold">No Categories Configured</h3>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            The community boards are being prepared. Check back shortly or log in as admin to customize boards.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {visibleCategories.map((category) => (
            <div 
              key={category.id} 
              className="rounded-3xl border border-border/50 overflow-hidden bg-card/30 backdrop-blur-md sg-glass shadow-lg transition-all hover:border-border/80"
            >
              {/* Category Header */}
              <div className="bg-gradient-to-r from-muted/60 via-card/70 to-transparent px-6 sm:px-8 py-5 border-b border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                    {getCategoryIcon(category.name)}
                  </div>
                  <div>
                    <h2 className="font-bold text-xl sm:text-2xl flex items-center gap-2.5 tracking-tight">
                      {category.name}
                      {category.isLocked && (
                        <span title="Locked category">
                          <Lock className="h-4 w-4 text-amber-400" />
                        </span>
                      )}
                      {(category.reqWriter || category.reqVIP || category.reqFounder || category.reqTrusted) && (
                        <span title="Restricted Access" className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                          <ShieldAlert className="h-3 w-3" /> Private Board
                        </span>
                      )}
                    </h2>
                    {category.description && (
                      <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                        {category.description}
                      </p>
                    )}
                  </div>
                </div>

                <span className="text-xs font-semibold text-muted-foreground bg-background/50 px-3 py-1 rounded-full border border-border/40 hidden sm:inline-block">
                  {category.subcategories.length} {category.subcategories.length === 1 ? "board" : "boards"}
                </span>
              </div>

              {/* Boards Grid */}
              <div className="p-6 sm:p-8">
                {category.subcategories.length === 0 ? (
                  <div className="text-sm text-muted-foreground italic py-4 text-center">
                    No boards in this category yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {category.subcategories.map((sub) => {
                      const latestThread = sub.threads[0];
                      return (
                        <div 
                          key={sub.id} 
                          className="flex flex-col bg-background/50 border border-border/40 rounded-2xl hover:border-primary/50 hover:shadow-xl hover:bg-background/80 transition-all duration-200 group overflow-hidden"
                        >
                          <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between gap-4">
                            <div className="flex items-start gap-3.5">
                              <div className="mt-0.5 shrink-0 p-2.5 bg-primary/10 rounded-xl group-hover:bg-primary/20 group-hover:scale-105 transition-all text-primary">
                                {sub.isLocked ? (
                                  <Lock className="h-5 w-5 text-amber-400" />
                                ) : (
                                  <Folder className="h-5 w-5" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <Link 
                                  href={`/forum/${sub.slug}`} 
                                  className="font-bold text-lg hover:text-primary transition-colors block truncate group-hover:translate-x-0.5 duration-150"
                                >
                                  {sub.name}
                                </Link>
                                {sub.description && (
                                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                                    {sub.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground pt-1">
                              <span className="flex items-center gap-1.5 bg-muted/40 px-2.5 py-1 rounded-lg border border-border/30">
                                <MessageSquare className="h-3.5 w-3.5 text-primary" /> {sub._count.threads} Threads
                              </span>
                              {(sub.reqWriter || sub.reqVIP || sub.reqFounder || sub.reqTrusted) && (
                                <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                                  Restricted
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Board Footer / Latest Thread Preview */}
                          <div className="bg-muted/20 border-t border-border/40 p-4">
                            {latestThread ? (
                              <div className="flex flex-col gap-1 text-xs">
                                <div className="text-muted-foreground flex justify-between items-center mb-0.5">
                                  <span className="font-semibold text-foreground/80 uppercase text-[10px] tracking-wider">Latest Activity</span>
                                  <span className="opacity-75">{formatDistanceToNow(new Date(latestThread.createdAt), { addSuffix: true })}</span>
                                </div>
                                <Link 
                                  href={`/forum/t/${latestThread.slug}`}
                                  className="font-medium text-foreground hover:text-primary truncate block transition-colors"
                                >
                                  {latestThread.title}
                                </Link>
                                <span className="text-muted-foreground text-[11px] truncate">
                                  by <Link href={`/user/${latestThread.author.username}`} className="font-medium text-foreground hover:underline">{latestThread.author.username}</Link>
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between text-xs text-muted-foreground italic py-1">
                                <span>No activity yet</span>
                                <Link href={`/forum/${sub.slug}`} className="text-[11px] font-semibold text-primary not-italic hover:underline">
                                  Be the first →
                                </Link>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

