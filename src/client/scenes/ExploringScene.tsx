import React from 'react';
import { GameCanvas } from '../components/GameCanvas';
import { GameUI } from '../ui/GameUI';

export function ExploringScene() {
  return (
    <div className="w-full h-full flex-1 relative">
      {/* Underlying 3D Canvas */}
      <GameCanvas />

      {/* HUD Layer (Phase 4) */}
      <GameUI />
    </div>
  );
}
