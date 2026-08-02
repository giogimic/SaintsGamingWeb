'use client';

import { useState } from 'react';
import { useGameStore } from './store';
import RpgPanel from './rpg-panel';
import { SHOP_CATALOG, SHOP_CRAFT_RECIPES, sellPrice } from '@/shared/game/shopCatalog';
import { ITEM_DB } from './data/items';

export default function ShopOverlay() {
  const player = useGameStore(state => state.player);
  const setGameMode = useGameStore(state => state.setGameMode);
  const emitSocketEvent = useGameStore(state => state.emitSocketEvent);
  
  const [tab, setTab] = useState<'BUY' | 'SELL' | 'CRAFT'>('BUY');

  const handleBuy = (itemSlug: string) => {
    emitSocketEvent?.('shop_buy', { itemSlug, quantity: 1 });
  };

  const handleSell = (itemSlug: string) => {
    emitSocketEvent?.('shop_sell', { itemSlug, quantity: 1 });
  };

  const handleCraft = (recipeSlug: string) => {
    emitSocketEvent?.('craft_item', recipeSlug);
  };

  const buyItems = SHOP_CATALOG.filter((i) => i.forSale);

  return (
    <RpgPanel title="VILLAGE MERCHANT" onClose={() => setGameMode('EXPLORING')}>
      <div className="flex justify-between items-center mb-6 bg-black/50 p-2 border border-[#ca8a04] rounded shadow-inner">
        <span className="text-[#e0e0e0] font-bold font-mono">FUNDS</span>
        <span className="text-[#ca8a04] font-mono font-bold text-lg">{player.credits} G</span>
      </div>

      <div className="flex space-x-2 mb-4">
        {(['BUY', 'SELL', 'CRAFT'] as const).map((t) => (
          <button 
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 font-bold font-mono rounded border-2 transition-colors ${tab === t ? 'bg-[#ca8a04] border-[#854d0e] text-white shadow-inner' : 'bg-black/50 border-[#3e2723] text-gray-400 hover:text-white'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2 h-[300px]">
        {tab === 'BUY' && buyItems.map((listing) => (
          <div key={listing.itemSlug} className="bg-[#fef08a] border-2 border-[#ca8a04] p-4 rounded-lg flex justify-between items-center">
            <div>
              <h3 className="font-bold text-[#854d0e] text-lg">{listing.name}</h3>
              <p className="text-[#a16207] text-sm font-mono">{listing.description}</p>
              <p className="text-[#a16207] text-xs font-mono mt-1">Owned: {player.inventory[listing.itemSlug] || 0}</p>
            </div>
            <button 
              onClick={() => handleBuy(listing.itemSlug)}
              className="px-6 py-2 bg-[#ca8a04] text-white font-bold rounded shadow hover:bg-[#a16207] transition-colors"
            >
              {listing.buyPrice} G
            </button>
          </div>
        ))}

        {tab === 'SELL' && Object.entries(player.inventory).filter(([_, amt]) => amt > 0).map(([itemSlug, amt]) => {
          const price = sellPrice(itemSlug);
          const name = SHOP_CATALOG.find((i) => i.itemSlug === itemSlug)?.name
            || ITEM_DB[itemSlug]?.name
            || itemSlug;
          if (price <= 0) return null;
          return (
            <div key={itemSlug} className="bg-[#fef08a] border-2 border-[#ca8a04] p-4 rounded-lg flex justify-between items-center opacity-90">
              <div>
                <h3 className="font-bold text-[#854d0e] text-lg">{name}</h3>
                <p className="text-[#a16207] text-sm font-mono text-xs">Owned: {amt}</p>
              </div>
              <button 
                onClick={() => handleSell(itemSlug)}
                className="px-6 py-2 bg-[#16a34a] text-white font-bold rounded shadow hover:bg-[#15803d] transition-colors"
              >
                Sell (+{price} G)
              </button>
            </div>
          );
        })}
        
        {tab === 'SELL' && Object.entries(player.inventory).filter(([id, amt]) => amt > 0 && sellPrice(id) > 0).length === 0 && (
          <div className="text-center text-gray-500 font-mono mt-10">
            Nothing the merchant wants to buy.
          </div>
        )}

        {tab === 'CRAFT' && (
          <>
            <p className="text-sm text-[#a16207] font-mono mb-2">
              Buy Crystal Dust + Wood Log, then craft Binding Crystals here.
            </p>
            {SHOP_CRAFT_RECIPES.filter((r) => r.slug === 'craft_film_standard').map((recipe) => (
              <div key={recipe.slug} className="bg-[#fef08a] border-2 border-[#ca8a04] p-4 rounded-lg space-y-3">
                <div>
                  <h3 className="font-bold text-[#854d0e] text-lg">
                    Craft {recipe.outputQuantity}× Standard Film
                  </h3>
                  <p className="text-[#a16207] text-sm font-mono mt-1">
                    Needs:{' '}
                    {recipe.ingredients.map((ing) => `${ing.qty}× ${ing.itemSlug}`).join(', ')}
                  </p>
                  <p className="text-[#a16207] text-xs font-mono mt-1">
                    Skill: {recipe.skillSlug} Lv {recipe.levelReq}
                  </p>
                </div>
                <button
                  onClick={() => handleCraft(recipe.slug)}
                  className="w-full py-2 bg-[#ca8a04] text-white font-bold rounded shadow hover:bg-[#a16207] transition-colors"
                >
                  Craft
                </button>
              </div>
            ))}
          </>
        )}
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
