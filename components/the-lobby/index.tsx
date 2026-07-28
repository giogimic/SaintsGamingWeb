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
  const activeDialog = useGameStore((state) => state.activeDialog);
  const isMapTransitioning = useGameStore((state) => state.isMapTransitioning);
  const containerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isDevEditorOpen, setIsDevEditorOpen] = useState(false);
  const [editorTab, setEditorTab] = useState<string>('maps');
  const [activeBrushTileId, setActiveBrushTileId] = useState<number>(1);
  const [activeLayerIdx, setActiveLayerIdx] = useState<number>(0);
  const [editorClickedTile, setEditorClickedTile] = useState<{r: number, c: number} | null>(null);

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
        spriteId: res.data.spriteId || 'adventurer',
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
      
      // Fetch logic tiles from DB
      await useGameStore.getState().fetchLogicTiles();

      // Hydrate custom maps from DB
      const mapsRes = await fetchAllMaps();
      if (mapsRes.success && mapsRes.data) {
        mapsRes.data.forEach((dbMap: any) => {
          try {
            GAME_MAPS[dbMap.id] = {
              id: dbMap.id,
              name: dbMap.name,
              grid: JSON.parse(dbMap.gridData || '[]'),
              gates: dbMap.gatesData ? JSON.parse(dbMap.gatesData) : {},
              encounterPool: dbMap.encountersData ? JSON.parse(dbMap.encountersData) : [],
              tileLayers: dbMap.tileLayersData ? JSON.parse(dbMap.tileLayersData) : [],
              tilesets: dbMap.tilesetsData ? JSON.parse(dbMap.tilesetsData) : []
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
          } catch {
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
        spriteId: state.player.spriteId || 'adventurer'
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
        activeLayerIdx={editorTab === 'logic' ? -2 : activeLayerIdx}
        isDevEditorOpen={isDevEditorOpen}
        onMapClick={(r, c) => {
          if (isDevEditorOpen) setEditorClickedTile({r, c});
        }}
      />
      
      {/* Mobile Controls */}
      <DPad />

      {/* Integrated Dev Editor Overlay */}
      <IntegratedDevEditor 
        isOpen={isDevEditorOpen} 
        onClose={() => setIsDevEditorOpen(false)} 
        onBrushTileChange={(tileId) => setActiveBrushTileId(tileId)}
        activeLayerIdx={activeLayerIdx}
        onLayerChange={(idx) => setActiveLayerIdx(idx)}
        onTabChange={(tab) => { setEditorTab(tab); setEditorClickedTile(null); }}
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
        <div className="absolute top-3 left-3 right-3 flex justify-between items-start z-40 pointer-events-none">
          {/* Left: System Controls */}
          <div className="flex gap-1.5 pointer-events-auto">
            <button
              onClick={toggleFullscreen}
              className="px-3 py-1.5 bg-black/70 backdrop-blur-sm text-slate-300 border border-white/10 rounded-lg text-[11px] font-mono font-medium hover:bg-white/10 hover:text-white transition-all shadow-lg"
            >
              {isFullscreen ? '⛶ EXIT' : '⛶ FULLSCREEN'}
            </button>
            {gameMode !== 'EXPLORING' && (
              <button
                onClick={() => useGameStore.getState().setGameMode('EXPLORING')}
                className="px-3 py-1.5 bg-red-950/70 backdrop-blur-sm text-red-300 border border-red-500/30 rounded-lg text-[11px] font-mono font-medium hover:bg-red-900/80 hover:text-red-200 transition-all shadow-lg"
              >
                ✕ CLOSE
              </button>
            )}
          </div>

          {/* Right: Game Menu Bar */}
          <div className="flex gap-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-1 shadow-2xl pointer-events-auto">
            {[
              { mode: 'PARTY', label: 'Party', key: 'P', icon: '⚔️' },
              { mode: 'INVENTORY', label: 'Items', key: 'I', icon: '🎒' },
              { mode: 'SKILLS', label: 'Skills', key: 'K', icon: '📊' },
              { mode: 'EQUIPMENT', label: 'Gear', key: null, icon: '🛡️' },
              { mode: 'DEX', label: 'Dex', key: 'X', icon: '📖' },
              { mode: 'QUESTS', label: 'Quests', key: null, icon: '📜' },
              { mode: 'GTC', label: 'GTC', key: null, icon: '💱' },
              { mode: 'ACHIEVEMENTS', label: 'Badges', key: 'B', icon: '🏅' },
              { mode: 'LEADERBOARD', label: 'Leaders', key: null, icon: '🏆' },
            ].map((item) => (
              <button
                key={item.mode}
                onClick={() => { setIsDevEditorOpen(false); useGameStore.getState().setGameMode(item.mode as any); }}
                className={`group relative flex flex-col items-center px-2 py-1.5 rounded-lg text-[10px] font-mono transition-all ${
                  gameMode === item.mode
                    ? 'bg-indigo-600/60 text-white shadow-lg shadow-indigo-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/10'
                }`}
                title={item.key ? `${item.label} [${item.key}]` : item.label}
              >
                <span className="text-base leading-none">{item.icon}</span>
                <span className="mt-0.5 leading-none">{item.label}</span>
                {item.key && (
                  <span className="absolute -bottom-0.5 right-0.5 text-[8px] text-cyan-400/60 font-bold">{item.key}</span>
                )}
              </button>
            ))}
            {isAdminUser && (
              <button
                onClick={() => { 
                  if (!isDevEditorOpen) useGameStore.getState().setGameMode('EXPLORING');
                  setIsDevEditorOpen(!isDevEditorOpen); 
                }}
                className={`group flex flex-col items-center px-2 py-1.5 rounded-lg text-[10px] font-mono transition-all border ${
                  isDevEditorOpen
                    ? 'bg-cyan-600/40 text-cyan-300 border-cyan-500/40 shadow-lg shadow-cyan-500/20'
                    : 'text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/50 border-transparent'
                }`}
                title="Dev Editor [Ctrl+E]"
              >
                <span className="text-base leading-none">🔧</span>
                <span className="mt-0.5 leading-none">Editor</span>
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
      {activeDialog && <DialogOverlay />}
      
      {/* Cinematic Map Transition Overlay */}
      <div 
        className={`fixed inset-0 bg-black transition-opacity duration-300 z-[9999] pointer-events-none ${isMapTransitioning ? 'opacity-100' : 'opacity-0'}`} 
      />
      
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
