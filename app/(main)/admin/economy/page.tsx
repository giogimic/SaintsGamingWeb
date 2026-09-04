import { auth } from "@/auth";
import { prisma } from "@/web/lib/prisma";
import { PERMISSION_LEVELS } from "@/web/lib/permissions";
import { redirect } from "next/navigation";
import { 
  Coins, TrendingUp, Package, ShoppingCart, 
  History, ShieldAlert, ArrowUpRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/web/components/ui/card";
import { Badge } from "@/web/components/ui/badge";

export const metadata = {
  title: "Economy & Audits | Saints Gaming Admin",
};

export default async function AdminEconomyPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const viewer = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissionLevel: true, isWriter: true },
  });

  if (!viewer || viewer.permissionLevel < PERMISSION_LEVELS.ADMIN) {
    redirect("/not-found");
  }

  // Fetch economy statistics, marketplace listings, and inventory logs
  const [
    inventoryCount,
    gtcListings,
    inventoryLogs,
    topCoinHolders,
  ] = await Promise.all([
    prisma.playerInventoryItem.count(),
    prisma.gtcListing.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      include: { seller: { select: { name: true } } },
    }),
    prisma.inventoryLog.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      take: 10,
      orderBy: { coins: "desc" },
      select: { id: true, username: true, coins: true, xp: true, level: true },
    }),
  ]);

  const totalCoinsInCirculation = topCoinHolders.reduce((sum, u) => sum + u.coins, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Identity, Progression &amp; Economy</span>
            <span className="text-xs text-muted-foreground/40">•</span>
            <span className="text-xs text-[#cbb26a] font-mono">Marketplace &amp; Wealth</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-foreground">
            <Coins className="h-8 w-8 text-primary" />
            Player Economy &amp; Inventory Audits
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Audit player inventories, inspect Grand Trade Center marketplace listings, and track currency flow and item transactions.
          </p>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-card/40 border-border/50 sg-glass">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-mono uppercase">Inventory Items</CardDescription>
            <CardTitle className="text-2xl font-mono font-bold text-primary">{inventoryCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card/40 border-border/50 sg-glass">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-mono uppercase">GTC Market Listings</CardDescription>
            <CardTitle className="text-2xl font-mono font-bold text-amber-400">{gtcListings.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card/40 border-border/50 sg-glass">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-mono uppercase">Top 10 Wealth Pool</CardDescription>
            <CardTitle className="text-2xl font-mono font-bold text-emerald-400">
              ${totalCoinsInCirculation.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card/40 border-border/50 sg-glass">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-mono uppercase">Audit Log Entries</CardDescription>
            <CardTitle className="text-2xl font-mono font-bold text-cyan-400">{inventoryLogs.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Section 1: Wealth Leaderboard & GTC Listings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Wealth Leaderboard */}
        <Card className="bg-card/40 border-border/50 sg-glass">
          <CardHeader className="pb-3 border-b border-border/30">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-400" /> Currency Wealth Leaderboard
            </CardTitle>
            <CardDescription>Top community accounts ranked by total coin balance.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-muted/40 text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">User</th>
                  <th className="px-4 py-2.5 font-semibold">Level &amp; XP</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {topCoinHolders.map((u, idx) => (
                  <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 font-semibold flex items-center gap-2">
                      <span className="font-mono text-muted-foreground text-[10px]">#{idx + 1}</span>
                      <span>{u.username}</span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-muted-foreground">
                      Lvl {u.level} • {u.xp} XP
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-amber-400">
                      ${u.coins.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Grand Trade Center Listings */}
        <Card className="bg-card/40 border-border/50 sg-glass">
          <CardHeader className="pb-3 border-b border-border/30">
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-amber-400" /> Grand Trade Center Listings ({gtcListings.length})
            </CardTitle>
            <CardDescription>Active player marketplace sales and equipment auctions.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5">
            {gtcListings.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-4 text-center">No active listings in the Trade Center.</p>
            ) : (
              gtcListings.map((l) => (
                <div key={l.id} className="p-3 rounded-lg border border-border/40 bg-background/50 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-foreground">{l.title}</span>
                      <Badge variant="outline" className="text-[9px] font-mono">
                        {l.itemType}
                      </Badge>
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground">
                      Seller: {l.seller.name} • Listed {new Date(l.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <span className="text-amber-400 font-mono font-bold text-xs">${l.price}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

      </div>

      {/* Section 2: Transaction & Inventory Audit Trail */}
      <Card className="bg-card/40 border-border/50 sg-glass">
        <CardHeader className="pb-3 border-b border-border/30">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-5 w-5 text-primary" /> Recent Inventory Audit Logs ({inventoryLogs.length})
          </CardTitle>
          <CardDescription>Transactional logs of gathering, crafting, quest payouts, and vendor trades.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-muted/40 text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">User ID</th>
                  <th className="px-4 py-2.5 font-semibold">Item Slug</th>
                  <th className="px-4 py-2.5 font-semibold">Quantity Delta</th>
                  <th className="px-4 py-2.5 font-semibold">Reason &amp; Context</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {inventoryLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-muted-foreground italic">
                      No inventory transaction logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  inventoryLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors font-mono">
                      <td className="px-4 py-2.5 text-muted-foreground">{log.userId.slice(0, 12)}...</td>
                      <td className="px-4 py-2.5 font-bold text-foreground">{log.itemSlug}</td>
                      <td className="px-4 py-2.5 text-emerald-400">+{log.quantity}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {log.reason} {log.source ? `(${log.source})` : ""}
                      </td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">
                        {new Date(log.createdAt).toLocaleTimeString()}
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
  );
}
