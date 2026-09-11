import React from 'react';
import { ToastOverlay } from './ToastOverlay';
import { LobbyHudDockLayout } from '@/web/components/the-lobby/hud/LobbyHudDockLayout';
import { MobileControls } from './hud/MobileControls';
import { WindowController } from './windows/WindowController';
import { DialogOverlay } from './overlays/DialogOverlay';
import { ShopOverlay } from './overlays/ShopOverlay';
import { CraftingOverlay } from './overlays/CraftingOverlay';
import { SpiritGateDialer } from './windows/SpiritGateDialer';

/**
 * Root UI container for the exploring scene.
 * Mounts all decoupled HUD components.
 */
export function GameUI() {
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
    </div>
  );
}
