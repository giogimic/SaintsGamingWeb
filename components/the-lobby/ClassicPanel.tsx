'use client';

import { useGameStore } from './store';
import InventoryOverlay from './inventory-overlay';
import SkillsOverlay from './skills-overlay';
import EquipmentOverlay from './equipment-overlay';
import QuestLogOverlay from './quest-log-overlay';
import GtcOverlay from './gtc-overlay';
import { 
  Backpack, 
  Sword, 
  Shield, 
  ScrollText, 
  Store
} from 'lucide-react';

export default function ClassicPanel() {
  const { gameMode, setGameMode } = useGameStore();

  // The modes that this panel handles
  const panelModes = ['INVENTORY', 'SKILLS', 'EQUIPMENT', 'QUESTS', 'GTC'];
  const isOpen = panelModes.includes(gameMode);

  // RS3 inspired tab styling
  const tabClass = (mode: string) => `
    flex-1 flex justify-center items-center py-2.5 cursor-pointer
    border-[#806f47]/40 transition-all duration-200
    ${gameMode === mode 
      ? 'bg-gradient-to-b from-[#1e293b]/90 to-[#0f172a] shadow-[inset_0_4px_10px_rgba(0,0,0,0.5)] border-t-2 border-t-[#cbb26a]' 
      : 'bg-[#0b1320]/80 hover:bg-[#162238]/90 border-t-2 border-t-transparent'}
    ${mode !== 'GTC' ? 'border-r' : ''}
  `;

  return (
    <div className="w-[95vw] sm:w-[600px] lg:w-[800px] max-w-full z-40 pointer-events-auto flex flex-col shadow-[0_8px_30px_rgba(0,0,0,0.7)]"
      style={{
        backgroundColor: 'rgba(11, 19, 32, 0.85)',
        backdropFilter: 'blur(8px)',
        border: '2px solid #806f47',
        borderRadius: '8px'
      }}
    >
      {/* TABS ROW (Always Visible) */}
      <div className="flex bg-[#050b14]/90 rounded-t-[6px] overflow-hidden border-b border-[#806f47]/50">
        <div className={tabClass('INVENTORY')} onClick={() => setGameMode(gameMode === 'INVENTORY' ? 'EXPLORING' : 'INVENTORY')} title="Inventory [I]">
          <Backpack className="w-5 h-5 text-[#e2d5b3]" style={{ filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.8))' }} />
        </div>
        <div className={tabClass('SKILLS')} onClick={() => setGameMode(gameMode === 'SKILLS' ? 'EXPLORING' : 'SKILLS')} title="Skills [K]">
          <Sword className="w-5 h-5 text-[#e2d5b3]" style={{ filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.8))' }} />
        </div>
        <div className={tabClass('EQUIPMENT')} onClick={() => setGameMode(gameMode === 'EQUIPMENT' ? 'EXPLORING' : 'EQUIPMENT')} title="Equipment">
          <Shield className="w-5 h-5 text-[#e2d5b3]" style={{ filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.8))' }} />
        </div>
        <div className={tabClass('QUESTS')} onClick={() => setGameMode(gameMode === 'QUESTS' ? 'EXPLORING' : 'QUESTS')} title="Quests">
          <ScrollText className="w-5 h-5 text-[#e2d5b3]" style={{ filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.8))' }} />
        </div>
        <div className={tabClass('GTC')} onClick={() => setGameMode(gameMode === 'GTC' ? 'EXPLORING' : 'GTC')} title="Global Trade Center">
          <Store className="w-5 h-5 text-[#e2d5b3]" style={{ filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.8))' }} />
        </div>
      </div>

      {/* CONTENT AREA (Only visible if a tab is open) */}
      {isOpen && (
        <div className="h-[60vh] min-h-[450px] max-h-[750px] relative overflow-hidden m-[4px] bg-gradient-to-b from-transparent to-[#050b14]/50 rounded border border-[#806f47]/30">
          {gameMode === 'INVENTORY' && (
            <div className="absolute inset-0 overflow-auto scale-wrapper">
               <InventoryOverlay />
            </div>
          )}
          {gameMode === 'SKILLS' && (
            <div className="absolute inset-0 overflow-auto scale-wrapper">
               <SkillsOverlay />
            </div>
          )}
          {gameMode === 'EQUIPMENT' && (
            <div className="absolute inset-0 overflow-auto scale-wrapper">
               <EquipmentOverlay />
            </div>
          )}
          {gameMode === 'QUESTS' && (
            <div className="absolute inset-0 overflow-auto scale-wrapper">
               <QuestLogOverlay />
            </div>
          )}
          {gameMode === 'GTC' && (
            <div className="absolute inset-0 overflow-auto scale-wrapper">
               <GtcOverlay />
            </div>
          )}
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .scale-wrapper > div {
          /* Force child overlays to fit in the panel instead of fullscreen */
          position: relative !important;
          width: 100% !important;
          height: 100% !important;
          max-width: none !important;
          max-height: none !important;
          border: none !important;
          background: transparent !important;
          box-shadow: none !important;
          backdrop-filter: none !important;
          transform: none !important;
          left: 0 !important;
          top: 0 !important;
          translate: none !important;
          padding: 8px !important;
        }
      `}} />
    </div>
  );
}
