import { create } from 'zustand';
import { setAutoFreeze } from 'immer';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { buildInitialSkills } from '../../../shared/game/skillTypings';
import {
  HudLayoutPreset,
  DockZoneId,
  WidgetSize,
  encodeHudPresetString,
  decodeHudPresetString,
} from './hud/dock-types';
import {
  DEFAULT_PRESET_MODERN,
  BUILTIN_HUD_PRESETS,
  ensureCompletePreset,
} from './hud/default-presets';


/**
 * `activeMapData` is handed straight to Babylon and mutated in place by Studio
 * paint, so it must stay writable.
 *
 * Immer deep-freezes the whole produced state, and every `set((state) => …)`
 * action here — player movement, chat, HP — froze `activeMapData.grid` along
 * with it. Painting then threw `Cannot assign to read only property` from inside
 * the Babylon pointer handler: for a visual layer the overlay had already been
 * drawn so the tile appeared but was never persisted, and for the Logic layer the
 * write came first so the click did nothing at all. Whether a stroke landed
 * depended on which unrelated action had produced state most recently, which is
 * why painting appeared to work only some of the time.
 */
setAutoFreeze(false);

export type GameMode = 'TITLE_SCREEN' | 'LOGIN' | 'SERVER_SELECT' | 'CHARACTER_SELECT' | 'CHARACTER_CREATOR' | 'EXPLORING' | 'BATTLE' | 'DEX' | 'SHOP' | 'SKILLS' | 'INVENTORY' | 'PARTY' | 'EQUIPMENT' | 'CRAFTING' | 'BASE' | 'DIALOG' | 'MAP_EDITOR' | 'PAUSED' | 'PROFESSOR_LAB' | 'GTC' | 'QUESTS' | 'LEADERBOARD' | 'ACHIEVEMENTS';

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

export type Point = { x: number; y: number };

export type MobileControlMode = 'floating' | 'dpad';

const MOBILE_CONTROL_STORAGE_KEY = 'saints-mobile-control-mode';
export const HUD_PRESET_STORAGE_KEY = 'saints-hud-layout-v2';
export const CUSTOM_PRESETS_STORAGE_KEY = 'saints-hud-custom-presets';


export interface MapEntity {
  id: string;
  type: 'NPC' | 'ANIMAL' | 'MONSTER';
  spriteKey: string;
  position: Point;
  isMoving: boolean;
  facing: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
  mapId?: string;
  name?: string;
  dialogueKey?: string;
  spriteConfig?: import('@/engine/BabylonEngine').SpriteSheetConfig;
}

export interface SkillData {
  level: number;
  xp: number;
}

export interface CreatureAbility {
  abilitySlug: string;
  currentCooldown: number;
}

export interface CreaturePartyMember {
  id: string;
  speciesSlug: string;
  nickname: string;
  level: number;
  xp: number;
  currentHp: number;
  maxHp: number;
  stats: {
    physicalPower: number;
    physicalDefense: number;
    abilityPower: number;
    abilityDefense: number;
    combatTempo: number;
  };
  abilities: CreatureAbility[];
  status: string | null;
}

export interface BattleCreature {
  id?: string;
  templateId?: string;
  hp: number;
  maxHp: number;
  level: number;
  spriteKey: string;
  name: string;
  isShiny?: boolean;
  tags?: string[];
}

export interface BattleState {
  id: string;
  accountId: string;
  phase: "WAITING_FOR_INPUT" | "RESOLUTION" | "TURN_END";
  isTrainer?: boolean;
  trainerNpcId?: string;
  trainerName?: string;
  wildCreature: BattleCreature;
  playerCreature: BattleCreature;
  log: string[];
}

export interface PartyMember {
  userId: string;
  socketId: string;
  name: string;
  spriteId: string;
  position: { x: number; y: number };
  creatureParty: CreaturePartyMember[];
}

export type ChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: number;
};

const DIRECTION_DELTA: Record<string, { dx: number, dy: number }> = {
  up:    { dx:  0, dy: -1 },
  down:  { dx:  0, dy:  1 },
  left:  { dx: -1, dy:  0 },
  right: { dx:  1, dy:  0 },
};

export interface PlayerState {
  accountId?: string;
  name?: string;
  spriteId?: string;
  spriteConfig?: import('@/engine/BabylonEngine').SpriteSheetConfig;
  position: Point;
  direction?: 'up' | 'down' | 'left' | 'right';
  isMoving?: boolean;
  level: number;
  xp: number;
  hp: number;
  maxHp: number;
  /** Soul essence (MP) — spent on magic / camera rites */
  mp: number;
  maxMp: number;
  credits: number;
  currency: {
    copper: number;
    silver: number;
    gold: number;
    platinum: number;
  };
  activeQuests: Record<string, { stage: number }>;
  completedQuests: string[];
  inventory: Record<string, number>;
  skills: Record<string, SkillData>;
  equipment: {
    head: string | null;
    chest: string | null;
    legs: string | null;
    weapon: string | null;
  };
  customization?: {
    skinTone: string;
    hairColor: string;
    shirtColor: string;
    pantsColor: string;
  };
  combatStyle: 'MELEE' | 'RANGED' | 'MAGIC';
  activeDaemonId: string | null;
  saintRank: string;
  caughtDaemons: string[];
  assignedBeasts: {
    furnace: string | null;
    farm: string | null;
    fishing_hut: string | null;
    lumber_mill: string | null;
    quarry: string | null;
  };
  lastBaseCollection: number;
  perk?: 'SWIFT_TRAVELER' | 'ACROBAT' | 'PACK_MULE' | 'MASTER_TAMER' | 'STAMINA_SURGE';
  maxWeight?: number;
  maxPartySize?: number;
  // Creature system
  creatureParty: CreaturePartyMember[];
  creatureInventory: Record<string, number>;
  creaturesCaught: string[];
  // Party system (multiplayer)
  party: PartyMember[];
  isPartyLeader: boolean;
}

