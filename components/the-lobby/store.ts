import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

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
  spriteConfig?: import('@/lib/game/BabylonEngine').SpriteSheetConfig;
}

export interface SkillData {
  level: number;
  xp: number;
}

export interface TuxemonMove {
  techniqueSlug: string;
  pp: number;
  maxPp: number;
}

export interface TuxemonPartyMember {
  id: string;
  speciesSlug: string;
  nickname: string;
  level: number;
  xp: number;
  currentHp: number;
  maxHp: number;
  stats: {
    meleeAtk: number;
    meleeDef: number;
    rangedAtk: number;
    rangedDef: number;
    speed: number;
  };
  moves: TuxemonMove[];
  status: string | null;
}

export interface PartyMember {
  userId: string;
  socketId: string;
  name: string;
  spriteId: string;
  position: { x: number; y: number };
  tuxemonParty: TuxemonPartyMember[];
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
  spriteConfig?: import('@/lib/game/BabylonEngine').SpriteSheetConfig;
  position: Point;
  direction?: 'up' | 'down' | 'left' | 'right';
  isMoving?: boolean;
  level: number;
  xp: number;
  hp: number;
  maxHp: number;
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
  // Tuxemon system
  tuxemonParty: TuxemonPartyMember[];
  tuxemonInventory: Record<string, number>;
  tuxemonSpeciesCaught: string[];
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
  mapEntities: MapEntity[];
  toast: ToastMessage | null;
  activeDialog: { npcId: string; npcName?: string; text: string } | null;
  setGameMode: (mode: GameMode) => void;
  setCurrentMapId: (id: string) => void;
  setInstanceId: (id: string) => void;
  setIsMapTransitioning: (isTransitioning: boolean) => void;
  setActiveDialog: (dialog: { npcId: string, text: string } | null) => void;
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
  
  // UI Customization
  isUiEditMode: boolean;
  setIsUiEditMode: (isEditMode: boolean) => void;
  uiSettings: Record<string, { x: number; y: number; scale: number }>;
  updateUiSetting: (id: string, setting: Partial<{ x: number; y: number; scale: number }>) => void;
  loadUiPreset: (presetData: Record<string, { x: number; y: number; scale: number }>) => void;
  
