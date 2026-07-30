'use client';

import { useState } from 'react';
import { useGameStore } from './store';
import RpgPanel from './rpg-panel';
import { ITEM_DB } from './data/items';

export default function ShopOverlay() {
  const player = useGameStore(state => state.player);
  const setGameMode = useGameStore(state => state.setGameMode);
  const modifyCredits = useGameStore(state => state.modifyCredits);
  const modifyInventory = useGameStore(state => state.modifyInventory);
  
  const [tab, setTab] = useState<'BUY' | 'SELL'>('BUY');

  // Items the shop sells
  const shopInventory = ['capture_script', 'patch_kit', 'wood_logs', 'raw_fish'];

  const handleBuy = (item: string) => {
    const cost = ITEM_DB[item]?.value || 0;
    if (player.credits >= cost) {
      modifyCredits(-cost);
      modifyInventory(item, 1);
      useGameStore.getState().showToast(`Purchased 1x ${ITEM_DB[item].name}`);
    } else {
      useGameStore.getState().showToast('Not enough credits!');
    }
  };

  const handleSell = (item: string) => {
    const sellValue = Math.floor((ITEM_DB[item]?.value || 0) * 0.5); // Sell for 50% value
    if ((player.inventory[item] || 0) > 0) {
      modifyInventory(item, -1);
      modifyCredits(sellValue);
      useGameStore.getState().showToast(`Sold 1x ${ITEM_DB[item].name} for ${sellValue} G`);
    }
  };

  return (
    <RpgPanel title="VILLAGE MERCHANT" onClose={() => setGameMode('EXPLORING')}>
      <div className="flex justify-between items-center mb-6 bg-black/50 p-2 border border-[#ca8a04] rounded shadow-inner">
        <span className="text-[#e0e0e0] font-bold font-mono">FUNDS</span>
        <span className="text-[#ca8a04] font-mono font-bold text-lg">{player.credits} G</span>
      </div>

      <div className="flex space-x-2 mb-4">
        <button 
          onClick={() => setTab('BUY')}
          className={`flex-1 py-2 font-bold font-mono rounded border-2 transition-colors ${tab === 'BUY' ? 'bg-[#ca8a04] border-[#854d0e] text-white shadow-inner' : 'bg-black/50 border-[#3e2723] text-gray-400 hover:text-white'}`}
        >
          BUY
        </button>
        <button 
          onClick={() => setTab('SELL')}
          className={`flex-1 py-2 font-bold font-mono rounded border-2 transition-colors ${tab === 'SELL' ? 'bg-[#ca8a04] border-[#854d0e] text-white shadow-inner' : 'bg-black/50 border-[#3e2723] text-gray-400 hover:text-white'}`}
        >
          SELL
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2 h-[300px]">
        {tab === 'BUY' && shopInventory.map(itemId => {
          const item = ITEM_DB[itemId];
          if (!item) return null;
          return (
            <div key={itemId} className="bg-[#fef08a] border-2 border-[#ca8a04] p-4 rounded-lg flex justify-between items-center">
              <div>
                <h3 className="font-bold text-[#854d0e] text-lg">{item.name}</h3>
                <p className="text-[#a16207] text-sm font-mono">{item.description}</p>
                <p className="text-[#a16207] text-xs font-mono mt-1">Owned: {player.inventory[itemId] || 0}</p>
              </div>
              <button 
                onClick={() => handleBuy(itemId)}
                className="px-6 py-2 bg-[#ca8a04] text-white font-bold rounded shadow hover:bg-[#a16207] transition-colors"
              >
                {item.value} G
              </button>
            </div>
          );
        })}

        {tab === 'SELL' && Object.entries(player.inventory).filter(([_, amt]) => amt > 0).map(([itemId, amt]) => {
          const item = ITEM_DB[itemId];
          if (!item) return null;
          const sellValue = Math.floor((item.value || 0) * 0.5);
          return (
            <div key={itemId} className="bg-[#fef08a] border-2 border-[#ca8a04] p-4 rounded-lg flex justify-between items-center opacity-90">
              <div>
                <h3 className="font-bold text-[#854d0e] text-lg">{item.name}</h3>
                <p className="text-[#a16207] text-sm font-mono text-xs">Owned: {amt}</p>
              </div>
              <button 
                onClick={() => handleSell(itemId)}
                className="px-6 py-2 bg-[#16a34a] text-white font-bold rounded shadow hover:bg-[#15803d] transition-colors"
                disabled={sellValue <= 0}
              >
                Sell (+{sellValue} G)
              </button>
            </div>
          );
        })}
        
        {tab === 'SELL' && Object.entries(player.inventory).filter(([_, amt]) => amt > 0).length === 0 && (
          <div className="text-center text-gray-500 font-mono mt-10">
            You have nothing to sell.
          </div>
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
