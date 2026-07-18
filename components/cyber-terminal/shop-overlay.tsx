'use client';

import { useGameStore } from './store';

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
    <div className="absolute inset-0 bg-[#eab308]/95 flex flex-col p-6 border-4 border-[#854d0e] rounded-lg backdrop-blur-sm z-30 animate-in fade-in duration-200">
      <div className="flex justify-between items-center mb-6 border-b-2 border-[#854d0e] pb-2">
        <h2 className="text-2xl font-bold text-[#854d0e] tracking-widest uppercase">Village Merchant</h2>
        <span className="text-[#854d0e] font-mono font-bold text-lg">{player.credits} Gold</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4">
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

      <div className="mt-4 pt-4 border-t-2 border-[#854d0e] flex justify-end">
        <button 
          onClick={() => setGameMode('EXPLORING')}
          className="px-8 py-3 bg-[#854d0e] text-[#fef08a] font-bold rounded shadow hover:bg-[#713f12] transition-colors"
        >
          LEAVE SHOP
        </button>
      </div>
    </div>
  );
}
