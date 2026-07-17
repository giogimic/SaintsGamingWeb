import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { PERMISSION_LEVELS } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { UserManager } from "@/components/admin/user-manager";
import { Users } from "lucide-react";

export const metadata = {
  title: "Admin - User Management",
};

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const currentUserLevel = (session.user.permissionLevel as number) || 0;
  if (currentUserLevel < PERMISSION_LEVELS.ADMIN) redirect("/"); // Only Admins allowed

  const roles = await prisma.role.findMany({
    orderBy: { level: "asc" }
  });

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      username: true,
      email: true,
      image: true,
      permissionLevel: true,
      isBanned: true,
      canPostToForum: true,
      isWriter: true,
      isVIP: true,
      isFounder: true,
      isTrusted: true,
      createdAt: true,
    }
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center gap-3">
        <Users className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-1">
            View, search, and manage community members and staff roles.
          </p>
        </div>
      </div>

      <div className="bg-card/50 border border-border/40 rounded-xl p-6 sg-glass">
        <UserManager 
          initialUsers={users} 
          currentUserId={session.user.id!}
          currentUserLevel={currentUserLevel}
          availableRoles={roles}
        />
      </div>
    </div>
  );
}
