import React from 'react';
import { ToastOverlay } from './ToastOverlay';
import { LobbyHudDockLayout } from '@/web/components/the-lobby/hud/LobbyHudDockLayout';
import { MobileControls } from './hud/MobileControls';
import { WindowController } from './windows/WindowController';
import { DialogOverlay } from './overlays/DialogOverlay';
import { ShopOverlay } from './overlays/ShopOverlay';
import { CraftingOverlay } from './overlays/CraftingOverlay';
import { SpiritGateDialer } from './windows/SpiritGateDialer';

import { useGameStore } from '@/client/state/useGameStore';
import { useSessionStore } from '@/client/state/useSessionStore';
import GameOptionsMenu from '@/web/components/the-lobby/hud/GameOptionsMenu';

/**
 * Root UI container for the exploring scene.
 * Mounts all decoupled HUD components.
 */
export function GameUI() {
  const isSystemMenuOpen = useGameStore(s => s.isSystemMenuOpen);
  const closeSystemMenu = useGameStore(s => s.closeSystemMenu);
  // Need to get fullscreen toggle and permissions from somewhere, or default them
  // Assuming basic toggles for now. We can import them or just handle the basic UI here.
  const isFullscreen = false;
  const canStudio = false; // Add real permission check later if needed
  const studioToolsOpen = false;

  return (
    <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
      <LobbyHudDockLayout />
      <ToastOverlay />
      
      {/* Interactive UI that needs pointer events */}
      <div className="pointer-events-none w-full h-full">
        <MobileControls />
        <WindowController />
        <DialogOverlay />
        <ShopOverlay />
        <CraftingOverlay />
        <SpiritGateDialer />
      </div>

      <GameOptionsMenu
        isOpen={isSystemMenuOpen}
        onClose={closeSystemMenu}
        isFullscreen={isFullscreen}
        onToggleFullscreen={() => {}}
        isAdminUser={canStudio}
        isCreationMode={studioToolsOpen}
        onToggleDevEditor={() => {}}
      />
    </div>
  );
}
