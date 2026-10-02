import React, { useEffect } from 'react';
import { GameCanvas } from '../components/GameCanvas';
import { GameUI } from '../ui/GameUI';
import { useGameStore } from '@/web/components/the-lobby/store';

export function ExploringScene() {
  useEffect(() => {
    // Sync legacy store so HUD components (like Hotbar) know we are playing
    useGameStore.getState().setGameMode('EXPLORING');
  }, []);

  return (
    <div className="w-full h-full flex-1 relative min-h-0">
      {/* Underlying 3D Canvas */}
      <GameCanvas />

      {/* HUD Layer (Phase 4) */}
      <GameUI />
    </div>
  );
}
