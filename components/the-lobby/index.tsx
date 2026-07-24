'use client';

import { useRef, useState, useEffect } from 'react';
import GameCanvasBabylon from './babylon/GameCanvasBabylon';
import IntegratedDevEditor from './editor/IntegratedDevEditor';
import SaintsDexOverlay from './SaintsDexOverlay';
import BattleOverlay from './battle-overlay';
import ShopOverlay from './shop-overlay';
import SkillsOverlay from './skills-overlay';
import InventoryOverlay from './inventory-overlay';
import PartyOverlay from './party-overlay';
import CraftingOverlay from './crafting-overlay';
import BaseOverlay from './base-overlay';
import DialogOverlay from './dialog-overlay';
import ProfessorLabOverlay from './ProfessorLabOverlay';
import GtcOverlay from './gtc-overlay';
import RpgStatsOverlay from './rpg-stats-overlay';
import QuestLogOverlay from './quest-log-overlay';
import LeaderboardOverlay from './leaderboard-overlay';
import AchievementsOverlay from './achievements-overlay';
import MiniMapRadar from './MiniMapRadar';
import DPad from './dpad';
import SaintsHudOrbs from './hud/SaintsHudOrbs';
import { useGameStore } from './store';

import { loadGameCharacter, saveGameState, getUserCharacters } from '@/app/actions/game';
import { fetchAllMaps } from '@/app/actions/game-admin';
import { fetchAllGameQuests } from '@/app/actions/game-dev';
import { GAME_MAPS } from './data/maps';
import { QUEST_DB } from './data/quests';
import { CharacterCreator } from './character-creator';
import { CharacterSelector } from './character-selector';
import { io, Socket } from 'socket.io-client';
import { GameChat } from './chat/GameChat';

