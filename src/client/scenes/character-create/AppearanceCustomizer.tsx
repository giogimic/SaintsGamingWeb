import React from 'react';
import { ArrowRight, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { CharacterSpritePreview } from '@/client/ui/shared/CharacterSpritePreview';
import { soundSynth } from '@/engine/sound-synth';

export interface AppearanceCustomizerProps {
  name: string;
  classId: string;
  activeLayers: string[];
  assetProfileId: string;
  selectedCape: string | null;
  selectedHat: string | null;
  selectedArmor: string | null;
  dynamicBases: any[];
  dynamicCapes: any[];
  dynamicHats: any[];
  dynamicArmor: any[];
  appearanceTab: 'BASE' | 'CAPE' | 'HEAD' | 'ARMOR' | 'CATALOG';
  setAppearanceTab: (tab: 'BASE' | 'CAPE' | 'HEAD' | 'ARMOR' | 'CATALOG') => void;
  setAssetProfileId: (id: string) => void;
  setSelectedCape: (id: string | null) => void;
  setSelectedHat: (id: string | null) => void;
  setSelectedArmor: (id: string | null) => void;
  onProceed: () => void;
  spriteSearch: string;
  setSpriteSearch: (search: string) => void;
  spritePage: number;
  setSpritePage: (page: number | ((p: number) => number)) => void;
  totalSpritePages: number;
  currentSprites: string[];
}

export function AppearanceCustomizer({
  name,
  classId,
  activeLayers,
  assetProfileId,
  selectedCape,
  selectedHat,
  selectedArmor,
  dynamicBases,
  dynamicCapes,
  dynamicHats,
  dynamicArmor,
  appearanceTab,
  setAppearanceTab,
  setAssetProfileId,
  setSelectedCape,
  setSelectedHat,
  setSelectedArmor,
  onProceed,
  spriteSearch,
  setSpriteSearch,
  spritePage,
  setSpritePage,
  totalSpritePages,
  currentSprites,
}: AppearanceCustomizerProps) {
  return (
    <div className="w-full flex flex-col items-center">
      <div className="text-center mb-4">
        <h2 className="text-2xl sm:text-3xl font-black uppercase font-mono tracking-wider mb-1 text-foreground">
          <span className="sg-text-gradient">Hero Customization</span>
        </h2>
        <p className="text-muted-foreground text-xs font-mono tracking-wide">
          Modular Sprite System: Customize base body, capes, headgear & armor
        </p>
      </div>

      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Selected Preview Stage */}
        <div className="lg:col-span-4 bg-[#050b14]/95 border border-border/50 rounded-2xl p-5 flex flex-col items-center justify-between text-center">
          <div>
            <span className="px-3 py-1 rounded-full bg-primary/20 border border-primary/40 text-primary text-[10px] font-mono font-bold uppercase tracking-wider">
              Hero Preview
            </span>
            <h3 className="text-lg font-bold font-mono text-foreground mt-2">{name || 'Hero'}</h3>
            <span className="text-xs font-mono text-primary font-bold">{classId}</span>
          </div>

          <div className="w-32 h-32 rounded-2xl bg-black/80 border-2 border-primary/60 flex items-center justify-center my-3 shadow-[0_0_25px_rgba(234,179,8,0.2)]">
            <CharacterSpritePreview layers={activeLayers} size={32} scale={2.8} />
          </div>

          {/* Layer Badges */}
          <div className="flex flex-wrap gap-1.5 justify-center mb-3">
            <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-card border border-border text-foreground">
              Base: {dynamicBases.find((b: any) => b.id === assetProfileId)?.label || assetProfileId}
            </span>
            {selectedCape && (
              <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-card border border-border text-foreground">
                Cape: {dynamicCapes.find((c: any) => c.id === selectedCape)?.label}
              </span>
            )}
            {selectedHat && (
              <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-card border border-border text-foreground">
                Hat: {dynamicHats.find((h: any) => h.id === selectedHat)?.label}
              </span>
            )}
            {selectedArmor && (
              <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-card border border-border text-foreground">
                Armor: {dynamicArmor.find((a: any) => a.id === selectedArmor)?.label}
              </span>
            )}
          </div>

          <div className="w-full pt-3 border-t border-border/40">
            <button
              onClick={onProceed}
              className="w-full py-2.5 rounded-xl font-mono font-bold text-xs uppercase bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(234,179,8,0.2)] cursor-pointer flex items-center justify-center gap-2"
            >
              Confirm Appearance <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Modular Deck & Tabs */}
        <div className="lg:col-span-8 bg-[#050b14]/95 border border-border/50 rounded-2xl p-4 flex flex-col justify-between">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 border-b border-border/40 pb-3 mb-3 overflow-x-auto">
            {(
              [
                { id: 'BASE', label: '1. Body Base' },
                { id: 'CAPE', label: '2. Cape' },
                { id: 'HEAD', label: '3. Headgear' },
                { id: 'ARMOR', label: '4. Armor & Gear' },
                { id: 'CATALOG', label: '5. All Sprites' },
              ] as const
            ).map((tab) => {
              const isTabCur = appearanceTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    soundSynth?.playSelectSound?.();
                    setAppearanceTab(tab.id);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-mono text-xs uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                    isTabCur
                      ? 'bg-primary text-primary-foreground font-bold shadow-[0_0_12px_rgba(234,179,8,0.25)]'
                      : 'bg-card/60 hover:bg-card text-muted-foreground hover:text-foreground border border-border/40'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* TAB CONTENT */}
          <div className="flex-1 min-h-[260px] max-h-[300px] overflow-y-auto p-1 scrollbar-thin">
            {/* TAB: BASE */}
            {appearanceTab === 'BASE' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {dynamicBases.map((b: any) => {
                  const isCur = assetProfileId === b.id;
                  return (
                    <div
                      key={b.id}
                      onClick={() => {
                        soundSynth?.playSelectSound?.();
                        setAssetProfileId(b.id);
                      }}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-between cursor-pointer transition-all ${
                        isCur
                          ? 'bg-primary/20 border-primary shadow-[0_0_15px_rgba(234,179,8,0.3)] scale-[1.02]'
                          : 'bg-[#0a1628]/80 border-border/40 hover:border-primary/50 hover:scale-[1.02]'
                      }`}
                    >
                      <div className="w-14 h-14 flex items-center justify-center">
                        <CharacterSpritePreview assetProfileId={b.id} size={32} scale={1.4} />
                      </div>
                      <span className="text-[11px] font-mono font-bold text-foreground mt-1 text-center line-clamp-1">
                        {b.label}
                      </span>
                      <span className="text-[9px] font-mono text-primary uppercase">
                        {b.tag}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB: CAPE */}
            {appearanceTab === 'CAPE' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {dynamicCapes.map((cape: any) => {
                  const isCur = selectedCape === cape.id;
                  return (
                    <div
                      key={cape.label}
                      onClick={() => {
                        soundSynth?.playSelectSound?.();
                        setSelectedCape(cape.id);
                      }}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-between cursor-pointer transition-all ${
                        isCur
                          ? 'bg-primary/20 border-primary shadow-[0_0_15px_rgba(234,179,8,0.3)] scale-[1.02]'
                          : 'bg-[#0a1628]/80 border-border/40 hover:border-primary/50 hover:scale-[1.02]'
                      }`}
                    >
                      <div className="w-14 h-14 flex items-center justify-center">
                        {cape.id ? (
                          <CharacterSpritePreview assetProfileId={cape.id} size={32} scale={1.4} />
                        ) : (
                          <span className="text-xs font-mono text-muted-foreground">None</span>
                        )}
                      </div>
                      <span className="text-xs font-mono font-bold text-foreground mt-1 text-center">
                        {cape.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB: HEAD */}
            {appearanceTab === 'HEAD' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {dynamicHats.map((hat: any) => {
                  const isCur = selectedHat === hat.id;
                  return (
                    <div
                      key={hat.label}
                      onClick={() => {
                        soundSynth?.playSelectSound?.();
                        setSelectedHat(hat.id);
                      }}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-between cursor-pointer transition-all ${
                        isCur
                          ? 'bg-primary/20 border-primary shadow-[0_0_15px_rgba(234,179,8,0.3)] scale-[1.02]'
                          : 'bg-[#0a1628]/80 border-border/40 hover:border-primary/50 hover:scale-[1.02]'
                      }`}
                    >
                      <div className="w-14 h-14 flex items-center justify-center">
                        {hat.id ? (
                          <CharacterSpritePreview assetProfileId={hat.id} size={32} scale={1.4} />
                        ) : (
                          <span className="text-xs font-mono text-muted-foreground">None</span>
                        )}
                      </div>
                      <span className="text-xs font-mono font-bold text-foreground mt-1 text-center">
                        {hat.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB: ARMOR */}
            {appearanceTab === 'ARMOR' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {dynamicArmor.map((armor: any) => {
                  const isCur = selectedArmor === armor.id;
                  return (
                    <div
                      key={armor.label}
                      onClick={() => {
                        soundSynth?.playSelectSound?.();
                        setSelectedArmor(armor.id);
                      }}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-between cursor-pointer transition-all ${
                        isCur
                          ? 'bg-primary/20 border-primary shadow-[0_0_15px_rgba(234,179,8,0.3)] scale-[1.02]'
                          : 'bg-[#0a1628]/80 border-border/40 hover:border-primary/50 hover:scale-[1.02]'
                      }`}
                    >
                      <div className="w-14 h-14 flex items-center justify-center">
                        {armor.id ? (
                          <CharacterSpritePreview assetProfileId={armor.id} size={32} scale={1.4} />
                        ) : (
                          <span className="text-xs font-mono text-muted-foreground">None</span>
                        )}
                      </div>
                      <span className="text-xs font-mono font-bold text-foreground mt-1 text-center">
                        {armor.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB: CATALOG (Full Sprites) */}
            {appearanceTab === 'CATALOG' && (
              <div>
                {/* Search & Filter Header */}
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={spriteSearch}
                      onChange={(e) => {
                        setSpriteSearch(e.target.value);
                        setSpritePage(0);
                      }}
                      placeholder="Filter sprite catalog..."
                      className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-card/60 border border-border/50 text-foreground placeholder:text-muted-foreground text-xs font-mono focus:outline-none focus:border-primary"
                    />
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                    <button
                      onClick={() => setSpritePage((p: number) => Math.max(0, p - 1))}
                      disabled={spritePage === 0}
                      className="p-1.5 rounded bg-card hover:bg-card/80 text-foreground disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <span>{spritePage + 1}/{totalSpritePages}</span>
                    <button
                      onClick={() => setSpritePage((p: number) => Math.min(totalSpritePages - 1, p + 1))}
                      disabled={spritePage >= totalSpritePages - 1}
                      className="p-1.5 rounded bg-card hover:bg-card/80 text-foreground disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>

                {/* Sprite Grid */}
                <div className="grid grid-cols-6 gap-2 max-h-[200px] overflow-y-auto p-1 scrollbar-thin">
                  {currentSprites.map((sprite: string) => {
                    const isCur = assetProfileId === sprite;
                    return (
                      <div
                        key={sprite}
                        onClick={() => {
                          soundSynth?.playSelectSound?.();
                          setAssetProfileId(sprite);
                        }}
                        className={`p-2 rounded-xl border flex flex-col items-center justify-center cursor-pointer transition-all ${
                          isCur
                            ? 'bg-primary/20 border-primary shadow-[0_0_15px_rgba(234,179,8,0.3)] scale-105'
                            : 'bg-[#0a1628]/80 border-border/40 hover:border-primary/50 hover:scale-105'
                        }`}
                      >
                        <CharacterSpritePreview assetProfileId={sprite} size={32} scale={1.5} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="text-[10px] font-mono text-muted-foreground text-center pt-2 border-t border-border/40 mt-2">
            ✦ Layered Modular Character Ingestion ✦
          </div>
        </div>
      </div>
    </div>
  );
}
