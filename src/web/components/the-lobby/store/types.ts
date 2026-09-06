import { create } from 'zustand';
import { setAutoFreeze } from 'immer';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { buildInitialSkills } from '../../../../shared/game/skillTypings';
import {
  HudLayoutPreset,
  DockZoneId,
  WidgetSize,
  encodeHudPresetString,
  decodeHudPresetString,
} from '../hud/dock-types';
import {
  DEFAULT_PRESET_MODERN,
  BUILTIN_HUD_PRESETS,
  ensureCompletePreset,
} from '../hud/default-presets';
import {
  DEFAULT_HUD_THEME_ID,
  getHudTheme,
  type HudTheme,
} from '../hud/hud-themes';
import type { WorldTarget } from '../../../../shared/game/worldTarget';


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

export type GameMode = 'TITLE_SCREEN' | 'LOGIN' | 'SERVER_SELECT' | 'CHARACTER_SELECT' | 'CHARACTER_CREATOR' | 'EXPLORING' | 'BATTLE' | 'DEX' | 'SHOP' | 'SKILLS' | 'INVENTORY' | 'PARTY' | 'EQUIPMENT' | 'CRAFTING' | 'BASE' | 'DIALOG' | 'MAP_EDITOR' | 'PAUSED' | 'PROFESSOR_LAB' | 'GTC' | 'QUESTS' | 'LEADERBOARD' | 'ACHIEVEMENTS' | 'BANK';

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

export const MOBILE_CONTROL_STORAGE_KEY = 'saints-mobile-control-mode';
export const HUD_PRESET_STORAGE_KEY = 'saints-hud-layout-v2';
export const CUSTOM_PRESETS_STORAGE_KEY = 'saints-hud-custom-presets';
export const HUD_THEME_STORAGE_KEY = 'saints-hud-theme-id';
export const HUD_CONFIG_STORAGE_KEY = 'saints-hud-config-v1';

export interface HudEngineConfig {
  themeId: string;
  scale: number;
  opacity: number;
  borderRadius: 'rounded' | 'compact' | 'capsule';
  borderGlow: boolean;
  vitalsFormat: 'dual-bar' | 'compact' | 'compact-stacked' | 'orbs' | 'heart-containers' | 'classic-gauge' | 'icon-bars';
  vitalsLayout: 'grouped' | 'separate';
  heartContainerCount?: number;
  minimapShape: 'rounded' | 'circle' | 'square';
  showMinimapRadar: boolean;
  showCoords: boolean;
  hotbarLayout: '1x5' | '2x5' | '1x10';
  showHotbarKeybinds: boolean;
  damageNumbersStyle: 'floating' | 'bounce' | 'pop';
  quickMenuButtons: {
    inventory: boolean;
    skills: boolean;
    equipment: boolean;
    quests: boolean;
    gtc: boolean;
    party: boolean;
    dex: boolean;
    achievements: boolean;
    studio: boolean;
  };
}

export const DEFAULT_HUD_CONFIG: HudEngineConfig = {
  themeId: DEFAULT_HUD_THEME_ID,
  scale: 1,
  opacity: 0.95,
  borderRadius: 'rounded',
  borderGlow: true,
  vitalsFormat: 'dual-bar',
  vitalsLayout: 'grouped',
  minimapShape: 'rounded',
  showMinimapRadar: true,
  showCoords: true,
  hotbarLayout: '1x5',
  showHotbarKeybinds: true,
  damageNumbersStyle: 'floating',
  quickMenuButtons: {
    inventory: true,
    skills: true,
    equipment: true,
    quests: true,
    gtc: true,
    party: true,
    dex: true,
    achievements: true,
    studio: true,
  },
};


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
  hp?: number;
  maxHp?: number;
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
  assetProfileId: string;
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

export const DIRECTION_DELTA: Record<string, { dx: number, dy: number }> = {
  up:    { dx:  0, dy: -1 },
  down:  { dx:  0, dy:  1 },
  left:  { dx: -1, dy:  0 },
  right: { dx:  1, dy:  0 },
};