export default function TheLobby({ characterId: initialCharacterId, forceCreate }: { characterId?: string, forceCreate?: boolean }) {
  const gameMode = useGameStore((state) => state.gameMode);
  const toast = useGameStore((state) => state.toast);
  const emitSocketEvent = useGameStore((state) => state.emitSocketEvent);
  const containerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isDevEditorOpen, setIsDevEditorOpen] = useState(false);
  const [activeBrushTileId, setActiveBrushTileId] = useState<number>(1);

  const [activeCharacterId, setActiveCharacterId] = useState<string | undefined>(initialCharacterId);
  const [userCharacters, setUserCharacters] = useState<any[]>([]);
  const [showSelector, setShowSelector] = useState(false);
  const [showCreator, setShowCreator] = useState(forceCreate || false);
  const [isAdminUser, setIsAdminUser] = useState(false);

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
        spriteId: res.data.spriteId,
        position: validPosition
      });
      useGameStore.setState({ currentMapId: validMapId });

      setActiveCharacterId(charId);
      setShowSelector(false);
      setShowCreator(false);
      if (typeof window !== 'undefined') {
        window.history.pushState({}, '', `/lobby?characterId=${charId}`);
      }
    } else {
      setShowSelector(true);
    }
    setIsInitializing(false);
  };

  useEffect(() => {
    async function init() {
      // Check admin status for Map Editor access
      const { checkAdminPermission } = await import('@/app/actions/game-admin');
      const adminPermission = await checkAdminPermission();
      setIsAdminUser(adminPermission);

      // Hydrate custom maps from DB
      const mapsRes = await fetchAllMaps();
      if (mapsRes.success && mapsRes.data) {
        mapsRes.data.forEach((dbMap: any) => {
          try {
            GAME_MAPS[dbMap.id] = {
              id: dbMap.id,
              name: dbMap.name,
              grid: JSON.parse(dbMap.gridData),
              gates: JSON.parse(dbMap.gatesData) || {},
              encounterPool: dbMap.encountersData ? JSON.parse(dbMap.encountersData) : []
            };

            if (dbMap.npcsData) {
              const parsedNpcs = JSON.parse(dbMap.npcsData);
              if (Array.isArray(parsedNpcs)) {
                const currentEntities = useGameStore.getState().mapEntities;
                const newEntities = parsedNpcs.map((npc: any) => ({
                  id: npc.id || `npc_${Math.random()}`,
                  type: 'NPC' as const,
                  spriteKey: npc.spriteId || 'villager_1',
                  position: { x: npc.x, y: npc.y },
                  isMoving: false,
                  facing: 'DOWN' as const,
                  mapId: dbMap.id
                }));
                useGameStore.setState({ mapEntities: [...currentEntities, ...newEntities] });
              }
            }
          } catch (_err) {
            console.error('Failed to parse map data:', dbMap.id);
          }
        });
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

      const existingChars = await loadCharactersList();

      if (initialCharacterId) {
        await selectAndLoadCharacter(initialCharacterId);
      } else if (forceCreate || existingChars.length === 0) {
        setShowCreator(true);
        setShowSelector(false);
        setIsInitializing(false);
      } else {
        setShowSelector(true);
        setShowCreator(false);
        setIsInitializing(false);
      }
    }
    init();
  }, [initialCharacterId, forceCreate]);

  // SOCKET.IO CONNECTION
  useEffect(() => {
    // Check if running in browser
    if (typeof window === 'undefined') return;

    // Connect to port 3001 for the game MMO server
    const socket = io(window.location.protocol + '//' + window.location.hostname + ':3001');
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
        spriteId: state.player.equipment?.head ? 'hero_male' : 'villager_1'
      });
    });
    
    socket.on('map_players', (players) => {
      useGameStore.getState().setOtherPlayers(players);
    });
    
    socket.on('player_joined', (data) => {
      useGameStore.getState().updateOtherPlayer(data.socketId, data);
    });
    
    socket.on('player_moved', (data) => {
      useGameStore.getState().updateOtherPlayer(data.socketId, data);
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
      if (key === 'i') useGameStore.getState().setGameMode('INVENTORY');
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

  if (showCreator) {
    return (
      <CharacterCreator 
        onComplete={(newId) => selectAndLoadCharacter(newId)} 
        onCancel={userCharacters.length > 0 ? () => { setShowCreator(false); setShowSelector(true); } : undefined}
      />
    );
  }

  if (showSelector) {
    return (
      <CharacterSelector 
        characters={userCharacters} 
        onSelect={(id) => selectAndLoadCharacter(id)} 
        onCreateNew={() => { setShowSelector(false); setShowCreator(true); }}
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
        isDevEditorOpen={isDevEditorOpen}
      />
      
      {/* Mobile Controls */}
      <DPad />

      {/* Integrated Dev Editor Overlay */}
      <IntegratedDevEditor 
        isOpen={isDevEditorOpen} 
        onClose={() => setIsDevEditorOpen(false)} 
        onBrushTileChange={(tileId) => setActiveBrushTileId(tileId)}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 px-4 py-2 bg-green-950/90 text-green-400 border border-green-500/50 rounded font-bold text-sm whitespace-nowrap animate-in slide-in-from-top-4 duration-300 z-50 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
          [!] {toast.message}
        </div>
      )}

      {gameMode !== 'BATTLE' && (
        <div className="absolute top-4 left-4 right-4 flex justify-between z-40 pointer-events-none">
          <div className="flex gap-2">
            <button
              onClick={toggleFullscreen}
              className="px-3 py-1 bg-white/90 text-black border-2 border-[#333] rounded font-bold text-xs hover:bg-gray-200 transition-colors shadow-md pointer-events-auto"
            >
              {isFullscreen ? 'EXIT FULLSCREEN' : 'FULLSCREEN'}
            </button>
            {gameMode !== 'EXPLORING' && (
              <button
                onClick={() => useGameStore.getState().setGameMode('EXPLORING')}
                className="px-3 py-1 bg-red-950/90 text-red-300 border-2 border-red-500/50 rounded font-bold text-xs hover:bg-red-900 transition-colors shadow-md pointer-events-auto flex items-center gap-1 font-mono"
              >
                ✕ CLOSE OVERLAY
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => { setIsDevEditorOpen(false); useGameStore.getState().setGameMode('ACHIEVEMENTS'); }}
              className="px-3 py-1 bg-yellow-900/90 text-yellow-200 border-2 border-yellow-500 rounded font-bold text-xs hover:bg-yellow-700 transition-colors shadow-md pointer-events-auto"
            >
              BADGES [B]
            </button>
            <button
              onClick={() => { setIsDevEditorOpen(false); useGameStore.getState().setGameMode('LEADERBOARD'); }}
              className="px-3 py-1 bg-purple-900/90 text-purple-200 border-2 border-purple-500 rounded font-bold text-xs hover:bg-purple-700 transition-colors shadow-md pointer-events-auto"
            >
              LEADERS
            </button>
            <button
              onClick={() => { setIsDevEditorOpen(false); useGameStore.getState().setGameMode('QUESTS'); }}
              className="px-3 py-1 bg-[#d84315]/90 text-amber-200 border-2 border-[#ff6e40] rounded font-bold text-xs hover:bg-[#ff6e40] transition-colors shadow-md pointer-events-auto"
            >
              QUESTS
            </button>
            <button
              onClick={() => { setIsDevEditorOpen(false); useGameStore.getState().setGameMode('PARTY'); }}
              className="px-3 py-1 bg-[#b71c1c]/90 text-white border-2 border-[#ff5252] rounded font-bold text-xs hover:bg-[#ff5252] transition-colors shadow-md pointer-events-auto"
            >
              PARTY [P]
            </button>
            <button
              onClick={() => { setIsDevEditorOpen(false); useGameStore.getState().setGameMode('EQUIPMENT'); }}
              className="px-3 py-1 bg-[#4a148c]/90 text-white border-2 border-[#9c27b0] rounded font-bold text-xs hover:bg-[#9c27b0] transition-colors shadow-md pointer-events-auto"
            >
              GEAR
            </button>
            <button
              onClick={() => { setIsDevEditorOpen(false); useGameStore.getState().setGameMode('INVENTORY'); }}
              className="px-3 py-1 bg-[#e65100]/90 text-white border-2 border-[#ff9800] rounded font-bold text-xs hover:bg-[#ff9800] transition-colors shadow-md pointer-events-auto"
            >
              INVENTORY [I]
            </button>
            <button
              onClick={() => { setIsDevEditorOpen(false); useGameStore.getState().setGameMode('GTC'); }}
              className="px-3 py-1 bg-amber-900/90 text-amber-300 border-2 border-amber-500 rounded font-bold text-xs hover:bg-amber-700 transition-colors shadow-md pointer-events-auto flex items-center gap-1"
            >
              GTC
            </button>
            <button
              onClick={() => { setIsDevEditorOpen(false); useGameStore.getState().setGameMode('SKILLS'); }}
              className="px-3 py-1 bg-[#1b5e20]/90 text-white border-2 border-[#4caf50] rounded font-bold text-xs hover:bg-[#4caf50] transition-colors shadow-md pointer-events-auto"
            >
              SKILLS [K]
            </button>
            <button
              onClick={() => { setIsDevEditorOpen(false); useGameStore.getState().setGameMode('DEX'); }}
              className="px-3 py-1 bg-[#0d47a1]/90 text-white border-2 border-[#2196f3] rounded font-bold text-xs hover:bg-[#2196f3] transition-colors shadow-md pointer-events-auto"
            >
              DEX [X]
            </button>
            {isAdminUser && (
              <button
                onClick={() => { 
                  if (!isDevEditorOpen) useGameStore.getState().setGameMode('EXPLORING');
                  setIsDevEditorOpen(!isDevEditorOpen); 
                }}
                className="px-3 py-1 bg-[#006064]/90 text-cyan-300 border-2 border-cyan-400 rounded font-bold text-xs hover:bg-cyan-700 transition-colors shadow-md pointer-events-auto flex items-center gap-1 font-mono"
              >
                {isDevEditorOpen ? 'CLOSE EDITOR' : 'EDITOR'}
              </button>
            )}
          </div>
        </div>
      )}
      
      {gameMode === 'DEX' && <SaintsDexOverlay />}
      {gameMode === 'BATTLE' && <BattleOverlay />}
      {gameMode === 'SHOP' && <ShopOverlay />}
      {gameMode === 'SKILLS' && <SkillsOverlay />}
      {gameMode === 'INVENTORY' && <InventoryOverlay />}
      {gameMode === 'PARTY' && <PartyOverlay />}
      {gameMode === 'EQUIPMENT' && <RpgStatsOverlay />}
      {gameMode === 'CRAFTING' && <CraftingOverlay />}
      {gameMode === 'BASE' && <BaseOverlay />}
      {gameMode === 'DIALOG' && <DialogOverlay />}
      {gameMode === 'GTC' && <GtcOverlay />}
      {gameMode === 'QUESTS' && <QuestLogOverlay />}
      {gameMode === 'LEADERBOARD' && <LeaderboardOverlay />}
      {gameMode === 'ACHIEVEMENTS' && <AchievementsOverlay />}
      {gameMode === 'PROFESSOR_LAB' && <ProfessorLabOverlay onClose={() => useGameStore.getState().setGameMode('EXPLORING')} />}

      {gameMode === 'EXPLORING' && !isDevEditorOpen && <MiniMapRadar />}
      {gameMode === 'EXPLORING' && !isDevEditorOpen && <SaintsHudOrbs />}

      {/* Unified Game Chat UI */}
      {gameMode === 'EXPLORING' && !isDevEditorOpen && (
        <GameChat />
      )}
    </div>
  );
}
