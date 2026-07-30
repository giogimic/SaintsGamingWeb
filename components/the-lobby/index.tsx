'use client';

import { useRef, useState, useEffect } from 'react';
import GameCanvasBabylon from './babylon/GameCanvasBabylon';
import IntegratedDevEditor from './editor/IntegratedDevEditor';
import SaintsDexOverlay from './SaintsDexOverlay';
import TargetFrame from './target-frame';
import ShopOverlay from './shop-overlay';
import PartyOverlay from './party-overlay';
import CraftingOverlay from './crafting-overlay';
import BaseOverlay from './base-overlay';
import DialogOverlay from './dialog-overlay';
import ProfessorLabOverlay from './ProfessorLabOverlay';
import LeaderboardOverlay from './leaderboard-overlay';
import AchievementsOverlay from './achievements-overlay';
import MiniMapRadar from './MiniMapRadar';
import DPad from './dpad';
import SaintsHudOrbs from './hud/SaintsHudOrbs';
import ClassicPanel from './ClassicPanel';
import { UiEditToolbar } from './editor/UiEditToolbar';
import Hotbar from './Hotbar';
import DraggablePanel from './DraggablePanel';
import GameTitleScreen from './GameTitleScreen';
import GameLogin from './GameLogin';
import ServerSelect from './ServerSelect';
import { useGameStore } from './store';

import { loadGameCharacter, saveGameState, getUserCharacters } from '@/app/actions/game';
import { fetchAllMaps } from '@/app/actions/game-admin';
import { fetchAllGameQuests } from '@/app/actions/game-dev';
import { GAME_MAPS, loadMap } from './data/maps';
import { QUEST_DB } from './data/quests';
import { CharacterCreator } from './character-creator';
import { CharacterSelector } from './character-selector';
import { io, Socket } from 'socket.io-client';
import { GameChat } from './chat/GameChat';
import GameOptionsMenu from './hud/GameOptionsMenu';

