import { prisma } from "@/web/lib/prisma";
import { auth } from "@/auth";
import { PERMISSION_LEVELS } from "@/web/lib/permissions";
import { redirect } from "next/navigation";
import { UserManager } from "@/web/components/admin/user-manager";
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
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Identity, Progression &amp; Economy</span>
            <span className="text-xs text-muted-foreground/40">•</span>
            <span className="text-xs text-[#cbb26a] font-mono">Members &amp; Staff</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-foreground">
            <Users className="h-8 w-8 text-primary" />
            User &amp; Member Management
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Search community accounts, grant staff roles (Writer, VIP, Founder, Trusted), ban/unban members, and reset passwords.
          </p>
        </div>
      </div>

      <div className="bg-card/40 border border-border/50 rounded-xl p-6 sg-glass">
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
