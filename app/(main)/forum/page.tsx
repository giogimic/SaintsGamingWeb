import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { MessageSquare, Lock, Folder } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { auth } from "@/auth";
import { PERMISSION_LEVELS } from "@/lib/permissions";

export const metadata = {
  title: "Forums | Saints Gaming",
  description: "Join the discussion, read the rules, and connect with the community.",
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
    <div className="container mx-auto px-4 py-12 max-w-6xl">
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
        <div className="space-y-8">
          {visibleCategories.map((category) => (
            <div key={category.id} className="rounded-xl border border-border/50 overflow-hidden bg-card/40 sg-glass">
              <div className="bg-muted/50 px-6 py-3 border-b border-border/50 flex items-center justify-between">
                <h2 className="font-bold text-lg flex items-center gap-2">
                  {category.isLocked && <Lock className="h-4 w-4 text-amber-500" />}
                  {category.name}
                </h2>
              </div>
              <div className="divide-y divide-border/50">
                {category.subcategories.length === 0 ? (
                  <div className="px-6 py-4 text-sm text-muted-foreground italic">
                    No subcategories.
                  </div>
                ) : (
                  category.subcategories.map((sub) => (
                    <div key={sub.id} className="px-6 py-4 flex flex-col sm:flex-row gap-4 sm:items-center hover:bg-muted/30 transition-colors">
                      <div className="flex-1 flex gap-4">
                        <div className="mt-1">
                          {sub.isLocked ? (
                            <Lock className="h-6 w-6 text-amber-500/70" />
                          ) : (
                            <Folder className="h-6 w-6 text-primary/70" />
                          )}
                        </div>
                        <div>
                          <Link href={`/forum/${sub.slug}`} className="font-semibold text-lg hover:text-primary transition-colors">
                            {sub.name}
                          </Link>
                          {sub.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {sub.description}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="hidden md:flex flex-col items-center justify-center min-w-[100px] text-sm text-muted-foreground border-l border-border/50 pl-4">
                        <span className="font-semibold text-foreground">{sub._count.threads}</span>
                        <span className="text-xs uppercase tracking-wider">Threads</span>
                      </div>

                      <div className="sm:w-64 text-sm text-muted-foreground border-t sm:border-t-0 sm:border-l border-border/50 pt-3 sm:pt-0 sm:pl-4">
                        {sub.threads.length > 0 ? (
                          <div className="flex flex-col">
                            <span className="text-xs mb-1 truncate text-foreground hover:text-primary cursor-pointer">
                              {sub.threads[0].title}
                            </span>
                            <span className="text-xs flex items-center gap-1">
                              by <Link href={`/user/${sub.threads[0].author.username}`} className="font-medium text-foreground hover:underline">{sub.threads[0].author.username}</Link>
                            </span>
                            <span className="text-xs mt-0.5">
                              {formatDistanceToNow(new Date(sub.threads[0].createdAt), { addSuffix: true })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs italic">No posts yet</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