export interface ToastMessage {
  id: number;
  message: string;
}

export interface PendingMove {
  seq: number;
  direction: 'up' | 'down' | 'left' | 'right';
  predictedPos: Point;
}

export interface GameState {
  logicTiles: Record<number, MapLogicTile>;
  gameMode: GameMode;
  player: PlayerState;
  otherPlayers: Record<string, { x: number; y: number; name: string; spriteId: string; direction?: 'up' | 'down' | 'left' | 'right'; isMoving?: boolean; chatMessage?: string; customization?: { skinTone: string; hairColor: string; shirtColor: string; pantsColor: string } }>;
  pathQueue: Point[];
  currentMapId: string;
  instanceId: string;
  activeMapData: any | null; // For dynamically loaded maps from DB
  mapEntities: MapEntity[];
  toasts: ToastMessage[];
  activeDialog: { npcId: string; npcName?: string; node?: string; text: string; options?: { label: string; nextNode: string }[] } | null;
  setGameMode: (mode: GameMode) => void;
  setCurrentMapId: (id: string) => void;
  setInstanceId: (id: string) => void;
  setActiveMapData: (data: any) => void;
  setIsMapTransitioning: (isTransitioning: boolean) => void;
  setActiveDialog: (dialog: { npcId: string; node?: string; text: string; options?: { label: string; nextNode: string }[] } | null) => void;
  acceptQuest: (questId: string) => void;
  completeQuest: (questId: string) => void;
  setOtherPlayers: (players: Record<string, { x: number; y: number; name: string; spriteId: string; direction?: 'up' | 'down' | 'left' | 'right'; isMoving?: boolean; chatMessage?: string; customization?: { skinTone: string; hairColor: string; shirtColor: string; pantsColor: string } }>) => void;
  updateOtherPlayer: (socketId: string, data: { x?: number; y?: number; name?: string; spriteId?: string; direction?: 'up' | 'down' | 'left' | 'right'; isMoving?: boolean; chatMessage?: string; customization?: { skinTone: string; hairColor: string; shirtColor: string; pantsColor: string } }) => void;
  removeOtherPlayer: (socketId: string) => void;
  setPlayerChat: (message: string) => void;
  localChat: string | null;
  isMapTransitioning: boolean;
  
  // Server Reconciliation (Phase 2)
  moveSequence: number;
  pendingMoves: PendingMove[];
  incrementMoveSeq: () => number;
  addPendingMove: (move: PendingMove) => void;
  clearPendingMovesUpTo: (seq: number, serverX?: number, serverY?: number) => void;
  applyServerCorrection: (x: number, y: number, direction: 'up' | 'down' | 'left' | 'right') => void;
  
  // UI Customization — Viewfinder Edit Mode & Modular Dock Presets
  /** @deprecated Prefer isEditingInterface — kept for existing subscribers */
  isUiEditMode: boolean;
  /** Viewfinder Edit Mode: HUD unlocked for drag/scale */
  isEditingInterface: boolean;
  setIsUiEditMode: (isEditMode: boolean) => void;
  setIsEditingInterface: (isEditing: boolean) => void;
  uiSettings: Record<string, { x: number; y: number; scale: number }>;
  uiLayoutEpoch: number;
  updateUiSetting: (id: string, setting: Partial<{ x: number; y: number; scale: number }>) => void;
  loadUiPreset: (presetData: Record<string, { x: number; y: number; scale: number }>) => void;
  resetUiLayout: () => void;

  // Modular HUD Dock Presets
  activeHudPreset: HudLayoutPreset;
  customHudPresets: HudLayoutPreset[];
  setActiveHudPreset: (presetOrId: HudLayoutPreset | string) => void;
  moveWidgetToZone: (widgetId: string, targetZone: DockZoneId, targetOrder?: number) => void;
  setWidgetSize: (widgetId: string, size: WidgetSize) => void;
  setWidgetVisibility: (widgetId: string, visible: boolean) => void;
  setWidgetCollapsed: (widgetId: string, collapsed: boolean) => void;
  setWidgetTabGroup: (widgetId: string, tabGroup?: string) => void;
  saveCurrentHudPresetAs: (name: string) => HudLayoutPreset;
  deleteCustomHudPreset: (id: string) => void;
  resetHudPresetToDefault: () => void;
  exportHudPresetString: () => string;
  importHudPresetString: (encoded: string) => boolean;
  hydrateHudPresets: () => void;

