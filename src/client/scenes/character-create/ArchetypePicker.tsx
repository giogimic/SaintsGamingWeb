import React from 'react';
import { Loader2, Dice5, ChevronRight } from 'lucide-react';
import { CharacterSpritePreview } from '@/client/ui/shared/CharacterSpritePreview';

interface ArchetypePickerProps {
  starterHeroes: any[];
  heroesLoading: boolean;
  classDefs: any[];
  selectedHeroSlug: string | null;
  onSelect: (hero: any) => void;
  onRandomize: () => void;
}

export function ArchetypePicker({
  starterHeroes,
  heroesLoading,
  classDefs,
  selectedHeroSlug,
  onSelect,
  onRandomize,
}: ArchetypePickerProps) {
  return (
    <div className="w-full flex flex-col items-center">
      <div className="text-center mb-6">
        <h2 className="text-2xl sm:text-3xl font-black uppercase font-mono tracking-wider mb-1 text-foreground">
          <span className="sg-text-gradient">Choose Your Hero Archetype</span>
        </h2>
        <p className="text-muted-foreground text-xs font-mono tracking-wide">
          Select a foundation archetype to begin your journey with tuned stats and starting abilities
        </p>

        {starterHeroes.length > 0 && !heroesLoading && (
          <div className="mt-3 flex justify-center">
            <button
              type="button"
              onClick={onRandomize}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card/80 hover:bg-card border border-primary/40 text-primary hover:text-foreground font-mono text-xs font-bold uppercase tracking-wider transition-all hover:scale-105 shadow-[0_0_15px_rgba(234,179,8,0.15)] cursor-pointer"
              title="Randomly selects a hero archetype and appearance"
            >
              <Dice5 size={14} className="text-primary" />
              Random Hero (Archetype & Class)
            </button>
          </div>
        )}
      </div>

      {heroesLoading ? (
        <div className="flex flex-col items-center py-16">
          <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
          <p className="text-xs font-mono text-muted-foreground">Loading Hero Archetypes...</p>
        </div>
      ) : starterHeroes.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <p className="text-sm font-mono text-destructive">No archetypes available. Please create archetypes in the Hero Studio or Game Setup.</p>
        </div>
      ) : (
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto p-1 scrollbar-thin">
          {starterHeroes.map((hero) => {
            const isSelected = selectedHeroSlug === hero.slug;
            return (
              <div
                key={hero.slug}
                onClick={() => onSelect(hero)}
                className={`cursor-pointer rounded-xl p-4 transition-all group flex flex-col justify-between border ${
                  isSelected
                    ? 'bg-[#0a1628] border-primary ring-2 ring-primary/60 shadow-[0_0_25px_rgba(234,179,8,0.25)] scale-[1.02]'
                    : 'bg-[#050b14]/90 border-border/50 hover:border-primary/50 hover:bg-[#0a1628]/80 hover:scale-[1.01]'
                }`}
              >
                <div>
                  {/* Tag & Class Badge */}
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase"
                      style={{ backgroundColor: `${hero.tagColor}22`, color: hero.tagColor, border: `1px solid ${hero.tagColor}44` }}
                    >
                      {hero.tag}
                    </span>
                    <span className="text-[10px] font-mono text-primary font-bold uppercase">
                      {hero.classId}
                    </span>
                  </div>

                  {/* Character Sprite Preview */}
                  <div className="w-20 h-20 rounded-xl bg-black/60 border border-border/50 mx-auto my-2.5 flex items-center justify-center shadow-inner group-hover:border-primary/60 transition-all overflow-hidden">
                    <CharacterSpritePreview assetProfileId={hero.assetProfileId} size={32} scale={1.8} />
                  </div>

                  {/* Name & Flavor */}
                  <div className="text-center mt-2">
                    <h3 className="text-sm font-bold font-mono text-foreground group-hover:text-primary transition-colors">
                      {hero.name}
                    </h3>
                    <p className="text-[11px] font-sans text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      {hero.flavor}
                    </p>
                  </div>
                </div>

                {/* Pick Button */}
                <div className="mt-3 pt-2.5 border-t border-border/30 text-center">
                  <span className="text-[11px] font-mono font-semibold text-primary group-hover:text-foreground uppercase tracking-wider flex items-center justify-center gap-1">
                    Select Archetype <ChevronRight size={12} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
