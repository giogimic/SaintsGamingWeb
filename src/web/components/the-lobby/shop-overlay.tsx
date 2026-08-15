'use client';

import { useState } from 'react';
import { useGameStore } from './store';
import RpgPanel from './rpg-panel';
import { SHOP_CATALOG, SHOP_CRAFT_RECIPES, sellPrice } from '@/shared/game/shopCatalog';
import { ITEM_DB } from './data/items';
import { soundSynth } from '@/engine/sound-synth';
import { Store, ShoppingCart, ArrowDownToLine, Coins, Hammer, Check, Sparkles } from 'lucide-react';

export default function ShopOverlay() {
  const player = useGameStore(state => state.player);
  const setGameMode = useGameStore(state => state.setGameMode);
  const emitSocketEvent = useGameStore(state => state.emitSocketEvent);
  const showToast = useGameStore(state => state.showToast);
  
  const [tab, setTab] = useState<'BUY' | 'SELL' | 'CRAFT'>('BUY');

  const handleBuy = (itemSlug: string, buyPrice: number, name: string) => {
    if (player.credits < buyPrice) {
      showToast(`Requires ${buyPrice} Credits!`);
      return;
    }
    soundSynth?.playActionSound?.();
    emitSocketEvent?.('shop_buy', { itemSlug, quantity: 1 });
    showToast(`Purchased 1x ${name} (-${buyPrice} C)`);
  };

  const handleSell = (itemSlug: string, price: number, name: string) => {
    soundSynth?.playActionSound?.();
    emitSocketEvent?.('shop_sell', { itemSlug, quantity: 1 });
    showToast(`Sold 1x ${name} (+${price} C)`);
  };

  const handleCraft = (recipeSlug: string, outputName: string) => {
    soundSynth?.playMiningSound?.();
    emitSocketEvent?.('craft_item', recipeSlug);
    showToast(`Crafted ${outputName}!`);
  };

  const buyItems = SHOP_CATALOG.filter((i) => i.forSale);

  return (
    <RpgPanel 
      title="VILLAGE MERCHANT & TRADE POST" 
      icon={<Store className="w-4 h-4 text-emerald-400" />}
      onClose={() => setGameMode('EXPLORING')}
    >
      <div className="flex flex-col h-full font-mono text-xs gap-3">
        
        {/* Navigation Tabs & Currency Counter */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-black/50 p-2 rounded-xl border border-cyan-500/30">
          <div className="flex gap-1.5">
            {(['BUY', 'SELL', 'CRAFT'] as const).map((t) => (
              <button 
                key={t}
                onClick={() => {
                  soundSynth?.playSelectSound?.();
                  setTab(t);
                }}
                className={`px-3.5 py-1.5 font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  tab === t 
                    ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]' 
                    : 'bg-black/30 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {t === 'BUY' && <ShoppingCart className="w-3.5 h-3.5" />}
                {t === 'SELL' && <ArrowDownToLine className="w-3.5 h-3.5" />}
                {t === 'CRAFT' && <Hammer className="w-3.5 h-3.5" />}
                <span>{t}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 bg-amber-950/40 px-3 py-1 rounded-lg border border-amber-500/40 text-amber-300 font-bold">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>{player.credits.toLocaleString()} CREDITS</span>
          </div>
        </div>

        {/* Item Stock Viewport */}
        <div className="flex-1 overflow-y-auto space-y-2.5 custom-scrollbar pr-1">
          {tab === 'BUY' && buyItems.map((listing) => (
            <div 
              key={listing.itemSlug} 
              className="p-3.5 rounded-xl border border-slate-800/80 bg-black/40 hover:border-cyan-500/50 hover:bg-cyan-950/10 transition-all flex items-center justify-between gap-3 shadow-sm"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white text-sm">{listing.name}</h3>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/5 text-slate-400 font-bold uppercase">
                    In Bag: {player.inventory[listing.itemSlug] || 0}
                  </span>
                </div>
                <p className="text-slate-400 text-xs mt-0.5">{listing.description}</p>
              </div>
              <button 
                onClick={() => handleBuy(listing.itemSlug, listing.buyPrice, listing.name)}
                className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-black text-xs rounded-lg transition-all border border-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.25)] active:scale-95 cursor-pointer whitespace-nowrap"
              >
                BUY ({listing.buyPrice} C)
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
              <div 
                key={itemSlug} 
                className="p-3.5 rounded-xl border border-slate-800/80 bg-black/40 hover:border-emerald-500/50 hover:bg-emerald-950/10 transition-all flex items-center justify-between gap-3 shadow-sm"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-sm">{name}</h3>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30 font-bold">
                      Available: x{amt}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[10px] mt-0.5">Sell value: {price} Credits per unit</p>
                </div>
                <button 
                  onClick={() => handleSell(itemSlug, price, name)}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 text-white font-black text-xs rounded-lg transition-all border border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.25)] active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  SELL (+{price} C)
                </button>
              </div>
            );
          })}
          
          {tab === 'SELL' && Object.entries(player.inventory).filter(([id, amt]) => amt > 0 && sellPrice(id) > 0).length === 0 && (
            <div className="text-center text-slate-500 italic p-8 border border-dashed border-slate-800 rounded-xl mt-4">
              No tradeable items in your inventory currently wanted by the merchant.
            </div>
          )}

          {tab === 'CRAFT' && (
            <>
              <div className="p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-500/30 text-cyan-300 text-[11px] mb-2 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Refine raw items or assemble Holo Standard Film directly at the village counter.</span>
              </div>
              {SHOP_CRAFT_RECIPES.filter((r) => r.slug === 'craft_film_standard').map((recipe) => (
                <div 
                  key={recipe.slug} 
                  className="p-4 rounded-xl border border-slate-800 bg-black/40 hover:border-cyan-500/40 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-white text-sm">
                        Craft {recipe.outputQuantity}× Standard Holo Film
                      </h3>
                      <p className="text-slate-400 text-xs mt-1">
                        Requires: {recipe.ingredients.map((ing) => `${ing.qty}× ${ing.itemSlug.replace('_', ' ')}`).join(', ')}
                      </p>
                      <p className="text-cyan-400 text-[10px] mt-0.5">
                        Skill: {recipe.skillSlug} Lv {recipe.levelReq}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCraft(recipe.slug, 'Standard Holo Film')}
                    className="w-full py-2.5 bg-cyan-600/80 hover:bg-cyan-500 text-white font-bold text-xs rounded-lg transition-all border border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)] active:scale-95 cursor-pointer"
                  >
                    CRAFT REAGENTS
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </RpgPanel>
  );
}

