import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { CategoryManager } from "@/components/admin/category-manager";
import { redirect } from "next/navigation";
import { PERMISSION_LEVELS } from "@/lib/permissions";

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
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Forum Management</h1>
        <p className="text-muted-foreground mt-2">
          Create and organize forum categories and boards.
        </p>
      </div>

      <div className="bg-card/50 border border-border/40 rounded-xl p-6">
        <CategoryManager initialCategories={categories} userPermissionLevel={userPermissionLevel} />
      </div>
    </div>
  );
}
