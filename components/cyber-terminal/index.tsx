'use client';

import { useRef, useState, useEffect } from 'react';
import GameCanvas from './game-canvas';
import DexOverlay from './dex-overlay';
import BattleOverlay from './battle-overlay';
import ShopOverlay from './shop-overlay';
import SkillsOverlay from './skills-overlay';
import DPad from './dpad';
import { useGameStore } from './store';

import { loadGameCharacter } from '@/app/actions/game';
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
    return <CharacterCreator onComplete={() => window.location.href = '/user/me'} />;
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
              onClick={() => useGameStore.getState().setGameMode('SKILLS')}
              className="px-3 py-1 bg-[#166534]/90 text-white border-2 border-[#14532d] rounded font-bold text-xs hover:bg-[#15803d] transition-colors shadow-md pointer-events-auto"
            >
              SKILLS
            </button>
            <button
              onClick={() => useGameStore.getState().setGameMode('DEX')}
              className="px-3 py-1 bg-white/90 text-black border-2 border-[#333] rounded font-bold text-xs hover:bg-gray-200 transition-colors shadow-md pointer-events-auto"
            >
              BEASTIARY
            </button>
          </div>
        </div>
      )}
      
      {gameMode === 'DEX' && <DexOverlay />}
      {gameMode === 'BATTLE' && <BattleOverlay />}
      {gameMode === 'SHOP' && <ShopOverlay />}
      {gameMode === 'SKILLS' && <SkillsOverlay />}
    </div>
  );
}
