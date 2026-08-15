'use client';

import React, { useEffect, useState } from 'react';
import { useGameStore } from './store';
import { HudPanelShell } from './hud/HudPanelShell';
import { soundSynth } from '@/engine/sound-synth';
import { Hammer, Sparkles, Shield, Sword, Wand2, FlaskConical, Filter, ChevronRight, Check } from 'lucide-react';

interface CraftingRecipe {
  slug: string;
  name: string;
  outputItemSlug: string;
  outputQuantity: number;
  skillSlug: 'smithing' | 'crafting' | 'fletching' | 'alchemy';
  levelReq: number;
  xpReward: number;
  ingredients: { itemSlug: string; qty: number }[];
  timeMs: number;
}

const RECIPE_CATALOG: CraftingRecipe[] = [
  {
    slug: 'craft_binding_crystal',
    name: 'Binding Crystal',
    outputItemSlug: 'binding_crystal',
    outputQuantity: 1,
    skillSlug: 'crafting',
    levelReq: 1,
    xpReward: 25,
    ingredients: [
      { itemSlug: 'crystal_dust', qty: 2 },
      { itemSlug: 'refined_flux', qty: 1 },
    ],
    timeMs: 1800,
  },
  {
    slug: 'craft_iron_sword',
    name: 'Refined Iron Longsword',
    outputItemSlug: 'iron_sword',
    outputQuantity: 1,
    skillSlug: 'smithing',
    levelReq: 5,
    xpReward: 35,
    ingredients: [
      { itemSlug: 'iron_bar', qty: 3 },
      { itemSlug: 'oak_wood', qty: 1 },
    ],
    timeMs: 2200,
  },
  {
    slug: 'craft_shadow_bow',
    name: 'Oak Recurve Bow',
    outputItemSlug: 'oak_bow',
    outputQuantity: 1,
    skillSlug: 'fletching',
    levelReq: 3,
    xpReward: 20,
    ingredients: [
      { itemSlug: 'oak_wood', qty: 3 },
      { itemSlug: 'bow_string', qty: 1 },
    ],
    timeMs: 1600,
  },
  {
    slug: 'craft_vitality_potion',
    name: 'Vitality Draught',
    outputItemSlug: 'vitality_draught',
    outputQuantity: 1,
    skillSlug: 'alchemy',
    levelReq: 2,
    xpReward: 30,
    ingredients: [
      { itemSlug: 'grimy_herb', qty: 2 },
      { itemSlug: 'pure_water', qty: 1 },
    ],
    timeMs: 1400,
  },
  {
    slug: 'craft_film_standard',
    name: 'Holo Capture Film',
    outputItemSlug: 'film_standard',
    outputQuantity: 2,
    skillSlug: 'crafting',
    levelReq: 1,
    xpReward: 20,
    ingredients: [
      { itemSlug: 'crystal_dust', qty: 2 },
      { itemSlug: 'wood_log', qty: 1 },
    ],
    timeMs: 1500,
  },
];

