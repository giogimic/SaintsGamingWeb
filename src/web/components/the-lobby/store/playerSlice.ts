import type { StateCreator } from 'zustand';
import type { GameState } from './types';
import { DEFAULT_PRESET_MODERN, BUILTIN_HUD_PRESETS, ensureCompletePreset } from '../hud/default-presets';
import { DEFAULT_HUD_THEME_ID } from '../hud/hud-themes';
import { HUD_PRESET_STORAGE_KEY, CUSTOM_PRESETS_STORAGE_KEY, HUD_CONFIG_STORAGE_KEY, MOBILE_CONTROL_STORAGE_KEY, DEFAULT_HUD_CONFIG } from './types';
import { INITIAL_SKILLS } from './types';

type GameSlice<T> = StateCreator<GameState, [['zustand/immer', never]], [], T>;

export const createPlayerSlice: GameSlice<Pick<GameState, "player" | "activeBattle" | "activeEnemies" | "combatTarget" | "cooldowns" | "setCombatTarget" | "acceptQuest" | "completeQuest" | "setActiveBattle" | "setActiveEnemies" | "setCooldown" | "refreshQuestsCounter" | "triggerQuestRefresh" | "setPlayerPosition" | "hydratePlayer" | "catchDaemon" | "modifyHp" | "modifyStamina" | "gainXp" | "modifyCredits" | "modifyInventory" | "gainSkillXp" | "equipItem" | "setCombatStyle" | "assignBeast" | "collectBaseResources" | "addCreatureToParty" | "removeCreatureFromParty" | "healCreature" | "addCreatureItem" | "removeCreatureItem" | "recordCreatureCapture" | "deductAbilityCooldown" | "evolveCreature">> = (set, get) => ({
player: {
        assetProfileId: 'adventurer',
        position: { x: 30, y: 30 },
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
        isPartyLeader: false,
        // Abilities
        unlockedAbilities: [],
        equippedAbilities: []
      },

activeBattle: null,

activeEnemies: {},

combatTarget: null,

cooldowns: {},

setCombatTarget: (target) => set((state) => {
        state.combatTarget = target;
      }),

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

setActiveBattle: (battleData) => set((state) => {
        state.activeBattle = battleData;
      }),

setActiveEnemies: (enemies) => set((state) => {
        state.activeEnemies = enemies;
      }),

setCooldown: (abilityId, timestamp) => set((state) => {
        state.cooldowns[abilityId] = timestamp;
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

hydratePlayer: (data) =>
        set((state) => {
          if (data.name) state.player.name = data.name;
          if (data.assetProfileId) state.player.assetProfileId = data.assetProfileId;
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

modifyHp: (amount) =>
        set((state) => {
          state.player.hp = Math.max(0, Math.min(state.player.maxHp, state.player.hp + amount));
        }),

modifyStamina: (amount) =>
        set((state) => {
          state.player.stamina = Math.max(0, Math.min(state.player.maxStamina, state.player.stamina + amount));
          
          if (state.player.stamina === 0) {
            state.player.isExhausted = true;
          } else if (state.player.isExhausted && state.player.stamina >= state.player.maxStamina * 0.25) {
            state.player.isExhausted = false; // Recovered enough to sprint again
          }
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
      })
});
