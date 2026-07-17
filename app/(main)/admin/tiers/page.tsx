import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSION_LEVELS } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { saveTier, deleteTier } from "./actions";

export const metadata = { title: "Admin - Level Tiers" };

export default async function AdminTiersPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissionLevel: true }
  });

  if (!user || user.permissionLevel < PERMISSION_LEVELS.ADMIN) {
    return <div className="p-8 text-center text-red-500">Access Denied</div>;
  }

  const tiers = await prisma.levelTier.findMany({
    orderBy: { level: "asc" }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Level Tiers</h1>
        <p className="text-muted-foreground mt-1">Manage the cosmetic ranks and required XP for forum & news participation.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <Card className="bg-card/40 border-border/50">
            <CardContent className="p-0">
              <div className="rounded-md border border-border/50 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border/50 text-left">
                    <tr>
                      <th className="h-10 px-4 font-medium">Level</th>
                      <th className="h-10 px-4 font-medium">Icon</th>
                      <th className="h-10 px-4 font-medium">Title</th>
                      <th className="h-10 px-4 font-medium">XP Required</th>
                      <th className="h-10 px-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tiers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                          No level tiers configured yet.
                        </td>
                      </tr>
                    ) : (
                      tiers.map((tier) => (
                        <tr key={tier.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="p-4 font-bold">{tier.level}</td>
                          <td className="p-4 text-2xl">{tier.icon || "—"}</td>
                          <td className="p-4 font-medium">{tier.name}</td>
                          <td className="p-4">{tier.xpRequired} XP</td>
                          <td className="p-4 text-right">
                            <form action={async () => { "use server"; await deleteTier(tier.id); }}>
                              <Button variant="ghost" size="icon" type="submit" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </form>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="bg-card/40 border-border/50 sticky top-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="h-4 w-4 text-primary" />
                Add New Tier
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form action={saveTier} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="level">Level Number</Label>
                  <Input id="level" name="level" type="number" min="1" required placeholder="e.g. 10" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Title / Rank Name</Label>
                  <Input id="name" name="name" required placeholder="e.g. Veteran" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="xpRequired">Total XP Required</Label>
                  <Input id="xpRequired" name="xpRequired" type="number" min="0" required placeholder="e.g. 500" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="icon">Emoji Icon (Optional)</Label>
                  <Input id="icon" name="icon" placeholder="e.g. 🌟" />
                </div>
                <Button type="submit" className="w-full">Create Tier</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
