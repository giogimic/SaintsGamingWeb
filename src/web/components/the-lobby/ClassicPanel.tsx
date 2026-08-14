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
  X,
} from 'lucide-react';
import { HudPanelShell } from './hud/HudPanelShell';

export default function ClassicPanel() {
  const { gameMode, setGameMode } = useGameStore();

  const panelModes = ['INVENTORY', 'SKILLS', 'EQUIPMENT', 'QUESTS', 'GTC'];
  const isOpen = panelModes.includes(gameMode);

  const tabClass = (mode: string) => `
    flex items-center justify-center p-2 rounded cursor-pointer transition-all duration-150
    ${
      gameMode === mode
        ? 'bg-teal-500/25 text-teal-200 shadow-[inset_0_0_8px_rgba(20,184,166,0.3)] border border-teal-400/50'
        : 'text-slate-400 hover:text-teal-200 hover:bg-white/5 border border-transparent'
    }
  `;

  // Closed utility dock — sized tightly to its actual icon contents
  if (!isOpen) {
    return (
      <HudPanelShell className="pointer-events-auto shrink-0 shadow-lg">
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={tabClass('INVENTORY')}
            onClick={() => setGameMode('INVENTORY')}
            title="Inventory [I]"
          >
            <Backpack className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={tabClass('SKILLS')}
            onClick={() => setGameMode('SKILLS')}
            title="Skills [K]"
          >
            <Sword className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={tabClass('EQUIPMENT')}
            onClick={() => setGameMode('EQUIPMENT')}
            title="Equipment"
          >
            <Shield className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={tabClass('QUESTS')}
            onClick={() => setGameMode('QUESTS')}
            title="Quest Log"
          >
            <ScrollText className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={tabClass('GTC')}
            onClick={() => setGameMode('GTC')}
            title="Global Trade Center"
          >
            <Store className="h-4 w-4" />
          </button>
        </div>
      </HudPanelShell>
    );
  }

  // Expanded panel view
  return (
    <HudPanelShell
      className="pointer-events-auto flex w-[min(95vw,380px)] max-w-full flex-col overflow-hidden shadow-2xl"
      noPadding
    >
      {/* Header Tab Bar */}
      <div className="flex items-center justify-between border-b border-teal-500/20 bg-black/40 px-2 py-1">
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={tabClass('INVENTORY')}
            onClick={() => setGameMode(gameMode === 'INVENTORY' ? 'EXPLORING' : 'INVENTORY')}
            title="Inventory [I]"
          >
            <Backpack className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={tabClass('SKILLS')}
            onClick={() => setGameMode(gameMode === 'SKILLS' ? 'EXPLORING' : 'SKILLS')}
            title="Skills [K]"
          >
            <Sword className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={tabClass('EQUIPMENT')}
            onClick={() => setGameMode(gameMode === 'EQUIPMENT' ? 'EXPLORING' : 'EQUIPMENT')}
            title="Equipment"
          >
            <Shield className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={tabClass('QUESTS')}
            onClick={() => setGameMode(gameMode === 'QUESTS' ? 'EXPLORING' : 'QUESTS')}
            title="Quest Log"
          >
            <ScrollText className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={tabClass('GTC')}
            onClick={() => setGameMode(gameMode === 'GTC' ? 'EXPLORING' : 'GTC')}
            title="Global Trade Center"
          >
            <Store className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setGameMode('EXPLORING')}
          className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          title="Close Panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tab Body */}
      <div className="relative m-1.5 h-[50vh] min-h-[260px] max-h-[600px] flex-1 overflow-hidden rounded bg-black/40 border border-teal-500/20">
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
    </HudPanelShell>
  );
}
