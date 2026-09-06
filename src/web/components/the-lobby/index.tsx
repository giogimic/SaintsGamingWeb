'use client';

import { useRef, useState, useEffect } from 'react';
import GameCanvasBabylon from './babylon/GameCanvasBabylon';
import dynamic from 'next/dynamic';
import { useEditorStore } from './editor/editor-store';
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
import MobileControls from './MobileControls';
import PlayerVitalsHud from './hud/PlayerVitalsHud';
import ClassicPanel from './ClassicPanel';
import Hotbar from './Hotbar';
import DraggablePanel from './DraggablePanel';

// Floating Window interfaces
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
import { Suspense } from 'react';
import { TurnBattleOverlay } from './battle/TurnBattleOverlay';
import { useGameStore } from './store';
import { hasPermission, PERMISSION_LEVELS } from '@/web/lib/permissions';
import { canEnterStudio } from '@/shared/game/studioPermissions';
import { ensureMapHasStudioTilesets } from '@/shared/game/studioTilesetBootstrap';
import {
  setEditorMode,
  shouldShowGameplayHud,
  shouldSuppressGameplaySystems,
} from '@/shared/game/studioSession';
import { shouldPieSuppressEncounters } from '@/shared/game/pieOptions';
import { shouldKeepActiveMapData } from '@/shared/game/mapSwitch';
import {
  mergeMapDocumentInPlace,
  shouldApplyMapReload,
  shouldClearPeersOnDisconnect,
  MAX_DISCONNECT_RECONNECT_WINDOW_MS,
} from '@/shared/game/lobbyReconnect';
import {
  buildJoinKey,
  shouldReplacePeerSnapshot,
  shouldSkipRedundantLobbyJoin,
} from '@/shared/game/lobbyJoin';
import { joinWorld } from '@/shared/game/lobbyWorldJoin';
import {
  STUDIO_MAP_HOT_RELOAD_EVENT,
  STUDIO_PIE_CHANGED_EVENT,
  type StudioMapHotReloadDetail,
  type StudioPieChangedDetail,
} from '@/shared/game/studioEvents';
import { resolveSafePlayerSpawn } from '@/shared/game/worldSpawns';

import { loadGameCharacter, saveGameState, getUserCharacters } from '@/app/actions/game';
import { fetchAllMaps } from '@/app/actions/admin/game-admin';
import { fetchAllGameQuests } from '@/app/actions/admin/game-dev';
import { GAME_MAPS, loadMap, patchCachedMapTile, preloadAdjacentMaps, invalidateMapCache } from './data/maps';
import { invalidateMapCache as invalidateSharedMapCache } from '@/shared/game/mapCache';
import { QUEST_DB } from './data/quests';

import { CharacterCreator } from './character-creator';
import { CharacterSelector } from './character-selector';
import { GameOfflineScreen } from './GameOfflineScreen';
import { io, Socket } from 'socket.io-client';
import { lobbySocketConnect } from '@/shared/net/goMmoSocket';
import { useSession } from 'next-auth/react';
import { decodeCreatureMoved, decodePlayerMoved, normalizeBinaryPayload } from '@/shared/net/movementCodec';
import { toBaseMapId } from '@/shared/net/mapIds';
import { resolveEntitySpriteUrl } from '@/shared/game/creatureCatalog';
import GameToastStack from './GameToastStack';
import GameOptionsMenu from './hud/GameOptionsMenu';
import { ViewfinderOverlay } from './hud/ViewfinderOverlay';
import { MidnightTropicalBackground } from './MidnightTropicalBackground';
import { StudioCanvasViewport } from './StudioCanvasViewport';
import { MobileGameLauncher } from './MobileGameLauncher';

