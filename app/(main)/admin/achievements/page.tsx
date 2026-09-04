import { auth } from "@/auth";
import { prisma } from "@/web/lib/prisma";
import { redirect } from "next/navigation";
import { getRecentAchievements } from "@/app/actions/game/achievements";
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
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Identity, Progression &amp; Economy</span>
            <span className="text-xs text-muted-foreground/40">•</span>
            <span className="text-xs text-[#cbb26a] font-mono">Community Honors</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-foreground">
            <ShieldCheck className="h-8 w-8 text-primary" />
            Achievement &amp; Badge Management
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Award custom achievement badges, trophies, and profile medals to outstanding community contributors.
          </p>
        </div>
      </div>

      <div className="bg-card/40 border border-border/50 rounded-xl p-6 sg-glass">
        <AdminAchievementsClient initialRecent={recentAchievements} />
      </div>
    </div>
  );
}
