import type { StateCreator } from 'zustand';
import type { GameState } from './types';
import { DEFAULT_PRESET_MODERN, BUILTIN_HUD_PRESETS, ensureCompletePreset } from '../hud/default-presets';
import { DEFAULT_HUD_THEME_ID } from '../hud/hud-themes';
import { HUD_PRESET_STORAGE_KEY, CUSTOM_PRESETS_STORAGE_KEY, HUD_CONFIG_STORAGE_KEY, MOBILE_CONTROL_STORAGE_KEY, DEFAULT_HUD_CONFIG } from './types';
import { INITIAL_SKILLS, Point, WorldSessionState } from './types';

type GameSlice<T> = StateCreator<GameState, [['zustand/immer', never]], [], T>;

export const createWorldSlice: GameSlice<Pick<GameState, "gameRegistry" | "setGameRegistry" | "fetchGameRegistry" | "logicTiles" | "worldSessionState" | "worldJoinSeq" | "setWorldSessionState" | "incrementWorldJoinSeq" | "pathQueue" | "currentMapId" | "instanceId" | "activeMapData" | "worldOriginOffset" | "setWorldOriginOffset" | "addWorldOriginOffset" | "mapEntities" | "setCurrentMapId" | "setInstanceId" | "setActiveMapData" | "fetchLogicTiles" | "updateEntityHp" | "hoveredTarget" | "focusedTarget" | "setHoveredTarget" | "setFocusedTarget" | "clearFocusedTarget" | "enqueuePath" | "dequeuePath" | "clearPath" | "changeMap">> = (set, get) => ({
gameRegistry: null,

setGameRegistry: (registry) => set({ gameRegistry: registry }),

fetchGameRegistry: async () => {
        try {
          const res = await fetch('/api/game-registry');
          if (res.ok) {
            const data = await res.json();
            set({ gameRegistry: data });

            // Automatically apply Server Default HUD if the user hasn't customized their layout
            if (data.defaultHudPreset && get().activeHudPreset.id === 'preset-modern') {
              const complete = ensureCompletePreset(data.defaultHudPreset);
              set((state) => {
                state.activeHudPreset = complete;
                if (typeof window !== 'undefined') {
                  localStorage.setItem(HUD_PRESET_STORAGE_KEY, JSON.stringify(complete));
                }
              });
            }
          }
        } catch (e) {
          console.error('Failed to fetch game registry', e);
        }
      },

logicTiles: {},

worldSessionState: 'not_joined',

worldJoinSeq: 0,

setWorldSessionState: (worldState) => set((state) => { state.worldSessionState = worldState; }),

incrementWorldJoinSeq: () => {
        let nextSeq = 1;
        set((state) => {
          state.worldJoinSeq += 1;
          nextSeq = state.worldJoinSeq;
        });
        return nextSeq;
      },

pathQueue: [],

currentMapId: 'LOBBY',

instanceId: '',

activeMapData: null,

worldOriginOffset: { x: 0, y: 0 },

setWorldOriginOffset: (x, y) => set((state) => {
        state.worldOriginOffset = { x, y };
      }),

addWorldOriginOffset: (dx, dy) => set((state) => {
        state.worldOriginOffset.x += dx;
        state.worldOriginOffset.y += dy;
      }),

mapEntities: [],

setCurrentMapId: (id) => set({ currentMapId: id, activeMapData: null }),

setInstanceId: (id) => set({ instanceId: id }),

setActiveMapData: (data) => set({ activeMapData: data }),

fetchLogicTiles: async () => {
        try {
          const res = await fetch('/api/world/logic-tiles');
          const json = await res.json();
          const rows = Array.isArray(json) ? json : (json?.success ? json.data : null);
          if (!rows) return;
          const keyed: Record<number, any> = {};
          if (Array.isArray(rows)) {
            for (const tile of rows) {
              if (tile && typeof tile.id === 'number') keyed[tile.id] = tile;
            }
          } else if (rows && typeof rows === 'object') {
            Object.assign(keyed, rows);
          }
          set((state) => { state.logicTiles = keyed; });
        } catch (e) {
          console.error('Failed to fetch logic tiles', e);
        }
      },

updateEntityHp: (entityId, hp, maxHp) => set((state) => {
        // Try mapEntities
        const mapEntityIndex = state.mapEntities.findIndex((e) => e.id === entityId);
        if (mapEntityIndex >= 0) {
          state.mapEntities[mapEntityIndex].hp = hp;
          if (maxHp !== undefined) state.mapEntities[mapEntityIndex].maxHp = maxHp;
          return;
        }

        // Try NPCs
        if (state.activeMapData?.npcs) {
          const npcIndex = state.activeMapData.npcs.findIndex((n: any) => n.id === entityId);
          if (npcIndex >= 0) {
            state.activeMapData.npcs[npcIndex].hp = hp;
            if (maxHp !== undefined) state.activeMapData.npcs[npcIndex].maxHp = maxHp;
            return; // done
          }
        }
        
        // Try other players
        const otherPlayerKeys = Object.keys(state.otherPlayers);
        for (const k of otherPlayerKeys) {
          // In GameCanvasBabylon multiplayer peers IDs are constructed as `multiplayer_${socketId}` or something,
          // but we can just check if entityId includes the socketId or matches it. We'll use strict match first, 
          // or assume it's `multiplayer_${k}`.
          if (k === entityId || `multiplayer_${k}` === entityId || state.otherPlayers[k].accountId === entityId) {
            state.otherPlayers[k].hp = hp;
            if (maxHp !== undefined) state.otherPlayers[k].maxHp = maxHp;
            return;
          }
        }
        
        // Try self
        if (state.player && (entityId === 'player_main' || entityId === (state.player as any).id || entityId === state.player.accountId)) { 
           state.player.hp = hp;
           if (maxHp !== undefined) state.player.maxHp = maxHp;
        }
      }),

hoveredTarget: null,

focusedTarget: null,

setHoveredTarget: (target) => set((state) => {
        state.hoveredTarget = target;
      }),

setFocusedTarget: (target) => set((state) => {
        state.focusedTarget = target;
        if (target && target.kind === 'creature') {
          state.combatTarget = {
            entityId: target.id || '',
            name: target.name,
            hp: target.health?.current || 100,
            maxHp: target.health?.max || 100,
          };
        } else if (!target) {
          state.combatTarget = null;
        }
      }),

clearFocusedTarget: () => set((state) => {
        state.focusedTarget = null;
        state.combatTarget = null;
      }),

enqueuePath: (path) =>
        set((state) => {
          state.pathQueue = path;
        }),

dequeuePath: () => {
        let nextPoint: Point | undefined;
        set((state) => {
          if (state.pathQueue.length > 0) {
            nextPoint = { ...state.pathQueue[0] };
            state.pathQueue.shift();
          }
        });
        return nextPoint;
      },

clearPath: () =>
        set((state) => {
          state.pathQueue = [];
        }),

changeMap: (mapId, spawnPoint) =>
        set((state) => {
          state.currentMapId = mapId;
          state.player.position = spawnPoint;
          state.pathQueue = []; // Clear queue on transition
        })
});
