/**
 * World Store — Map data, entities, map transitions, world session.
 *
 * Manages the currently loaded map document, NPC/creature entities on the map,
 * gate traversal transitions, and the game registry (items/quests/creatures
 * fetched from the API).
 */
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { setAutoFreeze } from 'immer';
import type { Point2D } from '../net/protocol.d';

/**
 * activeMapData is handed straight to Babylon and mutated in place by Studio
 * paint, so it must stay writable. Disable Immer deep-freeze.
 */
setAutoFreeze(false);

export interface MapLogicTile {
  id: number;
  name: string;
  color: string;
  isSolid: boolean;
  interactable: boolean;
  onInteractAction: string | null;
  onInteractPayload: string | null;
  onStepAction: string | null;
  onStepPayload: string | null;
}

export interface MapEntity {
  id: string;
  type: 'NPC' | 'ANIMAL' | 'MONSTER';
  spriteKey: string;
  position: Point2D;
  isMoving: boolean;
  facing: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
  mapId?: string;
  name?: string;
  dialogueKey?: string;
  hp?: number;
  maxHp?: number;
  // Dead Reckoning
  vx?: number;
  vy?: number;
  vz?: number;
  lastUpdateMs?: number;
}

export type WorldSessionState = 'not_joined' | 'joining' | 'joined' | 'transitioning' | 'disconnected';

export interface GameRegistryData {
  registryVersion: string;
  schemaVersion: string;
  contentHash: string;
  lastUpdated: string;
  creatures: any[];
  items: any[];
  classes: any[];
  abilities: any[];
  defaultHudPreset?: any;
}

export interface WorldState {
  // Map
  currentMapId: string;
  instanceId: string;
  activeMapData: any | null;
  isMapTransitioning: boolean;

  // World session
  worldSessionState: WorldSessionState;
  worldJoinSeq: number;

  // Entities
  mapEntities: MapEntity[];
  logicTiles: Record<number, MapLogicTile>;

  // Navigation
  pathQueue: Point2D[];
  worldOriginOffset: Point2D;

  // Dialog
  activeDialog: {
    npcId: string;
    npcName?: string;
    node?: string;
    text: string;
    options?: { label: string; nextNode: string }[];
  } | null;

  // Atlas
  activeAtlasNodeId: string | null;

  // Game Registry (fetched from API — replaces hardcoded data files)
  gameRegistry: GameRegistryData | null;

  // Actions
  setCurrentMapId: (id: string) => void;
  setInstanceId: (id: string) => void;
  setActiveMapData: (data: any) => void;
  setIsMapTransitioning: (transitioning: boolean) => void;
  setWorldSessionState: (state: WorldSessionState) => void;
  incrementWorldJoinSeq: () => number;
  setWorldOriginOffset: (x: number, y: number) => void;
  addWorldOriginOffset: (dx: number, dy: number) => void;
  setActiveDialog: (dialog: WorldState['activeDialog']) => void;
  setActiveAtlasNodeId: (id: string | null) => void;
  updateEntityHp: (entityId: string, hp: number, maxHp?: number) => void;
  changeMap: (mapId: string, spawnPoint: Point2D) => void;
  setGameRegistry: (registry: GameRegistryData) => void;
  setLogicTiles: (tiles: Record<number, MapLogicTile>) => void;

  // Path queue
  enqueuePath: (path: Point2D[]) => void;
  dequeuePath: () => Point2D | undefined;
  clearPath: () => void;

  // Registry fetch
  fetchGameRegistry: () => Promise<void>;
  fetchLogicTiles: () => Promise<void>;
}

export const useWorldStore = create<WorldState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      currentMapId: 'LOBBY',
      instanceId: '',
      activeMapData: null,
      isMapTransitioning: false,
      worldSessionState: 'not_joined' as WorldSessionState,
      worldJoinSeq: 0,
      mapEntities: [],
      logicTiles: {},
      pathQueue: [],
      worldOriginOffset: { x: 0, y: 0 },
      activeDialog: null,
      activeAtlasNodeId: null,
      gameRegistry: null,

      setCurrentMapId: (id) => set((s) => { s.currentMapId = id; }),

      setInstanceId: (id) => set((s) => { s.instanceId = id; }),

      setActiveMapData: (data) => set((s) => { s.activeMapData = data; }),

      setIsMapTransitioning: (transitioning) => set((s) => { s.isMapTransitioning = transitioning; }),

      setWorldSessionState: (worldState) => set((s) => { s.worldSessionState = worldState; }),

      incrementWorldJoinSeq: () => {
        let nextSeq = 1;
        set((s) => {
          s.worldJoinSeq += 1;
          nextSeq = s.worldJoinSeq;
        });
        return nextSeq;
      },

      setWorldOriginOffset: (x, y) => set((s) => { s.worldOriginOffset = { x, y }; }),

      addWorldOriginOffset: (dx, dy) => set((s) => {
        s.worldOriginOffset.x += dx;
        s.worldOriginOffset.y += dy;
      }),

      setActiveDialog: (dialog) => set((s) => { s.activeDialog = dialog; }),

      setActiveAtlasNodeId: (id) => set((s) => { s.activeAtlasNodeId = id; }),

      updateEntityHp: (entityId, hp, maxHp) => set((s) => {
        const ent = s.mapEntities.find((e) => e.id === entityId);
        if (ent) {
          ent.hp = hp;
          if (maxHp !== undefined) ent.maxHp = maxHp;
        }
      }),

      changeMap: (mapId, spawnPoint) => set((s) => {
        s.currentMapId = mapId;
        s.mapEntities = [];
      }),

      setGameRegistry: (registry) => set((s) => { s.gameRegistry = registry; }),

      setLogicTiles: (tiles) => set((s) => { s.logicTiles = tiles; }),

      enqueuePath: (path) => set((s) => { s.pathQueue = path; }),
      dequeuePath: () => {
        const queue = get().pathQueue;
        if (queue.length === 0) return undefined;
        const next = queue[0];
        set((s) => { s.pathQueue = s.pathQueue.slice(1); });
        return next;
      },
      clearPath: () => set((s) => { s.pathQueue = []; }),

      fetchGameRegistry: async () => {
        try {
          const res = await fetch('/api/game-registry');
          if (res.ok) {
            const data = await res.json();
            set((s) => { s.gameRegistry = data; });
          }
        } catch (e) {
          console.error('Failed to fetch game registry', e);
        }
      },

      fetchLogicTiles: async () => {
        try {
          const res = await fetch('/api/maps/logic-tiles');
          if (res.ok) {
            const data = await res.json();
            if (data.tiles) {
              const tileMap: Record<number, MapLogicTile> = {};
              for (const tile of data.tiles) {
                tileMap[tile.id] = tile;
              }
              set((s) => { s.logicTiles = tileMap; });
            }
          }
        } catch (e) {
          console.error('Failed to fetch logic tiles', e);
        }
      },
    }))
  )
);