export default function TheLobby({ characterId: initialCharacterId, forceCreate }: { characterId?: string, forceCreate?: boolean }) {
  const gameMode = useGameStore((state) => state.gameMode);
  const toast = useGameStore((state) => state.toast);
  const activeDialog = useGameStore((state) => state.activeDialog);
  const isMapTransitioning = useGameStore((state) => state.isMapTransitioning);
  const currentMapId = useGameStore((state) => state.currentMapId);
  const isUiEditMode = useGameStore((state) => state.isUiEditMode);
  const containerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isDevEditorOpen, setIsDevEditorOpen] = useState(false);
  const [devMapList, setDevMapList] = useState<{id: string, name: string}[]>([]);
  const [editorTab, setEditorTab] = useState<'visual' | 'logic'>('visual');
  const [activeBrushTileId, setActiveBrushTileId] = useState<number>(1);
  const [activeLayerIdx, setActiveLayerIdx] = useState<number>(0);
  const [editorClickedTile, setEditorClickedTile] = useState<{r: number, c: number} | null>(null);
  const [uiScale, setUiScale] = useState(1);

  const [activeCharacterId, setActiveCharacterId] = useState<string | undefined>(initialCharacterId);
  const [userCharacters, setUserCharacters] = useState<any[]>([]);
  const [showSelector, setShowSelector] = useState(false);
  const [showCreator, setShowCreator] = useState(forceCreate || false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);

  const loadCharactersList = async () => {
    const charsRes = await getUserCharacters();
    if (charsRes.success && charsRes.data) {
      setUserCharacters(charsRes.data);
      return charsRes.data;
    }
    return [];
  };

  const selectAndLoadCharacter = async (charId: string) => {
    setIsInitializing(true);
    const res = await loadGameCharacter(charId);
    if (res.success && res.data) {
      const parsedState = JSON.parse(res.data.stateData);
      
      // Map state sanitizer: ensure player boots into a valid Tuxemon campaign map
      const validMapId = (parsedState.currentMapId && GAME_MAPS[parsedState.currentMapId]) 
        ? parsedState.currentMapId 
        : 'PLAYER_HOUSE_BEDROOM';

      const validPosition = GAME_MAPS[validMapId] 
        ? (parsedState.position || { x: 6, y: 2 })
        : { x: 6, y: 2 };

      useGameStore.getState().hydratePlayer({ 
        ...parsedState,
        name: res.data.name,
        spriteId: res.data.spriteId || 'adventurer',
        position: validPosition
      });
      useGameStore.setState({ currentMapId: validMapId, gameMode: 'EXPLORING' });

      setActiveCharacterId(charId);
      if (typeof window !== 'undefined') {
        window.history.pushState({}, '', `/lobby?characterId=${charId}`);
      }
    } else {
      useGameStore.getState().setGameMode('CHARACTER_SELECT');
    }
    setIsInitializing(false);
  };

  useEffect(() => {
    async function init() {
      // Check admin status for Map Editor access
      const { checkAdminPermission } = await import('@/app/actions/game-admin');
      const adminPermission = await checkAdminPermission();
      setIsAdminUser(adminPermission);
      
      // Fetch logic tiles from DB
      await useGameStore.getState().fetchLogicTiles();

      // Fetch custom maps list for the dev editor dropdown
      const mapsRes = await fetchAllMaps();
      if (mapsRes.success && mapsRes.data) {
        setDevMapList(mapsRes.data);
      }

      // Hydrate custom quests from DB
      const questsRes = await fetchAllGameQuests();
      if (questsRes.success && questsRes.data) {
        questsRes.data.forEach((q: any) => {
          QUEST_DB[q.id] = {
            id: q.id,
            name: q.name,
            npcId: q.npcId,
            description: q.description,
            dialogs: {
              start: q.dialogStart,
              inProgress: q.dialogProgress,
              complete: q.dialogComplete,
            },
            requirements: {
              itemId: q.reqItemId || undefined,
              amount: q.reqAmount || undefined,
              skillId: q.reqSkillId || undefined,
              level: q.reqLevel || undefined,
            },
            rewards: {
              xp: q.rewardXp || undefined,
              credits: q.rewardCredits || undefined,
              itemId: q.rewardItemId || undefined,
              amount: q.rewardAmount || undefined,
            }
          };
        });
      }

      await loadCharactersList();

      if (initialCharacterId) {
        await selectAndLoadCharacter(initialCharacterId);
      } else {
        setIsInitializing(false);
      }
    }
    
    const handleResize = () => {
      const scale = Math.max(0.6, Math.min(1.5, window.innerWidth / 1280));
      setUiScale(scale);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    init();
    return () => window.removeEventListener('resize', handleResize);
  }, [initialCharacterId, forceCreate]);

  // SOCKET.IO CONNECTION
  useEffect(() => {
    // Check if running in browser
    if (typeof window === 'undefined') return;

    // Connect to the unified Next.js MMO server
    const socket = io(); // Connects to the same host that served the page
    socketRef.current = socket;
    
    socket.on('connect', () => {
      const state = useGameStore.getState();
      state.setEmitSocketEvent((event, data) => {
        socket.emit(event, data);
      });
      socket.emit('join_map', {
        mapId: state.currentMapId,
        x: state.player.position?.x ?? 6,
        y: state.player.position?.y ?? 2,
        name: state.player.name || 'Player',
        spriteId: state.player.spriteId || 'adventurer'
      });
    });
    
    socket.on('map_joined', (data) => {
      useGameStore.getState().setInstanceId(data.instanceId);
    });

    socket.on('map_players', (players) => {
      useGameStore.getState().setOtherPlayers(players);
    });
    
    socket.on('player_joined', (data) => {
      useGameStore.getState().updateOtherPlayer(data.socketId, data);
    });
    
    socket.on('player_moved', (data) => {
      if (data.socketId === socket.id) {
        // Phase 2: Client Prediction enabled. We ignore movement deltas for ourselves
        // because we strictly reconcile using 'move_ack' and 'position_correction' to prevent judder.
        // However, we MUST accept HP updates if we took damage.
        if (data.hp !== undefined) {
           useGameStore.setState((state) => {
              state.player.hp = data.hp;
              if (data.maxHp !== undefined) state.player.maxHp = data.maxHp;
           });
        }
      } else {
        useGameStore.getState().updateOtherPlayer(data.socketId, data);
      }
    });
    
    socket.on('player_chat', (data) => {
      useGameStore.getState().updateOtherPlayer(data.socketId, { chatMessage: data.message });
      
      // Dispatch custom event for the GameChat Log UI
      const state = useGameStore.getState();
      const op = state.otherPlayers[data.socketId];
      const msgEvent = new CustomEvent('game_chat_msg', {
        detail: {
          id: Date.now().toString() + Math.random(),
          sender: op?.name || 'Tamer',
          text: data.message,
          timestamp: Date.now(),
          type: 'LOCAL'
        }
      });
      window.dispatchEvent(msgEvent);

      setTimeout(() => {
        const store = useGameStore.getState();
        const currentOp = store.otherPlayers[data.socketId];
        if (currentOp && currentOp.chatMessage === data.message) {
          store.updateOtherPlayer(data.socketId, { chatMessage: undefined });
        }
      }, 7000);
    });

    socket.on('global_chat_msg', (data) => {
      const msgEvent = new CustomEvent('game_chat_msg', {
        detail: {
          id: Date.now().toString() + Math.random(),
          sender: data.sender || 'Tamer',
          text: data.message,
          timestamp: data.timestamp || Date.now(),
          type: 'GLOBAL'
        }
      });
      window.dispatchEvent(msgEvent);
    });

    socket.on('party_chat_msg', (data) => {
      const msgEvent = new CustomEvent('game_chat_msg', {
        detail: {
          id: Date.now().toString() + Math.random(),
          sender: data.sender || 'Tamer',
          text: data.message,
          timestamp: data.timestamp || Date.now(),
          type: 'PARTY'
        }
      });
      window.dispatchEvent(msgEvent);
    });
    
    socket.on('player_left', (socketId) => {
      useGameStore.getState().removeOtherPlayer(socketId);
    });
    
    socket.on('battle_invite_received', (data) => {
      useGameStore.getState().showToast(`Challenge from ${data.name}! Accepting...`);
      socket.emit('accept_battle', data.from);
    });
    
    socket.on('battle_started', (data) => {
      useGameStore.getState().setActiveBattle(data);
      useGameStore.getState().setGameMode('BATTLE');
    });
    
    socket.on('battle_update', (data) => {
      useGameStore.getState().setActiveBattle({
        ...useGameStore.getState().activeBattle,
        ...data
      });
    });
    
    socket.on('battle_ended', (data) => {
      const state = useGameStore.getState();
      const myId = socketRef.current?.id;
      if (data.winner === myId) {
        state.showToast('You won the battle!');
      } else {
        state.showToast('You lost the battle...');
      }
      setTimeout(() => {
        state.setActiveBattle(null);
        state.setGameMode('EXPLORING');
      }, 3000);
    });

    // --- PHASE 3: MMO Real-Time Combat ---
    socket.on('combat_update', (data) => {
      // Dispatch custom event so the BattleOverlay can render damage numbers and logs
      const msgEvent = new CustomEvent('combat_update_event', { detail: data });
      window.dispatchEvent(msgEvent);
    });

    socket.on('capture_start', (data) => {
      window.dispatchEvent(new CustomEvent('capture_start_event', { detail: data }));
    });

    socket.on('capture_result', (data) => {
      window.dispatchEvent(new CustomEvent('capture_result_event', { detail: data }));
    });

    socket.on('capture_interrupted', (data) => {
      window.dispatchEvent(new CustomEvent('capture_interrupted_event', { detail: data }));
    });

    // ─── Phase 2: Server-Authoritative Movement Reconciliation ───
    socket.on('move_ack', (data) => {
      // Server acknowledged our move — clear pending moves up to this seq
      // data = { seq, x, y, direction }
      useGameStore.getState().clearPendingMovesUpTo(data.seq, data.x, data.y);
    });

    socket.on('position_correction', (data) => {
      // Server rejected our move or we're desynced — rubber-band back
      // data = { seq, x, y, direction, reason }
      const store = useGameStore.getState();
      store.applyServerCorrection(data.x, data.y, data.direction);
      if (data.reason === 'invalid_distance') {
        console.warn('[Net] Server rejected move: teleport attempt detected');
      }
    });

    socket.on('player_defeated', (data) => {
      const state = useGameStore.getState();
      state.showToast("You blacked out... Respawning at Safe Zone");
      state.setInstanceId(data.instanceId);
      state.setCurrentMapId(data.mapId);
      state.setPlayerPosition({ x: data.x, y: data.y }, 'down', false);
      state.modifyHp(9999); // Full heal (clamped to maxHp by modifyHp)
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // AUTO-SAVE LOOP
  useEffect(() => {
    if (!activeCharacterId || showCreator || showSelector || isInitializing) return;

    const interval = setInterval(async () => {
      const state = useGameStore.getState();
      const stateData = JSON.stringify(state.player);
      
      const res = await saveGameState(activeCharacterId, stateData);
      if (res.success) {
        console.log('[Auto-Save] Successfully synced player state to DB');
      } else {
        console.error('[Auto-Save] Failed to sync player state');
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [activeCharacterId, showCreator, showSelector, isInitializing]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    // Standard game hotkeys (I, K, P, D, B)
    const handleGlobalHotkeys = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      const key = e.key.toLowerCase();
      if (key === 'escape') setIsOptionsOpen(prev => !prev);
      else if (key === 'i') useGameStore.getState().setGameMode('INVENTORY');
      else if (key === 'k') useGameStore.getState().setGameMode('SKILLS');
      else if (key === 'p') useGameStore.getState().setGameMode('PARTY');
      else if (key === 'x') useGameStore.getState().setGameMode('DEX');
      else if (key === 'b') useGameStore.getState().setGameMode('ACHIEVEMENTS');
    };
    window.addEventListener('keydown', handleGlobalHotkeys);
    return () => window.removeEventListener('keydown', handleGlobalHotkeys);
  }, []);

  if (isInitializing) {
    return <div className="w-full h-full flex items-center justify-center text-emerald-500 font-mono">INITIALIZING TERMINAL...</div>;
  }

  if (gameMode === 'CHARACTER_CREATOR' || showCreator) {
    return (
      <CharacterCreator 
        onComplete={(newId) => selectAndLoadCharacter(newId)} 
        onCancel={userCharacters.length > 0 ? () => { useGameStore.getState().setGameMode('CHARACTER_SELECT'); setShowCreator(false); } : undefined}
      />
    );
  }

  if (gameMode === 'CHARACTER_SELECT' || showSelector) {
    return (
      <CharacterSelector 
        characters={userCharacters} 
        onSelect={(id) => selectAndLoadCharacter(id)} 
        onCreateNew={() => { useGameStore.getState().setGameMode('CHARACTER_CREATOR'); setShowSelector(false); setShowCreator(true); }}
        onRefresh={() => loadCharactersList()}
      />
    );
  }

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full touch-none select-none bg-[#0a0a0f]"
    >
      <GameCanvasBabylon 
        activeBrushTileId={activeBrushTileId}
        activeLayerIdx={editorTab === 'logic' ? -2 : activeLayerIdx}
        isDevEditorOpen={isDevEditorOpen}
        onMapClick={(r, c) => {
          if (isDevEditorOpen) setEditorClickedTile({r, c});
        }}
      />
      
      {/* SCALED UI CONTAINER */}
      <div 
        className="absolute inset-0 pointer-events-none" 
      >
        {/* Mobile Controls */}
        <div className="pointer-events-auto">
          <DPad />
        </div>


      {/* Integrated Dev Editor Overlay — must be OUTSIDE the pointer-events-none container */}
      </div>
      <IntegratedDevEditor 
        activeMapId={currentMapId}
        onMapSelect={(id) => {
          loadMap(id).then(() => {
            useGameStore.setState({ currentMapId: id });
          });
        }}
        devMapList={devMapList}
        isOpen={isDevEditorOpen} 
        onClose={() => setIsDevEditorOpen(false)} 
        onBrushTileChange={(tileId) => setActiveBrushTileId(tileId)}
        activeLayerIdx={activeLayerIdx}
        onLayerChange={(idx) => setActiveLayerIdx(idx)}
        onTabChange={(tab) => { setEditorTab(tab as any); setEditorClickedTile(null); }}
        clickedTile={editorClickedTile}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="relative px-5 py-2.5 bg-black/80 backdrop-blur-xl border border-emerald-500/30 rounded-xl font-bold text-sm whitespace-nowrap shadow-[0_0_25px_rgba(16,185,129,0.2)]">
            <div className="absolute -top-px left-4 right-4 h-[2px] bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />
            <span className="text-emerald-400 font-mono text-xs mr-2">▶</span>
            <span className="text-emerald-200 font-mono text-xs">{toast.message}</span>
          </div>
        </div>
      )}

      {gameMode !== 'BATTLE' && (
        <div className="absolute top-3 right-3 z-40 pointer-events-none">
          <button
            onClick={() => setIsOptionsOpen(true)}
            className="pointer-events-auto px-3 py-1.5 bg-black/60 backdrop-blur-md text-slate-300 border border-white/10 rounded-lg text-[11px] font-mono font-medium hover:bg-white/10 hover:text-white transition-all shadow-lg active:scale-95 flex items-center gap-2"
          >
            <span className="text-sm leading-none">⚙️</span>
            <span>OPTIONS (ESC)</span>
          </button>
        </div>
      )}

      <GameOptionsMenu 
        isOpen={isOptionsOpen}
        onClose={() => setIsOptionsOpen(false)}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        isAdminUser={isAdminUser}
        isDevEditorOpen={isDevEditorOpen}
        onToggleDevEditor={() => {
          if (!isDevEditorOpen) useGameStore.getState().setGameMode('EXPLORING');
          setIsDevEditorOpen(!isDevEditorOpen); 
          setIsOptionsOpen(false);
        }}
      />

      {/* UI Edit Toolbar (Only visible in edit mode) */}
      <UiEditToolbar />

      {/* --- UI Overlays (Higher Z-Index) --- */}
      {gameMode === 'TITLE_SCREEN' && <GameTitleScreen />}
      {gameMode === 'LOGIN' && <GameLogin />}
      {gameMode === 'SERVER_SELECT' && <ServerSelect />}

      {/* Classic RPG Interface Panel */}
      <DraggablePanel id="classic-panel" className="absolute bottom-4 right-4 pointer-events-none">
        <ClassicPanel />
      </DraggablePanel>

      {/* Overlays that aren't part of ClassicPanel */}
      <div 
        className="absolute inset-0 pointer-events-none flex items-center justify-center" 
      >
        {gameMode === 'CRAFTING' && <CraftingOverlay />}
        {gameMode === 'BASE' && <BaseOverlay />}
        {gameMode === 'DIALOG' && <DialogOverlay />}
        {gameMode === 'PROFESSOR_LAB' && <ProfessorLabOverlay onClose={() => useGameStore.getState().setGameMode('EXPLORING')} />}
        {gameMode === 'ACHIEVEMENTS' && <AchievementsOverlay />}
        {gameMode === 'LEADERBOARD' && <LeaderboardOverlay />}
        {gameMode === 'BATTLE' && <TargetFrame />}
        {gameMode === 'PARTY' && <PartyOverlay />}
        {gameMode === 'DEX' && <SaintsDexOverlay />}
      </div>
      
      {gameMode === 'SHOP' && <ShopOverlay />}
      {/* INVENTORY, SKILLS, EQUIPMENT, QUESTS, GTC, PARTY are now in ClassicPanel */}
      {activeDialog && <DialogOverlay />}
      
      {/* Cinematic Map Transition Overlay */}
      <div 
        className={`fixed inset-0 bg-black transition-opacity duration-300 z-[9999] pointer-events-none ${isMapTransitioning ? 'opacity-100' : 'opacity-0'}`} 
      />
      
      {gameMode === 'LEADERBOARD' && <LeaderboardOverlay />}
      {gameMode === 'ACHIEVEMENTS' && <AchievementsOverlay />}
      {gameMode === 'PROFESSOR_LAB' && <ProfessorLabOverlay onClose={() => useGameStore.getState().setGameMode('EXPLORING')} />}

      {gameMode === 'EXPLORING' && !isDevEditorOpen && (
        <DraggablePanel id="minimap" defaultPosition={{ x: 0, y: 0 }}>
          <MiniMapRadar />
        </DraggablePanel>
      )}
      {gameMode === 'EXPLORING' && !isDevEditorOpen && (
        <DraggablePanel id="orbs" defaultPosition={{ x: 0, y: 0 }}>
          <SaintsHudOrbs />
        </DraggablePanel>
      )}

      {/* Unified Game Chat UI & Hotbar */}
      {gameMode === 'EXPLORING' && !isDevEditorOpen && (
        <>
          <DraggablePanel id="hotbar" defaultPosition={{ x: 0, y: 0 }}>
            <Hotbar />
          </DraggablePanel>
          <DraggablePanel id="chat" defaultPosition={{ x: 0, y: 0 }}>
            <GameChat />
          </DraggablePanel>
        </>
      )}
    </div>
  );
}
