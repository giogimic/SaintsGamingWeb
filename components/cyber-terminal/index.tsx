'use client';

import { useRef, useState, useEffect } from 'react';
import GameCanvas from './game-canvas';
import DexOverlay from './dex-overlay';
import BattleOverlay from './battle-overlay';
import ShopOverlay from './shop-overlay';
import SkillsOverlay from './skills-overlay';
import InventoryOverlay from './inventory-overlay';
import PartyOverlay from './party-overlay';
import EquipmentOverlay from './equipment-overlay';
import CraftingOverlay from './crafting-overlay';
import BaseOverlay from './base-overlay';
import DPad from './dpad';
import { useGameStore } from './store';

import { loadGameCharacter, saveGameState } from '@/app/actions/game';
import { fetchAllMaps } from '@/app/actions/game-admin';
import { GAME_MAPS } from './data/maps';
import { CharacterCreator } from './character-creator';

export default function CyberTerminal({ characterId, forceCreate }: { characterId?: string, forceCreate?: boolean }) {
  const gameMode = useGameStore((state) => state.gameMode);
  const toast = useGameStore((state) => state.toast);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showCreator, setShowCreator] = useState(forceCreate || !characterId);

  useEffect(() => {
    async function init() {
      // Hydrate custom maps from DB
      const mapsRes = await fetchAllMaps();
      if (mapsRes.success && mapsRes.data) {
        mapsRes.data.forEach((dbMap: any) => {
          try {
            GAME_MAPS[dbMap.id] = {
              id: dbMap.id,
              name: dbMap.name,
              grid: JSON.parse(dbMap.gridData),
              gates: JSON.parse(dbMap.gatesData) || {}
            };
          } catch (err) {
            console.error('Failed to parse map data:', dbMap.id);
          }
        });
      }

      if (!characterId) {
        setShowCreator(true);
        setIsInitializing(false);
        return;
      }
      
      const res = await loadGameCharacter(characterId);
      if (res.success && res.data) {
        useGameStore.getState().hydratePlayer(JSON.parse(res.data.stateData));
        setShowCreator(false);
      } else {
        setShowCreator(true);
      }
      setIsInitializing(false);
    }
    init();
  }, [characterId]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // AUTO-SAVE LOOP
  useEffect(() => {
    if (!characterId || showCreator || isInitializing) return;

    const interval = setInterval(async () => {
      const state = useGameStore.getState();
      const stateData = JSON.stringify(state.player);
      
      const res = await saveGameState(characterId, stateData);
      if (res.success) {
        console.log('[Auto-Save] Successfully synced player state to DB');
      } else {
        console.error('[Auto-Save] Failed to sync player state');
      }
    }, 15000); // Auto-save every 15 seconds

    return () => clearInterval(interval);
  }, [characterId, showCreator, isInitializing]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  };

  if (isInitializing) {
    return <div className="w-full h-full flex items-center justify-center text-emerald-500 font-mono">INITIALIZING TERMINAL...</div>;
  }

  if (showCreator) {
    return <CharacterCreator onComplete={() => window.location.href = '/profile/terminal'} />;
  }

  return (
    <div 
      ref={containerRef}
      className={`relative flex flex-col items-center justify-center w-full h-full max-w-full touch-none select-none ${isFullscreen ? 'w-screen h-screen fixed inset-0 z-50 bg-[#1a1a1a]' : ''}`}
    >
      <GameCanvas />
      
      {/* Mobile Controls */}
      <DPad />

      {/* Toast Notification */}
      {toast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 px-4 py-2 bg-green-950/90 text-green-400 border border-green-500/50 rounded font-bold text-sm whitespace-nowrap animate-in slide-in-from-top-4 duration-300 z-50 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
          [!] {toast.message}
        </div>
      )}

      {gameMode === 'EXPLORING' && (
        <div className="absolute top-4 left-4 right-4 flex justify-between z-20 pointer-events-none">
          <button
            onClick={toggleFullscreen}
            className="px-3 py-1 bg-white/90 text-black border-2 border-[#333] rounded font-bold text-xs hover:bg-gray-200 transition-colors shadow-md pointer-events-auto"
          >
            {isFullscreen ? 'EXIT FULLSCREEN' : 'FULLSCREEN'}
          </button>

          <div className="flex gap-2">
            <button
              onClick={() => useGameStore.getState().setGameMode('PARTY')}
              className="px-3 py-1 bg-[#b71c1c]/90 text-white border-2 border-[#ff5252] rounded font-bold text-xs hover:bg-[#ff5252] transition-colors shadow-md pointer-events-auto"
            >
              PARTY
            </button>
            <button
              onClick={() => useGameStore.getState().setGameMode('EQUIPMENT')}
              className="px-3 py-1 bg-[#4a148c]/90 text-white border-2 border-[#9c27b0] rounded font-bold text-xs hover:bg-[#9c27b0] transition-colors shadow-md pointer-events-auto"
            >
              GEAR
            </button>
            <button
              onClick={() => useGameStore.getState().setGameMode('INVENTORY')}
              className="px-3 py-1 bg-[#e65100]/90 text-white border-2 border-[#ff9800] rounded font-bold text-xs hover:bg-[#ff9800] transition-colors shadow-md pointer-events-auto"
            >
              INVENTORY
            </button>
            <button
              onClick={() => useGameStore.getState().setGameMode('SKILLS')}
              className="px-3 py-1 bg-[#1b5e20]/90 text-white border-2 border-[#4caf50] rounded font-bold text-xs hover:bg-[#4caf50] transition-colors shadow-md pointer-events-auto"
            >
              SKILLS
            </button>
            <button
              onClick={() => useGameStore.getState().setGameMode('DEX')}
              className="px-3 py-1 bg-[#0d47a1]/90 text-white border-2 border-[#2196f3] rounded font-bold text-xs hover:bg-[#2196f3] transition-colors shadow-md pointer-events-auto"
            >
              DEX
            </button>
          </div>
        </div>
      )}
      
      {gameMode === 'DEX' && <DexOverlay />}
      {gameMode === 'BATTLE' && <BattleOverlay />}
      {gameMode === 'SHOP' && <ShopOverlay />}
      {gameMode === 'SKILLS' && <SkillsOverlay />}
      {gameMode === 'INVENTORY' && <InventoryOverlay />}
      {gameMode === 'PARTY' && <PartyOverlay />}
      {gameMode === 'EQUIPMENT' && <EquipmentOverlay />}
      {gameMode === 'CRAFTING' && <CraftingOverlay />}
      {gameMode === 'BASE' && <BaseOverlay />}
    </div>
  );
}