const StudioEditorShell = dynamic(
  () => import('./editor/StudioEditorShell').then((m) => m.StudioEditorShell),
  { ssr: false }
);
const StudioEscapeMenu = dynamic(
  () => import('./editor/StudioEscapeMenu').then((m) => m.StudioEscapeMenu),
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
  const activeDialog = useGameStore((state) => state.activeDialog);
  const isMapTransitioning = useGameStore((state) => state.isMapTransitioning);
  const currentMapId = useGameStore((state) => state.currentMapId);
  const { data: session, status } = useSession();
  const containerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  /** Last successful lobby/studio join contract — used to coalesce join storms. */
  const lastJoinKeyRef = useRef<string | null>(null);
  const hasAuthInitializedRef = useRef(false);
  const recentChatEventKeysRef = useRef<Map<string, number>>(new Map());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isRealmOffline, setIsRealmOffline] = useState(false);
  const [devMapList, setDevMapList] = useState<{id: string, name: string}[]>([]);
  const [uiScale, setUiScale] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [hasEnteredMobile, setHasEnteredMobile] = useState(false);
  const [viewportReady, setViewportReady] = useState(false);
  
  const isCreationMode = useEditorStore((state) => state.isCreationMode);
  const studioMode = useEditorStore((state) => state.studioMode);
  /** Studio editor tools only — never treat /lobby as create-mode (store defaults true). */
  const studioToolsOpen = enableStudio && isCreationMode;
  const pieOptions = useEditorStore((state) => state.pieOptions);
  const activeBrushTileId = useEditorStore((state) => state.activeBrushTileId);
  const activeLayerIdx = useEditorStore((state) => state.activeLayerIdx);
  const setClickedTile = useEditorStore((state) => state.setClickedTile);
  const suppressGameplay =
    shouldSuppressGameplaySystems({
      isEditorMode: enableStudio,
      isCreationMode: studioToolsOpen,
    }) ||
    (enableStudio &&
      !isCreationMode &&
      shouldPieSuppressEncounters(pieOptions));
  const showGameplayHud = shouldShowGameplayHud({
    isEditorMode: enableStudio,
    isCreationMode: studioToolsOpen,
  });
  const isEditingInterface = useGameStore((s) => s.isEditingInterface || s.isUiEditMode);


  // Bible 17 — Studio sets global isEditorMode for clean gameplay gating.
  // Lobby must clear create-mode so shared editor-store never blocks walk/avatar.
  useEffect(() => {
    setEditorMode(enableStudio);
    if (!enableStudio) {
      useEditorStore.setState({ isCreationMode: false, studioMode: 'test' });
    }
    return () => setEditorMode(false);
  }, [enableStudio]);

  // Infallible safety watchdog: never let the client remain permanently trapped in a black transition curtain
  useEffect(() => {
    if (!isMapTransitioning) return;
    const timer = setTimeout(() => {
      const live = useGameStore.getState();
      if (live.isMapTransitioning) {
        live.setIsMapTransitioning(false);
        if (live.worldSessionState === 'transitioning') {
          live.setWorldSessionState('joined');
        }
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [isMapTransitioning]);

  const [activeCharacterId, setActiveCharacterId] = useState<string | undefined>(initialCharacterId);
  const [userCharacters, setUserCharacters] = useState<any[]>([]);
  const [showSelector, setShowSelector] = useState(false);
  const [showCreator, setShowCreator] = useState(forceCreate || false);
  const [permissionLevel, setPermissionLevel] = useState(0);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const isStaff = hasPermission(permissionLevel, PERMISSION_LEVELS.MODERATOR);
  const canStudio = canEnterStudio(permissionLevel);

  const dispatchChatEvent = (detail: {
    id?: string;
    sender?: string;
    text?: string;
    timestamp?: number;
    type?: string;
    recipient?: string;
    accountId?: string;
    socketId?: string;
  }) => {
    const text = String(detail.text || '').trim();
    if (!text) return;
    const type = String(detail.type || 'GLOBAL').toUpperCase();
    const sender = String(detail.sender || 'Saint');
    const account = String(detail.accountId || '');
    const socket = String(detail.socketId || '');
    const bucketTs = Math.floor((detail.timestamp || Date.now()) / 1000);
    const dedupeKey = `${type}|${sender}|${text}|${account}|${socket}|${bucketTs}`;

    const now = Date.now();
    const seenAt = recentChatEventKeysRef.current.get(dedupeKey);
    if (seenAt && now - seenAt < 6000) return;
    recentChatEventKeysRef.current.set(dedupeKey, now);

    // Keep the dedupe map bounded.
    if (recentChatEventKeysRef.current.size > 300) {
      for (const [k, t] of recentChatEventKeysRef.current) {
        if (now - t > 60000) recentChatEventKeysRef.current.delete(k);
      }
    }

    window.dispatchEvent(new CustomEvent('game_chat_msg', {
      detail: {
        id: detail.id || `${Date.now()}-${Math.random()}`,
        sender,
        text,
        timestamp: detail.timestamp || Date.now(),
        type,
        recipient: detail.recipient,
      }
    }));
  };

  const loadCharactersList = async () => {
    const charsRes = await getUserCharacters();
    if (charsRes.success && charsRes.data) {
      setUserCharacters(charsRes.data);
      return charsRes.data;
    }
    return [];
  };

  const DEFAULT_SPAWN = { x: 32, y: 32 };
  const GENERIC_FALLBACK_MAP = 'STARTING_MEADOW';

  const selectAndLoadCharacter = async (charId: string) => {
    setIsInitializing(true);
    const res = await loadGameCharacter(charId);
    if (res.success && res.data) {
      const parsedState = JSON.parse(res.data.stateData);

      const savedMap = String(parsedState.currentMapId || parsedState.mapId || '')
        .replace(/_ch\d+$/, '');
      let validMapId = savedMap;
      let validPosition = parsedState.position || { ...DEFAULT_SPAWN };

      // Query available world maps to verify map existence
      let availableMapIds: string[] = [];
      try {
        const mapListRes = await fetch('/api/maps');
        if (mapListRes.ok) {
          const mapData = await mapListRes.json();
          availableMapIds = (mapData.maps || []).map((m: any) => m.id);
        }
      } catch {
        /* ignore */
      }

      const safeSpawn = resolveSafePlayerSpawn({
        savedMapId: savedMap,
        savedX: parsedState.position?.x,
        savedY: parsedState.position?.y,
        availableMapIds,
      });

      validMapId = safeSpawn.mapId || availableMapIds[0] || GENERIC_FALLBACK_MAP;
      validPosition = { x: safeSpawn.x, y: safeSpawn.y };

      try {
        const loaded = ensureMapHasStudioTilesets(await loadMap(validMapId));
        const mw = loaded.grid?.[0]?.length || 30;
        const mh = loaded.grid?.length || 30;
        validPosition = {
          x: Math.max(1, Math.min(mw - 2, validPosition.x ?? 15)),
          y: Math.max(1, Math.min(mh - 2, validPosition.y ?? 15)),
        };
        useGameStore.getState().setActiveMapData(loaded);
        preloadAdjacentMaps(validMapId).catch(console.error);
      } catch {
        validMapId = availableMapIds[0] || GENERIC_FALLBACK_MAP;
        validPosition = { ...DEFAULT_SPAWN };
        try {
          const loadedFallback = ensureMapHasStudioTilesets(await loadMap(validMapId));
          useGameStore.getState().setActiveMapData(loadedFallback);
        } catch {}
      }

      useGameStore.getState().hydratePlayer({ 
        ...parsedState,
        currentMapId: validMapId,
        name: res.data.name,
        assetProfileId: res.data.assetProfileId || 'adventurer',
        position: validPosition
      });
      useGameStore.setState({
        currentMapId: validMapId,
        // Never pretend we're seated on a public shard until map_joined
        // delivers DEMO_SANDBOX_chN — a base instanceId disabled peer-wipe guards.
        instanceId: '',
        gameMode: 'EXPLORING',
        mapEntities: [], // clear stale placeholders; socket will repopulate
        otherPlayers: {}, // fresh seat; map_players / player_joined refill
      });

      // Notify socket server of loaded character specs via centralized joinWorld
      if (socketRef.current) {
        const store = useGameStore.getState();
        const neighborMapIds = Object.values(useGameStore.getState().activeMapData?.connections || {}).filter(Boolean) as string[];
        joinWorld({
          socket: socketRef.current,
          accountId: session?.user?.id || charId,
          characterId: charId,
          contract: {
            mapId: validMapId,
            lobby: !enableStudio,
            isPrivate: enableStudio,
            pie: enableStudio && !useEditorStore.getState().isCreationMode,
          },
          position: validPosition,
          name: res.data.name,
          assetProfileId: res.data.assetProfileId || 'adventurer',
          neighborMapIds,
          worldSessionState: store.worldSessionState,
          currentInstanceId: store.instanceId,
          worldJoinSeq: store.worldJoinSeq,
          lastJoinKey: lastJoinKeyRef.current,
          onSetWorldSessionState: store.setWorldSessionState,
          onIncrementWorldJoinSeq: store.incrementWorldJoinSeq,
          onUpdateLastJoinKey: (k) => { lastJoinKeyRef.current = k; },
          force: true,
        });
      }

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

  /**
   * Avatar-free Studio author session — load a map without a game character.
   * Account still joins the map room for hot-reload; player mesh stays hidden in Editor.
   */
  const enterStudioAuthorSession = async (mapId?: string) => {
    if (!enableStudio) return;
    setIsInitializing(true);
    let validMapId = mapId === 'SAINTS_VILLAGE' || !mapId ? GENERIC_FALLBACK_MAP : mapId.replace(/_ch\d+$/, '');
    let validPosition = { ...DEFAULT_SPAWN };

    try {
      const loaded = ensureMapHasStudioTilesets(await loadMap(validMapId));
      const mw = loaded.grid?.[0]?.length || 30;
      const mh = loaded.grid?.length || 30;
      validPosition = {
        x: Math.max(1, Math.min(mw - 2, DEFAULT_SPAWN.x)),
        y: Math.max(1, Math.min(mh - 2, DEFAULT_SPAWN.y)),
      };
      useGameStore.getState().setActiveMapData(loaded);
      preloadAdjacentMaps(validMapId).catch(console.error);
    } catch {
          validMapId = GENERIC_FALLBACK_MAP;
      validPosition = { x: 15, y: 15 };
      try {
            const loadedFallback = ensureMapHasStudioTilesets(await loadMap(GENERIC_FALLBACK_MAP));
            useGameStore.getState().setActiveMapData(loadedFallback);
            validMapId = GENERIC_FALLBACK_MAP;
      } catch {
        // Pristine realm fallback (0 maps in DB) — provide an interactive blank canvas
        const blankMap = ensureMapHasStudioTilesets({
          id: GENERIC_FALLBACK_MAP,
          name: 'Starting Realm Map',
          width: 30,
          height: 30,
          grid: Array(30).fill(0).map(() => Array(30).fill(0)),
          tileLayers: [],
          tilesets: [],
          gates: {},
          npcs: [],
          encounters: [],
        });
        useGameStore.getState().setActiveMapData(blankMap);
      }
    }

    const authorName = session?.user?.name || 'Studio Author';
    const accountId = session?.user?.id;
    useGameStore.getState().hydratePlayer({
      accountId: accountId || undefined,
      name: authorName,
      assetProfileId: 'adventurer',
      position: validPosition,
    });
    useGameStore.setState({
      currentMapId: validMapId,
      instanceId: validMapId,
      gameMode: 'EXPLORING',
      mapEntities: [],
    });

    if (accountId && socketRef.current) {
      const store = useGameStore.getState();
      joinWorld({
        socket: socketRef.current,
        accountId,
        characterId: undefined,
        contract: {
          mapId: validMapId,
          lobby: false,
          isPrivate: true,
          pie: false,
        },
        position: validPosition,
        name: authorName,
        assetProfileId: 'adventurer',
        worldSessionState: store.worldSessionState,
        currentInstanceId: store.instanceId,
        worldJoinSeq: store.worldJoinSeq,
        lastJoinKey: lastJoinKeyRef.current,
        onSetWorldSessionState: store.setWorldSessionState,
        onIncrementWorldJoinSeq: store.incrementWorldJoinSeq,
        onUpdateLastJoinKey: (k) => { lastJoinKeyRef.current = k; },
        force: true,
      });
    }

    setActiveCharacterId(undefined);
    setShowCreator(false);
    setShowSelector(false);
    useEditorStore.getState().enterDevelopmentMode();

    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/studio');
    }

    useGameStore.getState().showToast('Author session — no character (avatar hidden while editing)');
    setIsInitializing(false);
  };

  useEffect(() => {
    async function initData() {
      try {
        const setupRes = await fetch('/api/setup/status');
        if (setupRes.ok) {
          const setupJson = await setupRes.json();
          if (setupJson.status && !setupJson.status.isSetupCompleted) {
            if (!enableStudio) {
              setIsRealmOffline(true);
              setIsInitializing(false);
              return;
            }
            // If in Studio, allow entry so they can run setup from the Studio dashboard.
          }
        }
      } catch {}

      useGameStore.getState().hydrateMobileControlMode();
      await useGameStore.getState().fetchLogicTiles();
      await useGameStore.getState().fetchGameRegistry();

      if (enableStudio) {
        // Studio opens in Editor runtime; Playtest is for play systems only.
        useEditorStore.getState().enterDevelopmentMode();
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
      // Fit a ~1280px desktop HUD into the current viewport width.
      const scale = Math.max(0.35, Math.min(1.25, window.innerWidth / 1280));
      setUiScale(scale);
      // Gate + HUD scale on viewport width only (not every touch desktop).
      setIsMobile(window.innerWidth < 768);
      setViewportReady(true);
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
      if (hasAuthInitializedRef.current) return;
      hasAuthInitializedRef.current = true;
      loadCharactersList().then(() => {
        if (initialCharacterId) {
          selectAndLoadCharacter(initialCharacterId);
        } else if (enableStudio) {
          // Studio: avatar-free author session by default (no character required).
          // Pass ?characterId= to load a real character for Playtest instead.
          void enterStudioAuthorSession('STARTING_MAP');
        } else {
          useGameStore.getState().setGameMode('CHARACTER_SELECT');
          setShowSelector(true);
          setIsInitializing(false);
        }
      });
    } else if (status === 'unauthenticated') {
      setPermissionLevel(0);
      setIsInitializing(false);
    }
  }, [status, initialCharacterId, session?.user?.permissionLevel, enableStudio]);

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

    let activeSocket: any = null;
    let hadLobbyDisconnect = false;
    let fallbackTriggered = false;
    let pingInterval: any = null;

    useGameStore.getState().setConnectionStatus('connecting');
    const { url: configuredGoUrl, options: socketOpts } = lobbySocketConnect(session.user.id);

    let disconnectTimeout: any = null;

    const setupSocket = (targetUrl?: string) => {
      const opts = {
        ...socketOpts,
        reconnectionAttempts: targetUrl ? 2 : Infinity,
        timeout: targetUrl ? 3500 : 20000,
      };

      const socket = targetUrl ? io(targetUrl, opts) : io(opts);
      activeSocket = socket;
      socketRef.current = socket;

      if (targetUrl) {
        socket.on('connect_error', (err) => {
          console.warn('[lobby] Remote Go socket unreachable, falling back to same-origin socket:', err?.message || err);
          if (!fallbackTriggered) {
            fallbackTriggered = true;
            socket.disconnect();
            if (pingInterval) clearInterval(pingInterval);
            setupSocket(undefined);
          }
        });
      }

      // Periodic ping/pong for diagnostics & latency RTT
      if (pingInterval) clearInterval(pingInterval);
      pingInterval = setInterval(() => {
        if (socket.connected) {
          const start = performance.now();
          socket.emit('ping', { clientTime: Date.now() });
          socket.once('pong', () => {
            const rtt = Math.round(performance.now() - start);
            useGameStore.getState().setLatencyMs(rtt);
          });
        }
      }, 5000);
      
      socket.on('connect', () => {
        if (disconnectTimeout) {
          clearTimeout(disconnectTimeout);
          disconnectTimeout = null;
        }

        const state = useGameStore.getState();
        state.setConnectionStatus('connected');
        state.setEmitSocketEvent((event, data) => {
          socket.emit(event, data);
        });

        if (hadLobbyDisconnect) {
          state.showToast('Reconnected to lobby.');
          hadLobbyDisconnect = false;
        }

        const effectiveAccountId = session.user.id || state.player.accountId;
        const inWorld =
          state.gameMode === 'EXPLORING' || state.gameMode === 'BATTLE';
        if (effectiveAccountId && inWorld) {
          if (!state.player.accountId || state.player.accountId !== session.user.id) {
            useGameStore.getState().hydratePlayer({ accountId: session.user.id });
          }
          const neighborMapIds = Object.values(state.activeMapData?.connections || {}).filter(Boolean) as string[];
          joinWorld({
            socket,
            accountId: effectiveAccountId,
            characterId: activeCharacterId,
            contract: {
              mapId: state.currentMapId || GENERIC_FALLBACK_MAP,
              lobby: !enableStudio,
              isPrivate: enableStudio,
              pie: enableStudio && !useEditorStore.getState().isCreationMode,
            },
            position: {
              x: state.player.position?.x ?? 14,
              y: state.player.position?.y ?? 15,
            },
            name: state.player.name || 'Player',
            assetProfileId: state.player.assetProfileId || 'adventurer',
            neighborMapIds,
            worldSessionState: state.worldSessionState,
            currentInstanceId: state.instanceId,
            worldJoinSeq: state.worldJoinSeq,
            lastJoinKey: lastJoinKeyRef.current,
            onSetWorldSessionState: state.setWorldSessionState,
            onIncrementWorldJoinSeq: state.incrementWorldJoinSeq,
            onUpdateLastJoinKey: (k) => { lastJoinKeyRef.current = k; },
          });
          if (!enableStudio) {
            const cur = toBaseMapId(state.currentMapId || GENERIC_FALLBACK_MAP);
            if (cur !== GENERIC_FALLBACK_MAP) {
              const fallback = cur || GENERIC_FALLBACK_MAP;
              state.setCurrentMapId(fallback);
              void loadMap(fallback).then((m) => {
                useGameStore.getState().setActiveMapData(ensureMapHasStudioTilesets(m));
                preloadAdjacentMaps(fallback).catch(console.error);
              }).catch(() => {
                 state.setCurrentMapId(GENERIC_FALLBACK_MAP);
                 void loadMap(GENERIC_FALLBACK_MAP).then(m => useGameStore.getState().setActiveMapData(ensureMapHasStudioTilesets(m)));
              });
            }
          }
        }
      });

    socket.io.on('reconnect_attempt', () => {
      useGameStore.getState().setConnectionStatus('reconnecting');
    });

    socket.on('disconnect', (reason) => {
      hadLobbyDisconnect = true;
      lastJoinKeyRef.current = null;
      useGameStore.getState().setConnectionStatus('disconnected');
      useGameStore.getState().setWorldSessionState('disconnected');
      if (shouldClearPeersOnDisconnect(reason)) {
        useGameStore.getState().setOtherPlayers({});
      }
      if (reason === 'io server disconnect') {
        useGameStore.getState().showToast('Disconnected from lobby.');
        return;
      }
      useGameStore.getState().showToast('Connection lost — reconnecting…');

      // Enforce 20-30s disconnect policy (25s): If connection is lost for over 25s,
      // expire session and return to title screen to prevent stale link hijacking.
      if (disconnectTimeout) clearTimeout(disconnectTimeout);
      disconnectTimeout = setTimeout(() => {
        if (!activeSocket?.connected) {
          console.warn('[lobby] Connection lost for over 25s — expiring game session.');
          try {
            activeSocket?.disconnect();
          } catch {}
          lastJoinKeyRef.current = null;
          setActiveCharacterId(undefined);
          useGameStore.getState().setGameMode('TITLE_SCREEN');
          useGameStore.getState().setConnectionStatus('disconnected');
          useGameStore.getState().showToast('Session Expired: Lost connection to realm for over 25 seconds. Please re-enter from gateway.');
        }
      }, MAX_DISCONNECT_RECONNECT_WINDOW_MS);
    });
    
    socket.on('map_joined', (data) => {
      const state = useGameStore.getState();
      // Protect against stale and reordered join responses
      if (typeof data.joinSeq === 'number' && data.joinSeq < state.worldJoinSeq) {
        if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
          console.debug('[lobby] discard stale map_joined', { dataSeq: data.joinSeq, currentSeq: state.worldJoinSeq });
        }
        return;
      }
      state.setWorldSessionState('joined');
      if (state.isMapTransitioning) {
        state.setIsMapTransitioning(false);
      }
      state.setInstanceId(data.instanceId);
      if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
        const peerCount = Object.keys(useGameStore.getState().otherPlayers || {}).length;
        console.debug(
          '[lobby] map_joined',
          { instanceId: data.instanceId, mapId: data.mapId, seq: data.joinSeq, peerHint: peerCount }
        );
      }
      // Server may remap retired maps (SAINTS_VILLAGE → STARTING_MEADOW).
      // Compare base ids — setCurrentMapId clears activeMapData and would wipe Studio paint state.
      const joinedBase = toBaseMapId(String(data.mapId || ''));
      const currentBase = toBaseMapId(String(state.currentMapId || ''));
      if (joinedBase && joinedBase !== currentBase) {
        state.setCurrentMapId(joinedBase);
        void loadMap(joinedBase).then((m) => {
          useGameStore.getState().setActiveMapData(ensureMapHasStudioTilesets(m));
          preloadAdjacentMaps(joinedBase).catch(console.error);
        });
      } else if (
        joinedBase &&
        !shouldKeepActiveMapData(state.activeMapData, joinedBase)
      ) {
        // Same base id but missing/stale document (e.g. gate warp race) — refresh once.
        void loadMap(joinedBase).then((m) => {
          const live = useGameStore.getState();
          if (!shouldKeepActiveMapData(live.activeMapData, joinedBase)) {
            live.setActiveMapData(ensureMapHasStudioTilesets(m));
            preloadAdjacentMaps(joinedBase).catch(console.error);
          }
        });
      }
      if (typeof data.x === 'number' && typeof data.y === 'number') {
        state.setPlayerPosition({ x: data.x, y: data.y }, state.player.direction || 'down', false);
      }
    });

    socket.on('map_players', (players) => {
      const filtered = { ...(players || {}) };
      if (socket.id) delete filtered[socket.id];
      const state = useGameStore.getState();
      const incomingCount = Object.keys(filtered).length;
      const existingCount = Object.keys(state.otherPlayers || {}).length;
      if (
        !shouldReplacePeerSnapshot({
          incomingCount,
          existingCount,
          currentInstanceId: state.instanceId,
          // /lobby public seat — keep peers through base-id / join races
          lobbySeat: !enableStudio,
        })
      ) {
        if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
          console.debug('[lobby] map_players keep peers (empty snapshot race)', {
            existingCount,
            instanceId: state.instanceId,
          });
        }
        return;
      }
      state.setOtherPlayers(filtered);
      if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
        console.debug('[lobby] map_players', {
          count: incomingCount,
          instanceId: state.instanceId,
        });
      }
    });
    
    socket.on('player_joined', (data) => {
      if (data.socketId !== socket.id) {
        useGameStore.getState().updateOtherPlayer(data.socketId, data);
        // Visible confirmation that the peer store received the join (helps
        // separate "not on shard" from "sprite not rendering").
        if (!enableStudio && data?.name) {
          const at =
            typeof data.x === 'number' && typeof data.y === 'number'
              ? ` @ (${Math.round(data.x)}, ${Math.round(data.y)})`
              : '';
          useGameStore.getState().showToast(`${data.name} is nearby${at}`);
        }
      }
    });

    socket.on('session_replaced', (data: { reason?: string }) => {
      useGameStore.getState().setOtherPlayers({});
      useGameStore.getState().showToast(
        data?.reason ||
          'Signed in elsewhere — one account is one lobby seat. Use two different accounts to see each other.'
      );
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
      dispatchChatEvent({
        id: Date.now().toString() + Math.random(),
        sender: data.sender || op?.name || 'Saint',
        text: data.message,
        timestamp: Date.now(),
        type: isStaffMsg ? 'SYSTEM' : 'LOCAL',
        accountId: data.accountId,
        socketId: data.socketId,
      });
    });

    socket.on('force_disconnect', (data: { reason?: string }) => {
      useGameStore.getState().showToast(data?.reason || 'Disconnected by staff.');
      useGameStore.getState().setOtherPlayers({});
      // Staff kick: do not soft-reconnect back onto the map.
      socket.io.reconnection(false);
      socket.disconnect();
    });

    socket.on('global_chat_msg', (data) => {
      if (data.socketId === socket.id) return; // Prevent echoing own message
      if (data.accountId && session?.user?.id && String(data.accountId) === String(session.user.id)) return;
      dispatchChatEvent({
        id: Date.now().toString() + Math.random(),
        sender: data.sender || data.name || 'Saint',
        text: data.message,
        timestamp: data.timestamp || Date.now(),
        type: 'GLOBAL',
        accountId: data.accountId,
        socketId: data.socketId,
      });
    });

    socket.on('party_chat_msg', (data) => {
      if (data.socketId === socket.id) return; // Prevent echoing own message
      if (data.accountId && session?.user?.id && String(data.accountId) === String(session.user.id)) return;
      dispatchChatEvent({
        id: Date.now().toString() + Math.random(),
        sender: data.sender || data.name || 'Saint',
        text: data.message,
        timestamp: data.timestamp || Date.now(),
        type: 'PARTY',
        accountId: data.accountId,
        socketId: data.socketId,
      });
    });

    socket.on('whisper_msg', (data) => {
      dispatchChatEvent({
        id: Date.now().toString() + Math.random(),
        sender: data.sender || 'Saint',
        text: data.message,
        timestamp: data.timestamp || Date.now(),
        type: 'WHISPER',
        recipient: data.recipient,
        accountId: data.accountId,
        socketId: data.socketId,
      });
    });

    // Economy / party system lines arrive as chat_message (channel SYSTEM|PARTY).
    socket.on('chat_message', (data: any) => {
      const channel = String(data?.channel || 'SYSTEM').toUpperCase();
      const type =
        channel === 'PARTY' ? 'PARTY' :
        channel === 'GLOBAL' ? 'GLOBAL' :
        'SYSTEM';
      dispatchChatEvent({
        id: Date.now().toString() + Math.random(),
        sender: data?.senderName || data?.sender || 'Server',
        text: data?.message || '',
        timestamp: data?.timestamp || Date.now(),
        type,
        accountId: data?.accountId,
        socketId: data?.socketId,
      });
    });

    // CC1: Soft Locks and Presence
    socket.on('studio_lock', (data: any) => {
      if (!data?.resource) return;
      useEditorStore.getState().setSoftLock(data);
    });
    socket.on('studio_unlock', (data: any) => {
      if (!data?.resource) return;
      useEditorStore.getState().removeSoftLock(data.resource);
    });
    socket.on('studio_presence', (data: any) => {
      // For now, presence is just a heartbeat for locks
      // In the future, we can add a cursor tracker or presence list.
    });
    
    socket.on('rule_trace', (trace: any) => {
      window.dispatchEvent(new CustomEvent('studio_rule_trace', { detail: trace }));
    });
    
    // Phase 9: Real-Time Map Editor Synchronization (hot remesh, no remount blast)
    socket.on('content_reload', async (data: any) => {
      if (!data || (data.type !== 'map' && data.type !== 'map_entities')) return;
      const mapId = String(data.mapId || data.id || '');
      if (!mapId) return;
      const state = useGameStore.getState();
      const mapDirty = useEditorStore.getState().mapDirty;
      if (
        !shouldApplyMapReload({
          reloadMapId: mapId,
          currentMapId: state.currentMapId,
          isStudio: enableStudio,
          mapDirty,
        })
      ) {
        if (
          enableStudio &&
          mapDirty &&
          shouldKeepActiveMapData(state.activeMapData, mapId)
        ) {
          state.showToast('Server map saved — keeping your unsaved Studio paint.');
        }
        return;
      }

      state.showToast(`Map updated — hot-reloading ${mapId}…`);
      try {
        invalidateMapCache(mapId);
        invalidateSharedMapCache(mapId);
        const res = await fetch(`/api/maps/${encodeURIComponent(mapId)}?t=${Date.now()}`);
        const freshMapData = ensureMapHasStudioTilesets(await res.json());
        const live = useGameStore.getState().activeMapData;
        if (live && shouldKeepActiveMapData(live, mapId)) {
          // Keep object identity so GameCanvas does not dispose/remount Babylon.
          mergeMapDocumentInPlace(live, freshMapData);
          window.dispatchEvent(
            new CustomEvent<StudioMapHotReloadDetail>(STUDIO_MAP_HOT_RELOAD_EVENT, {
              detail: { mapId },
            })
          );
        } else {
          useGameStore.getState().setActiveMapData(freshMapData);
        }
      } catch (err) {
        console.error('Failed to hot-reload map data:', err);
      }
    });
    
    socket.on('battle_invite_received', (data) => {
      useGameStore.getState().showToast(`Challenge from ${data.name}! Accepting...`);
      socket.emit('accept_battle', data.from);
    });
    
    socket.on('battle_started', (data) => {
      // Bible 17: ignore combat while Studio create tools are open.
      if (
        shouldSuppressGameplaySystems({
          isEditorMode: enableStudio,
          isCreationMode: enableStudio && useEditorStore.getState().isCreationMode,
        })
      ) {
        return;
      }
      const state = useGameStore.getState();
      // Safety: ignore battles for other accounts if a map broadcast ever leaks through
      if (data?.accountId && state.player?.accountId && data.accountId !== state.player.accountId) {
        return;
      }

      const formattedBattle = {
        id: data?.id || data?.combatId || `battle_${Date.now()}`,
        accountId: data?.accountId || state.player?.accountId || '',
        phase: (data?.phase || (data?.turn === 'player' ? 'WAITING_FOR_INPUT' : 'RESOLUTION') || 'WAITING_FOR_INPUT') as any,
        isTrainer: !!data?.isTrainer || !!data?.opponentName,
        trainerName: data?.trainerName || data?.opponentName,
        wildCreature: data?.wildCreature || {
          id: data?.creatureId || 'wild_foe',
          name: data?.opponentName || data?.creatureName || (data?.creatureId?.startsWith?.('mob_') ? 'Wild Daemon' : 'Wild Creature'),
          hp: data?.creatureHp !== undefined ? data.creatureHp : (data?.opponentHp !== undefined ? data.opponentHp : (data?.hp || 50)),
          maxHp: data?.creatureMaxHp !== undefined ? data.creatureMaxHp : (data?.opponentMaxHp !== undefined ? data.opponentMaxHp : (data?.maxHp || 50)),
          level: data?.level || 5,
          spriteKey: data?.spriteKey || '/assets/sprites/creatures/brushpup.png',
        },
        playerCreature: data?.playerCreature || {
          id: state.player?.accountId || 'player_creature',
          name: state.player?.name || 'Saint',
          hp: data?.playerHp !== undefined ? data.playerHp : (state.player?.hp || 100),
          maxHp: data?.playerMaxHp !== undefined ? data.playerMaxHp : (state.player?.maxHp || 100),
          level: state.player?.level || 5,
          spriteKey: state.player?.assetProfileId ? `/assets/sprites/player/${state.player.assetProfileId}.png` : '/assets/sprites/creatures/budaye.png',
        },
        log: data?.log || ['Battle commenced!'],
      };

      state.setActiveBattle(formattedBattle);
      state.setGameMode('BATTLE');
    });

    socket.on('battle_update', (data) => {
      const state = useGameStore.getState();
      if (data?.accountId && state.player?.accountId && data.accountId !== state.player.accountId) {
        return;
      }
      const current = state.activeBattle;
      if (!current) {
        if (data?.id || data?.combatId) {
          const formattedBattle = {
            id: data.id || data.combatId,
            accountId: data.accountId || state.player?.accountId || '',
            phase: (data.phase || (data.turn === 'player' ? 'WAITING_FOR_INPUT' : 'RESOLUTION') || 'WAITING_FOR_INPUT') as any,
            isTrainer: !!data.isTrainer || !!data.opponentName,
            trainerName: data.trainerName || data.opponentName,
            wildCreature: data.wildCreature || {
              id: data.creatureId || 'wild_foe',
              name: data.opponentName || data.creatureName || 'Opponent',
              hp: data.creatureHp !== undefined ? data.creatureHp : (data.opponentHp !== undefined ? data.opponentHp : (data.hp || 50)),
              maxHp: data.creatureMaxHp !== undefined ? data.creatureMaxHp : (data.opponentMaxHp !== undefined ? data.opponentMaxHp : (data.maxHp || 50)),
              level: data.level || 5,
              spriteKey: data.spriteKey || '/assets/sprites/creatures/brushpup.png',
            },
            playerCreature: data.playerCreature || {
              id: state.player?.accountId || 'player_creature',
              name: state.player?.name || 'Saint',
              hp: data.playerHp !== undefined ? data.playerHp : (state.player?.hp || 100),
              maxHp: data.playerMaxHp !== undefined ? data.playerMaxHp : (state.player?.maxHp || 100),
              level: state.player?.level || 5,
              spriteKey: state.player?.assetProfileId ? `/assets/sprites/player/${state.player.assetProfileId}.png` : '/assets/sprites/creatures/budaye.png',
            },
            log: data.log || ['Battle updated.'],
          };
          state.setActiveBattle(formattedBattle);
        }
        return;
      }

      const updatedWild = {
        ...current.wildCreature,
        ...(data.wildCreature || {}),
        hp: data.creatureHp !== undefined ? data.creatureHp : (data.opponentHp !== undefined ? data.opponentHp : current.wildCreature.hp),
      };
      const updatedPlayer = {
        ...current.playerCreature,
        ...(data.playerCreature || {}),
        hp: data.playerHp !== undefined ? data.playerHp : current.playerCreature.hp,
      };

      const newLogs = [...(current.log || [])];
      if (data.damage) {
        newLogs.push(`Hit landed for ${data.damage} damage!${data.crit ? ' (Critical Hit!)' : ''}`);
      }

      state.setActiveBattle({
        ...current,
        id: data.id || data.combatId || current.id,
        phase: (data.phase || (data.turn === 'player' ? 'WAITING_FOR_INPUT' : 'RESOLUTION') || current.phase) as any,
        wildCreature: updatedWild,
        playerCreature: updatedPlayer,
        log: data.log || newLogs,
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

        // ALIGNMENT E.3 — remarkable captures → SocialPost (reuse createSocialPost)
        if (data.result === 'CAPTURE' && data.capture?.isRemarkable) {
          const name = data.capture.name || data.capture.speciesSlug || 'a creature';
          const slug = data.capture.speciesSlug || 'unknown';
          const first = data.capture.isFirstOfSpecies ? ' (first of species!)' : '';
          void import('@/app/actions/social')
            .then(({ createSocialPost }) =>
              createSocialPost(
                `Just captured ${name}${first} in The Lobby! 🐾 #SaintsTamer #Capture #${String(slug).replace(/[^a-zA-Z0-9_]/g, '')}`
              )
            )
            .then(() => {
              state.showToast('Shared capture to Community Feed!');
            })
            .catch((err) => {
              console.warn('[lobby] capture feed post failed', err);
            });
        }
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
      // RT HUD / floating combat feedback listens via window event
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
      if (data?.instanceId) state.setInstanceId(data.instanceId);
      const defeatMap = toBaseMapId(String(data?.mapId || state.currentMapId || GENERIC_FALLBACK_MAP));
      const currentBase = toBaseMapId(String(state.currentMapId || ''));
      if (defeatMap !== currentBase) {
        state.setOtherPlayers({});
        state.setCurrentMapId(defeatMap);
        void loadMap(defeatMap).then((m) => {
          useGameStore.getState().setActiveMapData(ensureMapHasStudioTilesets(m));
        });
      }
      const spawnX = typeof data?.x === 'number' ? data.x : 10;
      const spawnY = typeof data?.y === 'number' ? data.y : 10;
      state.setPlayerPosition({ x: spawnX, y: spawnY }, 'down', false);
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

    // Party invite from friends list / PartyManager (Y accept / N decline while focused)
    socket.on('party_invite', (data: { fromName?: string; fromAccountId?: string }) => {
      const from = data?.fromName || 'A tamer';
      useGameStore.getState().showToast(`${from} invited you to a party (Y/N)`);
      dispatchChatEvent({
        id: Date.now().toString() + Math.random(),
        sender: 'Server',
        text: `${from} invited you to a party. Press Y to accept or N to decline.`,
        timestamp: Date.now(),
        type: 'SYSTEM',
      });
    });

    socket.on('party_update', (data: { type?: string; members?: string[] }) => {
      if (data?.type === 'UPDATE' && Array.isArray(data.members)) {
        useGameStore.getState().showToast(`Party updated (${data.members.length})`);
      } else if (data?.type === 'DISBANDED' || data?.type === 'LEFT') {
        useGameStore.getState().showToast(
          data.type === 'DISBANDED' ? 'Party disbanded' : 'Left party'
        );
      }
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
      const entityId = data?.entityId || data?.id;
      if (!entityId) return;
      const isNpc = data.entityType === 'NPC' || String(data.type || '').toUpperCase() === 'NPC';
      useGameStore.setState((state) => {
        const idx = state.mapEntities.findIndex((e) => e.id === entityId);
        const templateId = String(data.templateId || data.species || '');
        const rawSprite = data.spriteKey || data.sprite || templateId || (isNpc ? 'adventurer' : 'rockitten');
        // Vance keeps classic walk-sheet adventurer; always store resolvable /game-assets URLs.
        // (Prevent bare slugs / battle-sheet keys from rendering as wrong in-world icons.)
        const spriteKey =
          isNpc && templateId.includes('vance')
            ? '/game-assets/npc/adventurer.png'
            : resolveEntitySpriteUrl(rawSprite, {
                kind: isNpc ? 'npc' : 'monster',
              });
        const dialogueKey =
          data.dialogueNpcId ||
          (isNpc
            ? templateId.includes('vance')
              ? 'npc_marshal_vance'
              : `npc_${templateId.replace(/^npc_/, '')}`
            : undefined);
        const ent = {
          id: entityId,
          type: (isNpc ? 'NPC' : 'MONSTER') as 'NPC' | 'MONSTER',
          spriteKey,
          position: { x: typeof data.x === 'number' ? data.x : 0, y: typeof data.y === 'number' ? data.y : 0 },
          isMoving: !!data.isMoving,
          facing: (String(data.direction || 'down').toUpperCase() as 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'),
          mapId: data.mapId,
          name:
            isNpc && templateId.includes('vance')
              ? 'Marshal Vance'
              : (data.name || templateId || 'Creature'),
          dialogueKey,
          hp: data.hp,
          maxHp: data.maxHp,
        };
        if (idx >= 0) state.mapEntities[idx] = ent;
        else state.mapEntities.push(ent);
      });
    });

    socket.on('creature_despawned', (data) => {
      const entityId = data?.entityId || data?.id || (typeof data === 'string' ? data : null);
      if (!entityId) return;
      useGameStore.setState((state) => {
        state.mapEntities = state.mapEntities.filter((e) => e.id !== entityId);
        if (state.combatTarget?.entityId === entityId) {
          state.combatTarget = null;
        }
      });
    });

    socket.on('creature_hp_update', (data) => {
      const entityId = data?.entityId || data?.id;
      if (!entityId) return;
      const target = useGameStore.getState().combatTarget;
      if (target && target.entityId === entityId) {
        const hpPercent = typeof data.hpPercent === 'number' ? data.hpPercent : (typeof data.hp === 'number' && typeof data.maxHp === 'number' && data.maxHp > 0 ? data.hp / data.maxHp : 1);
        useGameStore.getState().setCombatTarget({
          entityId: target.entityId,
          name: target.name,
          maxHp: target.maxHp,
          isCasting: target.isCasting,
          castName: target.castName,
          behavior: target.behavior,
          hp: Math.max(0, Math.round(target.maxHp * hpPercent)),
        });
      }
    });
  };

  setupSocket(configuredGoUrl);

  return () => {
    if (disconnectTimeout) clearTimeout(disconnectTimeout);
    if (pingInterval) clearInterval(pingInterval);
    activeSocket?.disconnect();
    socketRef.current = null;
  };
}, [status, session?.user?.id, enableStudio]);

  // If character becomes available after socket connect, ensure we are on-map.
  // Skip when already seated on the public lobby shard (avoids join storms).
  useEffect(() => {
    if (!activeCharacterId || status !== 'authenticated' || !session?.user?.id) return;
    const socket = socketRef.current;
    if (!socket?.connected) return;
    const state = useGameStore.getState();
    if (state.gameMode !== 'EXPLORING') return;
    const curMap = toBaseMapId(state.currentMapId || GENERIC_FALLBACK_MAP);
    const mapId = curMap;
    if (!state.activeMapData || state.activeMapData.id !== curMap) {
      void loadMap(curMap).then((m) => {
        useGameStore.getState().setActiveMapData(ensureMapHasStudioTilesets(m));
      }).catch(() => {
        /* map load fallback */
      });
    }
    const neighborMapIds = Object.values(state.activeMapData?.connections || {}).filter(Boolean) as string[];
    joinWorld({
      socket,
      accountId: session.user.id,
      characterId: activeCharacterId,
      contract: {
        mapId: curMap,
        lobby: !enableStudio,
        isPrivate: enableStudio,
        pie: enableStudio && !useEditorStore.getState().isCreationMode,
      },
      position: {
        x: state.player.position?.x ?? 14,
        y: state.player.position?.y ?? 15,
      },
      name: state.player.name || 'Player',
      assetProfileId: state.player.assetProfileId || 'adventurer',
      neighborMapIds,
      worldSessionState: state.worldSessionState,
      currentInstanceId: state.instanceId,
      worldJoinSeq: state.worldJoinSeq,
      lastJoinKey: lastJoinKeyRef.current,
      onSetWorldSessionState: state.setWorldSessionState,
      onIncrementWorldJoinSeq: state.incrementWorldJoinSeq,
      onUpdateLastJoinKey: (k) => { lastJoinKeyRef.current = k; },
    });
  }, [activeCharacterId, status, session?.user?.id, enableStudio]);

  // Studio PIE — rejoin private playtest shard / author private shard on Play ↔ Editor.
  useEffect(() => {
    if (!enableStudio) return;
    const onPieChanged = (ev: Event) => {
      const pie = (ev as CustomEvent<StudioPieChangedDetail>).detail?.pie === true;
      const socket = socketRef.current;
      const accountId = session?.user?.id;
      if (!socket?.connected || !accountId) return;
      const state = useGameStore.getState();
      if (state.gameMode !== 'EXPLORING' && state.gameMode !== 'BATTLE') return;

      if (pie && !activeCharacterId && state.player.level <= 1) {
        state.hydratePlayer({
          name: 'Dev Explorer',
          level: 50,
          hp: 1000,
          maxHp: 1000,
          mp: 500,
          maxMp: 500,
          credits: 50000,
        });
      }

      joinWorld({
        socket,
        accountId,
        characterId: activeCharacterId,
        contract: {
          mapId: toBaseMapId(state.currentMapId || GENERIC_FALLBACK_MAP),
          lobby: false,
          isPrivate: !pie,
          pie,
        },
        position: {
          x: state.player.position?.x ?? 14,
          y: state.player.position?.y ?? 15,
        },
        name: state.player.name || (pie ? 'Dev Explorer' : 'Studio Author'),
        assetProfileId: state.player.assetProfileId || 'adventurer',
        worldSessionState: state.worldSessionState,
        currentInstanceId: state.instanceId,
        worldJoinSeq: state.worldJoinSeq,
        lastJoinKey: lastJoinKeyRef.current,
        onSetWorldSessionState: state.setWorldSessionState,
        onIncrementWorldJoinSeq: state.incrementWorldJoinSeq,
        onUpdateLastJoinKey: (k) => { lastJoinKeyRef.current = k; },
        force: true,
      });
      state.showToast(pie ? 'PIE — Playtest runtime active (Test Character)' : 'Editor — World authoring runtime');
    };
    window.addEventListener(STUDIO_PIE_CHANGED_EVENT, onPieChanged as EventListener);
    return () => window.removeEventListener(STUDIO_PIE_CHANGED_EVENT, onPieChanged as EventListener);
  }, [enableStudio, session?.user?.id, activeCharacterId]);

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

  const wantMobileFullscreen = useRef(false);

  const handleEnterMobileGame = () => {
    wantMobileFullscreen.current = true;
    setHasEnteredMobile(true);
  };

  // Desktop never uses the Open Game gate; keep play session if viewport shrinks mid-session.
  useEffect(() => {
    if (viewportReady && !isMobile) setHasEnteredMobile(true);
  }, [viewportReady, isMobile]);

  // After Open Game from the launcher, try fullscreen once the lobby shell mounts.
  useEffect(() => {
    if (!hasEnteredMobile || !isMobile || !viewportReady) return;
    if (!wantMobileFullscreen.current) return;
    wantMobileFullscreen.current = false;
    const el = containerRef.current || document.documentElement;
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    }
    if (typeof screen !== "undefined" && screen.orientation && (screen.orientation as any).lock) {
      (screen.orientation as any).lock("landscape").catch(() => {});
    }
  }, [hasEnteredMobile, isMobile, viewportReady]);

  useEffect(() => {
    const handleOpenOptionsEvent = () => setIsOptionsOpen(true);
    window.addEventListener('open_game_options', handleOpenOptionsEvent);

    // Standard game hotkeys (I, K, P, D, B) + ESC for Options / exit Viewfinder
    const handleGlobalHotkeys = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        const store = useGameStore.getState();
        // Viewfinder edit mode: Escape exits without the Options modal
        if (store.isEditingInterface || store.isUiEditMode) {
          store.setIsEditingInterface(false);
          setIsOptionsOpen(false);
          return;
        }
        // Close topmost floating window first
        const topWindow = store.getTopmostWindow();
        if (topWindow) {
          store.closeWindow(topWindow);
          return;
        }
        // Sub-mode open: Escape closes back to EXPLORING
        if (store.gameMode !== 'EXPLORING' && store.gameMode !== 'BATTLE') {
          store.setGameMode('EXPLORING');
          return;
        }
        // Target selected: Escape deselects target
        if (store.combatTarget) {
          store.setCombatTarget(null);
          return;
        }
        setIsOptionsOpen((open) => !open);
        return;
      }
      const key = e.key.toLowerCase();
      const store = useGameStore.getState();
      const toggleMode = (targetMode: any) => {
        store.setGameMode(store.gameMode === targetMode ? 'EXPLORING' : targetMode);
      };
      // Interface windows use floating window system (handled by ClassicPanel hotkeys)
      // i, k, c, l are handled by ClassicPanel's own keydown listener
      if (key === 'p') toggleMode('PARTY');
      else if (key === 'x') toggleMode('DEX');
      else if (key === 'b') toggleMode('ACHIEVEMENTS');
      else if (key === 'y') socketRef.current?.emit('party_invite_accept');
      else if (key === 'n') socketRef.current?.emit('party_invite_decline');
    };
    window.addEventListener('keydown', handleGlobalHotkeys);
    return () => {
      window.removeEventListener('open_game_options', handleOpenOptionsEvent);
      window.removeEventListener('keydown', handleGlobalHotkeys);
    };
  }, [enableStudio, canStudio]);


  const frameClass = enableStudio
    ? 'fixed inset-0 z-30 touch-none select-none overflow-hidden bg-transparent'
    : 'fixed inset-0 z-30 touch-none select-none overflow-hidden bg-[#0a0a0f]';

  if (isInitializing) {
    return (
      <div className={`${frameClass} flex items-center justify-center text-primary font-mono`}>
        INITIALIZING MMO WORLD...
      </div>
    );
  }

  // Narrow screens: replace the game window with a single Open Game button.
  // Do not mount Babylon / desktop HUD underneath — that was the crowded mess.
  if (viewportReady && isMobile && !hasEnteredMobile) {
    return (
      <div className={frameClass}>
        <MobileGameLauncher
          character={userCharacters.find((c) => c.id === activeCharacterId) || userCharacters[0]}
          onEnterGame={handleEnterMobileGame}
          onSelectCharacter={() => {
            setShowSelector(true);
            setHasEnteredMobile(true);
          }}
        />
      </div>
    );
  }

  if (isRealmOffline) {
    return (
      <div className={frameClass}>
        <GameOfflineScreen
          isAdmin={enableStudio && canStudio}
          onAdminLogin={() => {
            useGameStore.getState().setGameMode('LOGIN');
            setIsRealmOffline(false);
          }}
          onRefresh={async () => {
            const res = await fetch('/api/setup/status', { cache: 'no-store' });
            if (res.ok) {
              const data = await res.json();
              if (data.status?.isSetupCompleted) {
                setIsRealmOffline(false);
                window.location.reload();
              }
            }
          }}
        />
      </div>
    );
  }

  if (gameMode === 'CHARACTER_CREATOR' || showCreator) {
    return (
      <div className={frameClass}>
        <CharacterCreator 
          onComplete={(newId) => selectAndLoadCharacter(newId)} 
          onCancel={userCharacters.length > 0 ? () => { useGameStore.getState().setGameMode('CHARACTER_SELECT'); setShowCreator(false); } : undefined}
        />
      </div>
    );
  }

  if (gameMode === 'CHARACTER_SELECT' || showSelector) {
    return (
      <div className={frameClass}>
        <CharacterSelector 
          characters={userCharacters}
          onSelect={(id) => selectAndLoadCharacter(id)} 
          onCreateNew={() => { useGameStore.getState().setGameMode('CHARACTER_CREATOR'); setShowSelector(false); setShowCreator(true); }}
          onRefresh={() => loadCharactersList()}
          onCancel={
            enableStudio
              ? () => {
                  setShowSelector(false);
                  void enterStudioAuthorSession(
                    toBaseMapId(useGameStore.getState().currentMapId || GENERIC_FALLBACK_MAP)
                  );
                }
              : undefined
          }
        />
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={frameClass}
    >
      {enableStudio && <MidnightTropicalBackground />}
      {enableStudio ? (
        (studioMode === 'tile' || studioMode === 'voxel') ? (
          currentMapId === GENERIC_FALLBACK_MAP ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-[5] select-none pointer-events-none">
               <div className="text-center p-8 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl pointer-events-auto">
                 <h2 className="text-2xl font-mono font-bold text-white mb-2">No Map Loaded</h2>
                 <p className="text-white/60 font-mono text-sm max-w-sm">
                   Open a map from the browser or create a new one using the <span className="text-primary font-bold">File</span> menu.
                 </p>
               </div>
            </div>
          ) : (
            <StudioCanvasViewport 
              activeBrushTileId={activeBrushTileId}
              activeLayerIdx={activeLayerIdx}
              isDevEditorOpen={studioToolsOpen}
              suppressGameplay={suppressGameplay}
              onMapClick={(r: number, c: number) => {
                if (studioToolsOpen) setClickedTile({r, c});
              }}
            />
          )
        ) : null
      ) : (
        gameMode !== 'TITLE_SCREEN' && gameMode !== 'LOGIN' && gameMode !== 'SERVER_SELECT' && (
          <GameCanvasBabylon 
            activeBrushTileId={activeBrushTileId}
            activeLayerIdx={activeLayerIdx}
            isDevEditorOpen={studioToolsOpen}
            suppressGameplay={suppressGameplay}
            onMapClick={(r, c) => {
              if (studioToolsOpen) setClickedTile({r, c});
            }}
          />
        )
      )}

      {/* Touch controls — only in-world. Do NOT wrap in a full-screen
          pointer-events-auto layer: that sat above the title UI (z-30 vs sibling
          z-auto) and swallowed ENTER WORLD / menu clicks on desktop. */}
      {gameMode === 'EXPLORING' && !studioToolsOpen && (
        <div className="pointer-events-none absolute inset-0 z-30">
          <MobileControls
            onToggleFullscreen={toggleFullscreen}
            onToggleOptions={() => setIsOptionsOpen(true)}
            onLeaveGame={() => {
              window.location.href = '/';
            }}
          />
        </div>
      )}
      
      {/* Scale desktop HUD chrome on phones (canvas + touch stay full-bleed).
          pointer-events-none so canvas/world receive clicks; every interactive
          child (title, login, server select, overlays, buttons) MUST set
          pointer-events-auto on its root or it will not receive mouse input. */}
      <div
        className="pointer-events-none absolute inset-0 origin-top-left z-40"
        style={
          isMobile && !enableStudio
            ? {
                transform: `scale(${uiScale})`,
                transformOrigin: "top left",
                width: `${100 / Math.max(uiScale, 0.5)}%`,
                height: `${100 / Math.max(uiScale, 0.5)}%`,
              }
            : undefined
        }
      >
        {gameMode === 'BATTLE' && !suppressGameplay && <TurnBattleOverlay />}

        {/* Defense-in-depth: /studio layout already redirects non-Admin+ users,
            but gate the shell on the client too if this mounts elsewhere. */}
        {enableStudio && canStudio && (
          <Suspense fallback={null}>
            <StudioEditorShell />
          </Suspense>
        )}

        {studioToolsOpen ? (
          <StudioEscapeMenu
            isOpen={isOptionsOpen}
            onClose={() => setIsOptionsOpen(false)}
            onExitStudio={() => {
              useEditorStore.getState().toggleCreationMode();
              useGameStore.getState().setGameMode('EXPLORING');
              setIsOptionsOpen(false);
            }}
          />
        ) : (
          <GameOptionsMenu 
            isOpen={isOptionsOpen}
            onClose={() => setIsOptionsOpen(false)}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
            isAdminUser={canStudio}
            isCreationMode={studioToolsOpen}
            onToggleDevEditor={() => {
              if (!canStudio) return;
              if (!enableStudio) {
                window.location.href = '/studio';
                return;
              }
              if (!studioToolsOpen) useGameStore.getState().setGameMode('EXPLORING');
              useEditorStore.getState().toggleCreationMode(); 
              setIsOptionsOpen(false);
            }}
          />
        )}

        {/* Viewfinder Edit Mode — player + studio */}
        <ViewfinderOverlay />
        <Suspense fallback={null}>
          <UiEditToolbar />
        </Suspense>

        {gameMode === 'TITLE_SCREEN' && (
          <GameTitleScreen
            characters={userCharacters}
            activeCharacterId={activeCharacterId}
            onSelectCharacter={(id) => selectAndLoadCharacter(id)}
            onCreateCharacter={() => {
              useGameStore.getState().setGameMode('CHARACTER_CREATOR');
              setShowCreator(true);
            }}
            onOpenCharacterSelect={() => {
              useGameStore.getState().setGameMode('CHARACTER_SELECT');
              setShowSelector(true);
            }}
            onOpenServerSelect={() => {
              useGameStore.getState().setGameMode('SERVER_SELECT');
            }}
            onRefreshCharacters={() => loadCharactersList()}
          />
        )}
        {gameMode === 'LOGIN' && <GameLogin />}
        {gameMode === 'SERVER_SELECT' && <ServerSelect />}
        <GameToastStack />

        <HudErrorBoundary fallbackTitle="Game Overlay Error">
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            {gameMode === 'CRAFTING' && <CraftingOverlay />}
            {gameMode === 'BASE' && <BaseOverlay />}
            {gameMode === 'DIALOG' && <DialogOverlay />}
            {gameMode === 'PROFESSOR_LAB' && <ProfessorLabOverlay onClose={() => useGameStore.getState().setGameMode('EXPLORING')} />}
            {gameMode === 'ACHIEVEMENTS' && <AchievementsOverlay />}
            {gameMode === 'LEADERBOARD' && <LeaderboardOverlay />}
            {/* TB UI: TurnBattleOverlay only (mounted when gameMode === BATTLE above) */}
            {gameMode === 'PARTY' && <PartyOverlay />}
            {gameMode === 'DEX' && <SaintsDexOverlay />}
          </div>
          
          {gameMode === 'SHOP' && <ShopOverlay />}
          {gameMode === 'BANK' && activeCharacterId && <BankOverlay characterId={activeCharacterId} />}
          {activeDialog && gameMode !== 'DIALOG' && <DialogOverlay />}
        </HudErrorBoundary>
        
        <div 
          className={`pointer-events-none fixed inset-0 z-[9999] bg-black transition-opacity duration-300 ${isMapTransitioning ? 'opacity-100' : 'opacity-0'}`} 
        />

        {/* Modular Dock-Based In-Game HUD */}
        {((['EXPLORING', 'DIALOG'].includes(gameMode) && showGameplayHud) || isEditingInterface) && (
          <HudErrorBoundary fallbackTitle="HUD Dock Error">
            <LobbyHudDockLayout enableStudio={enableStudio} />
          </HudErrorBoundary>
        )}

        {/* Floating Interface Windows — independent of gameMode */}
        {gameMode === 'EXPLORING' && (
          <HudErrorBoundary fallbackTitle="Floating Window Error">
            <TargetUnitFrame />
            <ContextInteractionBadge />
            <InventoryWindow />
            <SkillsWindow />
            <EquipmentWindow />
            <QuestLogWindow />
            <GtcWindow />
          </HudErrorBoundary>
        )}

      </div>

    </div>
  );
}
