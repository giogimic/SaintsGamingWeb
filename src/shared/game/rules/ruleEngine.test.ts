import { describe, it, expect } from 'vitest';
import {
  evaluateCondition,
  executeAction,
  evaluateAndExecuteRule,
  ConditionDefinition,
  ActionDefinition,
  RuleEvaluationContext,
  RuleDefinition,
} from './ruleEngine';

describe('Shared RuleEngine (Phase 1B)', () => {
  describe('evaluateCondition', () => {
    it('evaluates PLAYER_ITEM conditions correctly', () => {
      const condition: ConditionDefinition = {
        kind: 'PLAYER_ITEM',
        itemId: 'patch_kit',
        amount: 5,
        operator: 'GTE',
      };

      const ctxPass: RuleEvaluationContext = {
        player: { items: { patch_kit: 10 } },
      };
      const ctxFail: RuleEvaluationContext = {
        player: { items: { patch_kit: 2 } },
      };

      expect(evaluateCondition(condition, ctxPass)).toBe(true);
      expect(evaluateCondition(condition, ctxFail)).toBe(false);
    });

    it('evaluates PLAYER_GOLD conditions correctly', () => {
      const condition: ConditionDefinition = {
        kind: 'PLAYER_GOLD',
        amount: 500,
        operator: 'GTE',
      };

      expect(evaluateCondition(condition, { player: { gold: 600 } })).toBe(true);
      expect(evaluateCondition(condition, { player: { gold: 400 } })).toBe(false);
    });

    it('evaluates QUEST_STATE conditions correctly', () => {
      const condActive: ConditionDefinition = {
        kind: 'QUEST_STATE',
        questId: 'quest_1',
        state: 'ACTIVE',
        stage: 2,
      };

      expect(
        evaluateCondition(condActive, {
          player: {
            quests: {
              quest_1: { stage: 2, isActive: true, isCompleted: false },
            },
          },
        })
      ).toBe(true);

      expect(
        evaluateCondition(condActive, {
          player: {
            quests: {
              quest_1: { stage: 1, isActive: true, isCompleted: false },
            },
          },
        })
      ).toBe(false);
    });

    it('evaluates COMPOUND logic (AND, OR, NOT)', () => {
      const andCondition: ConditionDefinition = {
        kind: 'COMPOUND',
        logic: 'AND',
        conditions: [
          { kind: 'PLAYER_LEVEL', level: 10, operator: 'GTE' },
          { kind: 'PLAYER_GOLD', amount: 100, operator: 'GTE' },
        ],
      };

      expect(evaluateCondition(andCondition, { player: { level: 12, gold: 150 } })).toBe(true);
      expect(evaluateCondition(andCondition, { player: { level: 8, gold: 150 } })).toBe(false);

      const orCondition: ConditionDefinition = {
        kind: 'COMPOUND',
        logic: 'OR',
        conditions: [
          { kind: 'PLAYER_LEVEL', level: 20, operator: 'GTE' },
          { kind: 'PLAYER_GOLD', amount: 1000, operator: 'GTE' },
        ],
      };

      expect(evaluateCondition(orCondition, { player: { level: 5, gold: 1500 } })).toBe(true);
      expect(evaluateCondition(orCondition, { player: { level: 5, gold: 500 } })).toBe(false);

      const notCondition: ConditionDefinition = {
        kind: 'COMPOUND',
        logic: 'NOT',
        conditions: [{ kind: 'TIME_OF_DAY', timeSlot: 'NIGHT' }],
      };

      expect(evaluateCondition(notCondition, { timeSlot: 'DAY' })).toBe(true);
      expect(evaluateCondition(notCondition, { timeSlot: 'NIGHT' })).toBe(false);
    });
  });

  describe('executeAction', () => {
    it('executes GIVE_ITEM and REMOVE_ITEM actions', () => {
      const ctx: RuleEvaluationContext = {
        player: { items: { herb: 5 } },
      };

      executeAction({ kind: 'GIVE_ITEM', itemId: 'potion', quantity: 2 }, ctx);
      expect(ctx.player?.items?.potion).toBe(2);

      executeAction({ kind: 'REMOVE_ITEM', itemId: 'herb', quantity: 3 }, ctx);
      expect(ctx.player?.items?.herb).toBe(2);
    });

    it('executes GIVE_GOLD and REMOVE_GOLD actions', () => {
      const ctx: RuleEvaluationContext = {
        player: { gold: 100 },
      };

      executeAction({ kind: 'GIVE_GOLD', amount: 50 }, ctx);
      expect(ctx.player?.gold).toBe(150);

      executeAction({ kind: 'REMOVE_GOLD', amount: 75 }, ctx);
      expect(ctx.player?.gold).toBe(75);
    });

    it('executes SET_QUEST_STATE actions', () => {
      const ctx: RuleEvaluationContext = {
        player: { quests: {} },
      };

      executeAction({ kind: 'SET_QUEST_STATE', questId: 'q1', action: 'START', stage: 1 }, ctx);
      expect(ctx.player?.quests?.q1.isActive).toBe(true);
      expect(ctx.player?.quests?.q1.stage).toBe(1);

      executeAction({ kind: 'SET_QUEST_STATE', questId: 'q1', action: 'ADVANCE_STAGE' }, ctx);
      expect(ctx.player?.quests?.q1.stage).toBe(2);

      executeAction({ kind: 'SET_QUEST_STATE', questId: 'q1', action: 'COMPLETE' }, ctx);
      expect(ctx.player?.quests?.q1.isCompleted).toBe(true);
      expect(ctx.player?.quests?.q1.isActive).toBe(false);
    });
  });

  describe('evaluateAndExecuteRule', () => {
    it('runs actions only when conditions pass', () => {
      const rule: RuleDefinition = {
        id: 'rule_reward_1',
        name: 'Herbalist Reward',
        condition: {
          kind: 'PLAYER_ITEM',
          itemId: 'rare_herb',
          amount: 3,
          operator: 'GTE',
        },
        actions: [
          { kind: 'REMOVE_ITEM', itemId: 'rare_herb', quantity: 3 },
          { kind: 'GIVE_GOLD', amount: 300 },
        ],
      };

      const ctxFail: RuleEvaluationContext = {
        player: { items: { rare_herb: 1 }, gold: 50 },
      };

      const resFail = evaluateAndExecuteRule(rule, ctxFail);
      expect(resFail.passed).toBe(false);
      expect(resFail.executed).toBe(false);
      expect(ctxFail.player?.gold).toBe(50);

      const ctxPass: RuleEvaluationContext = {
        player: { items: { rare_herb: 5 }, gold: 50 },
      };

      const resPass = evaluateAndExecuteRule(rule, ctxPass);
      expect(resPass.passed).toBe(true);
      expect(resPass.executed).toBe(true);
      expect(ctxPass.player?.items?.rare_herb).toBe(2);
      expect(ctxPass.player?.gold).toBe(350);
    });
  });
});
