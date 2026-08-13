import React, { useEffect, useState } from 'react';
import { useGameStore } from './store';
import { X, Hammer } from 'lucide-react';

interface CraftingRecipe {
  slug: string;
  outputItemSlug: string;
  outputQuantity: number;
  skillSlug: string;
  levelReq: number;
  xpReward: number;
  ingredients: { itemSlug: string, qty: number }[];
  timeMs: number;
}

export default function CraftingOverlay() {
  const { emitSocketEvent, gameMode, setGameMode } = useGameStore();
  const [recipes, setRecipes] = useState<CraftingRecipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<CraftingRecipe | null>(null);
  const [isCrafting, setIsCrafting] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Fake data for demo purposes, since we don't have an endpoint fetching these yet
  // In a full implementation, we'd fetch this from /api/crafting/recipes based on the station
  useEffect(() => {
    if (gameMode === 'CRAFTING') {
      setRecipes([
        {
          slug: "craft_film_standard",
          outputItemSlug: "film_standard",
          outputQuantity: 1,
          skillSlug: "crafting",
          levelReq: 1,
          xpReward: 20,
          ingredients: [
            { itemSlug: "crystal_dust", qty: 2 },
            { itemSlug: "wood_log", qty: 1 },
          ],
          timeMs: 2000,
        },
        {
          slug: "craft_iron_sword",
          outputItemSlug: "iron_sword",
          outputQuantity: 1,
          skillSlug: "smithing",
          levelReq: 1,
          xpReward: 15,
          ingredients: [{ itemSlug: "iron_ore", qty: 2 }],
          timeMs: 2000
        },
        {
          slug: "craft_wood_bow",
          outputItemSlug: "wood_bow",
          outputQuantity: 1,
          skillSlug: "fletching",
          levelReq: 1,
          xpReward: 10,
          ingredients: [{ itemSlug: "logs", qty: 3 }],
          timeMs: 1500
        }
      ]);
    }
  }, [gameMode]);

  if (gameMode !== 'CRAFTING') return null;

  const handleCraft = () => {
    if (!selectedRecipe || isCrafting || !emitSocketEvent) return;

    setIsCrafting(true);
    setProgress(0);

    // Simulate progress bar
    const interval = 50;
    const steps = selectedRecipe.timeMs / interval;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      setProgress((currentStep / steps) * 100);
      
      if (currentStep >= steps) {
        clearInterval(timer);
        setIsCrafting(false);
        setProgress(0);
        emitSocketEvent('craft_item', selectedRecipe.slug);
      }
    }, interval);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
      <div className="flex flex-col w-full max-w-2xl bg-[#050b14]/95 border border-[#22d3ee]/40 rounded-[2rem] overflow-hidden shadow-[0_0_30px_rgba(34,211,238,0.15)]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#22d3ee]/20 bg-black/40">
          <div className="flex items-center gap-3">
            <Hammer className="w-6 h-6 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
            <h2 className="text-xl font-extrabold text-cyan-50 tracking-tight drop-shadow-md">Crafting Station</h2>
          </div>
          <button 
            onClick={() => setGameMode('EXPLORING')}
            className="p-2 text-cyan-200/50 hover:bg-white/10 hover:text-cyan-100 transition-colors rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Recipe List */}
          <div className="w-1/2 border-r border-[#22d3ee]/20 overflow-y-auto p-4 custom-scrollbar bg-black/20">
            <h3 className="text-sm font-extrabold text-cyan-200/50 uppercase tracking-widest mb-3">Available Recipes</h3>
            <div className="space-y-2">
              {recipes.map(recipe => (
                <button
                  key={recipe.slug}
                  onClick={() => setSelectedRecipe(recipe)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    selectedRecipe?.slug === recipe.slug
                      ? 'border-[#22d3ee]/50 bg-cyan-500/10 shadow-[inset_0_0_12px_rgba(34,211,238,0.2)]'
                      : 'border-transparent hover:bg-white/5'
                  }`}
                >
                  <div className={`font-extrabold ${selectedRecipe?.slug === recipe.slug ? 'text-cyan-300' : 'text-cyan-50'}`}>
                    {recipe.outputItemSlug.replace('_', ' ').toUpperCase()}
                  </div>
                  <div className="text-xs font-medium text-slate-400 mt-1">
                    Req: Lvl {recipe.levelReq} {recipe.skillSlug}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Recipe Details */}
          <div className="w-1/2 p-6 flex flex-col bg-transparent">
            {selectedRecipe ? (
              <>
                <div className="flex-1">
                  <h3 className="text-2xl font-extrabold text-cyan-50 mb-2 drop-shadow-md">
                    {selectedRecipe.outputItemSlug.replace('_', ' ').toUpperCase()} x{selectedRecipe.outputQuantity}
                  </h3>
                  <div className="text-sm font-extrabold text-magenta-400 mb-6 drop-shadow-[0_0_5px_rgba(217,70,239,0.5)]">
                    +{selectedRecipe.xpReward} {selectedRecipe.skillSlug} XP
                  </div>

                  <h4 className="text-sm font-extrabold text-cyan-200/50 uppercase tracking-widest mb-3">Ingredients</h4>
                  <ul className="space-y-3">
                    {selectedRecipe.ingredients.map(ing => (
                      <li key={ing.itemSlug} className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-[#22d3ee]/10">
                        <span className="text-slate-300 font-medium capitalize">{ing.itemSlug.replace('_', ' ')}</span>
                        <span className="text-cyan-400 font-extrabold font-mono">x{ing.qty}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 pt-6 border-t border-[#22d3ee]/20">
                  {isCrafting ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-extrabold text-cyan-200/50 uppercase tracking-widest">
                        <span>Crafting...</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <div className="h-3 w-full bg-black/60 rounded-full overflow-hidden border border-[#22d3ee]/20">
                        <div 
                          className="h-full bg-cyan-400 transition-all duration-100 ease-linear shadow-[0_0_10px_rgba(34,211,238,0.8)]"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={handleCraft}
                      className="w-full py-4 bg-cyan-600/80 hover:bg-cyan-500 text-white rounded-xl font-extrabold transition-all active:scale-95 shadow-[0_0_15px_rgba(34,211,238,0.3)] border border-cyan-400"
                    >
                      Craft Item
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-cyan-200/30 font-extrabold italic">
                Select a recipe to begin
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
