import { auth } from "@/auth";
import { prisma } from "@/web/lib/prisma";
import { PERMISSION_LEVELS } from "@/web/lib/permissions";
import { redirect } from "next/navigation";
import { 
  Store, ShoppingBag, Sparkles, Coins, 
  MapPin, Clock, Package
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";

export const metadata = {
  title: "Shops & Encounters | Saints Gaming Admin",
};

export default async function AdminShopsEncountersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const viewer = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissionLevel: true, isWriter: true },
  });

  if (!viewer || (viewer.permissionLevel < PERMISSION_LEVELS.DEVELOPER && !viewer.isWriter)) {
    redirect("/not-found");
  }

  // Fetch shops and encounter tables
  const [shops, encounters] = await Promise.all([
    prisma.shopTemplate.findMany({
      take: 20,
      include: { inventory: true },
      orderBy: { slug: "asc" },
    }),
    prisma.encounterTable.findMany({
      take: 20,
      orderBy: { slug: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">World &amp; MMO</span>
            <span className="text-xs text-muted-foreground/40">•</span>
            <span className="text-xs text-[#cbb26a] font-mono">Vendors &amp; Spawns</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-foreground">
            <Store className="h-8 w-8 text-primary" />
            Shops &amp; Wild Encounters
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage merchant inventory, item buy/sell prices, stock refill timers, and wild creature encounter spawn tables.
          </p>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-card/40 border-border/50 sg-glass">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-mono uppercase">Merchant Shops</CardDescription>
            <CardTitle className="text-2xl font-mono font-bold text-primary">{shops.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card/40 border-border/50 sg-glass">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-mono uppercase">Total Stock Items</CardDescription>
            <CardTitle className="text-2xl font-mono font-bold text-amber-400">
              {shops.reduce((sum, s) => sum + s.inventory.length, 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card/40 border-border/50 sg-glass">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-mono uppercase">Encounter Tables</CardDescription>
            <CardTitle className="text-2xl font-mono font-bold text-cyan-400">{encounters.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card/40 border-border/50 sg-glass">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-mono uppercase">Currency Type</CardDescription>
            <CardTitle className="text-2xl font-mono font-bold text-emerald-400">Gold ($)</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Section 1: Merchant Shops */}
      <Card className="bg-card/40 border-border/50 sg-glass">
        <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-border/30">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" /> Merchant Shops ({shops.length})
            </CardTitle>
            <CardDescription>NPC vendors, merchant catalogs, pricing, and stock limitations.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {shops.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-4 text-center">No merchant shops configured in the database.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {shops.map((shop) => (
                <div key={shop.slug} className="p-4 rounded-xl border border-border/40 bg-background/50 space-y-3">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm text-foreground">{shop.name}</span>
                      <Badge variant="outline" className="text-[10px] font-mono text-emerald-400 border-emerald-500/30">
                        {shop.currency.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-[11px] font-mono text-muted-foreground">slug: {shop.slug}</div>
                    {shop.description && (
                      <p className="text-xs text-muted-foreground mt-1">{shop.description}</p>
                    )}
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-border/30">
                    <span className="text-[10px] uppercase font-mono text-muted-foreground block">
                      Stock Inventory ({shop.inventory.length}):
                    </span>
                    <div className="space-y-1">
                      {shop.inventory.length === 0 ? (
                        <span className="text-[11px] text-muted-foreground italic">No items listed.</span>
                      ) : (
                        shop.inventory.map((item) => (
                          <div key={item.id} className="flex items-center justify-between text-xs p-1.5 rounded bg-muted/30">
                            <span className="font-mono">{item.itemSlug}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-amber-400 font-mono font-bold">${item.price}</span>
                              {item.stock !== null && (
                                <span className="text-[10px] text-muted-foreground font-mono">({item.stock} in stock)</span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Wild Encounter Tables */}
      <Card className="bg-card/40 border-border/50 sg-glass">
        <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-border/30">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-5 w-5 text-cyan-400" /> Wild Creature Encounter Tables ({encounters.length})
            </CardTitle>
            <CardDescription>Zone encounter rates, spawn weights, and level ranges per map.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {encounters.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-4 text-center">No encounter tables registered in database.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {encounters.map((enc) => (
                <div key={enc.slug} className="p-3 rounded-lg border border-border/40 bg-background/50 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-foreground">{enc.slug}</span>
                    {enc.mapName && (
                      <Badge variant="outline" className="text-[10px] font-mono text-cyan-400 border-cyan-500/30">
                        {enc.mapName}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] font-mono text-muted-foreground truncate">
                    Raw Data: {enc.data.slice(0, 60)}...
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
