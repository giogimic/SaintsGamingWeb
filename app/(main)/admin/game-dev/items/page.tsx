import { auth } from "@/auth";
import { prisma } from "@/web/lib/prisma";
import { PERMISSION_LEVELS } from "@/web/lib/permissions";
import { redirect } from "next/navigation";
import { 
  Sword, Hammer, Sparkles, BookOpen, 
  Shield, Plus, Package, Clock, Zap
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";

export const metadata = {
  title: "Item & Crafting Templates | Saints Gaming Admin",
};

export default async function AdminItemsCraftingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const viewer = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissionLevel: true, isWriter: true },
  });

  if (!viewer || (viewer.permissionLevel < PERMISSION_LEVELS.DEVELOPER && !viewer.isWriter)) {
    redirect("/not-found");
  }

  // Fetch items, crafting recipes, and professions
  const [items, recipes, professions, legacyItems] = await Promise.all([
    prisma.itemTemplate.findMany({
      take: 50,
      orderBy: { slug: "asc" },
    }),
    prisma.craftingRecipe.findMany({
      take: 50,
      include: { ingredients: true },
      orderBy: { slug: "asc" },
    }),
    prisma.professionTemplate.findMany({
      take: 20,
      orderBy: { slug: "asc" },
    }),
    prisma.gameItem.findMany({
      take: 50,
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
            <span className="text-xs text-[#cbb26a] font-mono">Economy Engine</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-foreground">
            <Sword className="h-8 w-8 text-primary" />
            Items, Crafting &amp; Professions
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage weapons, armor, tools, crafting recipes, gathering professions, and stat multipliers across the Saints MMO.
          </p>
        </div>
      </div>

      {/* Overview Stat Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-card/40 border-border/50 sg-glass">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-mono uppercase">Item Templates</CardDescription>
            <CardTitle className="text-2xl font-mono font-bold text-primary">{items.length + legacyItems.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card/40 border-border/50 sg-glass">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-mono uppercase">Crafting Recipes</CardDescription>
            <CardTitle className="text-2xl font-mono font-bold text-amber-400">{recipes.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card/40 border-border/50 sg-glass">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-mono uppercase">Professions</CardDescription>
            <CardTitle className="text-2xl font-mono font-bold text-cyan-400">{professions.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card/40 border-border/50 sg-glass">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-mono uppercase">Recipe Ingredients</CardDescription>
            <CardTitle className="text-2xl font-mono font-bold text-emerald-400">
              {recipes.reduce((sum, r) => sum + r.ingredients.length, 0)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Section 1: Item Templates */}
      <Card className="bg-card/40 border-border/50 sg-glass">
        <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-border/30">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" /> Item Templates ({items.length + legacyItems.length})
            </CardTitle>
            <CardDescription>Weapons, armor, consumable items, and gathering resources in the database.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {items.length === 0 && legacyItems.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-4 text-center">No item templates registered yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map((item) => (
                <div key={item.id} className="p-3 rounded-lg border border-border/40 bg-background/50 space-y-1.5 hover:border-primary/40 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-foreground truncate">{item.name}</span>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      Tier {item.tier}
                    </Badge>
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground truncate">slug: {item.slug}</div>
                  <div className="flex items-center gap-1 flex-wrap pt-1">
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
                      {item.category}
                    </Badge>
                    {item.subCategory && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                        {item.subCategory}
                      </Badge>
                    )}
                    {item.baseDurability ? (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-amber-400 border-amber-500/30">
                        Dur: {item.baseDurability}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-emerald-400 border-emerald-500/30">
                        Indestructible
                      </Badge>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2 pt-1">{item.description}</p>
                  )}
                </div>
              ))}

              {legacyItems.map((lItem) => (
                <div key={lItem.slug} className="p-3 rounded-lg border border-border/40 bg-background/50 space-y-1.5 hover:border-primary/40 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-foreground truncate">{lItem.name}</span>
                    <Badge variant="secondary" className="text-[10px] font-mono bg-muted text-muted-foreground">
                      Legacy Item
                    </Badge>
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground truncate">slug: {lItem.slug}</div>
                  <div className="flex items-center gap-1 flex-wrap pt-1">
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                      {lItem.category}
                    </Badge>
                    {lItem.price && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-amber-400 border-amber-500/30">
                        ${lItem.price} Gold
                      </Badge>
                    )}
                  </div>
                  {lItem.description && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2 pt-1">{lItem.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Crafting Recipes & Professions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Crafting Recipes */}
        <Card className="bg-card/40 border-border/50 sg-glass">
          <CardHeader className="pb-3 border-b border-border/30">
            <CardTitle className="text-base flex items-center gap-2">
              <Hammer className="h-5 w-5 text-amber-400" /> Crafting Recipes ({recipes.length})
            </CardTitle>
            <CardDescription>Formulas for crafting weapons, consumables, and gear.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {recipes.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-4 text-center">No crafting recipes found.</p>
            ) : (
              recipes.map((r) => (
                <div key={r.id} className="p-3 rounded-lg border border-border/40 bg-background/50 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                      <span>{r.outputQuantity}x {r.outputItemSlug}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono text-[#cbb26a] border-[#cbb26a]/30">
                      {r.skillSlug} (Lvl {r.levelReq})
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-3">
                    <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-amber-400" /> +{r.xpReward} XP</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-cyan-400" /> {r.timeMs / 1000}s craft time</span>
                  </div>
                  <div className="pt-1 border-t border-border/30">
                    <span className="text-[10px] uppercase font-mono text-muted-foreground block mb-1">Required Ingredients:</span>
                    <div className="flex gap-1.5 flex-wrap">
                      {r.ingredients.map((ing) => (
                        <Badge key={ing.id} variant="secondary" className="text-[10px] font-mono">
                          {ing.quantity}x {ing.itemSlug}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Professions */}
        <Card className="bg-card/40 border-border/50 sg-glass">
          <CardHeader className="pb-3 border-b border-border/30">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-cyan-400" /> Gathering &amp; Artisan Professions ({professions.length})
            </CardTitle>
            <CardDescription>Life skills, max level caps, and mastery milestones.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {professions.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-4 text-center">No professions registered in database.</p>
            ) : (
              professions.map((prof) => (
                <div key={prof.id} className="p-3 rounded-lg border border-border/40 bg-background/50 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-foreground">{prof.name}</span>
                    <Badge variant="outline" className="text-[10px] font-mono" style={{ borderColor: prof.themeColor, color: prof.themeColor }}>
                      {prof.category}
                    </Badge>
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground">
                    Max Level: {prof.maxLevel} • XP Curve: {prof.xpCurve}
                  </div>
                  {prof.tagline && (
                    <p className="text-[11px] text-muted-foreground italic">&ldquo;{prof.tagline}&rdquo;</p>
                  )}
                  {prof.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{prof.description}</p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

      </div>

    </div>
  );
}
