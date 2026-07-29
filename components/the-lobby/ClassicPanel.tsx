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

  // Classic RPG tab styling
  const tabClass = (mode: string) => `
    flex-1 flex justify-center items-center py-2 cursor-pointer
    border-black transition-colors
    ${gameMode === mode 
      ? 'bg-[#7a6f5d] shadow-inner' 
      : 'bg-[#52493d] hover:bg-[#63594b]'}
    ${mode !== 'GTC' ? 'border-r-2' : ''}
  `;

  return (
    <div className="absolute bottom-4 right-4 w-[340px] z-40 pointer-events-auto flex flex-col shadow-[4px_4px_15px_rgba(0,0,0,0.8)]"
      style={{
        backgroundColor: '#52493d',
        border: '3px solid #383024',
        borderTopColor: '#7a6f5d',
        borderLeftColor: '#7a6f5d',
        borderRadius: '8px'
      }}
    >
      {/* TABS ROW (Always Visible) */}
      <div className="flex bg-[#383024] rounded-t-[5px] overflow-hidden border-b-2 border-black">
        <div className={tabClass('INVENTORY')} onClick={() => setGameMode(gameMode === 'INVENTORY' ? 'EXPLORING' : 'INVENTORY')} title="Inventory [I]">
          <Backpack className="w-5 h-5 text-[#d5c3a3]" style={{ filter: 'drop-shadow(1px 1px 0px black)' }} />
        </div>
        <div className={tabClass('SKILLS')} onClick={() => setGameMode(gameMode === 'SKILLS' ? 'EXPLORING' : 'SKILLS')} title="Skills [K]">
          <Sword className="w-5 h-5 text-[#d5c3a3]" style={{ filter: 'drop-shadow(1px 1px 0px black)' }} />
        </div>
        <div className={tabClass('EQUIPMENT')} onClick={() => setGameMode(gameMode === 'EQUIPMENT' ? 'EXPLORING' : 'EQUIPMENT')} title="Equipment">
          <Shield className="w-5 h-5 text-[#d5c3a3]" style={{ filter: 'drop-shadow(1px 1px 0px black)' }} />
        </div>
        <div className={tabClass('QUESTS')} onClick={() => setGameMode(gameMode === 'QUESTS' ? 'EXPLORING' : 'QUESTS')} title="Quests">
          <ScrollText className="w-5 h-5 text-[#d5c3a3]" style={{ filter: 'drop-shadow(1px 1px 0px black)' }} />
        </div>
        <div className={tabClass('GTC')} onClick={() => setGameMode(gameMode === 'GTC' ? 'EXPLORING' : 'GTC')} title="Global Trade Center">
          <Store className="w-5 h-5 text-[#d5c3a3]" style={{ filter: 'drop-shadow(1px 1px 0px black)' }} />
        </div>
      </div>

      {/* CONTENT AREA (Only visible if a tab is open) */}
      {isOpen && (
        <div className="h-[430px] relative overflow-hidden m-[4px] bg-[#d5c3a3] border-2 border-[#383024] border-t-[#221c13] border-l-[#221c13]">
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
