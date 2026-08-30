import { prisma } from "@/web/lib/prisma";
import { auth } from "@/auth";
import { CategoryManager } from "@/web/components/admin/category-manager";
import { redirect } from "next/navigation";
import { PERMISSION_LEVELS } from "@/web/lib/permissions";
import Link from "next/link";

export const metadata = {
  title: "Admin - Forum Management",
};

export default async function AdminForumPage() {
  const categories = await prisma.forumCategory.findMany({
    orderBy: { order: "asc" },
    include: {
      subcategories: {
        orderBy: { order: "asc" },
      },
    },
  });

  const session = await auth();
  const userPermissionLevel = (session?.user?.permissionLevel as number) || 0;

  if (userPermissionLevel < PERMISSION_LEVELS.HEAD_MODERATOR) {
    redirect("/admin");
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Community &amp; Content</span>
            <span className="text-xs text-muted-foreground/40">•</span>
            <span className="text-xs text-[#cbb26a] font-mono">Forum Structure</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-foreground">
            Forum Categories &amp; Boards
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create, order, and restrict forum categories and boards. Lock boards or require specific roles (VIP, Founder, Writer) to post.
          </p>
        </div>
      </div>

      <div className="flex gap-2 text-sm border-b border-border/40 pb-2">
        <Link
          href="/admin/forum"
          className="px-3 py-1.5 rounded-lg bg-primary/20 text-primary font-bold text-xs font-mono"
        >
          Categories &amp; Boards
        </Link>
        <Link
          href="/admin/forum/settings"
          className="px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground text-xs font-mono"
        >
          AI &amp; Moderation Settings
        </Link>
      </div>

      <div className="bg-card/40 border border-border/50 rounded-xl p-6 sg-glass">
        <CategoryManager initialCategories={categories} userPermissionLevel={userPermissionLevel} />
      </div>
    </div>
  );
}
