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
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 pointer-events-auto backdrop-blur-sm p-4">
      <div className="sg-glass rounded-xl w-full max-w-4xl max-h-[80vh] flex flex-col border border-white/10 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/40">
          <div className="flex items-center gap-3">
            <Hammer className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold tracking-wider uppercase text-white/90">Crafting Station</h2>
          </div>
          <button 
            onClick={() => setGameMode('EXPLORING')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/50 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel: Recipe List */}
          <div className="w-1/3 border-r border-white/10 overflow-y-auto p-2 bg-black/20">
            <h3 className="text-sm font-semibold text-white/50 px-2 py-2 uppercase tracking-widest">Available Recipes</h3>
            <div className="flex flex-col gap-1 mt-2">
              {recipes.map(recipe => (
                <button
                  key={recipe.slug}
                  onClick={() => setSelectedRecipe(recipe)}
                  className={`flex flex-col text-left p-3 rounded-lg transition-all ${
                    selectedRecipe?.slug === recipe.slug 
                      ? 'bg-amber-500/20 border border-amber-500/50' 
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <span className="font-medium text-white capitalize">
                    {recipe.outputItemSlug.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-amber-400/70">
                    Lvl {recipe.levelReq} {recipe.skillSlug}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Right Panel: Recipe Details & Crafting */}
          <div className="w-2/3 p-6 flex flex-col bg-gradient-to-br from-black/40 to-transparent">
            {selectedRecipe ? (
              <div className="flex flex-col h-full">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-3xl font-bold text-white capitalize mb-1">
                      {selectedRecipe.outputItemSlug.replace('_', ' ')}
                    </h2>
                    <p className="text-sm text-white/50">
                      Requires Level {selectedRecipe.levelReq} {selectedRecipe.skillSlug}
                    </p>
                  </div>
                  <div className="bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded text-amber-400 font-mono text-sm">
                    +{selectedRecipe.xpReward} XP
                  </div>
                </div>

                <div className="mt-8">
                  <h3 className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-4">Required Materials</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedRecipe.ingredients.map((ing, idx) => (
                      <div key={idx} className="bg-black/30 border border-white/5 p-3 rounded-lg flex justify-between items-center">
                        <span className="capitalize text-white/90">{ing.itemSlug.replace('_', ' ')}</span>
                        <span className="font-mono text-white/50">x{ing.qty}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-auto">
                  {isCrafting ? (
                    <div className="w-full bg-black/50 rounded-full h-12 overflow-hidden relative border border-white/10">
                      <div 
                        className="h-full bg-amber-500 transition-all duration-75 ease-linear"
                        style={{ width: `${progress}%` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center font-bold text-white uppercase tracking-wider text-sm">
                        Crafting...
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={handleCraft}
                      className="w-full py-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold rounded-lg transition-all hover:scale-[1.01] hover:shadow-lg hover:shadow-amber-500/20 active:scale-95 uppercase tracking-wider"
                    >
                      Craft Item
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-white/30 text-lg">
                Select a recipe to begin
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
