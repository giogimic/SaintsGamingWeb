const fs = require('fs');
const path = require('path');

const indexTsxPath = 'src/web/components/the-lobby/index.tsx';
const overlayOut = 'src/web/components/the-lobby/OverlayManager.tsx';

let code = fs.readFileSync(indexTsxPath, 'utf8');
const lines = code.split('\\n'); // Windows \r\n will leave \r, that's fine, it preserves it.

const socketStart = 570;
const socketEnd = 1551;
const engineStart = 1825;
const engineEnd = 1848;
const overlayStart = 1882;
const overlayEnd = 1997;

// --- OVERLAY MANAGER ---
const overlayProps = `
export interface OverlayManagerProps {
  gameMode: string;
  enableStudio: boolean;
  canStudio: boolean;
  studioToolsOpen: boolean;
  suppressGameplay: boolean;
  isMapTransitioning: boolean;
  activeDialog: any;
  showGameplayHud: boolean;
  isEditingInterface: boolean;
  userCharacters: any[];
  activeCharacterId?: string;
  isOptionsOpen: boolean;
  setIsOptionsOpen: (v: boolean) => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  selectAndLoadCharacter: (id: string) => void;
  setShowCreator: (v: boolean) => void;
  setShowSelector: (v: boolean) => void;
  loadCharactersList: () => void;
}
`;

const overlayJSX = lines.slice(overlayStart, overlayEnd + 1).join('\\n');
const overlayCode = `import React, { Suspense } from 'react';
import { useEditorStore } from './editor/editor-store';
import { useGameStore } from './store';
import SaintsDexOverlay from './SaintsDexOverlay';
import TargetFrame from './target-frame';
import QuestTrackerOverlay from './quest-tracker-overlay';
import ShopOverlay from './shop-overlay';
import BankOverlay from './windows/bank-overlay';
import PartyOverlay from './party-overlay';
import CraftingOverlay from './crafting-overlay';
import BaseOverlay from './base-overlay';
import DialogOverlay from './dialog-overlay';
import ProfessorLabOverlay from './ProfessorLabOverlay';
import LeaderboardOverlay from './leaderboard-overlay';
import AchievementsOverlay from './achievements-overlay';
import MiniMapRadar from './MiniMapRadar';
import PeerPresenceHud from './PeerPresenceHud';
import PlayerVitalsHud from './hud/PlayerVitalsHud';
import ClassicPanel from './ClassicPanel';
import Hotbar from './Hotbar';
import DraggablePanel from './DraggablePanel';
import { InventoryWindow } from './windows/InventoryWindow';
import { SkillsWindow } from './windows/SkillsWindow';
import { EquipmentWindow } from './windows/EquipmentWindow';
import { QuestLogWindow } from './windows/QuestLogWindow';
import { GtcWindow } from './windows/GtcWindow';
import { LobbyHudDockLayout } from './hud/LobbyHudDockLayout';
import { ContextInteractionBadge } from './hud/ContextInteractionBadge';
import { TargetUnitFrame } from './hud/TargetUnitFrame';
import GameTitleScreen from './GameTitleScreen';
import GameLogin from './GameLogin';
import ServerSelect from './ServerSelect';
import { HudErrorBoundary } from './hud/HudErrorBoundary';
import { TurnBattleOverlay } from './battle/TurnBattleOverlay';
import GameToastStack from './GameToastStack';
import GameOptionsMenu from './hud/GameOptionsMenu';
import { ViewfinderOverlay } from './hud/ViewfinderOverlay';
import dynamic from 'next/dynamic';

const StudioEditorShell = dynamic(() => import('./editor/StudioEditorShell').then((m) => m.StudioEditorShell), { ssr: false });
const StudioEscapeMenu = dynamic(() => import('./editor/StudioEscapeMenu').then((m) => m.StudioEscapeMenu), { ssr: false });
const UiEditToolbar = dynamic(() => import('./editor/UiEditToolbar').then((m) => m.UiEditToolbar), { ssr: false });

${overlayProps}

export function OverlayManager({
  gameMode,
  enableStudio,
  canStudio,
  studioToolsOpen,
  suppressGameplay,
  isMapTransitioning,
  activeDialog,
  showGameplayHud,
  isEditingInterface,
  userCharacters,
  activeCharacterId,
  isOptionsOpen,
  setIsOptionsOpen,
  isFullscreen,
  toggleFullscreen,
  selectAndLoadCharacter,
  setShowCreator,
  setShowSelector,
  loadCharactersList
}: OverlayManagerProps) {
  return (
    <>
${overlayJSX}
    </>
  );
}
`;
fs.writeFileSync(overlayOut, overlayCode);


// --- REBUILD INDEX.TSX ---

const socketCall = `  useWorldSocket({
    status,
    session,
    enableStudio,
    socketRef,
    lastJoinKeyRef,
    recentChatEventKeysRef,
    isRealmOffline,
    setIsRealmOffline,
    activeCharacterId,
    setActiveCharacterId,
    hasAuthInitializedRef,
    dispatchChatEvent,
    setDevMapList
  });\\r`;

const engineCall = `      <EngineMount 
        enableStudio={enableStudio}
        activeBrushTileId={activeBrushTileId}
        activeLayerIdx={activeLayerIdx}
        studioToolsOpen={studioToolsOpen}
        suppressGameplay={suppressGameplay}
        setClickedTile={setClickedTile}
        gameMode={gameMode}
      />\\r`;

const overlayCall = `        <OverlayManager
          gameMode={gameMode}
          enableStudio={enableStudio}
          canStudio={canStudio}
          studioToolsOpen={studioToolsOpen}
          suppressGameplay={suppressGameplay}
          isMapTransitioning={isMapTransitioning}
          activeDialog={activeDialog}
          showGameplayHud={showGameplayHud}
          isEditingInterface={isEditingInterface}
          userCharacters={userCharacters}
          activeCharacterId={activeCharacterId}
          isOptionsOpen={isOptionsOpen}
          setIsOptionsOpen={setIsOptionsOpen}
          isFullscreen={isFullscreen}
          toggleFullscreen={toggleFullscreen}
          selectAndLoadCharacter={selectAndLoadCharacter}
          setShowCreator={setShowCreator}
          setShowSelector={setShowSelector}
          loadCharactersList={loadCharactersList}
        />\\r`;

// Replace from bottom to top so line numbers don't shift!
lines.splice(overlayStart, overlayEnd - overlayStart + 1, overlayCall);
lines.splice(engineStart, engineEnd - engineStart + 1, engineCall);
lines.splice(socketStart, socketEnd - socketStart + 1, socketCall);

// Remove the import GameCanvasBabylon line (index 3) and add the 3 new imports
lines.splice(3, 1, 
  "import { useWorldSocket } from './useWorldSocket';\\r",
  "import { OverlayManager } from './OverlayManager';\\r",
  "import { EngineMount } from './EngineMount';\\r"
);

fs.writeFileSync(indexTsxPath, lines.join('\\n'));
console.log("Successfully ran robust explicit-index slice.");
