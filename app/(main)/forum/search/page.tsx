import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";
import { MessageSquare, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Search Forums | Saints Gaming",
  description: "Search across all forum discussions and tags.",
};

type Props = {
  searchParams: Promise<{ q?: string; tag?: string }>;
};

export default async function ForumSearchPage({ searchParams }: Props) {
  const resolvedParams = await searchParams;
  const query = resolvedParams.q || "";
  const tagFilter = resolvedParams.tag || "";

  let threads: any[] = [];
  let error = null;

  try {
    if (query || tagFilter) {
      threads = await prisma.thread.findMany({
        where: {
          AND: [
            query ? {
              OR: [
                { title: { contains: query } },
                { body: { contains: query } },
              ]
            } : {},
            tagFilter ? {
              hashtags: {
                some: {
                  hashtag: {
                    name: tagFilter.toLowerCase()
                  }
                }
              }
            } : {}
          ]
        },
        include: {
          author: {
            select: { username: true, role: { select: { name: true, color: true } } }
          },
          subcategory: {
            select: { name: true, slug: true }
          },
          hashtags: {
            include: { hashtag: true }
          },
          _count: {
            select: { replies: true }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    }
  } catch {
    error = "An error occurred while searching.";
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-foreground mb-4">
          <Search className="h-8 w-8 text-primary" />
          Forum Search
        </h1>
        
        <form className="bg-card/40 sg-glass border border-border/50 rounded-xl p-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1 space-y-2">
            <label htmlFor="q" className="text-sm font-semibold text-muted-foreground">Keywords</label>
            <Input 
              id="q"
              name="q"
              defaultValue={query}
              placeholder="Search by keyword in title or body..."
              className="bg-background/50 border-border/50"
            />
          </div>
          <div className="flex-1 space-y-2">
            <label htmlFor="tag" className="text-sm font-semibold text-muted-foreground">Tag Filter</label>
            <Input 
              id="tag"
              name="tag"
              defaultValue={tagFilter}
              placeholder="e.g. guide, support"
              className="bg-background/50 border-border/50"
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full md:w-auto h-10">
              <Search className="h-4 w-4 mr-2" /> Search
            </Button>
          </div>
        </form>
      </div>

      <div className="space-y-4">
        {(!query && !tagFilter) && (
          <div className="text-center py-12 text-muted-foreground bg-card/20 sg-glass rounded-xl border border-border/30">
            Enter search terms or a tag above to find discussions.
          </div>
        )}

        {error && (
          <div className="text-center py-12 text-destructive bg-destructive/10 rounded-xl border border-destructive/20">
            {error}
          </div>
        )}

        {(query || tagFilter) && threads.length === 0 && !error && (
          <div className="text-center py-12 text-muted-foreground bg-card/20 sg-glass rounded-xl border border-border/30">
            No threads found matching your search criteria.
          </div>
        )}

        {threads.map((thread) => (
          <div key={thread.id} className="bg-card/40 sg-glass border border-border/50 rounded-xl p-4 sm:p-6 hover:border-primary/50 transition-colors group">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Link href={`/forum/${thread.subcategory.slug}`} className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors">
                    {thread.subcategory.name}
                  </Link>
                  {thread.hashtags.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {thread.hashtags.map((h: any) => (
                        <Link key={h.hashtagId} href={`/forum/search?tag=${h.hashtag.name}`}>
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors cursor-pointer">
                            #{h.hashtag.name}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
                <Link href={`/forum/t/${thread.slug}`} className="block">
                  <h3 className="text-lg sm:text-xl font-bold text-foreground group-hover:text-primary transition-colors truncate">
                    {thread.title}
                  </h3>
                </Link>
                <div className="mt-2 text-sm text-muted-foreground flex items-center gap-3">
                  <span>
                    By <Link href={`/user/${thread.author.username}`} className="hover:text-primary">{thread.author.username}</Link>
                  </span>
                  <span>•</span>
                  <span>{format(new Date(thread.createdAt), "MMM d, yyyy")}</span>
                </div>
              </div>
              
              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0">
                <div className="flex items-center gap-1 text-muted-foreground text-sm">
                  <MessageSquare className="h-4 w-4" />
                  <span>{thread._count.replies}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
