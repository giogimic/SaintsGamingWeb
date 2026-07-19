import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export type GameMode = 'EXPLORING' | 'BATTLE' | 'DEX' | 'SHOP' | 'SKILLS' | 'INVENTORY' | 'PARTY' | 'EQUIPMENT' | 'CRAFTING' | 'BASE' | 'DIALOG';

export type Point = { x: number; y: number };

export interface MapEntity {
  id: string;
  type: 'NPC' | 'ANIMAL' | 'MONSTER';
  spriteKey: string;
  position: Point;
  isMoving: boolean;
  facing: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
}

export interface SkillData {
  level: number;
  xp: number;
}

export interface PlayerState {
  position: Point;
  level: number;
  xp: number;
  hp: number;
  maxHp: number;
  credits: number;
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
}

export interface ToastMessage {
  id: number;
  message: string;
}

export interface GameState {
  gameMode: GameMode;
  player: PlayerState;
  otherPlayers: Record<string, { x: number; y: number; name: string; spriteId: string }>;
  pathQueue: Point[];
  currentMapId: string;
  mapEntities: MapEntity[];
  toast: ToastMessage | null;
  activeDialog: { npcId: string, text: string } | null;
  setGameMode: (mode: GameMode) => void;
  setActiveDialog: (dialog: { npcId: string, text: string } | null) => void;
  acceptQuest: (questId: string) => void;
  completeQuest: (questId: string) => void;
  setOtherPlayers: (players: Record<string, { x: number; y: number; name: string; spriteId: string }>) => void;
  updateOtherPlayer: (socketId: string, data: { x: number; y: number; name?: string; spriteId?: string }) => void;
  removeOtherPlayer: (socketId: string) => void;
  activeBattle: any;
  setActiveBattle: (battleData: any) => void;
  emitSocketEvent?: (event: string, data: any) => void;
  setEmitSocketEvent: (emitter: (event: string, data: any) => void) => void;
  setPlayerPosition: (pos: Point) => void;
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
      gameMode: 'EXPLORING',
      player: {
        position: { x: 15, y: 16 },
        level: 1,
        xp: 0,
        hp: 100,
        maxHp: 100,
        credits: 500,
        activeQuests: {},
        completedQuests: [],
        inventory: {},
        skills: INITIAL_SKILLS,
        equipment: { head: null, chest: null, legs: null, weapon: null },
        combatStyle: 'MELEE',
        activeDaemonId: null,
        saintRank: 'Rookie',
        caughtDaemons: [],
        assignedBeasts: { furnace: null, farm: null, fishing_hut: null, lumber_mill: null, quarry: null },
        lastBaseCollection: Date.now()
      },
      otherPlayers: {},
      activeBattle: null,
      pathQueue: [],
      currentMapId: 'SAINTS_VILLAGE',
      mapEntities: [
        { id: 'npc-1', type: 'NPC', spriteKey: 'villager_1', position: { x: 12, y: 13 }, isMoving: false, facing: 'DOWN' },
        { id: 'anim-1', type: 'ANIMAL', spriteKey: 'chicken', position: { x: 14, y: 18 }, isMoving: false, facing: 'LEFT' },
        { id: 'anim-2', type: 'ANIMAL', spriteKey: 'cow', position: { x: 8, y: 14 }, isMoving: false, facing: 'RIGHT' }
      ],
      toast: null,
      activeDialog: null,

      setGameMode: (mode) => set((state) => { state.gameMode = mode; }),
      setActiveDialog: (dialog) => set((state) => { state.activeDialog = dialog; }),
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
          state.otherPlayers[socketId] = { x: data.x, y: data.y, name: data.name || 'Unknown', spriteId: data.spriteId || 'hero_male' };
        } else {
          state.otherPlayers[socketId].x = data.x;
          state.otherPlayers[socketId].y = data.y;
          if (data.name) state.otherPlayers[socketId].name = data.name;
          if (data.spriteId) state.otherPlayers[socketId].spriteId = data.spriteId;
        }
      }),
      removeOtherPlayer: (socketId) => set((state) => {
        delete state.otherPlayers[socketId];
      }),
      setActiveBattle: (battleData) => set((state) => {
        state.activeBattle = battleData;
      }),
      setEmitSocketEvent: (emitter) => set((state) => {
        state.emitSocketEvent = emitter;
      }),
      setPlayerPosition: (pos) => set((state) => { 
        state.player.position = pos; 
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
      })
    }))
  )
);
