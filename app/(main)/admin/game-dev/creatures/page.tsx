/* eslint-disable @next/next/no-img-element */
import { prisma } from '@/web/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Gamepad2 } from 'lucide-react';
import Link from 'next/link';

export default async function CreaturesAdminPage() {
  const speciesList = await prisma.creatureTemplate.findMany({
    include: {
      stats: true,
      learnedAbilities: true,
      evolutions: true,
    },
    orderBy: {
      dexNumber: 'asc',
    },
    take: 100,
  });

  const totalCount = await prisma.creatureTemplate.count();
  const totalMoves = await prisma.abilityDictionary.count();

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/50 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">World &amp; MMO</span>
            <span className="text-xs text-muted-foreground/40">•</span>
            <span className="text-xs text-[#cbb26a] font-mono">Creature Catalog</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-foreground">
            <Gamepad2 className="h-8 w-8 text-primary" />
            Saints Beast &amp; Species Catalog
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Browse and inspect all registered Saints Beast species, elemental types, base combat stats, and technique movesets.
          </p>
        </div>
        <Link
          href="/lobby"
          className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg text-xs tracking-wider uppercase transition-all shadow-md"
        >
          Play In Lobby &rarr;
        </Link>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-mono uppercase">Total Species</CardDescription>
            <CardTitle className="text-2xl font-mono font-bold text-cyan-400">{totalCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-mono uppercase">Total Techniques</CardDescription>
            <CardTitle className="text-2xl font-mono font-bold text-emerald-400">{totalMoves}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-mono uppercase">Element Types</CardDescription>
            <CardTitle className="text-2xl font-mono font-bold text-purple-400">14 Elements</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Species Grid */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Registered Creatures (First 100)</CardTitle>
          <CardDescription>Species metadata synced directly from Prisma SQLite database.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {speciesList.map((species) => {
              const types = Array.isArray(species.types) ? species.types : [];
              return (
                <div
                  key={species.id}
                  className="bg-background/80 border border-border/50 hover:border-cyan-500/50 rounded-xl p-4 flex flex-col gap-3 transition-colors shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 bg-black/70 rounded-lg flex items-center justify-center border border-cyan-500/30 overflow-hidden shrink-0">
                      {species.spriteFront ? (
                        <img
                          src={species.spriteFront}
                          alt={species.speciesName}
                          className="w-12 h-12 object-contain pixelated"
                          style={{ imageRendering: 'pixelated' }}
                        />
                      ) : (
                        <span className="text-cyan-400 font-mono font-bold text-xs">#{species.dexNumber}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-base truncate text-foreground">{species.speciesName}</h3>
                      <span className="text-xs text-muted-foreground font-mono">#{species.dexNumber}</span>
                    </div>
                  </div>

                  <div className="flex gap-1 flex-wrap">
                    {types.map((type: string, idx: number) => (
                      <span
                        key={idx}
                        className="text-[10px] px-2 py-0.5 bg-cyan-950/60 text-cyan-300 border border-cyan-800 rounded font-mono font-bold uppercase"
                      >
                        {type}
                      </span>
                    ))}
                  </div>

                  {species.stats && (
                    <div className="grid grid-cols-3 gap-1 text-[10px] text-muted-foreground font-mono bg-muted/30 p-2 rounded border border-border/40">
                      <span>HP: {species.stats.hp}</span>
                      <span>ATK: {species.stats.physicalPower}</span>
                      <span>SPD: {species.stats.combatTempo}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
