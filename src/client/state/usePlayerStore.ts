/**
 * Player Store — Character stats, inventory, equipment, skills, quests.
 *
 * Only the player's own data — other players live in useMultiplayerStore.
 * High-frequency position updates use refs in the game loop, not this store.
 */
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { buildInitialSkills } from '@/shared/game/skillTypings';
import type { Direction, Point2D } from '../net/protocol.d';

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

export interface PlayerCustomization {
  skinTone: string;
  hairColor: string;
  shirtColor: string;
  pantsColor: string;
}

export interface PlayerData {
  accountId?: string;
  name?: string;
  assetProfileId?: string;
  position: Point2D;
  direction: Direction;
  isMoving: boolean;
  level: number;
  xp: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  stamina: number;
  maxStamina: number;
  isExhausted: boolean;
  credits: number;
  currency: { copper: number; silver: number; gold: number; platinum: number };
  activeQuests: Record<string, any>;
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
  customization?: PlayerCustomization;
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
  creatureParty: CreaturePartyMember[];
  creatureInventory: Record<string, number>;
  creaturesCaught: string[];
  unlockedAbilities: string[];
  equippedAbilities: string[];
}

const INITIAL_SKILLS: Record<string, SkillData> = buildInitialSkills();

export interface PlayerState {
  player: PlayerData;

  // Position
  setPlayerPosition: (pos: Point2D, direction?: Direction, isMoving?: boolean) => void;

  // Hydration
  hydratePlayer: (data: Partial<PlayerData>) => void;

  // Stats
  modifyHp: (amount: number) => void;
  modifyStamina: (amount: number) => void;
  gainXp: (amount: number) => void;
  modifyCredits: (amount: number) => void;

  // Inventory & Equipment
  modifyInventory: (itemId: string, amount: number) => void;
  equipItem: (slot: string, itemId: string | null) => void;
  setCombatStyle: (style: 'MELEE' | 'RANGED' | 'MAGIC') => void;

  // Skills
  gainSkillXp: (skillName: string, amount: number) => void;

  // Quests
  acceptQuest: (questId: string) => void;
  completeQuest: (questId: string) => void;
  refreshQuestsCounter: number;
  triggerQuestRefresh: () => void;

  // Creatures
  catchDaemon: (daemonId: string) => void;
  addCreatureToParty: (member: CreaturePartyMember) => void;
  removeCreatureFromParty: (creatureId: string) => void;
  healCreature: (creatureId: string, amount: number) => void;
  addCreatureItem: (itemSlug: string, amount: number) => void;
  removeCreatureItem: (itemSlug: string, amount: number) => void;
  recordCreatureCapture: (speciesSlug: string) => void;
  deductAbilityCooldown: (creatureId: string, abilityIndex: number) => void;
  evolveCreature: (creatureId: string, newSpeciesSlug: string, newNickname?: string) => void;

  // Base
  assignBeast: (facility: 'furnace' | 'farm' | 'fishing_hut' | 'lumber_mill' | 'quarry', beastId: string | null) => void;
  collectBaseResources: () => void;
}

