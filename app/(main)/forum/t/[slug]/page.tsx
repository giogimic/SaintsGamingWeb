import { Metadata } from "next";
export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { MessageSquare, Pin, Lock } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { auth } from "@/auth";
import { ReplyForm } from "@/components/forum/reply-form";
import { ReplyActions } from "@/components/forum/reply-actions";
import { ThreadActions } from "@/components/forum/thread-actions";
import { ThreadPoll } from "@/components/forum/thread-poll";
import { ThreadWatchButton } from "@/components/forum/thread-watch-button";
import { PERMISSION_LEVELS } from "@/lib/permissions";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const thread = await prisma.thread.findUnique({
    where: { slug: resolvedParams.slug },
  });

  if (!thread) return { title: "Thread Not Found" };

  const description = thread.body.substring(0, 150) + "...";
  return {
    title: `${thread.title} | Forums`,
    description,
    openGraph: {
      title: `${thread.title} | Forums`,
      description,
      type: "article",
      url: `https://saintsgaming.net/forum/t/${thread.slug}`,
      siteName: "Saints Gaming",
    },
    twitter: {
      card: "summary",
      title: `${thread.title} | Forums`,
      description,
    },
  };
}

export default async function ThreadPage({ params }: Props) {
  const session = await auth();
  const resolvedParams = await params;
  const thread = await prisma.thread.findUnique({
    where: { slug: resolvedParams.slug },
    include: {
      subcategory: true,
      polls: {
        include: {
          options: {
            include: { votes: true }
          }
        }
      },
      author: {
        select: {
          id: true,
          username: true,
          image: true,
          role: { select: { name: true, color: true } },
          level: true,
          createdAt: true
        }
      },
      replies: {
        orderBy: { createdAt: "asc" },
        include: {
          author: {
            select: {
              username: true,
              image: true,
              role: { select: { name: true, color: true } },
              level: true,
              createdAt: true
            }
          },
          likes: { select: { userId: true } }
        }
      }
    }
  });

  if (!thread) {
    notFound();
  }

  let currentUserPermission = 0;
  let isWatched = false;
  if (session?.user?.id) {
    const userDb = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { permissionLevel: true }
    });
    currentUserPermission = userDb?.permissionLevel ?? 0;

    const sub = await prisma.threadSubscription.findUnique({
      where: {
        userId_threadId: {
          userId: session.user.id,
          threadId: thread.id
        }
      }
    });
    isWatched = !!sub;
  }

  const relatedThreads = await prisma.thread.findMany({
    where: {
      subcategoryId: thread.subcategoryId,
      id: { not: thread.id }
    },
    orderBy: { createdAt: "desc" },
    take: 3,
    include: {
      author: { select: { username: true } },
      _count: { select: { replies: true } }
    }
  });

  // Fire-and-forget increment view count (won't work correctly in SSR without a separate API call in client, but good enough for static generation demo)
  // A better approach is to have a client component hit an API route to increment view count on mount.

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Link href="/forum" className="hover:text-primary transition-colors">Forums</Link>
          <span>/</span>
          <Link href={`/forum/${thread.subcategory.slug}`} className="hover:text-primary transition-colors">
            {thread.subcategory.name}
          </Link>
          <span>/</span>
          <span className="text-foreground truncate max-w-[200px] sm:max-w-xs">{thread.title}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-start gap-3">
            {thread.isPinned && <Pin className="h-6 w-6 text-primary mt-1 shrink-0" />}
            {thread.isLocked && <Lock className="h-6 w-6 text-amber-500 mt-1 shrink-0" />}
            <span className="break-words">{thread.title}</span>
          </h1>
          <div className="flex items-center gap-2 shrink-0">
            {thread.isLocked ? (
              <span className="px-4 py-2 bg-muted text-muted-foreground font-medium rounded-md flex items-center justify-center gap-2 cursor-not-allowed">
                <Lock className="h-4 w-4" /> Locked
              </span>
            ) : (
              <button className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                <MessageSquare className="h-4 w-4" /> Reply
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Original Post */}
        <div className="rounded-xl border border-border/50 overflow-hidden bg-card/40 sg-glass flex flex-col md:flex-row">
          {/* Author Sidebar */}
          <div className="w-full md:w-48 lg:w-56 bg-muted/30 p-4 border-b md:border-b-0 md:border-r border-border/50 flex flex-row md:flex-col items-center md:items-start gap-4">
            <div className="flex-1 md:flex-none flex flex-row md:flex-col items-center md:items-center gap-4 md:w-full">
              {thread.author.image ? (
                <Image 
                  src={thread.author.image} 
                  alt={thread.author.username} 
                  width={80} 
                  height={80} 
                  className="rounded-full w-12 h-12 md:w-20 md:h-20 object-cover border-2 border-primary/20"
                />
              ) : (
                <div className="w-12 h-12 md:w-20 md:h-20 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl md:text-3xl border-2 border-primary/40 shrink-0">
                  {thread.author.username.charAt(0).toUpperCase()}
                </div>
              )}
              
              <div className="text-left md:text-center flex-1">
                <Link href={`/user/${thread.author.username}`} className="font-bold text-lg hover:text-primary hover:underline break-all block">
                  {thread.author.username}
                </Link>
                {thread.author.role ? (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-background/50 border border-border/50 ${thread.author.role.color || "text-foreground"}`}>
                    {thread.author.role.name}
                  </span>
                ) : (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-background/50 border border-border/50 text-muted-foreground">
                    Member
                  </span>
                )}
                
                <div className="hidden md:block mt-4 space-y-1 text-xs text-muted-foreground w-full text-left bg-background/30 p-2 rounded-md border border-border/30">
                  <div className="flex justify-between"><span>Level:</span> <span>{thread.author.level}</span></div>
                  <div className="flex justify-between"><span>Joined:</span> <span>{format(new Date(thread.author.createdAt), "MMM yyyy")}</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* Post Content */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="px-6 py-3 border-b border-border/50 text-xs text-muted-foreground flex justify-between items-center bg-muted/10">
              <span>{format(new Date(thread.createdAt), "MMM d, yyyy 'at' h:mm a")}</span>
              <div className="flex items-center gap-2">
                {session?.user?.id && (
                  <ThreadWatchButton threadId={thread.id} initialIsWatched={isWatched} />
                )}
                <ThreadActions 
                  threadId={thread.id} 
                  userPermissionLevel={currentUserPermission} 
                  isAuthor={session?.user?.id === thread.author.id}
                  subcategorySlug={thread.subcategory.slug}
                />
              </div>
            </div>

            {thread.polls && thread.polls.length > 0 && (
              <ThreadPoll poll={thread.polls[0]} currentUserId={session?.user?.id} />
            )}
            
            <div className="p-6 flex-1 min-h-[150px]">
              <div className="prose prose-invert prose-sm sm:prose-base max-w-none prose-headings:text-foreground prose-a:text-primary hover:prose-a:text-primary/80 prose-strong:text-foreground break-words">
                <ReactMarkdown>{thread.body}</ReactMarkdown>
              </div>
            </div>
          </div>
        </div>

        {/* Replies */}
        {thread.replies.map((reply, i) => (
          <div key={reply.id} className="sg-glass border border-border/50 rounded-xl overflow-hidden flex flex-col md:flex-row mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${i * 100}ms`, animationFillMode: "both" }}>
            {/* Author Sidebar */}
            <div className="w-full md:w-48 lg:w-56 bg-muted/30 p-4 border-b md:border-b-0 md:border-r border-border/50 flex flex-row md:flex-col items-center md:items-start gap-4">
              <div className="flex-1 md:flex-none flex flex-row md:flex-col items-center md:items-center gap-4 md:w-full">
                {reply.author.image ? (
                  <Image 
                    src={reply.author.image} 
                    alt={reply.author.username} 
                    width={80} 
                    height={80} 
                    className="rounded-full w-12 h-12 md:w-20 md:h-20 object-cover border-2 border-primary/20"
                  />
                ) : (
                  <div className="w-12 h-12 md:w-20 md:h-20 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl md:text-3xl border-2 border-primary/40 shrink-0">
                    {reply.author.username.charAt(0).toUpperCase()}
                  </div>
                )}
                
                <div className="text-left md:text-center flex-1">
                  <Link href={`/user/${reply.author.username}`} className="font-bold text-lg hover:text-primary hover:underline break-all block">
                    {reply.author.username}
                  </Link>
                  {reply.author.role ? (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-background/50 border border-border/50 ${reply.author.role.color || "text-foreground"}`}>
                      {reply.author.role.name}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-background/50 border border-border/50 text-muted-foreground">
                      Member
                    </span>
                  )}
                  
                  <div className="hidden md:block mt-4 space-y-1 text-xs text-muted-foreground w-full text-left bg-background/30 p-2 rounded-md border border-border/30">
                    <div className="flex justify-between"><span>Level:</span> <span>{reply.author.level}</span></div>
                    <div className="flex justify-between"><span>Joined:</span> <span>{format(new Date(reply.author.createdAt), "MMM yyyy")}</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Post Content */}
            <ReplyActions 
                  replyId={reply.id}
                  threadId={thread.id}
                  initialBody={reply.body}
                  canEdit={session?.user?.id === reply.authorId || currentUserPermission >= PERMISSION_LEVELS.MODERATOR}
                  isThreadAuthor={session?.user?.id === thread.authorId}
                  isSolution={thread.acceptedAnswerId === reply.id}
                  createdAt={reply.createdAt}
                  initialLikesCount={reply.likes?.length || 0}
                  initialHasLiked={reply.likes?.some(like => like.userId === session?.user?.id) || false}
                />
          </div>
        ))}

        {relatedThreads.length > 0 && (
          <div className="mt-12 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-500">
            <h3 className="text-xl font-bold tracking-tight">You might also like...</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {relatedThreads.map((rt) => (
                <Link key={rt.id} href={`/forum/t/${rt.slug}`} className="block sg-glass border border-border/50 rounded-xl p-4 hover:border-primary/50 transition-colors bg-card/40">
                  <h4 className="font-semibold text-primary truncate mb-2">{rt.title}</h4>
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>{rt.author.username}</span>
                    <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3"/> {rt._count.replies}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {!thread.isLocked && (
          <div className="mt-8 pt-8 border-t border-border/50">
            {session?.user ? (
              <ReplyForm threadId={thread.id} />
            ) : (
              <>
                <h3 className="text-lg font-bold mb-4">Post a Reply</h3>
                <div className="bg-card/40 sg-glass border border-border/50 rounded-xl p-4 text-center">
                  <p className="text-muted-foreground mb-4">You must be logged in to reply to this thread.</p>
                  <Link href="/login" className="px-6 py-2 bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 transition-colors inline-block">
                    Log In or Register
                  </Link>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
