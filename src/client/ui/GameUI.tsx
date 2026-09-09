import React from 'react';
import { ToastOverlay } from './ToastOverlay';
import { ChatOverlay } from './ChatOverlay';
import { PlayerStatsOverlay } from './PlayerStatsOverlay';

/**
 * Root UI container for the exploring scene.
 * Mounts all decoupled HUD components.
 */
export function GameUI() {
  return (
    <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
      <PlayerStatsOverlay />
      <ToastOverlay />
      <ChatOverlay />
    </div>
  );
}
