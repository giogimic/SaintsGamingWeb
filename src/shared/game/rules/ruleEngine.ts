/**
 * Saints Gaming — Shared Rule, Condition & Action Engine (Bible 16 / Studio Master Plan Phase 1B)
 *
 * Provides a unified, composable, data-driven rule language:
 * Condition -> Requirement -> Action
 * Reusable across Quests, NPCs, Dungeons, World Events, Professions, and Logic Tiles.
 */
import type { RuleTracePayload } from '../../net/protocol';
import {
  type SimulationMultipliers,
  scaleSimulationXp,
  scaleSimulationGold,
} from '../simulation/simulationModifiers';

export type ComparisonOperator = 'EQ' | 'NEQ' | 'GT' | 'GTE' | 'LT' | 'LTE' | 'IN' | 'NOT_IN';

export type SingleConditionDefinition =
  | {
      kind: 'PLAYER_ITEM';
      itemId: string;
      amount: number;
      operator?: 'GTE' | 'LTE' | 'EQ';
    }
  | {
      kind: 'PLAYER_GOLD';
      amount: number;
      operator?: 'GTE' | 'LTE' | 'EQ';
    }
  | {
      kind: 'PLAYER_LEVEL';
      level: number;
      operator?: ComparisonOperator;
    }
  | {
      kind: 'PLAYER_SKILL_LEVEL';
      skillId: string;
      level: number;
      operator?: ComparisonOperator;
    }
  | {
      kind: 'QUEST_STATE';
      questId: string;
      state: 'NOT_STARTED' | 'ACTIVE' | 'COMPLETED';
      stage?: number;
    }
  | {
      kind: 'REPUTATION';
      factionId: string;
      value: number;
      operator?: ComparisonOperator;
    }
  | {
      kind: 'WORLD_STATE';
      key: string;
      value: any;
      operator?: 'EQ' | 'NEQ';
    }
  | {
      kind: 'TIME_OF_DAY';
      timeSlot: 'DAY' | 'DUSK' | 'NIGHT' | 'DAWN';
    }
  | {
      kind: 'CUSTOM';
      predicateKey: string;
      expectedValue: any;
    };

export type CompoundConditionDefinition = {
  kind: 'COMPOUND';
  logic: 'AND' | 'OR' | 'NOT';
  conditions: ConditionDefinition[];
};

export type ConditionDefinition = SingleConditionDefinition | CompoundConditionDefinition;

export type ActionDefinition =
  | {
      kind: 'GIVE_ITEM';
      itemId: string;
      quantity: number;
    }
  | {
      kind: 'REMOVE_ITEM';
      itemId: string;
      quantity: number;
    }
  | {
      kind: 'GIVE_GOLD';
      amount: number;
    }
  | {
      kind: 'REMOVE_GOLD';
      amount: number;
    }
  | {
      kind: 'GRANT_XP';
      amount: number;
      skillId?: string;
    }
  | {
      kind: 'SET_QUEST_STATE';
      questId: string;
      action: 'START' | 'ADVANCE_STAGE' | 'COMPLETE';
      stage?: number;
    }
  | {
      kind: 'MODIFY_REPUTATION';
      factionId: string;
      delta: number;
    }
  | {
      kind: 'TELEPORT_PLAYER';
      mapId: string;
      x: number;
      y: number;
    }
  | {
      kind: 'SPAWN_ENTITY';
      entityId: string;
      entityType: 'NPC' | 'MONSTER' | 'CREATURE' | 'OBJECT';
      mapId: string;
      x: number;
      y: number;
    }
  | {
      kind: 'TRIGGER_WORLD_EVENT';
      eventId: string;
      durationSeconds?: number;
    }
  | {
      kind: 'SET_WORLD_STATE';
      key: string;
      value: any;
    }
  | {
      kind: 'SEND_NOTIFICATION';
      title: string;
      message: string;
      type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
    };

export interface RulePlayerContext {
  id?: string;
  level?: number;
  gold?: number;
  items?: Record<string, number>;
  skills?: Record<string, number>;
  reputation?: Record<string, number>;
  quests?: Record<string, { stage: number; isCompleted: boolean; isActive: boolean }>;
}

export interface RuleEvaluationContext {
  player?: RulePlayerContext;
  worldState?: Record<string, any>;
  timeSlot?: 'DAY' | 'DUSK' | 'NIGHT' | 'DAWN';
  customPredicates?: Record<string, any>;
  tracer?: (trace: RuleTracePayload) => void;
  ruleId?: string;
  simulationMultipliers?: SimulationMultipliers;
}

export interface RuleDefinition {
  id: string;
  name: string;
  description?: string;
  category?: string;
  condition: ConditionDefinition;
  actions: ActionDefinition[];
  isActive?: boolean;
}

export interface ActionResult {
  kind: string;
  success: boolean;
  message?: string;
  appliedData?: any;
}

