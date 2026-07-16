import { prisma } from "@/lib/prisma";
import { ModpackManager } from "@/components/admin/modpack-manager";

export const metadata = {
  title: "Admin - Modpack Management",
};

export default async function AdminModpacksPage() {
  const modpacks = await prisma.modpack.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Modpacks & Servers</h1>
        <p className="text-muted-foreground mt-2">
          Manage game servers, download links, and installation instructions.
        </p>
      </div>

      <div className="bg-card/50 border border-border/40 rounded-xl p-6">
        <ModpackManager initialModpacks={modpacks} />
      </div>
    </div>
  );
}