  // Game Data
  fetchLogicTiles: () => Promise<void>;
  activeBattle: any;
  setActiveBattle: (battleData: any) => void;
  activeEnemies: Record<string, any>;
  setActiveEnemies: (enemies: Record<string, any>) => void;
  combatTarget: { entityId: string, name: string, hp: number, maxHp: number, isCasting?: boolean, castName?: string, behavior?: string } | null;
  setCombatTarget: (target: { entityId: string, name: string, hp: number, maxHp: number, isCasting?: boolean, castName?: string, behavior?: string } | null) => void;
  cooldowns: Record<string, number>;
  setCooldown: (abilityId: string, timestamp: number) => void;
  emitSocketEvent?: (event: string, data: any) => void;
  setEmitSocketEvent: (emitter: (event: string, data: any) => void) => void;
  setPlayerPosition: (pos: Point, direction?: 'up' | 'down' | 'left' | 'right', isMoving?: boolean) => void;
  enqueuePath: (path: Point[]) => void;
  dequeuePath: () => Point | undefined;
  clearPath: () => void;
  hydratePlayer: (data: Partial<PlayerState>) => void;
  catchDaemon: (daemonId: string) => void;
  changeMap: (mapId: string, spawnPoint: Point) => void;
  showToast: (message: string) => void;
  modifyHp: (amount: number) => void;
  gainXp: (amount: number) => void;
  modifyCredits: (amount: number) => void;
  modifyInventory: (itemId: string, amount: number) => void;
  gainSkillXp: (skillName: string, amount: number) => void;
  equipItem: (slot: 'head' | 'chest' | 'legs' | 'weapon', itemId: string | null) => void;
  setCombatStyle: (style: 'MELEE' | 'RANGED' | 'MAGIC') => void;
  assignBeast: (facility: 'furnace' | 'farm' | 'fishing_hut' | 'lumber_mill' | 'quarry', beastId: string | null) => void;
  collectBaseResources: () => void;
  // Tuxemon actions
  addTuxemonToParty: (member: TuxemonPartyMember) => void;
  removeTuxemonFromParty: (tuxemonId: string) => void;
  healTuxemon: (tuxemonId: string, amount: number) => void;
  addTuxemonItem: (itemSlug: string, amount: number) => void;
  removeTuxemonItem: (itemSlug: string, amount: number) => void;
  recordTuxemonCapture: (speciesSlug: string) => void;
  deductMovePp: (tuxemonId: string, moveIndex: number) => void;
  evolveTuxemon: (tuxemonId: string, newSpeciesSlug: string, newNickname?: string) => void;
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

export const INITIAL_SKILLS: Record<string, SkillData> = {
  // Combat
  Attack: { level: 1, xp: 0 }, Constitution: { level: 1, xp: 0 }, Defence: { level: 1, xp: 0 },
  Magic: { level: 1, xp: 0 }, Necromancy: { level: 1, xp: 0 }, Prayer: { level: 1, xp: 0 },
  Ranged: { level: 1, xp: 0 }, Strength: { level: 1, xp: 0 }, Summoning: { level: 1, xp: 0 },
  // Gathering
  Farming: { level: 1, xp: 0 }, Fishing: { level: 1, xp: 0 }, Hunter: { level: 1, xp: 0 },
  Mining: { level: 1, xp: 0 }, Woodcutting: { level: 1, xp: 0 },
  // Artisan
  Construction: { level: 1, xp: 0 }, Cooking: { level: 1, xp: 0 }, Crafting: { level: 1, xp: 0 },
  Firemaking: { level: 1, xp: 0 }, Fletching: { level: 1, xp: 0 }, Herblore: { level: 1, xp: 0 },
  Runecrafting: { level: 1, xp: 0 }, Smithing: { level: 1, xp: 0 },
  // Support
  Agility: { level: 1, xp: 0 }, Thieving: { level: 1, xp: 0 }
};

export const useGameStore = create<GameState>()(
  subscribeWithSelector(
    immer((set) => ({
      logicTiles: {},
      gameMode: 'TITLE_SCREEN',
      player: {
        spriteId: 'adventurer',
        position: { x: 6, y: 2 },
        level: 1,
        xp: 0,
        hp: 100,
        maxHp: 100,
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
        // Tuxemon system
        tuxemonParty: [],
        tuxemonInventory: {},
        tuxemonSpeciesCaught: [],
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
      currentMapId: 'cotton_town',
      instanceId: '',
      mapEntities: [
        { id: 'npc-1', type: 'NPC', spriteKey: 'villager_1', position: { x: 12, y: 13 }, isMoving: false, facing: 'DOWN', mapId: 'SAINTS_VILLAGE' },
        { id: 'npc-2', type: 'NPC', spriteKey: 'villager_2', position: { x: 8, y: 26 }, isMoving: false, facing: 'RIGHT', mapId: 'SAINTS_VILLAGE' },
        { id: 'npc-guard', type: 'NPC', spriteKey: 'villager_1', position: { x: 4, y: 2 }, isMoving: false, facing: 'DOWN', mapId: 'VERDANT_OUTPOST' },
        { id: 'anim-1', type: 'ANIMAL', spriteKey: 'chicken', position: { x: 14, y: 18 }, isMoving: false, facing: 'LEFT', mapId: 'SAINTS_VILLAGE' },
        { id: 'anim-2', type: 'ANIMAL', spriteKey: 'cow', position: { x: 8, y: 14 }, isMoving: false, facing: 'RIGHT', mapId: 'SAINTS_VILLAGE' }
      ],
      toast: null,
      activeDialog: null,
      moveSequence: 0,
      pendingMoves: [],
      isUiEditMode: false,
      uiSettings: {},

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

      setIsUiEditMode: (isEditMode) => set((state) => { state.isUiEditMode = isEditMode; }),
      updateUiSetting: (id, setting) => set((state) => {
        if (!state.uiSettings[id]) {
          state.uiSettings[id] = { x: 0, y: 0, scale: 1 };
        }
        state.uiSettings[id] = { ...state.uiSettings[id], ...setting };
      }),
      loadUiPreset: (presetData) => set((state) => {
        state.uiSettings = presetData;
        if (typeof window !== 'undefined') {
          Object.keys(presetData).forEach(key => {
            localStorage.setItem(`saints-ui-${key}`, JSON.stringify(presetData[key]));
          });
        }
      }),

      setGameMode: (mode) => set((state) => { state.gameMode = mode; }),
      setCurrentMapId: (id) => set((state) => { state.currentMapId = id }),
      setInstanceId: (id) => set((state) => { state.instanceId = id }),
      setIsMapTransitioning: (isTransitioning) => set((state) => { state.isMapTransitioning = isTransitioning; }),
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
          if (json.success) {
            set((state) => { state.logicTiles = json.data; });
          }
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
          state.otherPlayers[socketId] = { x: data.x || 0, y: data.y || 0, name: data.name || 'Unknown', spriteId: data.spriteId || 'hero_male', direction: data.direction, isMoving: data.isMoving, chatMessage: data.chatMessage, customization: data.customization };
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
      setEmitSocketEvent: (emitter) => set((state) => {
        state.emitSocketEvent = emitter;
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
          if (data.position) state.player.position = data.position;
          if (data.level !== undefined) state.player.level = data.level;
          if (data.xp !== undefined) state.player.xp = data.xp;
          if (data.hp !== undefined) state.player.hp = data.hp;
          if (data.maxHp !== undefined) state.player.maxHp = data.maxHp;
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
        set((state) => {
          state.toast = { id: Date.now(), message };
        });
        setTimeout(() => {
          set((state) => {
            if (state.toast?.message === message) state.toast = null;
          });
        }, 3000);
      },

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
            state.toast = { id: Date.now(), message: `Level Up! Reached Level ${newLevel}` };
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
          state.toast = { id: Date.now(), message: `${skillName} level up! (${newLevel})` };
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
            state.toast = { id: Date.now(), message: `Beast assigned to the ${facility.replace('_', ' ')}!` };
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
          state.toast = { 
            id: Date.now(), 
            message: `Base yielded: ${collectedWood > 0 ? collectedWood + ' Wood' : ''} ${collectedOre > 0 ? collectedOre + ' Ore' : ''}` 
          };
        }

        // Update timestamp keeping the remainder
        state.player.lastBaseCollection = now - (diffMs % 10000);
      }),

      // Tuxemon actions
      addTuxemonToParty: (member) => set((state) => {
        if (state.player.tuxemonParty.length < 6) {
          state.player.tuxemonParty.push(member);
          state.toast = { id: Date.now(), message: `${member.nickname} joined your party!` };
        } else {
          state.toast = { id: Date.now(), message: 'Party is full!' };
        }
      }),

      removeTuxemonFromParty: (tuxemonId) => set((state) => {
        state.player.tuxemonParty = state.player.tuxemonParty.filter(t => t.id !== tuxemonId);
      }),

      healTuxemon: (tuxemonId, amount) => set((state) => {
        const tuxemon = state.player.tuxemonParty.find(t => t.id === tuxemonId);
        if (tuxemon) {
          tuxemon.currentHp = Math.min(tuxemon.maxHp, tuxemon.currentHp + amount);
        }
      }),

      addTuxemonItem: (itemSlug, amount) => set((state) => {
        const current = state.player.tuxemonInventory[itemSlug] || 0;
        state.player.tuxemonInventory[itemSlug] = current + amount;
      }),

      removeTuxemonItem: (itemSlug, amount) => set((state) => {
        const current = state.player.tuxemonInventory[itemSlug] || 0;
        const newAmount = Math.max(0, current - amount);
        if (newAmount === 0) {
          delete state.player.tuxemonInventory[itemSlug];
        } else {
          state.player.tuxemonInventory[itemSlug] = newAmount;
        }
      }),

      recordTuxemonCapture: (speciesSlug) => set((state) => {
        if (!state.player.tuxemonSpeciesCaught.includes(speciesSlug)) {
          state.player.tuxemonSpeciesCaught.push(speciesSlug);
          state.toast = { id: Date.now(), message: `New species discovered: ${speciesSlug}!` };
        }
      }),

      deductMovePp: (tuxemonId, moveIndex) => set((state) => {
        const beast = state.player.tuxemonParty.find(b => b.id === tuxemonId);
        if (beast && beast.moves[moveIndex]) {
          beast.moves[moveIndex].pp = Math.max(0, beast.moves[moveIndex].pp - 1);
        }
      }),

      evolveTuxemon: (tuxemonId, newSpeciesSlug, newNickname) => set((state) => {
        const beast = state.player.tuxemonParty.find(b => b.id === tuxemonId);
        if (beast) {
          const oldName = beast.nickname || beast.speciesSlug;
          beast.speciesSlug = newSpeciesSlug;
          if (newNickname) beast.nickname = newNickname;
          state.toast = { id: Date.now(), message: `✨ What?! ${oldName} evolved into ${newSpeciesSlug}! ✨` };
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
        state.toast = { id: Date.now(), message: 'You left the party' };
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
          state.toast = { id: Date.now(), message: `${member.name} joined the party!` };
        } else {
          state.toast = { id: Date.now(), message: 'Party is full!' };
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
