import React from 'react';
import { ToastOverlay } from './ToastOverlay';
import { ChatOverlay } from './ChatOverlay';
import { PlayerStatsOverlay } from './PlayerStatsOverlay';
import { TargetUnitFrame } from './hud/TargetUnitFrame';
import { MiniMapRadar } from './hud/MiniMapRadar';
import { Hotbar } from './hud/Hotbar';
import { MobileControls } from './hud/MobileControls';
import { PeerPresenceHud } from './hud/PeerPresenceHud';
import { QuestTracker } from './hud/QuestTracker';
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
      <PlayerStatsOverlay />
      <TargetUnitFrame />
      <MiniMapRadar />
      <PeerPresenceHud />
      <QuestTracker />
      <ToastOverlay />
      <ChatOverlay />
      
      {/* Interactive UI that needs pointer events */}
      <div className="pointer-events-none w-full h-full">
        <Hotbar />
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
