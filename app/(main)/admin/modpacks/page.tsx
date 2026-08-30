import { prisma } from "@/web/lib/prisma";
import { ModpackManager } from "@/web/components/admin/modpack-manager";

export const metadata = {
  title: "Admin - Modpack Management",
};

export default async function AdminModpacksPage() {
  const modpacks = await prisma.modpack.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Game Servers &amp; Infrastructure</span>
            <span className="text-xs text-muted-foreground/40">•</span>
            <span className="text-xs text-[#cbb26a] font-mono">Client Distribution</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-foreground">
            Modpacks &amp; Client Files
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage Minecraft and game client modpack downloads, version hashes, changelogs, and installation guides.
          </p>
        </div>
      </div>

      <div className="bg-card/40 border border-border/50 rounded-xl p-6 sg-glass">
        <ModpackManager initialModpacks={modpacks} />
      </div>
    </div>
  );
}
