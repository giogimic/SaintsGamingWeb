import { auth } from "@/auth";
import { prisma } from "@/web/lib/prisma";
import { PERMISSION_LEVELS } from "@/web/lib/permissions";
import { redirect } from "next/navigation";
import { 
  BookOpen, Rocket, Gamepad2, Sparkles, 
  Wand2, BookText, ArrowUpRight, Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import Link from "next/link";
import { getWikiCategories, getWikiArticleCount } from "@/shared/wiki/wikiRegistry";

export const metadata = {
  title: "Wiki & Game Guides | Saints Gaming Admin",
};

export default async function AdminWikiPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const viewer = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissionLevel: true, isWriter: true },
  });

  if (!viewer || (viewer.permissionLevel < PERMISSION_LEVELS.HEAD_MODERATOR && !viewer.isWriter)) {
    redirect("/not-found");
  }

  const categories = getWikiCategories();
  const articleCount = getWikiArticleCount();

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Community &amp; Content</span>
            <span className="text-xs text-muted-foreground/40">•</span>
            <span className="text-xs text-[#cbb26a] font-mono">Knowledge Base</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-foreground">
            <BookOpen className="h-8 w-8 text-primary" />
            Wiki &amp; Game Guides Directory
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Explore and review official onboarding guides, game systems documentation, and developer references.
          </p>
        </div>
        <Button asChild className="gap-2 shadow-md">
          <Link href="/wiki" target="_blank">
            <ArrowUpRight className="h-4 w-4" /> Open Public Wiki
          </Link>
        </Button>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card/40 border-border/50 sg-glass">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-mono uppercase">Total Documentation</CardDescription>
            <CardTitle className="text-2xl font-mono font-bold text-primary">{articleCount} Articles</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card/40 border-border/50 sg-glass">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-mono uppercase">Subject Categories</CardDescription>
            <CardTitle className="text-2xl font-mono font-bold text-amber-400">{categories.length} Sections</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card/40 border-border/50 sg-glass">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-mono uppercase">Public Search Index</CardDescription>
            <CardTitle className="text-2xl font-mono font-bold text-emerald-400">100% Synced</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Categories & Articles List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories.map((cat) => (
          <Card key={cat.id} className="bg-card/40 border-border/50 sg-glass flex flex-col justify-between">
            <CardHeader className="pb-3 border-b border-border/30">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookText className="h-5 w-5 text-primary" /> {cat.title}
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {cat.articles.length} Articles
                </Badge>
              </div>
              <CardDescription>{cat.description}</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-2 flex-1">
              {cat.articles.map((art) => (
                <div key={art.slug} className="p-2.5 rounded-lg border border-border/30 bg-background/50 hover:bg-muted/30 transition-colors flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/wiki/${art.slug}`} target="_blank" className="font-semibold text-xs text-foreground hover:text-primary hover:underline truncate block">
                      {art.title}
                    </Link>
                    <p className="text-[11px] text-muted-foreground truncate">{art.summary}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {art.readTime}m
                    </span>
                    <Button variant="ghost" size="sm" asChild className="h-6 w-6 p-0 text-primary">
                      <Link href={`/wiki/${art.slug}`} target="_blank">
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

    </div>
  );
}
