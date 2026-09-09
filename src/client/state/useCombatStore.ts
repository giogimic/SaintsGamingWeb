/**
 * Combat Store — Active battle, combat target, cooldowns.
 *
 * Handles both turn-based creature encounters (Saints Buddy Battles)
 * and real-time MMO combat (Hero Battles).
 */
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

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
  phase: 'WAITING_FOR_INPUT' | 'RESOLUTION' | 'TURN_END';
  isTrainer?: boolean;
  trainerNpcId?: string;
  trainerName?: string;
  wildCreature: BattleCreature;
  playerCreature: BattleCreature;
  log: string[];
}

export interface CombatTarget {
  entityId: string;
  name: string;
  hp: number;
  maxHp: number;
  isCasting?: boolean;
  castName?: string;
  behavior?: string;
}

export interface CombatState {
  activeBattle: BattleState | null;
  combatTarget: CombatTarget | null;
  cooldowns: Record<string, number>;
  activeEnemies: Record<string, any>;

  setActiveBattle: (battle: BattleState | null) => void;
  setCombatTarget: (target: CombatTarget | null) => void;
  setCooldown: (abilityId: string, timestamp: number) => void;
  setActiveEnemies: (enemies: Record<string, any>) => void;
}

export const useCombatStore = create<CombatState>()(
  subscribeWithSelector(
    immer((set) => ({
      activeBattle: null,
      combatTarget: null,
      cooldowns: {},
      activeEnemies: {},

      setActiveBattle: (battle) => set((s) => { s.activeBattle = battle; }),

      setCombatTarget: (target) => set((s) => { s.combatTarget = target; }),

      setCooldown: (abilityId, timestamp) => set((s) => { s.cooldowns[abilityId] = timestamp; }),

      setActiveEnemies: (enemies) => set((s) => { s.activeEnemies = enemies; }),
    }))
  )
);
