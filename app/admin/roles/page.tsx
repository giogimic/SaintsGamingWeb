import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { PERMISSION_LEVELS } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center gap-3">
        <ShieldAlert className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Role Management</h1>
          <p className="text-muted-foreground mt-1">
            View the dynamic roles used by the RBAC system across the application.
          </p>
        </div>
      </div>

      <div className="bg-card/50 border border-border/40 rounded-xl p-6 sg-glass">
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
