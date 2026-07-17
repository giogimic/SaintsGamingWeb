import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { MessageSquare, Lock, Folder } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { auth } from "@/auth";
import { PERMISSION_LEVELS } from "@/lib/permissions";

export const metadata = {
  title: "Forums | Saints Gaming",
  description: "Join the discussion, read the rules, and connect with the community.",
  openGraph: {
    title: "Forums | Saints Gaming",
    description: "Join the discussion, read the rules, and connect with the community.",
    type: "website",
    url: "https://saintsgaming.net/forum",
    siteName: "Saints Gaming",
  },
  twitter: {
    card: "summary",
    title: "Forums | Saints Gaming",
    description: "Join the discussion, read the rules, and connect with the community.",
  },
};

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
              author: { select: { username: true } }
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

  const userPermissionLevel = dbUser?.permissionLevel || 0;
  
  // Helper to check if a user has access to a category or subcategory
  const hasAccess = (item: { reqWriter: boolean; reqVIP: boolean; reqFounder: boolean; reqTrusted: boolean }) => {
    const isRestricted = item.reqWriter || item.reqVIP || item.reqFounder || item.reqTrusted;
    if (!isRestricted) return true;
    
    // Staff bypass
    if (userPermissionLevel >= PERMISSION_LEVELS.HEAD_MODERATOR) return true;
    if (!dbUser) return false;
    
    // Tick checks
    if (item.reqWriter && dbUser.isWriter) return true;
    if (item.reqVIP && dbUser.isVIP) return true;
    if (item.reqFounder && dbUser.isFounder) return true;
    if (item.reqTrusted && dbUser.isTrusted) return true;
    
    return false;
  };

  const visibleCategories = categories
    .filter(hasAccess)
    .map(cat => ({
      ...cat,
      subcategories: cat.subcategories.filter(hasAccess)
    }));

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3 sg-text-gradient">
            <MessageSquare className="h-8 w-8 text-primary" /> Community Forums
          </h1>
          <p className="text-muted-foreground mt-2">
            Discuss roleplay, report issues, and connect with other members.
          </p>
        </div>
      </div>

      {visibleCategories.length === 0 ? (
        <div className="text-center py-16 bg-card/30 rounded-xl border border-border/50">
          <MessageSquare className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-xl font-medium">No Categories Yet</h3>
          <p className="text-muted-foreground mt-2">The forums are currently being set up.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {visibleCategories.map((category) => (
            <div key={category.id} className="rounded-2xl border border-border/50 overflow-hidden bg-card/40 sg-glass shadow-sm">
              <div className="bg-muted/50 px-6 py-4 border-b border-border/50 flex items-center justify-between">
                <h2 className="font-bold text-xl flex items-center gap-2">
                  {category.isLocked && <Lock className="h-5 w-5 text-amber-500" />}
                  {category.name}
                </h2>
              </div>
              <div className="p-6">
                {category.subcategories.length === 0 ? (
                  <div className="text-sm text-muted-foreground italic">
                    No subcategories.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {category.subcategories.map((sub) => (
                      <div key={sub.id} className="flex flex-col bg-background/60 border border-border/50 rounded-xl hover:border-primary/50 hover:shadow-md hover:bg-background/80 transition-all group overflow-hidden">
                        <div className="p-5 flex-1 flex flex-col gap-3">
                          <div className="flex items-start gap-3">
                            <div className="mt-1 shrink-0 p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                              {sub.isLocked ? (
                                <Lock className="h-6 w-6 text-amber-500/70" />
                              ) : (
                                <Folder className="h-6 w-6 text-primary/80" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <Link href={`/forum/${sub.slug}`} className="font-bold text-lg hover:text-primary transition-colors block truncate">
                                {sub.name}
                              </Link>
                              {sub.description && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {sub.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-muted/30 border-t border-border/50 p-4">
                          {sub.threads.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              <div className="text-xs text-muted-foreground flex justify-between items-center mb-1">
                                <span className="font-semibold uppercase tracking-wider text-primary/80">{sub._count.threads} Threads</span>
                                <span className="opacity-80">{formatDistanceToNow(new Date(sub.threads[0].createdAt), { addSuffix: true })}</span>
                              </div>
                              <span className="text-sm font-medium text-foreground hover:text-primary cursor-pointer truncate">
                                {sub.threads[0].title}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                by <Link href={`/user/${sub.threads[0].author.username}`} className="font-medium text-foreground hover:underline">{sub.threads[0].author.username}</Link>
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <div className="text-xs text-muted-foreground flex justify-between items-center mb-1">
                                <span className="font-semibold uppercase tracking-wider text-primary/80">{sub._count.threads} Threads</span>
                              </div>
                              <span className="text-xs italic text-muted-foreground mt-1">No posts yet</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
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
