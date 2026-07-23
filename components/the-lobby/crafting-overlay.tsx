'use client';

import { useGameStore } from './store';
import RpgPanel from './rpg-panel';
import { CRAFTING_RECIPES, getItem } from './data/items';

export default function CraftingOverlay() {
  const inventory = useGameStore(state => state.player.inventory);
  const skills = useGameStore(state => state.player.skills);
  const setGameMode = useGameStore(state => state.setGameMode);
  const modifyInventory = useGameStore(state => state.modifyInventory);
  const gainSkillXp = useGameStore(state => state.gainSkillXp);
  const showToast = useGameStore(state => state.showToast);

  const handleCraft = (recipe: typeof CRAFTING_RECIPES[0]) => {
    // Check level req
    const playerLevel = skills[recipe.skill]?.level || 1;
    if (playerLevel < recipe.levelReq) {
      showToast(`Requires ${recipe.skill} level ${recipe.levelReq}`);
      return;
    }

    // Check ingredients
    const missing: string[] = [];
    Object.entries(recipe.ingredients).forEach(([itemId, qty]) => {
      if ((inventory[itemId] || 0) < qty) {
        missing.push(getItem(itemId)?.name || itemId);
      }
    });

    if (missing.length > 0) {
      showToast(`Missing: ${missing.join(', ')}`);
      return;
    }

    // Consume ingredients
    Object.entries(recipe.ingredients).forEach(([itemId, qty]) => {
      modifyInventory(itemId, -qty);
    });

    // Roll ARPG Rarity & Affixes
    const roll = Math.random();
    let rarity = 'Common';
    let affixMsg = '';
    if (roll < 0.01) {
      rarity = 'LEGENDARY';
      affixMsg = ' (+25% Damage, +15% XP, Lifesteal)';
    } else if (roll < 0.05) {
      rarity = 'EPIC';
      affixMsg = ' (+15% Damage, +10% XP)';
    } else if (roll < 0.15) {
      rarity = 'RARE';
      affixMsg = ' (+10% Damage)';
    } else if (roll < 0.35) {
      rarity = 'UNCOMMON';
      affixMsg = ' (+5% Damage)';
    }

    // Grant Item
    modifyInventory(recipe.resultItemId, 1);
    
    // Grant XP
    gainSkillXp(recipe.skill, recipe.xpReward);

    const resultItem = getItem(recipe.resultItemId);
    const prefix = rarity !== 'Common' ? `[${rarity}] ` : '';
    showToast(`Crafted ${prefix}${resultItem?.name}!${affixMsg} (+${recipe.xpReward} ${recipe.skill} XP)`);
  };

  return (
    <RpgPanel title="CRAFTING STATION" onClose={() => setGameMode('EXPLORING')}>
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
        {CRAFTING_RECIPES.map(recipe => {
          const resultItem = getItem(recipe.resultItemId);
          if (!resultItem) return null;

          const playerLevel = skills[recipe.skill]?.level || 1;
          const canCraft = playerLevel >= recipe.levelReq;

          return (
            <div key={recipe.id} className={`bg-black/40 border-2 rounded p-4 ${canCraft ? 'border-[#8d6e63]' : 'border-[#3e2723] opacity-60'}`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className={`font-bold text-lg ${canCraft ? 'text-[#e0e0e0]' : 'text-slate-500'}`}>
                    {resultItem.name}
                  </h3>
                  <div className="text-[10px] text-yellow-500 font-mono">
                    Requires {recipe.skill} Lvl {recipe.levelReq}
                  </div>
                </div>
                
                <button
                  onClick={() => handleCraft(recipe)}
                  className={`px-4 py-2 font-bold rounded shadow transition-colors ${
                    canCraft 
                      ? 'bg-[#4e342e] text-white hover:bg-[#5d4037] border border-[#795548]' 
                      : 'bg-[#271c19] text-slate-500 border border-[#3e2723] cursor-not-allowed'
                  }`}
                >
                  CRAFT
                </button>
              </div>

              <div className="mt-3">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block mb-1">Materials Required:</span>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(recipe.ingredients).map(([itemId, qty]) => {
                    const ingItem = getItem(itemId);
                    const hasQty = inventory[itemId] || 0;
                    const hasEnough = hasQty >= qty;

                    return (
                      <div key={itemId} className={`px-2 py-1 rounded text-xs font-mono border ${hasEnough ? 'bg-[#1b5e20]/20 border-[#4caf50] text-[#a5d6a7]' : 'bg-[#b71c1c]/20 border-[#ef5350] text-[#ef9a9a]'}`}>
                        {ingItem?.name || itemId}: {hasQty}/{qty}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #4e342e; border-radius: 4px; border: 1px solid #3e2723; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #5d4037; }
      `}} />
    </RpgPanel>
  );
}