  /** Mobile touch movement style — persisted separately from panel uiSettings */
  mobileControlMode: MobileControlMode;
  setMobileControlMode: (mode: MobileControlMode) => void;
  hydrateMobileControlMode: () => void;

  
  // Game Data
  fetchLogicTiles: () => Promise<void>;
  activeBattle: BattleState | null;
  setActiveBattle: (battleData: BattleState | null) => void;
  activeEnemies: Record<string, any>;
  setActiveEnemies: (enemies: Record<string, any>) => void;
  combatTarget: { entityId: string, name: string, hp: number, maxHp: number, isCasting?: boolean, castName?: string, behavior?: string } | null;
  setCombatTarget: (target: { entityId: string, name: string, hp: number, maxHp: number, isCasting?: boolean, castName?: string, behavior?: string } | null) => void;
  cooldowns: Record<string, number>;
  setCooldown: (abilityId: string, timestamp: number) => void;
  connectionStatus: 'connected' | 'connecting' | 'reconnecting' | 'disconnected';
  setConnectionStatus: (status: 'connected' | 'connecting' | 'reconnecting' | 'disconnected') => void;
  latencyMs: number;
  setLatencyMs: (ms: number) => void;
  emitSocketEvent?: (event: string, data: any) => void;
  setEmitSocketEvent: (emitter: (event: string, data: any) => void) => void;
  refreshQuestsCounter: number;
  triggerQuestRefresh: () => void;
  setPlayerPosition: (pos: Point, direction?: 'up' | 'down' | 'left' | 'right', isMoving?: boolean) => void;
  enqueuePath: (path: Point[]) => void;
  dequeuePath: () => Point | undefined;
  clearPath: () => void;
  hydratePlayer: (data: Partial<PlayerState>) => void;
  catchDaemon: (daemonId: string) => void;
  changeMap: (mapId: string, spawnPoint: Point) => void;
  showToast: (message: string) => void;
  removeToast: (id: number) => void;
  modifyHp: (amount: number) => void;
  gainXp: (amount: number) => void;
  modifyCredits: (amount: number) => void;
  modifyInventory: (itemId: string, amount: number) => void;
  gainSkillXp: (skillName: string, amount: number) => void;
  equipItem: (slot: 'head' | 'chest' | 'legs' | 'weapon', itemId: string | null) => void;
  setCombatStyle: (style: 'MELEE' | 'RANGED' | 'MAGIC') => void;
  assignBeast: (facility: 'furnace' | 'farm' | 'fishing_hut' | 'lumber_mill' | 'quarry', beastId: string | null) => void;
  collectBaseResources: () => void;
  // Creature actions
  addCreatureToParty: (member: CreaturePartyMember) => void;
  removeCreatureFromParty: (creatureId: string) => void;
  healCreature: (creatureId: string, amount: number) => void;
  addCreatureItem: (itemSlug: string, amount: number) => void;
  removeCreatureItem: (itemSlug: string, amount: number) => void;
  recordCreatureCapture: (speciesSlug: string) => void;
  deductAbilityCooldown: (creatureId: string, abilityIndex: number) => void;
  evolveCreature: (creatureId: string, newSpeciesSlug: string, newNickname?: string) => void;
  // Party actions
  inviteToParty: (userId: string) => void;
  acceptPartyInvite: (inviteId: string) => void;
  leaveParty: () => void;
  updatePartyMemberPosition: (socketId: string, position: { x: number; y: number }) => void;
  setParty: (members: PartyMember[]) => void;
  addPartyMember: (member: PartyMember) => void;
  removePartyMember: (userId: string) => void;
  clearParty: () => void;
}

/** Combat typings + gathering/artisan matrix (Title Case UI keys). */
export const INITIAL_SKILLS: Record<string, SkillData> = buildInitialSkills();

