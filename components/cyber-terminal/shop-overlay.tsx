'use client';

import { useGameStore } from './store';
import RpgPanel from './rpg-panel';

export default function ShopOverlay() {
  const player = useGameStore(state => state.player);
  const setGameMode = useGameStore(state => state.setGameMode);
  const modifyCredits = useGameStore(state => state.modifyCredits);
  const modifyInventory = useGameStore(state => state.modifyInventory);
  
  const handleBuy = (item: string, cost: number) => {
    if (player.credits >= cost) {
      modifyCredits(-cost);
      modifyInventory(item, 1);
      useGameStore.getState().showToast(`Purchased 1x ${item}`);
    } else {
      useGameStore.getState().showToast('Not enough gold!');
    }
  };

  return (
    <RpgPanel title="VILLAGE MERCHANT" onClose={() => setGameMode('EXPLORING')}>
      <div className="flex justify-between items-center mb-6 bg-black/50 p-2 border border-[#ca8a04] rounded shadow-inner">
        <span className="text-[#e0e0e0] font-bold font-mono">FUNDS</span>
        <span className="text-[#ca8a04] font-mono font-bold text-lg">{player.credits} G</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
        {/* Item: Binding Crystal */}
        <div className="bg-[#fef08a] border-2 border-[#ca8a04] p-4 rounded-lg flex justify-between items-center">
          <div>
            <h3 className="font-bold text-[#854d0e] text-lg">Binding Crystal</h3>
            <p className="text-[#a16207] text-sm font-mono">Use to capture wild Beasts during encounters.</p>
            <p className="text-[#a16207] text-xs font-mono mt-1">Owned: {player.inventory['capture_script'] || 0}</p>
          </div>
          <button 
            onClick={() => handleBuy('capture_script', 100)}
            className="px-6 py-2 bg-[#ca8a04] text-white font-bold rounded shadow hover:bg-[#a16207] transition-colors"
          >
            100 G
          </button>
        </div>

        {/* Item: Healing Salve */}
        <div className="bg-[#fef08a] border-2 border-[#ca8a04] p-4 rounded-lg flex justify-between items-center">
          <div>
            <h3 className="font-bold text-[#854d0e] text-lg">Healing Salve</h3>
            <p className="text-[#a16207] text-sm font-mono">Restores 50 HP during battle or exploration.</p>
            <p className="text-[#a16207] text-xs font-mono mt-1">Owned: {player.inventory['patch_kit'] || 0}</p>
          </div>
          <button 
            onClick={() => handleBuy('patch_kit', 50)}
            className="px-6 py-2 bg-[#ca8a04] text-white font-bold rounded shadow hover:bg-[#a16207] transition-colors"
          >
            50 G
          </button>
        </div>
      </div>
        </div>
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
