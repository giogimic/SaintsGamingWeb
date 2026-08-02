'use client';

import { useRef, useState, useEffect } from 'react';
import GameCanvasBabylon from './babylon/GameCanvasBabylon';
import dynamic from 'next/dynamic';
import { useEditorStore } from './editor/editor-store';
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
import MobileControls from './MobileControls';
import SaintsHudOrbs from './hud/SaintsHudOrbs';
import ClassicPanel from './ClassicPanel';
import Hotbar from './Hotbar';
import DraggablePanel from './DraggablePanel';
import GameTitleScreen from './GameTitleScreen';
import GameLogin from './GameLogin';
import ServerSelect from './ServerSelect';
import BattleOverlay from './BattleOverlay';
import { TurnBattleOverlay } from './battle/TurnBattleOverlay';
import { useGameStore } from './store';
import { StaffFloatingMenu } from './StaffFloatingMenu';
import { hasPermission, PERMISSION_LEVELS } from '@/web/lib/permissions';

import { loadGameCharacter, saveGameState, getUserCharacters } from '@/app/actions/game';
import { fetchAllMaps } from '@/app/actions/game-admin';
import { fetchAllGameQuests } from '@/app/actions/game-dev';
import { GAME_MAPS, loadMap, patchCachedMapTile } from './data/maps';
import { QUEST_DB } from './data/quests';
import { CharacterCreator } from './character-creator';
import { CharacterSelector } from './character-selector';
import { io, Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';
import { decodeCreatureMoved, decodePlayerMoved, normalizeBinaryPayload } from '@/shared/net/movementCodec';
import { toBaseMapId } from '@/shared/net/mapIds';
import { GameChat } from './chat/GameChat';
import GameOptionsMenu from './hud/GameOptionsMenu';
import { MobileGameLauncher } from './MobileGameLauncher';

const StudioEditorShell = dynamic(
  () => import('./editor/StudioEditorShell').then((m) => m.StudioEditorShell),
  { ssr: false }
);
const UiEditToolbar = dynamic(
  () => import('./editor/UiEditToolbar').then((m) => m.UiEditToolbar),
  { ssr: false }
);

export type LobbyClientMode = 'player' | 'studio';

export default function TheLobby({
  characterId: initialCharacterId,
  forceCreate,
  mode = 'player',
}: {
  characterId?: string;
  forceCreate?: boolean;
  mode?: LobbyClientMode;
}) {
  const enableStudio = mode === 'studio';
  const gameMode = useGameStore((state) => state.gameMode);
  const toast = useGameStore((state) => state.toast);
  const activeDialog = useGameStore((state) => state.activeDialog);
  const isMapTransitioning = useGameStore((state) => state.isMapTransitioning);
  const currentMapId = useGameStore((state) => state.currentMapId);
  const isUiEditMode = useGameStore((state) => state.isUiEditMode);
  const { data: session, status } = useSession();
  const containerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [devMapList, setDevMapList] = useState<{id: string, name: string}[]>([]);
  const [uiScale, setUiScale] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [hasEnteredMobile, setHasEnteredMobile] = useState(false);
  
  const isCreationMode = useEditorStore((state) => state.isCreationMode);
  const activeBrushTileId = useEditorStore((state) => state.activeBrushTileId);
  const activeLayerIdx = useEditorStore((state) => state.activeLayerIdx);
  const setClickedTile = useEditorStore((state) => state.setClickedTile);

  const [activeCharacterId, setActiveCharacterId] = useState<string | undefined>(initialCharacterId);
  const [userCharacters, setUserCharacters] = useState<any[]>([]);
  const [showSelector, setShowSelector] = useState(false);
  const [showCreator, setShowCreator] = useState(forceCreate || false);
  const [permissionLevel, setPermissionLevel] = useState(0);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const isStaff = hasPermission(permissionLevel, PERMISSION_LEVELS.MODERATOR);
  const isDeveloper = hasPermission(permissionLevel, PERMISSION_LEVELS.DEVELOPER);

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

      // Lobby: keep demo + Spyder campaign maps; unknown/empty → DEMO_SANDBOX.
      // Studio keeps saved map for editor work.
      const DEMO_MAP = 'DEMO_SANDBOX';
      const DEMO_SPAWN = { x: 14, y: 15 };
      const knownPlayable = new Set([
        'DEMO_SANDBOX',
        'SAINTS_VILLAGE',
        'AZURE_TOWN',
        'SPYDER_ROUTE1',
        'ROUTE1',
        'COTTON_TOWN',
        'SPYDER_COTTON_TOWN',
        'PLAYER_HOUSE_BEDROOM',
        'PLAYER_HOUSE_DOWNSTAIRS',
      ]);
      const savedMap = String(parsedState.currentMapId || '');
      let validMapId = savedMap;
      let validPosition = parsedState.position || { ...DEMO_SPAWN };

      if (!enableStudio) {
        if (!savedMap || !knownPlayable.has(savedMap)) {
          validMapId = DEMO_MAP;
          validPosition = { ...DEMO_SPAWN };
        }
      } else if (!savedMap) {
        validMapId = DEMO_MAP;
        validPosition = { ...DEMO_SPAWN };
      }

      try {
        const loaded = await loadMap(validMapId);
        const mw = loaded.grid?.[0]?.length || 30;
        const mh = loaded.grid?.length || 30;
        validPosition = {
          x: Math.max(1, Math.min(mw - 2, validPosition.x ?? DEMO_SPAWN.x)),
          y: Math.max(1, Math.min(mh - 2, validPosition.y ?? DEMO_SPAWN.y)),
        };
        useGameStore.getState().setActiveMapData(loaded);
      } catch {
        validMapId = DEMO_MAP;
        validPosition = { ...DEMO_SPAWN };
      }

      useGameStore.getState().hydratePlayer({ 
        ...parsedState,
        currentMapId: validMapId,
        name: res.data.name,
        spriteId: res.data.spriteId || 'adventurer',
        position: validPosition
      });
      useGameStore.setState({ currentMapId: validMapId, gameMode: 'EXPLORING' });

      // Notify socket server of loaded character specs
      socketRef.current?.emit('join_map', {
        accountId: charId,
        mapId: validMapId,
        x: validPosition.x,
        y: validPosition.y,
        name: res.data.name,
        spriteId: res.data.spriteId || 'adventurer'
      });

      setActiveCharacterId(charId);
      setShowCreator(false);
      setShowSelector(false);
      
      if (typeof window !== 'undefined') {
        const base = enableStudio ? '/studio' : '/lobby';
        window.history.pushState({}, '', `${base}?characterId=${charId}`);
      }
    } else {
      useGameStore.getState().setGameMode('CHARACTER_SELECT');
      setShowSelector(true);
    }
    setIsInitializing(false);
  };

  useEffect(() => {
    async function initData() {
      useGameStore.getState().hydrateMobileControlMode();
      await useGameStore.getState().fetchLogicTiles();

      if (enableStudio) {
        const mapsRes = await fetchAllMaps();
        if (mapsRes.success && mapsRes.data) {
          setDevMapList(mapsRes.data);
        }
      }

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
    }
    
    const handleResize = () => {
      const scale = Math.max(0.6, Math.min(1.5, window.innerWidth / 1280));
      setUiScale(scale);
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0));
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    initData();
    return () => window.removeEventListener('resize', handleResize);
  }, [enableStudio]);

  // Auth-dependent initialization
  useEffect(() => {
    if (status === 'authenticated') {
      setPermissionLevel(session?.user?.permissionLevel ?? 0);
      loadCharactersList().then(() => {
        if (initialCharacterId && isInitializing) {
          selectAndLoadCharacter(initialCharacterId);
        } else if (isInitializing) {
          setIsInitializing(false);
        }
      });
    } else if (status === 'unauthenticated') {
      setPermissionLevel(0);
      if (isInitializing) {
        setIsInitializing(false);
      }
    }
  }, [status, initialCharacterId, isInitializing, session?.user?.permissionLevel]);

  // Handle fallback events like unauthorized creation
  useEffect(() => {
    const handleCloseCreator = () => {
      setShowCreator(false);
    };
    window.addEventListener('close_creator', handleCloseCreator);
    return () => window.removeEventListener('close_creator', handleCloseCreator);
  }, []);

  // SOCKET.IO CONNECTION
  useEffect(() => {
    // Phase 10: Require active NextAuth session before connecting to the socket
    if (typeof window === 'undefined' || status !== 'authenticated' || !session?.user?.id) return;

    // Connect to the unified Next.js MMO server with the session token
    const socket = io({
      auth: { token: session.user.id }
    });
    socketRef.current = socket;
    
    socket.on('connect', () => {
      const state = useGameStore.getState();
      state.setEmitSocketEvent((event, data) => {
        socket.emit(event, data);
      });

      const effectiveAccountId = activeCharacterId || state.player.accountId;
      if (effectiveAccountId) {
        socket.emit('join_map', {
          accountId: effectiveAccountId,
          mapId: state.currentMapId,
          x: state.player.position?.x ?? 6,
          y: state.player.position?.y ?? 2,
          name: state.player.name || 'Player',
          spriteId: state.player.spriteId || 'adventurer'
        });
      }
    });
    
    socket.on('map_joined', (data) => {
      useGameStore.getState().setInstanceId(data.instanceId);
    });

    socket.on('map_players', (players) => {
      const filtered = { ...players };
      if (socket.id) delete filtered[socket.id];
      useGameStore.getState().setOtherPlayers(filtered);
    });
    
    socket.on('player_joined', (data) => {
      if (data.socketId !== socket.id) {
        useGameStore.getState().updateOtherPlayer(data.socketId, data);
      }
    });
    
    socket.on('player_moved', (raw) => {
      // Milestone 4: accept compact binary deltas (fallback JSON for older peers)
      let data = raw as any;
      const bin = normalizeBinaryPayload(raw);
      if (bin) {
        const decoded = decodePlayerMoved(bin);
        if (decoded) {
          data = decoded;
        } else if (!raw || typeof raw !== 'object' || ArrayBuffer.isView(raw) || raw instanceof ArrayBuffer) {
          // Binary that failed to decode — drop; don't treat as JSON
          return;
        }
      }

      if (!data?.socketId) return;

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

    socket.on('player_left', (data: any) => {
      const targetSocketId = typeof data === 'string' ? data : data?.socketId;
      if (targetSocketId) {
        useGameStore.getState().removeOtherPlayer(targetSocketId);
      }
    });
    
    socket.on('player_chat', (data) => {
      if (data.socketId === socket.id) return;

      const isStaffMsg = data.socketId === 'STAFF' || String(data.sender || '').startsWith('[STAFF]');
      if (!isStaffMsg && data.socketId) {
        useGameStore.getState().updateOtherPlayer(data.socketId, { chatMessage: data.message });
        setTimeout(() => {
          const store = useGameStore.getState();
          const currentOp = store.otherPlayers[data.socketId];
          if (currentOp && currentOp.chatMessage === data.message) {
            store.updateOtherPlayer(data.socketId, { chatMessage: undefined });
          }
        }, 7000);
      }

      const state = useGameStore.getState();
      const op = data.socketId ? state.otherPlayers[data.socketId] : undefined;
      window.dispatchEvent(new CustomEvent('game_chat_msg', {
        detail: {
          id: Date.now().toString() + Math.random(),
          sender: data.sender || op?.name || 'Tamer',
          text: data.message,
          timestamp: Date.now(),
          type: isStaffMsg ? 'SYSTEM' : 'LOCAL'
        }
      }));
    });

    socket.on('force_disconnect', (data: { reason?: string }) => {
      useGameStore.getState().showToast(data?.reason || 'Disconnected by staff.');
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
    
    // Phase 9: Real-Time Map Editor Synchronization
    socket.on('map_reloaded', async (data) => {
      const mapId = data.mapId;
      useGameStore.getState().showToast(`Map updated by admin! Hot-reloading ${mapId}...`);
      try {
        // Bust the local cache and fetch the fresh map
        const res = await fetch(`/api/maps/${encodeURIComponent(mapId)}?t=${Date.now()}`);
        const freshMapData = await res.json();
        useGameStore.getState().setActiveMapData(freshMapData);
      } catch (err) {
        console.error("Failed to hot-reload map data:", err);
      }
    });
    
    socket.on('battle_invite_received', (data) => {
      useGameStore.getState().showToast(`Challenge from ${data.name}! Accepting...`);
      socket.emit('accept_battle', data.from);
    });
    
    socket.on('battle_started', (data) => {
      const state = useGameStore.getState();
      // Safety: ignore battles for other accounts if a map broadcast ever leaks through
      if (data?.accountId && state.player?.accountId && data.accountId !== state.player.accountId) {
        return;
      }
      state.setActiveBattle(data);
      state.setGameMode('BATTLE');
    });

    socket.on('battle_update', (data) => {
      const state = useGameStore.getState();
      if (data?.accountId && state.player?.accountId && data.accountId !== state.player.accountId) {
        return;
      }
      if (!state.activeBattle && data?.id) {
        state.setActiveBattle(data);
        return;
      }
      state.setActiveBattle({
        ...state.activeBattle!,
        ...data
      });
    });
    
    socket.on('battle_ended', (data) => {
      const state = useGameStore.getState();
      const myId = socketRef.current?.id;
      const myAccount = state.player?.accountId;

      // Turn-based encounter results (bible 11)
      if (data?.result) {
        if (data.accountId && myAccount && data.accountId !== myAccount) return;
        const messages: Record<string, string> = {
          CAPTURE: 'Creature captured! Check your Creature Box.',
          WIN: 'Victory! The wild creature fainted.',
          LOSE: 'Your creature fainted. Heal before the next battle.',
          FLEE: 'Got away safely.',
        };
        state.showToast(messages[data.result] || 'Battle ended.');
      } else if (data?.winner === myId) {
        state.showToast('You won the battle!');
      } else if (data?.winner) {
        state.showToast('You lost the battle...');
      }

      setTimeout(() => {
        state.setActiveBattle(null);
        state.setGameMode('EXPLORING');
      }, data?.result === 'FLEE' ? 800 : 2500);
    });

    // --- PHASE 3: MMO Real-Time Combat ---
    socket.on('combat_update', (data) => {
      // Dispatch custom event so the BattleOverlay can render damage numbers and logs
      const msgEvent = new CustomEvent('combat_update_event', { detail: data });
      window.dispatchEvent(msgEvent);
    });

    socket.on('loot_dropped', (data) => {
      window.dispatchEvent(new CustomEvent('loot_dropped_event', { detail: data }));
    });

    socket.on('loot_despawned', (data) => {
      window.dispatchEvent(new CustomEvent('loot_despawned_event', { detail: data }));
    });

    socket.on('creature_hp_update', (data) => {
      window.dispatchEvent(new CustomEvent('creature_hp_update_event', { detail: data }));
    });

    // --- PHASE 7: Gathering & Economy ---
    socket.on('node_depleted', (data) => {
      window.dispatchEvent(new CustomEvent('node_depleted_event', { detail: data }));
    });

    socket.on('node_respawned', (data) => {
      window.dispatchEvent(new CustomEvent('node_respawned_event', { detail: data }));
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

    // --- PHASE 6: Dialogue ---
    socket.on('dialogue_start', (data) => {
      useGameStore.getState().setActiveDialog(data);
      useGameStore.getState().setGameMode('DIALOG');
    });

    socket.on('dialogue_end', () => {
      useGameStore.getState().setActiveDialog(null);
      useGameStore.getState().setGameMode('EXPLORING');
    });

    socket.on('demo_open_lab', () => {
      useGameStore.getState().setActiveDialog(null);
      useGameStore.getState().setGameMode('PROFESSOR_LAB');
    });

    // --- PHASE 7: Skills & Toast ---
    socket.on('skill_xp_gained', (data) => {
      useGameStore.setState((state) => {
        if (!state.player.skills[data.skillSlug]) {
          state.player.skills[data.skillSlug] = { level: 1, xp: 0 };
        }
        state.player.skills[data.skillSlug].xp = data.totalXp;
        state.player.skills[data.skillSlug].level = data.level;
      });
    });

    socket.on('show_toast', (data) => {
      useGameStore.getState().showToast(data.message);
    });

    socket.on('sync_credits', (data) => {
      if (typeof data?.credits === 'number') {
        useGameStore.setState((state) => {
          state.player.credits = data.credits;
        });
      }
    });

    socket.on('inventory_sync', (data) => {
      if (data?.inventory && typeof data.inventory === 'object') {
        useGameStore.setState((state) => {
          state.player.inventory = data.inventory;
        });
      }
    });

    socket.on('quest_sync', () => {
      useGameStore.getState().triggerQuestRefresh();
    });

    socket.on('tile_changed', (data) => {
      if (!data || typeof data.x !== 'number' || typeof data.y !== 'number') return;
      const store = useGameStore.getState();
      const tileId = typeof data.tileId === 'number' ? data.tileId : 0;
      const mapId = data.mapId || store.currentMapId;
      const baseId = toBaseMapId(String(mapId || ''));
      patchCachedMapTile(baseId, data.x, data.y, tileId);
      patchCachedMapTile(String(mapId || ''), data.x, data.y, tileId);

      useGameStore.setState((state) => {
        if (!state.activeMapData) {
          const cached = GAME_MAPS[baseId] || GAME_MAPS[state.currentMapId];
          if (cached?.grid) {
            state.activeMapData = {
              ...cached,
              grid: cached.grid.map((row: number[]) => [...row]),
            };
          }
        }
        if (state.activeMapData?.grid?.[data.y]) {
          state.activeMapData.grid[data.y][data.x] = tileId;
        }
      });

      window.dispatchEvent(new CustomEvent('lobby_tile_changed', { detail: { ...data, tileId, mapId: baseId } }));
    });

    socket.on('creature_moved', (raw) => {
      let data = raw as any;
      const bin = normalizeBinaryPayload(raw);
      if (bin) {
        const decoded = decodeCreatureMoved(bin);
        if (decoded) data = decoded;
        else if (!raw || typeof raw !== 'object' || ArrayBuffer.isView(raw) || raw instanceof ArrayBuffer) {
          return;
        }
      }
      if (!data?.entityId) return;
      useGameStore.setState((state) => {
        const idx = state.mapEntities.findIndex((e) => e.id === data.entityId);
        if (idx < 0) return;
        const ent = state.mapEntities[idx];
        state.mapEntities[idx] = {
          ...ent,
          position: { x: data.x, y: data.y },
          isMoving: !!data.isMoving,
          facing: (String(data.direction || ent.facing || 'down').toUpperCase() as 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'),
        };
      });
    });

    socket.on('starter_claimed', (data) => {
      const creature = data?.creature;
      const slug = creature?.speciesSlug;
      if (slug) {
        useGameStore.getState().catchDaemon(slug);
        useGameStore.setState((state) => {
          state.player.activeDaemonId = slug;
        });
      }
      if (creature?.id) {
        let stats = {
          physicalPower: 10,
          physicalDefense: 10,
          abilityPower: 10,
          abilityDefense: 10,
          combatTempo: 10,
        };
        let abilities: any[] = [];
        try {
          if (typeof creature.stats === 'string') stats = { ...stats, ...JSON.parse(creature.stats) };
          else if (creature.stats) stats = { ...stats, ...creature.stats };
        } catch { /* keep defaults */ }
        try {
          if (typeof creature.abilities === 'string') abilities = JSON.parse(creature.abilities);
          else if (Array.isArray(creature.abilities)) abilities = creature.abilities;
        } catch { /* keep defaults */ }

        const already = useGameStore.getState().player.creatureParty.some((m) => m.id === creature.id);
        if (!already) {
          useGameStore.getState().addCreatureToParty({
            id: creature.id,
            speciesSlug: creature.speciesSlug,
            nickname: creature.nickname || data?.def?.name || creature.speciesSlug,
            level: creature.level || 5,
            xp: creature.xp || 0,
            currentHp: creature.currentHp ?? creature.maxHp ?? 40,
            maxHp: creature.maxHp ?? 40,
            stats,
            abilities,
            status: null,
          });
        }
      }
      if (useGameStore.getState().gameMode === 'PROFESSOR_LAB') {
        useGameStore.getState().setGameMode('EXPLORING');
      }
      useGameStore.getState().triggerQuestRefresh();
    });

    socket.on('creature_spawned', (data) => {
      if (!data?.entityId) return;
      const isNpc = data.entityType === 'NPC';
      useGameStore.setState((state) => {
        const idx = state.mapEntities.findIndex((e) => e.id === data.entityId);
        const spriteKey = isNpc
          ? (String(data.templateId || '').includes('vance') ? 'adventurer' : (data.spriteKey || 'adventurer'))
          : (data.spriteKey || data.templateId || 'rockitten');
        const ent = {
          id: data.entityId,
          type: (isNpc ? 'NPC' : 'MONSTER') as 'NPC' | 'MONSTER',
          spriteKey,
          position: { x: data.x, y: data.y },
          isMoving: !!data.isMoving,
          facing: (String(data.direction || 'down').toUpperCase() as 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'),
          mapId: data.mapId,
          name: isNpc && String(data.templateId || '').includes('vance')
            ? 'Warden Vance'
            : (data.name || data.templateId),
        };
        if (idx >= 0) state.mapEntities[idx] = ent;
        else state.mapEntities.push(ent);
      });
    });

    socket.on('creature_despawned', (data) => {
      if (!data?.entityId) return;
      useGameStore.setState((state) => {
        state.mapEntities = state.mapEntities.filter((e) => e.id !== data.entityId);
        if (state.combatTarget?.entityId === data.entityId) {
          state.combatTarget = null;
        }
      });
    });

    socket.on('creature_hp_update', (data) => {
      if (!data?.entityId) return;
      const target = useGameStore.getState().combatTarget;
      if (target && target.entityId === data.entityId && typeof data.hpPercent === 'number') {
        useGameStore.getState().setCombatTarget({
          entityId: target.entityId,
          name: target.name,
          maxHp: target.maxHp,
          isCasting: target.isCasting,
          castName: target.castName,
          behavior: target.behavior,
          hp: Math.max(0, Math.round(target.maxHp * data.hpPercent)),
        });
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [activeCharacterId, status, session]);

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
      const stateDataToSave = {
        ...state.player,
        currentMapId: state.currentMapId
      };
      const stateData = JSON.stringify(stateDataToSave);
      
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

  const handleEnterMobileGame = () => {
    setHasEnteredMobile(true);
    toggleFullscreen();
    if (typeof screen !== 'undefined' && screen.orientation && (screen.orientation as any).lock) {
      (screen.orientation as any).lock('landscape').catch(() => {});
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
      if (key === 'c') useGameStore.getState().setGameMode('CHARACTER_CREATOR');
      else if (key === 'e' && enableStudio && isDeveloper) {
        useEditorStore.getState().toggleCreationMode();
      }
      else if (key === 'i') useGameStore.getState().setGameMode('INVENTORY');
      else if (key === 'k') useGameStore.getState().setGameMode('SKILLS');
      else if (key === 'p') useGameStore.getState().setGameMode('PARTY');
      else if (key === 'x') useGameStore.getState().setGameMode('DEX');
      else if (key === 'b') useGameStore.getState().setGameMode('ACHIEVEMENTS');
    };
    window.addEventListener('keydown', handleGlobalHotkeys);
    return () => window.removeEventListener('keydown', handleGlobalHotkeys);
  }, [enableStudio, isDeveloper]);

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
      {/* Mobile Enter Game Launcher Overlay */}
      {isMobile && !hasEnteredMobile && !isFullscreen && (
        <MobileGameLauncher 
          character={userCharacters.find(c => c.id === activeCharacterId) || userCharacters[0]}
          onEnterGame={handleEnterMobileGame}
          onSelectCharacter={() => { setShowSelector(true); setHasEnteredMobile(true); }}
        />
      )}

      <GameCanvasBabylon 
        activeBrushTileId={activeBrushTileId}
        activeLayerIdx={activeLayerIdx}
        isDevEditorOpen={isCreationMode}
        onMapClick={(r, c) => {
          if (isCreationMode) setClickedTile({r, c});
        }}
      />
      
      {/* SCALED UI CONTAINER */}
      <div 
        className="absolute inset-0 pointer-events-none" 
      >
        {/* Mobile Controls — single surface (floating joystick default / D-Pad toggle) */}
        <div className="pointer-events-auto">
          <MobileControls
            onToggleFullscreen={toggleFullscreen}
            onToggleOptions={() => setIsOptionsOpen(true)}
          />
        </div>
      </div>

      {/* Turn-Based Battle Overlay */}
      {gameMode === 'BATTLE' && <TurnBattleOverlay />}

      {enableStudio && <StudioEditorShell />}

      {isStaff && gameMode === 'EXPLORING' && !isCreationMode && (
        <StaffFloatingMenu
          permissionLevel={permissionLevel}
          isStudioRoute={enableStudio}
        />
      )}

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
        <div className="absolute top-3 right-3 z-40 pointer-events-none flex items-center gap-2">
          {enableStudio && isDeveloper && (
            <button
              onClick={() => useEditorStore.getState().toggleCreationMode()}
              className={`pointer-events-auto px-3 py-1.5 border rounded-lg text-[11px] font-mono font-medium transition-all shadow-lg active:scale-95 flex items-center gap-2
                ${isCreationMode 
                  ? 'bg-[#cbb26a] text-black border-[#806f47] hover:bg-amber-500 shadow-[0_0_15px_rgba(203,178,106,0.3)]' 
                  : 'bg-black/60 backdrop-blur-md text-[#cbb26a] border-[#806f47]/50 hover:bg-white/10 hover:border-[#cbb26a]'
                }`}
            >
              <span className="text-sm leading-none">🔨</span>
              <span>STUDIO (Ctrl+E)</span>
            </button>
          )}
          {!enableStudio && isDeveloper && (
            <a
              href="/studio"
              className="pointer-events-auto px-3 py-1.5 border rounded-lg text-[11px] font-mono font-medium transition-all shadow-lg bg-black/60 backdrop-blur-md text-[#cbb26a] border-[#806f47]/50 hover:bg-white/10 hover:border-[#cbb26a] flex items-center gap-2"
            >
              <span className="text-sm leading-none">🔨</span>
              <span>OPEN STUDIO</span>
            </a>
          )}
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
        isAdminUser={enableStudio && isDeveloper}
        isCreationMode={isCreationMode}
        onToggleDevEditor={() => {
          if (!enableStudio || !isDeveloper) return;
          if (!isCreationMode) useGameStore.getState().setGameMode('EXPLORING');
          useEditorStore.getState().toggleCreationMode(); 
          setIsOptionsOpen(false);
        }}
      />

      {/* UI Edit Toolbar (Studio only) */}
      {enableStudio && <UiEditToolbar />}

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
        {gameMode === 'BATTLE' && <BattleOverlay />}
        {gameMode === 'PARTY' && <PartyOverlay />}
        {gameMode === 'DEX' && <SaintsDexOverlay />}
      </div>
      
      {gameMode === 'SHOP' && <ShopOverlay />}
      {/* INVENTORY, SKILLS, EQUIPMENT, QUESTS, GTC, PARTY are now in ClassicPanel */}
      {activeDialog && gameMode !== 'DIALOG' && <DialogOverlay />}
      
      {/* Cinematic Map Transition Overlay */}
      <div 
        className={`fixed inset-0 bg-black transition-opacity duration-300 z-[9999] pointer-events-none ${isMapTransitioning ? 'opacity-100' : 'opacity-0'}`} 
      />

      {gameMode === 'EXPLORING' && !isCreationMode && (
        <DraggablePanel id="minimap" defaultPosition={{ x: 0, y: 0 }}>
          <MiniMapRadar />
        </DraggablePanel>
      )}
      {gameMode === 'EXPLORING' && !isCreationMode && (
        <DraggablePanel id="orbs" defaultPosition={{ x: 0, y: 0 }}>
          <SaintsHudOrbs />
        </DraggablePanel>
      )}

      {/* Unified Game Chat UI & Hotbar */}
      {gameMode === 'EXPLORING' && !isCreationMode && (
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
