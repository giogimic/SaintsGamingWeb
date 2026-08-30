import { prisma } from "@/web/lib/prisma";
import { auth } from "@/auth";
import { PERMISSION_LEVELS } from "@/web/lib/permissions";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { Badge } from "@/shared/ui/badge";

export const metadata = {
  title: "Admin - Role Management",
};

export default async function AdminRolesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const currentUserLevel = ((session.user as any  ).permissionLevel as number) || 0;
  if (currentUserLevel < PERMISSION_LEVELS.DEVELOPER) redirect("/admin");

  const roles = await prisma.role.findMany({
    orderBy: { level: "desc" },
    include: {
      _count: {
        select: { users: true }
      }
    }
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Identity, Progression &amp; Economy</span>
            <span className="text-xs text-muted-foreground/40">•</span>
            <span className="text-xs text-[#cbb26a] font-mono">RBAC Security</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-foreground">
            <ShieldAlert className="h-8 w-8 text-primary" />
            Role &amp; Permission Hierarchy
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            View the dynamic roles used by the RBAC system across Saints Gaming. Higher permission levels inherit privileges from lower tiers.
          </p>
        </div>
      </div>

      <div className="bg-card/40 border border-border/50 rounded-xl p-6 sg-glass">
        <div className="rounded-md border border-border/50 overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>Role Name</TableHead>
                <TableHead>Permission Level</TableHead>
                <TableHead>Color Class</TableHead>
                <TableHead className="text-right">Users with Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell>
                    <Badge variant="outline" className={`${role.color} bg-background`}>
                      {role.name}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{role.level}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{role.color}</TableCell>
                  <TableCell className="text-right">{role._count.users}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-muted-foreground mt-4 italic">
          Note: Creating and editing custom roles is limited to direct database access currently to prevent permission escalation exploits. Roles can be safely assigned to users from the User Management panel.
        </p>
      </div>
    </div>
  );
}