export default function CraftingOverlay() {
  const { emitSocketEvent, gameMode, setGameMode, showToast } = useGameStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedRecipe, setSelectedRecipe] = useState<CraftingRecipe | null>(RECIPE_CATALOG[0]);
  const [isCrafting, setIsCrafting] = useState(false);
  const [progress, setProgress] = useState(0);

  if (gameMode !== 'CRAFTING') return null;

  const filteredRecipes = selectedCategory === 'all'
    ? RECIPE_CATALOG
    : RECIPE_CATALOG.filter(r => r.skillSlug === selectedCategory);

  const handleCraft = () => {
    if (!selectedRecipe || isCrafting) return;

    soundSynth?.playMiningSound?.();
    setIsCrafting(true);
    setProgress(0);

    const interval = 50;
    const steps = selectedRecipe.timeMs / interval;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      setProgress((currentStep / steps) * 100);

      if (currentStep % 8 === 0) {
        soundSynth?.playMiningSound?.();
      }

      if (currentStep >= steps) {
        clearInterval(timer);
        setIsCrafting(false);
        setProgress(0);
        soundSynth?.playLevelUpSound?.();
        emitSocketEvent?.('craft_item', selectedRecipe.slug);
        showToast?.(`Forged ${selectedRecipe.name} (+${selectedRecipe.xpReward} ${selectedRecipe.skillSlug} XP)!`);
      }
    }, interval);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <HudPanelShell
        title="FORGE & CRAFTING STATION"
        icon={<Hammer className="w-5 h-5 text-cyan-400" />}
        headerRight={
          <span className="text-[9px] px-2 py-0.5 rounded font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
            ANVIL & CRUCIBLE
          </span>
        }
        onClose={() => {
          soundSynth?.playSelectSound?.();
          setGameMode('EXPLORING');
        }}
        className="w-full max-w-4xl h-[620px]"
      >
        <div className="flex flex-col md:flex-row h-full gap-4 overflow-hidden font-mono">
          
          {/* Left Column: Category Filters & Recipe List */}
          <div className="w-full md:w-5/12 flex flex-col gap-2 overflow-hidden">
            {/* Filter Chips */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px]">
              {['all', 'smithing', 'crafting', 'fletching', 'alchemy'].map(cat => (
                <button
                  key={cat}
                  onClick={() => {
                    soundSynth?.playSelectSound?.();
                    setSelectedCategory(cat);
                  }}
                  className={`px-2.5 py-1 rounded-md uppercase font-bold transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/50 shadow-[0_0_8px_rgba(6,182,212,0.25)]'
                      : 'bg-black/40 text-slate-400 border border-slate-800 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Recipe List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
              {filteredRecipes.map(recipe => {
                const isSelected = selectedRecipe?.slug === recipe.slug;
                return (
                  <div
                    key={recipe.slug}
                    onClick={() => {
                      soundSynth?.playSelectSound?.();
                      setSelectedRecipe(recipe);
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-cyan-400/80 bg-cyan-950/30 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                        : 'border-slate-800 bg-black/40 hover:border-cyan-500/40 hover:bg-black/60'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-white text-xs flex items-center gap-2">
                        {recipe.name}
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/5 text-cyan-300 uppercase">
                          {recipe.skillSlug}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        Req: Lvl {recipe.levelReq} • +{recipe.xpReward} XP
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-cyan-400' : 'text-slate-600'}`} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Recipe Blueprint, Ingredients & Forge Control */}
          <div className="w-full md:w-7/12 flex flex-col justify-between bg-black/40 border border-cyan-500/20 rounded-2xl p-4 overflow-y-auto">
            {selectedRecipe ? (
              <>
                <div>
                  <div className="flex items-start justify-between border-b border-cyan-500/20 pb-3 mb-3">
                    <div>
                      <h3 className="text-base font-black text-white uppercase tracking-wider">{selectedRecipe.name}</h3>
                      <div className="text-xs text-cyan-300 flex items-center gap-2 mt-0.5">
                        <span>Yield: x{selectedRecipe.outputQuantity}</span>
                        <span>•</span>
                        <span className="text-emerald-400 font-bold">+{selectedRecipe.xpReward} {selectedRecipe.skillSlug} XP</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] rounded bg-cyan-500/20 border border-cyan-400/30 text-cyan-200 uppercase font-bold">
                      LVL {selectedRecipe.levelReq} REQ
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    REAGENTS & MATERIALS REQUIRED
                  </h4>

                  <div className="space-y-2 mb-4">
                    {selectedRecipe.ingredients.map(ing => (
                      <div 
                        key={ing.itemSlug}
                        className="p-2.5 rounded-lg bg-black/60 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <span className="text-slate-300 capitalize">{ing.itemSlug.replace('_', ' ')}</span>
                        <span className="text-cyan-400 font-bold">x{ing.qty} Required</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Forging Action Bar */}
                <div className="pt-3 border-t border-cyan-500/20">
                  {isCrafting ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-[11px] font-bold text-cyan-300">
                        <span>FORGING IN PROGRESS...</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <div className="h-3 w-full bg-black/80 rounded-full overflow-hidden border border-cyan-500/40">
                        <div 
                          className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-75 shadow-[0_0_10px_rgba(6,182,212,0.8)]"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={handleCraft}
                      className="w-full py-3 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-[0_0_15px_rgba(6,182,212,0.35)] border border-cyan-300 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Hammer className="w-4 h-4" />
                      FORGE RECIPE
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 italic text-xs">
                Select a recipe from the list to view requirements.
              </div>
            )}
          </div>

        </div>
      </HudPanelShell>
    </div>
  );
}