export interface PlayerState {
  accountId?: string;
  name?: string;
  assetProfileId?: string;
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
  /** Physical endurance (SP) — spent on dodging / sprinting */
  stamina: number;
  maxStamina: number;
  isExhausted?: boolean;
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
    offhand?: string | null;
    gloves?: string | null;
    boots?: string | null;
    ring?: string | null;
    amulet?: string | null;
    cape?: string | null;
    [key: string]: string | null | undefined;
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
  // Abilities
  unlockedAbilities: string[];
  equippedAbilities: string[];
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

export type WorldSessionState = 'not_joined' | 'joining' | 'joined' | 'transitioning' | 'disconnected';

export interface GameState {
  worldSessionState: WorldSessionState;
  worldJoinSeq: number;
  setWorldSessionState: (state: WorldSessionState) => void;
  incrementWorldJoinSeq: () => number;
  logicTiles: Record<number, MapLogicTile>;
  gameMode: GameMode;
  player: PlayerState;
  otherPlayers: Record<string, { accountId?: string; x: number; y: number; name: string; assetProfileId: string; direction?: 'up' | 'down' | 'left' | 'right'; isMoving?: boolean; chatMessage?: string; hp?: number; maxHp?: number; customization?: { skinTone: string; hairColor: string; shirtColor: string; pantsColor: string } }>;
  pathQueue: Point[];
  worldOriginOffset: { x: number; y: number };
  currentMapId: string;
  instanceId: string;
  activeMapData: any | null;
  mapEntities: MapEntity[];
  toasts: ToastMessage[];
  toastHistory: Array<{ id: number; message: string; timestamp: number }>;
  clearToastHistory: () => void;
  activeDialog: { npcId: string; npcName?: string; node?: string; text: string; options?: { label: string; nextNode: string }[] } | null;
  setGameMode: (mode: GameMode) => void;
  setWorldOriginOffset: (x: number, y: number) => void;
  addWorldOriginOffset: (dx: number, dy: number) => void;
  setCurrentMapId: (id: string) => void;
  setInstanceId: (id: string) => void;
  setActiveMapData: (data: any) => void;
  setIsMapTransitioning: (isTransitioning: boolean) => void;
  setActiveDialog: (dialog: { npcId: string; node?: string; text: string; options?: { label: string; nextNode: string }[] } | null) => void;
  acceptQuest: (questId: string) => void;
  completeQuest: (questId: string) => void;
  setOtherPlayers: (players: Record<string, { accountId?: string; x: number; y: number; name: string; assetProfileId: string; direction?: 'up' | 'down' | 'left' | 'right'; isMoving?: boolean; chatMessage?: string; hp?: number; maxHp?: number; customization?: { skinTone: string; hairColor: string; shirtColor: string; pantsColor: string } }>) => void;
  updateOtherPlayer: (socketId: string, data: { x?: number; y?: number; name?: string; assetProfileId?: string; direction?: 'up' | 'down' | 'left' | 'right'; isMoving?: boolean; chatMessage?: string; customization?: { skinTone: string; hairColor: string; shirtColor: string; pantsColor: string }; hp?: number; maxHp?: number }) => void;
  updateEntityHp: (entityId: string, hp: number, maxHp?: number) => void;
  removeOtherPlayer: (socketId: string) => void;
  setPlayerChat: (message: string) => void;
  localChat: string | null;
  isMapTransitioning: boolean;
  activeAtlasNodeId: string | null;
  setActiveAtlasNodeId: (id: string | null) => void;
  
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

  // Game Engine HUD & UI Style Customization
  hudThemeId: string;
  hudConfig: HudEngineConfig;
  setHudTheme: (themeId: string) => void;
  setHudScale: (scale: number) => void;
  setHudOpacity: (opacity: number) => void;
  updateHudConfig: (partial: Partial<HudEngineConfig>) => void;
  resetHudConfig: () => void;
  hydrateHudConfig: () => void;

  /** Mobile touch movement style — persisted separately from panel uiSettings */
  mobileControlMode: MobileControlMode;
  setMobileControlMode: (mode: MobileControlMode) => void;
  hydrateMobileControlMode: () => void;

  
  // Floating Window Manager — interfaces open independently of gameMode
  openWindows: string[];
  toggleWindow: (windowId: string) => void;
  closeWindow: (windowId: string) => void;
  closeAllWindows: () => void;
  /** Returns the topmost (last-opened) window id, or null */
  getTopmostWindow: () => string | null;

  // Game Data
  gameRegistry: {
    registryVersion: string;
    schemaVersion: string;
    contentHash: string;
    lastUpdated: string;
    creatures: any[];
    items: any[];
    classes: any[];
    abilities: any[];
    defaultHudPreset?: any;
  } | null;
  setGameRegistry: (registry: any) => void;
  fetchGameRegistry: () => Promise<void>;
  fetchLogicTiles: () => Promise<void>;
  activeBattle: BattleState | null;
  setActiveBattle: (battleData: BattleState | null) => void;
  activeEnemies: Record<string, any>;
  setActiveEnemies: (enemies: Record<string, any>) => void;
  // Spatial Interaction & Targeting (Unified WorldTarget)
  hoveredTarget: WorldTarget | null;
  focusedTarget: WorldTarget | null;
  setHoveredTarget: (target: WorldTarget | null) => void;
  setFocusedTarget: (target: WorldTarget | null) => void;
  clearFocusedTarget: () => void;

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
  modifyStamina: (amount: number) => void;
  gainXp: (amount: number) => void;
  modifyCredits: (amount: number) => void;
  modifyInventory: (itemId: string, amount: number) => void;
  gainSkillXp: (skillName: string, amount: number) => void;
  equipItem: (slot: string, itemId: string | null) => void;
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