export const usePlayerStore = create<PlayerState>()(
  subscribeWithSelector(
    immer((set) => ({
      player: {
        assetProfileId: 'adventurer',
        position: { x: 30, y: 30 },
        direction: 'down' as Direction,
        isMoving: false,
        level: 1,
        xp: 0,
        hp: 100,
        maxHp: 100,
        mp: 100,
        maxMp: 100,
        stamina: 100,
        maxStamina: 100,
        isExhausted: false,
        credits: 500,
        currency: { copper: 50000, silver: 0, gold: 0, platinum: 0 },
        activeQuests: {},
        completedQuests: [],
        inventory: {},
        skills: INITIAL_SKILLS,
        equipment: { head: null, chest: null, legs: null, weapon: null },
        customization: { skinTone: '#fcd34d', hairColor: '#3b82f6', shirtColor: '#10b981', pantsColor: '#18181b' },
        combatStyle: 'MELEE' as const,
        activeDaemonId: null,
        saintRank: 'Rookie',
        caughtDaemons: [],
        assignedBeasts: { furnace: null, farm: null, fishing_hut: null, lumber_mill: null, quarry: null },
        lastBaseCollection: Date.now(),
        creatureParty: [],
        creatureInventory: {},
        creaturesCaught: [],
        unlockedAbilities: [],
        equippedAbilities: [],
      },

      setPlayerPosition: (pos, direction, isMoving) => set((s) => {
        s.player.position = pos;
        if (direction !== undefined) s.player.direction = direction;
        if (isMoving !== undefined) s.player.isMoving = isMoving;
      }),

      hydratePlayer: (data) => set((s) => {
        Object.assign(s.player, data);
      }),

      modifyHp: (amount) => set((s) => {
        s.player.hp = Math.max(0, Math.min(s.player.maxHp, s.player.hp + amount));
      }),

      modifyStamina: (amount) => set((s) => {
        const newVal = s.player.stamina + amount;
        s.player.stamina = Math.max(0, Math.min(s.player.maxStamina, newVal));
        s.player.isExhausted = newVal <= 0;
      }),

      gainXp: (amount) => set((s) => {
        s.player.xp += amount;
        // Level up check (simple: 100xp per level)
        const newLevel = Math.floor(s.player.xp / 100) + 1;
        if (newLevel > s.player.level) {
          s.player.level = newLevel;
          s.player.maxHp += 10;
          s.player.hp = s.player.maxHp;
        }
      }),

      modifyCredits: (amount) => set((s) => {
        s.player.credits = Math.max(0, s.player.credits + amount);
      }),

      modifyInventory: (itemId, amount) => set((s) => {
        const current = s.player.inventory[itemId] || 0;
        const newVal = current + amount;
        if (newVal <= 0) {
          delete s.player.inventory[itemId];
        } else {
          s.player.inventory[itemId] = newVal;
        }
      }),

      equipItem: (slot, itemId) => set((s) => {
        s.player.equipment[slot] = itemId;
      }),

      setCombatStyle: (style) => set((s) => { s.player.combatStyle = style; }),

      gainSkillXp: (skillName, amount) => set((s) => {
        if (!s.player.skills[skillName]) {
          s.player.skills[skillName] = { level: 1, xp: 0 };
        }
        s.player.skills[skillName].xp += amount;
        const newLevel = Math.floor(s.player.skills[skillName].xp / 100) + 1;
        if (newLevel > s.player.skills[skillName].level) {
          s.player.skills[skillName].level = newLevel;
        }
      }),

      acceptQuest: (questId) => set((s) => {
        s.player.activeQuests[questId] = { started: Date.now(), progress: 0 };
      }),

      completeQuest: (questId) => set((s) => {
        delete s.player.activeQuests[questId];
        if (!s.player.completedQuests.includes(questId)) {
          s.player.completedQuests.push(questId);
        }
      }),

      refreshQuestsCounter: 0,
      triggerQuestRefresh: () => set((s) => { s.refreshQuestsCounter += 1; }),

      catchDaemon: (daemonId) => set((s) => {
        if (!s.player.caughtDaemons.includes(daemonId)) {
          s.player.caughtDaemons.push(daemonId);
        }
      }),

      addCreatureToParty: (member) => set((s) => {
        if (!s.player.creatureParty.some((m) => m.id === member.id)) {
          s.player.creatureParty.push(member);
        }
      }),

      removeCreatureFromParty: (creatureId) => set((s) => {
        s.player.creatureParty = s.player.creatureParty.filter((m) => m.id !== creatureId);
      }),

      healCreature: (creatureId, amount) => set((s) => {
        const c = s.player.creatureParty.find((m) => m.id === creatureId);
        if (c) c.currentHp = Math.min(c.maxHp, c.currentHp + amount);
      }),

      addCreatureItem: (itemSlug, amount) => set((s) => {
        s.player.creatureInventory[itemSlug] = (s.player.creatureInventory[itemSlug] || 0) + amount;
      }),

      removeCreatureItem: (itemSlug, amount) => set((s) => {
        const cur = s.player.creatureInventory[itemSlug] || 0;
        if (cur <= amount) delete s.player.creatureInventory[itemSlug];
        else s.player.creatureInventory[itemSlug] = cur - amount;
      }),

      recordCreatureCapture: (speciesSlug) => set((s) => {
        if (!s.player.creaturesCaught.includes(speciesSlug)) {
          s.player.creaturesCaught.push(speciesSlug);
        }
      }),

      deductAbilityCooldown: (creatureId, abilityIndex) => set((s) => {
        const c = s.player.creatureParty.find((m) => m.id === creatureId);
        if (c?.abilities?.[abilityIndex]) {
          c.abilities[abilityIndex].currentCooldown = Math.max(0, c.abilities[abilityIndex].currentCooldown - 1);
        }
      }),

      evolveCreature: (creatureId, newSpeciesSlug, newNickname) => set((s) => {
        const c = s.player.creatureParty.find((m) => m.id === creatureId);
        if (c) {
          c.speciesSlug = newSpeciesSlug;
          if (newNickname) c.nickname = newNickname;
        }
      }),

      assignBeast: (facility, beastId) => set((s) => {
        s.player.assignedBeasts[facility] = beastId;
      }),

      collectBaseResources: () => set((s) => {
        s.player.lastBaseCollection = Date.now();
      }),
    }))
  )
);
