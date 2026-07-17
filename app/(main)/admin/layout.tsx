import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PERMISSION_LEVELS } from "@/lib/permissions";
import { AdminOverlayShell } from "./admin-overlay-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissionLevel: true, isWriter: true }
  });

  if (!dbUser || (dbUser.permissionLevel < PERMISSION_LEVELS.MODERATOR && !dbUser.isWriter)) {
    redirect("/not-found");
  }

  return (
    <AdminOverlayShell permissionLevel={dbUser.permissionLevel} isWriter={dbUser.isWriter}>
      {children}
    </AdminOverlayShell>
  );
}