export const useGameStore = create<GameState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      logicTiles: {},

      gameMode: 'TITLE_SCREEN',
      player: {
        spriteId: 'adventurer',
        position: { x: 14, y: 15 },
        level: 1,
        xp: 0,
        hp: 100,
        maxHp: 100,
        mp: 100,
        maxMp: 100,
        credits: 500,
        currency: { copper: 50000, silver: 0, gold: 0, platinum: 0 },
        activeQuests: {},
        completedQuests: [],
        inventory: {},
        skills: INITIAL_SKILLS,
        equipment: { head: null, chest: null, legs: null, weapon: null },
        customization: { skinTone: '#fcd34d', hairColor: '#3b82f6', shirtColor: '#10b981', pantsColor: '#18181b' },
        combatStyle: 'MELEE',
        activeDaemonId: null,
        saintRank: 'Rookie',
        caughtDaemons: [],
        assignedBeasts: { furnace: null, farm: null, fishing_hut: null, lumber_mill: null, quarry: null },
        lastBaseCollection: Date.now(),
        // Creature system
        creatureParty: [],
        creatureInventory: {},
        creaturesCaught: [],
        // Party system
        party: [],
        isPartyLeader: false
      },
      otherPlayers: {},
      isMapTransitioning: false,
      activeBattle: null,
      activeEnemies: {},
      combatTarget: null,
      cooldowns: {},
      pathQueue: [],
      // Default to the seeded demo map; entities come from the socket (creature_spawned).
      currentMapId: 'DEMO_SANDBOX',
      instanceId: 'DEMO_SANDBOX',
      activeMapData: null,
      mapEntities: [],
      toasts: [],
      activeDialog: null,
      moveSequence: 0,
      pendingMoves: [],
      isUiEditMode: false,
      isEditingInterface: false,
      uiSettings: {},
      uiLayoutEpoch: 0,
      activeHudPreset: DEFAULT_PRESET_MODERN,
      customHudPresets: [],
      mobileControlMode: 'floating' as MobileControlMode,

      setMobileControlMode: (mode) => set((state) => {
        state.mobileControlMode = mode;
        if (typeof window !== 'undefined') {
          localStorage.setItem(MOBILE_CONTROL_STORAGE_KEY, mode);
        }
      }),
      hydrateMobileControlMode: () => {
        if (typeof window === 'undefined') return;
        const stored = localStorage.getItem(MOBILE_CONTROL_STORAGE_KEY);
        if (stored === 'floating' || stored === 'dpad') {
          set((state) => { state.mobileControlMode = stored; });
        }
      },

      setActiveHudPreset: (presetOrId) => set((state) => {
        if (typeof presetOrId === 'string') {
          const foundBuiltin = BUILTIN_HUD_PRESETS.find((p) => p.id === presetOrId);
          const foundCustom = state.customHudPresets.find((p) => p.id === presetOrId);
          const target = foundBuiltin || foundCustom;
          if (target) {
            state.activeHudPreset = ensureCompletePreset(target);
          }
        } else {
          state.activeHudPreset = ensureCompletePreset(presetOrId);
        }
        state.uiLayoutEpoch += 1;
        if (typeof window !== 'undefined') {
          localStorage.setItem(HUD_PRESET_STORAGE_KEY, JSON.stringify(state.activeHudPreset));
        }
      }),

      moveWidgetToZone: (widgetId, targetZone, targetOrder) => set((state) => {
        if (!state.activeHudPreset.widgets[widgetId]) {
          state.activeHudPreset.widgets[widgetId] = {
            widgetId,
            zoneId: targetZone,
            order: 0,
            sizeVariant: 'standard',
            visible: true,
            collapsed: false,
          };
        } else {
          state.activeHudPreset.widgets[widgetId].zoneId = targetZone;
          if (typeof targetOrder === 'number') {
            state.activeHudPreset.widgets[widgetId].order = targetOrder;
          } else {
            const sameZoneCount = Object.values(state.activeHudPreset.widgets).filter(
              (w) => w.zoneId === targetZone && w.widgetId !== widgetId
            ).length;
            state.activeHudPreset.widgets[widgetId].order = sameZoneCount;
          }
        }
        state.uiLayoutEpoch += 1;
        if (typeof window !== 'undefined') {
          localStorage.setItem(HUD_PRESET_STORAGE_KEY, JSON.stringify(state.activeHudPreset));
        }
      }),

      setWidgetSize: (widgetId, size) => set((state) => {
        if (!state.activeHudPreset.widgets[widgetId]) {
          state.activeHudPreset.widgets[widgetId] = {
            widgetId,
            zoneId: 'top-left',
            order: 0,
            sizeVariant: size,
            visible: true,
            collapsed: false,
          };
        } else {
          state.activeHudPreset.widgets[widgetId].sizeVariant = size;
        }
        state.uiLayoutEpoch += 1;
        if (typeof window !== 'undefined') {
          localStorage.setItem(HUD_PRESET_STORAGE_KEY, JSON.stringify(state.activeHudPreset));
        }
      }),

      setWidgetVisibility: (widgetId, visible) => set((state) => {
        if (!state.activeHudPreset.widgets[widgetId]) {
          state.activeHudPreset.widgets[widgetId] = {
            widgetId,
            zoneId: 'top-left',
            order: 0,
            sizeVariant: 'standard',
            visible,
            collapsed: false,
          };
        } else {
          state.activeHudPreset.widgets[widgetId].visible = visible;
        }
        state.uiLayoutEpoch += 1;
        if (typeof window !== 'undefined') {
          localStorage.setItem(HUD_PRESET_STORAGE_KEY, JSON.stringify(state.activeHudPreset));
        }
      }),

      setWidgetCollapsed: (widgetId, collapsed) => set((state) => {
        if (state.activeHudPreset.widgets[widgetId]) {
          state.activeHudPreset.widgets[widgetId].collapsed = collapsed;
          state.uiLayoutEpoch += 1;
          if (typeof window !== 'undefined') {
            localStorage.setItem(HUD_PRESET_STORAGE_KEY, JSON.stringify(state.activeHudPreset));
          }
        }
      }),

      setWidgetTabGroup: (widgetId, tabGroup) => set((state) => {
        if (state.activeHudPreset.widgets[widgetId]) {
          state.activeHudPreset.widgets[widgetId].tabGroup = tabGroup;
          state.uiLayoutEpoch += 1;
          if (typeof window !== 'undefined') {
            localStorage.setItem(HUD_PRESET_STORAGE_KEY, JSON.stringify(state.activeHudPreset));
          }
        }
      }),

      saveCurrentHudPresetAs: (name) => {
        let createdPreset: HudLayoutPreset = DEFAULT_PRESET_MODERN;
        set((state) => {
          const newPreset: HudLayoutPreset = {
            id: `custom-${Date.now()}`,
            name: name.trim() || `Custom Layout ${state.customHudPresets.length + 1}`,
            version: 1,
            widgets: JSON.parse(JSON.stringify(state.activeHudPreset.widgets)),
          };
          state.customHudPresets.push(newPreset);
          state.activeHudPreset = newPreset;
          state.uiLayoutEpoch += 1;
          createdPreset = newPreset;
          if (typeof window !== 'undefined') {
            localStorage.setItem(CUSTOM_PRESETS_STORAGE_KEY, JSON.stringify(state.customHudPresets));
            localStorage.setItem(HUD_PRESET_STORAGE_KEY, JSON.stringify(newPreset));
          }
        });
        return createdPreset;
      },

      deleteCustomHudPreset: (id) => set((state) => {
        state.customHudPresets = state.customHudPresets.filter((p) => p.id !== id);
        if (state.activeHudPreset.id === id) {
          state.activeHudPreset = JSON.parse(JSON.stringify(DEFAULT_PRESET_MODERN));
        }
        state.uiLayoutEpoch += 1;
        if (typeof window !== 'undefined') {
          localStorage.setItem(CUSTOM_PRESETS_STORAGE_KEY, JSON.stringify(state.customHudPresets));
          localStorage.setItem(HUD_PRESET_STORAGE_KEY, JSON.stringify(state.activeHudPreset));
        }
      }),

      resetHudPresetToDefault: () => set((state) => {
        state.activeHudPreset = JSON.parse(JSON.stringify(DEFAULT_PRESET_MODERN));
        state.uiSettings = {};
        state.uiLayoutEpoch += 1;
        if (typeof window !== 'undefined') {
          localStorage.removeItem(HUD_PRESET_STORAGE_KEY);
          const keys: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('saints-ui-')) keys.push(k);
          }
          keys.forEach((k) => localStorage.removeItem(k));
        }
      }),

      exportHudPresetString: () => {
        return encodeHudPresetString(get().activeHudPreset);
      },

      importHudPresetString: (encoded) => {
        const decoded = decodeHudPresetString(encoded);
        if (!decoded) return false;
        const complete = ensureCompletePreset(decoded);
        set((state) => {
          state.activeHudPreset = complete;
          state.customHudPresets.push(complete);
          state.uiLayoutEpoch += 1;
          if (typeof window !== 'undefined') {
            localStorage.setItem(HUD_PRESET_STORAGE_KEY, JSON.stringify(complete));
            localStorage.setItem(CUSTOM_PRESETS_STORAGE_KEY, JSON.stringify(state.customHudPresets));
          }
        });
        return true;
      },

      hydrateHudPresets: () => {
        if (typeof window === 'undefined') return;
        try {
          const rawCustom = localStorage.getItem(CUSTOM_PRESETS_STORAGE_KEY);
          let loadedCustom: HudLayoutPreset[] = [];
          if (rawCustom) {
            const parsed = JSON.parse(rawCustom);
            if (Array.isArray(parsed)) {
              loadedCustom = parsed.map((p) => ensureCompletePreset(p));
            }
          }

          const rawActive = localStorage.getItem(HUD_PRESET_STORAGE_KEY);
          let loadedActive: HudLayoutPreset = DEFAULT_PRESET_MODERN;
          if (rawActive) {
            const parsed = JSON.parse(rawActive);
            loadedActive = ensureCompletePreset(parsed);
          }

          set((state) => {
            state.customHudPresets = loadedCustom;
            state.activeHudPreset = loadedActive;
          });
        } catch (err) {
          console.error('[HUD Store] Failed to hydrate presets from localStorage:', err);
        }
      },


      // Server Reconciliation (Phase 2)
      incrementMoveSeq: () => {
        let seq = 0;
        set((state) => {
          state.moveSequence += 1;
          seq = state.moveSequence;
        });
        return seq;
      },
      addPendingMove: (move) => set((state) => {
        state.pendingMoves.push(move);
        // Cap the buffer at 60 to prevent memory leaks
        if (state.pendingMoves.length > 60) {
          state.pendingMoves = state.pendingMoves.slice(-30);
        }
      }),
      clearPendingMovesUpTo: (seq, serverX, serverY) => set((state) => {
        const remainingMoves = state.pendingMoves.filter(m => m.seq > seq);
        
        if (serverX !== undefined && serverY !== undefined) {
           let px = serverX;
           let py = serverY;
           for (const m of remainingMoves) {
              const delta = DIRECTION_DELTA[m.direction];
              if (delta) {
                 px += delta.dx;
                 py += delta.dy;
              }
           }
           state.player.position = { x: px, y: py };
        }
        
        state.pendingMoves = remainingMoves;
      }),
      applyServerCorrection: (x, y, direction) => set((state) => {
        state.player.position = { x, y };
        state.player.direction = direction;
        state.player.isMoving = false;
        // Clear all pending moves since the server corrected us
        state.pendingMoves = [];
      }),

      setCombatTarget: (target) => set((state) => {
        state.combatTarget = target;
      }),

      setIsUiEditMode: (isEditMode) => set((state) => {
        state.isUiEditMode = isEditMode;
        state.isEditingInterface = isEditMode;
      }),
      setIsEditingInterface: (isEditing) => set((state) => {
        state.isEditingInterface = isEditing;
        state.isUiEditMode = isEditing;
      }),
      updateUiSetting: (id, setting) => set((state) => {
        if (!state.uiSettings[id]) {
          state.uiSettings[id] = { x: 0, y: 0, scale: 1 };
        }
        state.uiSettings[id] = { ...state.uiSettings[id], ...setting };
      }),
      loadUiPreset: (presetData) => set((state) => {
        state.uiSettings = presetData;
        state.uiLayoutEpoch += 1;
        if (typeof window !== 'undefined') {
          Object.keys(presetData).forEach(key => {
            localStorage.setItem(`saints-ui-${key}`, JSON.stringify(presetData[key]));
          });
        }
      }),
      resetUiLayout: () => set((state) => {
        state.uiSettings = {};
        state.uiLayoutEpoch += 1;
        if (typeof window !== 'undefined') {
          const keys: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('saints-ui-')) keys.push(k);
          }
          keys.forEach((k) => localStorage.removeItem(k));
        }
      }),

      setGameMode: (mode) => set((state) => { state.gameMode = mode; }),
      setCurrentMapId: (id) => set({ currentMapId: id, activeMapData: null }),
      setInstanceId: (id) => set({ instanceId: id }),
      setActiveMapData: (data) => set({ activeMapData: data }),
      setIsMapTransitioning: (isMapTransitioning) => set({ isMapTransitioning }),
      setActiveDialog: (dialog) => set((state) => { state.activeDialog = dialog; }),
      localChat: null,
      setPlayerChat: (message) => {
        set((state) => { state.localChat = message; });
        setTimeout(() => set((state) => { 
          if (state.localChat === message) state.localChat = null; 
        }), 4000);
      },
      
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
      
      acceptQuest: (questId) => set((state) => {
        if (!state.player.activeQuests[questId]) {
          state.player.activeQuests[questId] = { stage: 1 };
        }
      }),
      completeQuest: (questId) => set((state) => {
        delete state.player.activeQuests[questId];
        if (!state.player.completedQuests.includes(questId)) {
          state.player.completedQuests.push(questId);
        }
      }),
      setOtherPlayers: (players) => set((state) => { state.otherPlayers = players; }),
      updateOtherPlayer: (socketId, data) => set((state) => {
        if (!state.otherPlayers[socketId]) {
          state.otherPlayers[socketId] = {
            x: data.x ?? 0,
            y: data.y ?? 0,
            name: data.name || 'Unknown',
            spriteId: data.spriteId || 'adventurer',
            direction: data.direction,
            isMoving: data.isMoving,
            chatMessage: data.chatMessage,
            customization: data.customization,
          };
        } else {
          if (data.x !== undefined) state.otherPlayers[socketId].x = data.x;
          if (data.y !== undefined) state.otherPlayers[socketId].y = data.y;
          if (data.name !== undefined) state.otherPlayers[socketId].name = data.name;
          if (data.spriteId !== undefined) state.otherPlayers[socketId].spriteId = data.spriteId;
          if (data.direction !== undefined) state.otherPlayers[socketId].direction = data.direction;
          if (data.isMoving !== undefined) state.otherPlayers[socketId].isMoving = data.isMoving;
          if (data.customization !== undefined) state.otherPlayers[socketId].customization = data.customization;
          if (data.chatMessage !== undefined) {
            state.otherPlayers[socketId].chatMessage = data.chatMessage;
            if (data.chatMessage) {
              setTimeout(() => set((s) => {
                if (s.otherPlayers[socketId]?.chatMessage === data.chatMessage) {
                  s.otherPlayers[socketId].chatMessage = undefined;
                }
              }), 4000);
            }
          }
        }
      }),
      removeOtherPlayer: (socketId) => set((state) => {
        delete state.otherPlayers[socketId];
      }),
      setActiveBattle: (battleData) => set((state) => {
        state.activeBattle = battleData;
      }),
      setActiveEnemies: (enemies) => set((state) => {
        state.activeEnemies = enemies;
      }),
      setCooldown: (abilityId, timestamp) => set((state) => {
        state.cooldowns[abilityId] = timestamp;
      }),
      connectionStatus: 'disconnected',
      setConnectionStatus: (status) => set((state) => { state.connectionStatus = status; }),
      latencyMs: 0,
      setLatencyMs: (ms) => set((state) => { state.latencyMs = ms; }),
      setEmitSocketEvent: (emitter) => set((state) => {
        state.emitSocketEvent = emitter;
      }),
      refreshQuestsCounter: 0,
      triggerQuestRefresh: () => set((state) => {
        state.refreshQuestsCounter += 1;
      }),
      setPlayerPosition: (pos, direction, isMoving) => set((state) => { 
        state.player.position = pos; 
        if (direction) state.player.direction = direction;
        if (isMoving !== undefined) state.player.isMoving = isMoving;
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

      hydratePlayer: (data) =>
        set((state) => {
          if (data.name) state.player.name = data.name;
          if (data.spriteId) state.player.spriteId = data.spriteId;
          if (data.accountId) state.player.accountId = data.accountId;
          if (data.position) state.player.position = data.position;
          if (data.level !== undefined) state.player.level = data.level;
          if (data.xp !== undefined) state.player.xp = data.xp;
          if (data.hp !== undefined) state.player.hp = data.hp;
          if (data.maxHp !== undefined) state.player.maxHp = data.maxHp;
          if (data.mp !== undefined) state.player.mp = data.mp;
          if (data.maxMp !== undefined) state.player.maxMp = data.maxMp;
          // Backfill soul essence for older character saves
          if (state.player.maxMp == null || Number.isNaN(state.player.maxMp)) state.player.maxMp = 100;
          if (state.player.mp == null || Number.isNaN(state.player.mp)) state.player.mp = state.player.maxMp;
          if (data.credits !== undefined) state.player.credits = data.credits;
          if (data.inventory) state.player.inventory = data.inventory;
          if (data.skills) state.player.skills = data.skills;
          if (data.equipment) state.player.equipment = data.equipment;
          if (data.customization) state.player.customization = data.customization;
          if (data.combatStyle) state.player.combatStyle = data.combatStyle;
          if (data.activeDaemonId !== undefined) state.player.activeDaemonId = data.activeDaemonId;
          if (data.saintRank) state.player.saintRank = data.saintRank;
          if (data.caughtDaemons) state.player.caughtDaemons = data.caughtDaemons;
          if (data.assignedBeasts) state.player.assignedBeasts = data.assignedBeasts;
          if (data.lastBaseCollection !== undefined) state.player.lastBaseCollection = data.lastBaseCollection;
          if (data.activeQuests) state.player.activeQuests = data.activeQuests;
          if (data.completedQuests) state.player.completedQuests = data.completedQuests;
        }),

      catchDaemon: (daemonId) =>
        set((state) => {
          if (!state.player.caughtDaemons.includes(daemonId)) {
            state.player.caughtDaemons.push(daemonId);
          }
        }),

      changeMap: (mapId, spawnPoint) =>
        set((state) => {
          state.currentMapId = mapId;
          state.player.position = spawnPoint;
          state.pathQueue = []; // Clear queue on transition
        }),

      showToast: (message) => {
        const id = Date.now() + Math.random();
        set((state) => {
          const newToasts = [...state.toasts, { id, message }].slice(-3); // Keep max 3
          state.toasts = newToasts;
        });
        setTimeout(() => {
          set((state) => {
            state.toasts = state.toasts.filter(t => t.id !== id);
          });
        }, 3000);
      },
      
      removeToast: (id) => set((state) => {
        state.toasts = state.toasts.filter(t => t.id !== id);
      }),

      modifyHp: (amount) =>
        set((state) => {
          state.player.hp = Math.max(0, Math.min(state.player.maxHp, state.player.hp + amount));
        }),

      gainXp: (amount) =>
        set((state) => {
          state.player.xp += amount;
          // Simple leveling curve: Level = floor(sqrt(XP / 100)) + 1
          const newLevel = Math.floor(Math.sqrt(state.player.xp / 100)) + 1;
          if (newLevel > state.player.level) {
            state.player.level = newLevel;
            state.player.maxHp += 20;
            state.player.hp = state.player.maxHp;
            const id = Date.now() + Math.random();
            state.toasts = [...state.toasts, { id, message: `Level Up! Reached Level ${newLevel}` }].slice(-3);
            setTimeout(() => {
              set((s) => { s.toasts = s.toasts.filter(t => t.id !== id); });
            }, 3000);
          }
        }),

      modifyCredits: (amount) =>
        set((state) => {
          state.player.credits = Math.max(0, state.player.credits + amount);
        }),

      modifyInventory: (itemId, amount) =>
        set((state) => {
          const current = state.player.inventory[itemId] || 0;
          state.player.inventory[itemId] = Math.max(0, current + amount);
        }),

      gainSkillXp: (skillName, amount) => set((state) => {
        if (!state.player.skills[skillName]) return;
        state.player.skills[skillName].xp += amount;
        
        // Recalculate level: Lvl = floor(sqrt(XP / 50)) + 1
        const newLevel = Math.floor(Math.sqrt(state.player.skills[skillName].xp / 50)) + 1;
        if (newLevel > state.player.skills[skillName].level && newLevel <= 50) {
          state.player.skills[skillName].level = newLevel;
          const id = Date.now() + Math.random();
          state.toasts = [...state.toasts, { id, message: `${skillName} level up! (${newLevel})` }].slice(-3);
          setTimeout(() => {
            set((s) => { s.toasts = s.toasts.filter(t => t.id !== id); });
          }, 3000);
        }
      }),
      equipItem: (slot, itemId) => set((state) => {
        state.player.equipment[slot] = itemId;
      }),
      setCombatStyle: (style) => set((state) => {
        state.player.combatStyle = style;
      }),
        
      assignBeast: (facility, beastId) =>
        set((state) => {
          state.player.assignedBeasts[facility] = beastId;
          if (beastId) {
            const id = Date.now() + Math.random();
            state.toasts = [...state.toasts, { id, message: `Beast assigned to the ${facility.replace('_', ' ')}!` }].slice(-3);
            setTimeout(() => {
              set((s) => { s.toasts = s.toasts.filter(t => t.id !== id); });
            }, 3000);
          }
        }),

      collectBaseResources: () => set((state) => {
        const now = Date.now();
        const diffMs = now - state.player.lastBaseCollection;
        const diffSeconds = Math.floor(diffMs / 1000);
        
        // Only collect if at least 10 seconds have passed to prevent spam
        if (diffSeconds < 10) return;

        // Base rate: 1 resource every 10 seconds per assigned beast
        const cycles = Math.floor(diffSeconds / 10);
        
        let collectedWood = 0;
        let collectedOre = 0;

        if (state.player.assignedBeasts.lumber_mill) collectedWood += cycles;
        if (state.player.assignedBeasts.quarry) collectedOre += cycles;

        if (collectedWood > 0 || collectedOre > 0) {
          if (collectedWood > 0) {
            state.player.inventory['wood_logs'] = (state.player.inventory['wood_logs'] || 0) + collectedWood;
          }
          if (collectedOre > 0) {
            state.player.inventory['copper_ore'] = (state.player.inventory['copper_ore'] || 0) + collectedOre;
          }
          const id = Date.now() + Math.random();
          state.toasts = [...state.toasts, { 
            id, 
            message: `Base yielded: ${collectedWood > 0 ? collectedWood + ' Wood' : ''} ${collectedOre > 0 ? collectedOre + ' Ore' : ''}` 
          }].slice(-3);
          setTimeout(() => set((s) => { s.toasts = s.toasts.filter(t => t.id !== id); }), 3000);
        }

        // Update timestamp keeping the remainder
        state.player.lastBaseCollection = now - (diffMs % 10000);
      }),

      // Creature actions
      addCreatureToParty: (member) => set((state) => {
        if (state.player.creatureParty.length < 6) {
          state.player.creatureParty.push(member);
          const id = Date.now() + Math.random();
          state.toasts = [...state.toasts, { id, message: `${member.nickname} joined your party!` }].slice(-3);
          setTimeout(() => set((s) => { s.toasts = s.toasts.filter(t => t.id !== id); }), 3000);
        } else {
          const id = Date.now() + Math.random();
          state.toasts = [...state.toasts, { id, message: 'Party is full!' }].slice(-3);
          setTimeout(() => set((s) => { s.toasts = s.toasts.filter(t => t.id !== id); }), 3000);
        }
      }),

      removeCreatureFromParty: (creatureId) => set((state) => {
        state.player.creatureParty = state.player.creatureParty.filter(t => t.id !== creatureId);
      }),

      healCreature: (creatureId, amount) => set((state) => {
        const creature = state.player.creatureParty.find(t => t.id === creatureId);
        if (creature) {
          creature.currentHp = Math.min(creature.maxHp, creature.currentHp + amount);
        }
      }),

      addCreatureItem: (itemSlug, amount) => set((state) => {
        const current = state.player.creatureInventory[itemSlug] || 0;
        state.player.creatureInventory[itemSlug] = current + amount;
      }),

      removeCreatureItem: (itemSlug, amount) => set((state) => {
        const current = state.player.creatureInventory[itemSlug] || 0;
        const newAmount = Math.max(0, current - amount);
        if (newAmount === 0) {
          delete state.player.creatureInventory[itemSlug];
        } else {
          state.player.creatureInventory[itemSlug] = newAmount;
        }
      }),

      recordCreatureCapture: (speciesSlug) => set((state) => {
        if (!state.player.creaturesCaught.includes(speciesSlug)) {
          state.player.creaturesCaught.push(speciesSlug);
          const id = Date.now() + Math.random();
          state.toasts = [...state.toasts, { id, message: `New species discovered: ${speciesSlug}!` }].slice(-3);
          setTimeout(() => set((s) => { s.toasts = s.toasts.filter(t => t.id !== id); }), 3000);
        }
      }),

      deductAbilityCooldown: (creatureId, abilityIndex) => set((state) => {
        const beast = state.player.creatureParty.find(b => b.id === creatureId);
        if (beast && beast.abilities[abilityIndex]) {
          beast.abilities[abilityIndex].currentCooldown = Date.now();
        }
      }),

      evolveCreature: (creatureId, newSpeciesSlug, newNickname) => set((state) => {
        const beast = state.player.creatureParty.find(b => b.id === creatureId);
        if (beast) {
          const oldName = beast.nickname || beast.speciesSlug;
          beast.speciesSlug = newSpeciesSlug;
          if (newNickname) beast.nickname = newNickname;
          const id = Date.now() + Math.random();
          state.toasts = [...state.toasts, { id, message: `✨ What?! ${oldName} evolved into ${newSpeciesSlug}! ✨` }].slice(-3);
          setTimeout(() => set((s) => { s.toasts = s.toasts.filter(t => t.id !== id); }), 3000);
        }
      }),

      // Party actions
      inviteToParty: (userId) => set((_state) => {
        // This will be implemented with Socket.IO in Phase 7
        console.log('Inviting user to party:', userId);
      }),

      acceptPartyInvite: (inviteId) => set((_state) => {
        // This will be implemented with Socket.IO in Phase 7
        console.log('Accepting party invite:', inviteId);
      }),

      leaveParty: () => set((state) => {
        state.player.party = [];
        state.player.isPartyLeader = false;
        const id = Date.now() + Math.random();
        state.toasts = [...state.toasts, { id, message: 'You left the party' }].slice(-3);
        setTimeout(() => set((s) => { s.toasts = s.toasts.filter(t => t.id !== id); }), 3000);
      }),

      updatePartyMemberPosition: (socketId, position) => set((state) => {
        const member = state.player.party.find(m => m.socketId === socketId);
        if (member) {
          member.position = position;
        }
      }),

      setParty: (members) => set((state) => {
        state.player.party = members;
      }),

      addPartyMember: (member) => set((state) => {
        if (state.player.party.length < 4) {
          state.player.party.push(member);
          const id = Date.now() + Math.random();
          state.toasts = [...state.toasts, { id, message: `${member.name} joined the party!` }].slice(-3);
          setTimeout(() => set((s) => { s.toasts = s.toasts.filter(t => t.id !== id); }), 3000);
        } else {
          const id = Date.now() + Math.random();
          state.toasts = [...state.toasts, { id, message: 'Party is full!' }].slice(-3);
          setTimeout(() => set((s) => { s.toasts = s.toasts.filter(t => t.id !== id); }), 3000);
        }
      }),

      removePartyMember: (userId) => set((state) => {
        state.player.party = state.player.party.filter(m => m.userId !== userId);
      }),

      clearParty: () => set((state) => {
        state.player.party = [];
        state.player.isPartyLeader = false;
      })
    }))
  )
);

// XP calculation with party bonus
export function calculateBattleXP(
  enemyLevel: number,
  partySize: number,
  participated: boolean
): number {
  const baseXP = enemyLevel * 10;
  const partyBonus = 1 + (partySize - 1) * 0.2; // +20% per member
  const totalXP = baseXP * partyBonus;
  
  return participated ? Math.floor(totalXP / partySize) : 0;
}