function compareNumbers(actual: number, expected: number, op: ComparisonOperator = 'GTE'): boolean {
  switch (op) {
    case 'EQ':
      return actual === expected;
    case 'NEQ':
      return actual !== expected;
    case 'GT':
      return actual > expected;
    case 'GTE':
      return actual >= expected;
    case 'LT':
      return actual < expected;
    case 'LTE':
      return actual <= expected;
    default:
      return actual >= expected;
  }
}

/**
 * Evaluates a condition against a contextual game state.
 */
export function evaluateCondition(
  condition: ConditionDefinition,
  ctx: RuleEvaluationContext
): boolean {
  if (!condition) return true;

  if (condition.kind === 'COMPOUND') {
    const { logic, conditions } = condition;
    if (!conditions || conditions.length === 0) return true;

    if (logic === 'AND') {
      return conditions.every((sub) => evaluateCondition(sub, ctx));
    }
    if (logic === 'OR') {
      return conditions.some((sub) => evaluateCondition(sub, ctx));
    }
    if (logic === 'NOT') {
      return !evaluateCondition(conditions[0], ctx);
    }
    return true;
  }

  const player = ctx.player || {};

  let passed = false;
  let expected: any = undefined;
  let actual: any = undefined;

  switch (condition.kind) {
    case 'PLAYER_ITEM': {
      const held = (player.items && player.items[condition.itemId]) || 0;
      const op = condition.operator || 'GTE';
      expected = condition.amount;
      actual = held;
      passed = compareNumbers(held, condition.amount, op);
      break;
    }

    case 'PLAYER_GOLD': {
      const gold = player.gold || 0;
      const op = condition.operator || 'GTE';
      expected = condition.amount;
      actual = gold;
      passed = compareNumbers(gold, condition.amount, op);
      break;
    }

    case 'PLAYER_LEVEL': {
      const level = player.level || 1;
      expected = condition.level;
      actual = level;
      passed = compareNumbers(level, condition.level, condition.operator || 'GTE');
      break;
    }

    case 'PLAYER_SKILL_LEVEL': {
      const skillLevel = (player.skills && player.skills[condition.skillId]) || 1;
      expected = condition.level;
      actual = skillLevel;
      passed = compareNumbers(skillLevel, condition.level, condition.operator || 'GTE');
      break;
    }

    case 'QUEST_STATE': {
      const q = player.quests && player.quests[condition.questId];
      expected = condition.state;
      if (condition.state === 'NOT_STARTED') {
        passed = !q || (!q.isActive && !q.isCompleted);
        actual = passed ? 'NOT_STARTED' : q?.isCompleted ? 'COMPLETED' : 'ACTIVE';
      } else if (condition.state === 'ACTIVE') {
        if (!q || !q.isActive || q.isCompleted) {
          passed = false;
          actual = !q ? 'NOT_STARTED' : 'COMPLETED';
        } else if (typeof condition.stage === 'number') {
          passed = q.stage === condition.stage;
          actual = q.stage;
        } else {
          passed = true;
          actual = 'ACTIVE';
        }
      } else if (condition.state === 'COMPLETED') {
        passed = Boolean(q && q.isCompleted);
        actual = passed ? 'COMPLETED' : q?.isActive ? 'ACTIVE' : 'NOT_STARTED';
      }
      break;
    }

    case 'REPUTATION': {
      const rep = (player.reputation && player.reputation[condition.factionId]) || 0;
      expected = condition.value;
      actual = rep;
      passed = compareNumbers(rep, condition.value, condition.operator || 'GTE');
      break;
    }

    case 'WORLD_STATE': {
      const val = ctx.worldState ? ctx.worldState[condition.key] : undefined;
      const op = condition.operator || 'EQ';
      expected = condition.value;
      actual = val;
      if (op === 'NEQ') {
        passed = val !== condition.value;
      } else {
        passed = val === condition.value;
      }
      break;
    }

    case 'TIME_OF_DAY': {
      expected = condition.timeSlot;
      actual = ctx.timeSlot;
      passed = ctx.timeSlot === condition.timeSlot;
      break;
    }

    case 'CUSTOM': {
      const customVal = ctx.customPredicates ? ctx.customPredicates[condition.predicateKey] : undefined;
      expected = condition.expectedValue;
      actual = customVal;
      passed = customVal === condition.expectedValue;
      break;
    }

    default:
      passed = true;
      break;
  }

  if (ctx.tracer && ctx.ruleId) {
    ctx.tracer({
      ruleId: ctx.ruleId,
      nodeType: condition.kind,
      expected,
      actual,
      passed,
      timestamp: Date.now()
    });
  }

  return passed;
}

/**
 * Executes an action on a mutable or recorded execution context.
 */
