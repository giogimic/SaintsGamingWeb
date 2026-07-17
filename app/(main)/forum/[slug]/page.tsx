import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, MessageSquare, Pin, Lock, User } from "lucide-react";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const subcategory = await prisma.subCategory.findUnique({
    where: { slug: resolvedParams.slug },
  });

  if (!subcategory) return { title: "Subcategory Not Found" };

  const description = subcategory.description || `Browse threads in ${subcategory.name}`;
  return {
    title: `${subcategory.name} | Forums`,
    description,
    openGraph: {
      title: `${subcategory.name} | Forums`,
      description,
      type: "website",
      url: `https://saintsgaming.net/forum/${subcategory.slug}`,
      siteName: "Saints Gaming",
    },
    twitter: {
      card: "summary",
      title: `${subcategory.name} | Forums`,
      description,
    },
  };
}

export default async function SubCategoryPage({ params }: Props) {
  const resolvedParams = await params;
  const subcategory = await prisma.subCategory.findUnique({
    where: { slug: resolvedParams.slug },
    include: {
      category: true,
      threads: {
        orderBy: [
          { isPinned: "desc" },
          { createdAt: "desc" }
        ],
        include: {
          author: { select: { username: true } },
          _count: { select: { replies: true } },
          replies: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { author: { select: { username: true } } }
          }
        }
      }
    }
  });

  if (!subcategory) {
    notFound();
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <Link
          href="/forum"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-4 group"
        >
          <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Forums
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-foreground">
              {subcategory.name}
              {subcategory.isLocked && <Lock className="h-6 w-6 text-amber-500" />}
            </h1>
            <p className="text-muted-foreground mt-2">
              {subcategory.description}
            </p>
          </div>
          <Link
            href={`/forum/${subcategory.slug}/new`}
            className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 transition-colors shrink-0 flex items-center justify-center gap-2"
          >
            <MessageSquare className="h-4 w-4" /> New Thread
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-border/50 overflow-hidden bg-card/40 sg-glass">
        <div className="bg-muted/50 px-6 py-3 border-b border-border/50 flex items-center text-sm font-semibold text-muted-foreground hidden md:flex">
          <div className="flex-[3]">Title</div>
          <div className="flex-1 text-center">Replies</div>
          <div className="flex-1 text-center">Views</div>
          <div className="flex-[2] text-right">Latest Activity</div>
        </div>

        <div className="divide-y divide-border/50">
          {subcategory.threads.length === 0 ? (
            <div className="px-6 py-12 text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>There are no threads in this category yet.</p>
            </div>
          ) : (
            subcategory.threads.map((thread) => (
              <div key={thread.id} className="px-6 py-4 flex flex-col md:flex-row gap-4 md:items-center hover:bg-muted/30 transition-colors">
                <div className="flex-[3] flex gap-3 items-start">
                  <div className="mt-1 shrink-0">
                    {thread.isPinned ? (
                      <Pin className="h-5 w-5 text-primary/80 fill-primary/20" />
                    ) : thread.isLocked ? (
                      <Lock className="h-5 w-5 text-amber-500/80" />
                    ) : (
                      <MessageSquare className="h-5 w-5 text-muted-foreground/70" />
                    )}
                  </div>
                  <div>
                    <Link href={`/forum/t/${thread.slug}`} className={`font-semibold text-base hover:text-primary transition-colors ${thread.isPinned ? 'text-foreground' : 'text-foreground/90'}`}>
                      {thread.title}
                    </Link>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <User className="h-3 w-3" />
                      <Link href={`/user/${thread.author.username}`} className="hover:underline">{thread.author.username}</Link>
                      <span>•</span>
                      <span>{formatDistanceToNow(new Date(thread.createdAt), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 md:hidden text-xs text-muted-foreground mt-2 border-t border-border/50 pt-2">
                  <div><span className="font-medium text-foreground">{thread._count.replies}</span> replies</div>
                  <div><span className="font-medium text-foreground">{thread.viewCount}</span> views</div>
                </div>

                <div className="hidden md:flex flex-1 items-center justify-center text-sm text-muted-foreground">
                  {thread._count.replies}
                </div>
                
                <div className="hidden md:flex flex-1 items-center justify-center text-sm text-muted-foreground">
                  {thread.viewCount}
                </div>

                <div className="flex-[2] md:text-right text-sm text-muted-foreground mt-2 md:mt-0">
                  {thread.replies.length > 0 ? (
                    <div className="flex flex-col md:items-end">
                      <span className="text-xs">
                        {formatDistanceToNow(new Date(thread.replies[0].createdAt), { addSuffix: true })}
                      </span>
                      <span className="text-xs flex items-center gap-1">
                        by <Link href={`/user/${thread.replies[0].author.username}`} className="font-medium text-foreground hover:underline">{thread.replies[0].author.username}</Link>
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs italic md:float-right">No replies</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
