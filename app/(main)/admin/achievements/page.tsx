import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getRecentAchievements } from "@/app/actions/achievements";
import { AdminAchievementsClient } from "./admin-achievements-client";
import { ShieldCheck } from "lucide-react";

export const metadata = { title: "Manage Achievements | Admin" };

export default async function AdminAchievementsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissionLevel: true }
  });

  if (!dbUser || dbUser.permissionLevel < 50) {
    redirect("/");
  }

  const recentAchievements = await getRecentAchievements();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-primary" />
          Achievement Management
        </h1>
        <p className="text-muted-foreground mt-2">
          Award special badges and achievements to community members.
        </p>
      </div>

      <AdminAchievementsClient initialRecent={recentAchievements} />
    </div>
  );
}