export function executeAction(
  action: ActionDefinition,
  ctx: RuleEvaluationContext
): ActionResult {
  const player = ctx.player;

  switch (action.kind) {
    case 'GIVE_ITEM': {
      if (player) {
        if (!player.items) player.items = {};
        player.items[action.itemId] = (player.items[action.itemId] || 0) + action.quantity;
      }
      return { kind: action.kind, success: true, appliedData: { itemId: action.itemId, quantity: action.quantity } };
    }

    case 'REMOVE_ITEM': {
      if (player && player.items) {
        const current = player.items[action.itemId] || 0;
        player.items[action.itemId] = Math.max(0, current - action.quantity);
      }
      return { kind: action.kind, success: true, appliedData: { itemId: action.itemId, quantity: action.quantity } };
    }

    case 'GIVE_GOLD': {
      const scaledAmount = ctx.simulationMultipliers
        ? scaleSimulationGold(action.amount, ctx.simulationMultipliers)
        : action.amount;
      if (player) {
        player.gold = (player.gold || 0) + scaledAmount;
      }
      return { kind: action.kind, success: true, appliedData: { amount: scaledAmount, baseAmount: action.amount } };
    }

    case 'REMOVE_GOLD': {
      if (player) {
        player.gold = Math.max(0, (player.gold || 0) - action.amount);
      }
      return { kind: action.kind, success: true, appliedData: { amount: action.amount } };
    }

    case 'GRANT_XP': {
      const scaledAmount = ctx.simulationMultipliers
        ? scaleSimulationXp(action.amount, ctx.simulationMultipliers)
        : action.amount;
      if (player) {
        if (action.skillId) {
          if (!player.skills) player.skills = {};
          player.skills[action.skillId] = (player.skills[action.skillId] || 1) + Math.floor(scaledAmount / 100);
        } else {
          player.level = (player.level || 1) + Math.floor(scaledAmount / 500);
        }
      }
      return { kind: action.kind, success: true, appliedData: { amount: scaledAmount, baseAmount: action.amount, skillId: action.skillId } };
    }

    case 'SET_QUEST_STATE': {
      if (player) {
        if (!player.quests) player.quests = {};
        const existing = player.quests[action.questId] || { stage: 1, isCompleted: false, isActive: false };
        if (action.action === 'START') {
          existing.isActive = true;
          existing.stage = action.stage || 1;
          existing.isCompleted = false;
        } else if (action.action === 'ADVANCE_STAGE') {
          existing.stage = (existing.stage || 1) + 1;
        } else if (action.action === 'COMPLETE') {
          existing.isActive = false;
          existing.isCompleted = true;
        }
        player.quests[action.questId] = existing;
      }
      return { kind: action.kind, success: true, appliedData: { questId: action.questId, action: action.action } };
    }

    case 'MODIFY_REPUTATION': {
      if (player) {
        if (!player.reputation) player.reputation = {};
        player.reputation[action.factionId] = (player.reputation[action.factionId] || 0) + action.delta;
      }
      return { kind: action.kind, success: true, appliedData: { factionId: action.factionId, delta: action.delta } };
    }

    case 'SET_WORLD_STATE': {
      if (ctx.worldState) {
        ctx.worldState[action.key] = action.value;
      }
      return { kind: action.kind, success: true, appliedData: { key: action.key, value: action.value } };
    }

    case 'TELEPORT_PLAYER':
    case 'SPAWN_ENTITY':
    case 'TRIGGER_WORLD_EVENT':
    case 'SEND_NOTIFICATION': {
      return { kind: action.kind, success: true, appliedData: action };
    }

    default:
      return { kind: 'UNKNOWN', success: false, message: 'Unrecognized action kind' };
  }
}

/**
 * Evaluates a rule and conditionally applies its actions.
 */
export function evaluateAndExecuteRule(
  rule: RuleDefinition,
  ctx: RuleEvaluationContext
): {
  passed: boolean;
  executed: boolean;
  results: ActionResult[];
} {
  if (rule.isActive === false) {
    return { passed: false, executed: false, results: [] };
  }

  ctx.ruleId = rule.id;

  const passed = evaluateCondition(rule.condition, ctx);
  if (!passed) {
    if (ctx.tracer) {
      ctx.tracer({
        ruleId: rule.id,
        nodeType: 'RULE_EVALUATION',
        expected: 'PASSED',
        actual: 'FAILED',
        passed: false,
        timestamp: Date.now()
      });
    }
    return { passed: false, executed: false, results: [] };
  }

  if (ctx.tracer) {
    ctx.tracer({
      ruleId: rule.id,
      nodeType: 'RULE_EVALUATION',
      expected: 'PASSED',
      actual: 'PASSED',
      passed: true,
      timestamp: Date.now()
    });
  }

  const results = rule.actions.map((act) => executeAction(act, ctx));
  return { passed: true, executed: true, results };
}
