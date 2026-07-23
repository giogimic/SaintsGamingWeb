'use client';

import { useRef, useState, useEffect } from 'react';
import GameCanvas from './game-canvas';
import SaintsDexOverlay from './TuxepediaOverlay';
import MapEditorPanel from './MapEditorPanel';
import BattleOverlay from './battle-overlay';
import ShopOverlay from './shop-overlay';
import SkillsOverlay from './skills-overlay';
import InventoryOverlay from './inventory-overlay';
import PartyOverlay from './party-overlay';
import EquipmentOverlay from './equipment-overlay';
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
import { useGameStore } from './store';

import { loadGameCharacter, saveGameState, getUserCharacters } from '@/app/actions/game';
import { fetchAllMaps } from '@/app/actions/game-admin';
import { fetchAllGameQuests } from '@/app/actions/game-dev';
import { GAME_MAPS } from './data/maps';
import { QUEST_DB } from './data/quests';
import { CharacterCreator } from './character-creator';
import { CharacterSelector } from './character-selector';

export default function CyberTerminal({ characterId: initialCharacterId, forceCreate }: { characterId?: string, forceCreate?: boolean }) {
  const gameMode = useGameStore((state) => state.gameMode);
  const toast = useGameStore((state) => state.toast);
  const emitSocketEvent = useGameStore((state) => state.emitSocketEvent);
  const containerRef = useRef<HTMLDivElement>(null);
  const [chatInput, setChatInput] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

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
      <GameCanvas />
      
      {/* Mobile Controls */}
      <DPad />

      {/* Toast Notification */}
      {toast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 px-4 py-2 bg-green-950/90 text-green-400 border border-green-500/50 rounded font-bold text-sm whitespace-nowrap animate-in slide-in-from-top-4 duration-300 z-50 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
          [!] {toast.message}
        </div>
      )}

      {gameMode === 'EXPLORING' && (
        <div className="absolute top-4 left-4 right-4 flex justify-between z-20 pointer-events-none">
          <button
            onClick={toggleFullscreen}
            className="px-3 py-1 bg-white/90 text-black border-2 border-[#333] rounded font-bold text-xs hover:bg-gray-200 transition-colors shadow-md pointer-events-auto"
          >
            {isFullscreen ? 'EXIT FULLSCREEN' : 'FULLSCREEN'}
          </button>

          <div className="flex gap-2">
            <button
              onClick={() => useGameStore.getState().setGameMode('ACHIEVEMENTS')}
              className="px-3 py-1 bg-yellow-900/90 text-yellow-200 border-2 border-yellow-500 rounded font-bold text-xs hover:bg-yellow-700 transition-colors shadow-md pointer-events-auto"
            >
              BADGES
            </button>
            <button
              onClick={() => useGameStore.getState().setGameMode('LEADERBOARD')}
              className="px-3 py-1 bg-purple-900/90 text-purple-200 border-2 border-purple-500 rounded font-bold text-xs hover:bg-purple-700 transition-colors shadow-md pointer-events-auto"
            >
              LEADERS
            </button>
            <button
              onClick={() => useGameStore.getState().setGameMode('QUESTS')}
              className="px-3 py-1 bg-[#d84315]/90 text-amber-200 border-2 border-[#ff6e40] rounded font-bold text-xs hover:bg-[#ff6e40] transition-colors shadow-md pointer-events-auto"
            >
              QUESTS
            </button>
            <button
              onClick={() => useGameStore.getState().setGameMode('PARTY')}
              className="px-3 py-1 bg-[#b71c1c]/90 text-white border-2 border-[#ff5252] rounded font-bold text-xs hover:bg-[#ff5252] transition-colors shadow-md pointer-events-auto"
            >
              PARTY
            </button>
            <button
              onClick={() => useGameStore.getState().setGameMode('EQUIPMENT')}
              className="px-3 py-1 bg-[#4a148c]/90 text-white border-2 border-[#9c27b0] rounded font-bold text-xs hover:bg-[#9c27b0] transition-colors shadow-md pointer-events-auto"
            >
              GEAR
            </button>
            <button
              onClick={() => useGameStore.getState().setGameMode('INVENTORY')}
              className="px-3 py-1 bg-[#e65100]/90 text-white border-2 border-[#ff9800] rounded font-bold text-xs hover:bg-[#ff9800] transition-colors shadow-md pointer-events-auto"
            >
              INVENTORY
            </button>
            <button
              onClick={() => useGameStore.getState().setGameMode('GTC')}
              className="px-3 py-1 bg-amber-900/90 text-amber-300 border-2 border-amber-500 rounded font-bold text-xs hover:bg-amber-700 transition-colors shadow-md pointer-events-auto flex items-center gap-1"
            >
              GTC
            </button>
            <button
              onClick={() => useGameStore.getState().setGameMode('SKILLS')}
              className="px-3 py-1 bg-[#1b5e20]/90 text-white border-2 border-[#4caf50] rounded font-bold text-xs hover:bg-[#4caf50] transition-colors shadow-md pointer-events-auto"
            >
              SKILLS
            </button>
            <button
              onClick={() => useGameStore.getState().setGameMode('DEX')}
              className="px-3 py-1 bg-[#0d47a1]/90 text-white border-2 border-[#2196f3] rounded font-bold text-xs hover:bg-[#2196f3] transition-colors shadow-md pointer-events-auto"
            >
              DEX
            </button>
            {isAdminUser && (
              <button
                onClick={() => useGameStore.getState().setGameMode('MAP_EDITOR')}
                className="px-3 py-1 bg-[#006064]/90 text-cyan-300 border-2 border-cyan-400 rounded font-bold text-xs hover:bg-cyan-700 transition-colors shadow-md pointer-events-auto"
              >
                EDITOR
              </button>
            )}
          </div>
        </div>
      )}
      
      {gameMode === 'DEX' && <SaintsDexOverlay />}
      {gameMode === 'MAP_EDITOR' && <MapEditorPanel onClose={() => useGameStore.getState().setGameMode('EXPLORING')} />}
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

      {gameMode === 'EXPLORING' && <MiniMapRadar />}

      {/* Global Chat Bar */}
      {gameMode === 'EXPLORING' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[80%] max-w-md z-40 flex shadow-lg">
          <input 
            type="text" 
            placeholder="Press Enter to chat..." 
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && chatInput.trim().length > 0) {
                emitSocketEvent?.('chat_message', chatInput.trim());
                useGameStore.getState().setPlayerChat(chatInput.trim());
                setChatInput('');
              }
            }}
            className="flex-1 bg-black/80 border-2 border-slate-700 text-white font-mono text-xs p-2 rounded-l focus:outline-none focus:border-cyan-500"
          />
          <button 
            onClick={() => {
              if (chatInput.trim().length > 0) {
                emitSocketEvent?.('chat_message', chatInput.trim());
                useGameStore.getState().setPlayerChat(chatInput.trim());
                setChatInput('');
              }
            }}
            className="bg-slate-700 border-2 border-l-0 border-slate-700 text-white font-bold font-mono text-xs px-4 py-2 rounded-r hover:bg-slate-600"
          >
            SEND
          </button>
        </div>
      )}
    </div>
  );
}
