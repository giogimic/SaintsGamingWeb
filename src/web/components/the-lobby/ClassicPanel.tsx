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
  Store,
} from 'lucide-react';
import { GamePanelShell } from './ui/GamePanelShell';

export default function ClassicPanel() {
  const { gameMode, setGameMode } = useGameStore();

  const panelModes = ['INVENTORY', 'SKILLS', 'EQUIPMENT', 'QUESTS', 'GTC'];
  const isOpen = panelModes.includes(gameMode);

  const tabClass = (mode: string) => `
    flex-1 flex justify-center items-center py-2.5 cursor-pointer
    transition-all duration-200 border-t-2
    ${
      gameMode === mode
        ? 'bg-lobby-soul/15 border-t-lobby-soul text-lobby-mist shadow-[inset_0_4px_12px_rgba(0,0,0,0.35)]'
        : 'bg-black/20 border-t-transparent text-lobby-fog hover:bg-white/5 hover:text-lobby-mist'
    }
    ${mode !== 'GTC' ? 'border-r border-r-lobby-border/60' : ''}
  `;

  // Closed tab strip fights mobile ActionCluster — hide until a panel is open on phones.
  if (!isOpen) {
    return (
      <GamePanelShell accentColor="cyan" className="pointer-events-auto z-40 hidden w-[95vw] max-w-full flex-col overflow-hidden md:flex sm:w-[600px] lg:w-[800px]">
        <div className="flex overflow-hidden bg-black/30">
          <div
            className={tabClass('INVENTORY')}
            onClick={() => setGameMode('INVENTORY')}
            title="Inventory [I]"
          >
            <Backpack className="h-5 w-5" />
          </div>
          <div
            className={tabClass('SKILLS')}
            onClick={() => setGameMode('SKILLS')}
            title="Skills [K]"
          >
            <Sword className="h-5 w-5" />
          </div>
          <div
            className={tabClass('EQUIPMENT')}
            onClick={() => setGameMode('EQUIPMENT')}
            title="Equipment"
          >
            <Shield className="h-5 w-5" />
          </div>
          <div
            className={tabClass('QUESTS')}
            onClick={() => setGameMode('QUESTS')}
            title="Quests"
          >
            <ScrollText className="h-5 w-5" />
          </div>
          <div
            className={tabClass('GTC')}
            onClick={() => setGameMode('GTC')}
            title="Global Trade Center"
          >
            <Store className="h-5 w-5" />
          </div>
        </div>
      </GamePanelShell>
    );
  }

  return (
    <GamePanelShell accentColor="cyan" className="pointer-events-auto z-40 flex w-[min(95vw,100%)] max-w-full flex-col overflow-hidden max-md:fixed max-md:inset-x-2 max-md:bottom-[calc(5.5rem+env(safe-area-inset-bottom))] max-md:top-14 max-md:z-[60] sm:w-[600px] lg:w-[800px]">
      <div className="flex overflow-hidden border-b border-white/10 bg-black/30">
        <div
          className={tabClass('INVENTORY')}
          onClick={() => setGameMode(gameMode === 'INVENTORY' ? 'EXPLORING' : 'INVENTORY')}
          title="Inventory [I]"
        >
          <Backpack className="h-5 w-5" />
        </div>
        <div
          className={tabClass('SKILLS')}
          onClick={() => setGameMode(gameMode === 'SKILLS' ? 'EXPLORING' : 'SKILLS')}
          title="Skills [K]"
        >
          <Sword className="h-5 w-5" />
        </div>
        <div
          className={tabClass('EQUIPMENT')}
          onClick={() => setGameMode(gameMode === 'EQUIPMENT' ? 'EXPLORING' : 'EQUIPMENT')}
          title="Equipment"
        >
          <Shield className="h-5 w-5" />
        </div>
        <div
          className={tabClass('QUESTS')}
          onClick={() => setGameMode(gameMode === 'QUESTS' ? 'EXPLORING' : 'QUESTS')}
          title="Quests"
        >
          <ScrollText className="h-5 w-5" />
        </div>
        <div
          className={tabClass('GTC')}
          onClick={() => setGameMode(gameMode === 'GTC' ? 'EXPLORING' : 'GTC')}
          title="Global Trade Center"
        >
          <Store className="h-5 w-5" />
        </div>
      </div>

      {isOpen && (
        <div className="relative m-1.5 h-[60vh] min-h-[280px] max-h-[750px] flex-1 overflow-hidden rounded-lg border border-lobby-border bg-black/25 max-md:min-h-0 max-md:h-auto">
          {gameMode === 'INVENTORY' && (
            <div className="scale-wrapper absolute inset-0 overflow-auto">
              <InventoryOverlay />
            </div>
          )}
          {gameMode === 'SKILLS' && (
            <div className="scale-wrapper absolute inset-0 overflow-auto">
              <SkillsOverlay />
            </div>
          )}
          {gameMode === 'EQUIPMENT' && (
            <div className="scale-wrapper absolute inset-0 overflow-auto">
              <EquipmentOverlay />
            </div>
          )}
          {gameMode === 'QUESTS' && (
            <div className="scale-wrapper absolute inset-0 overflow-auto">
              <QuestLogOverlay />
            </div>
          )}
          {gameMode === 'GTC' && (
            <div className="scale-wrapper absolute inset-0 overflow-auto">
              <GtcOverlay />
            </div>
          )}
        </div>
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .scale-wrapper > div {
          position: relative !important;
          width: 100% !important;
          height: 100% !important;
          max-width: none !important;
          max-height: none !important;
          inset: 0 !important;
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          backdrop-filter: none !important;
        }
      `,
        }}
      />
    </GamePanelShell>
  );
}
