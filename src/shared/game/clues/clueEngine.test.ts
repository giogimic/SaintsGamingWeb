import { describe, it, expect } from 'vitest';
import {
  createClueScroll,
  evaluateDigAction,
  evaluateNpcRiddleAction,
  ClueStep,
} from './clueEngine';

describe('Treasure Trail Clue Step & Coordinate Evaluator (Bible 18 & 25)', () => {
  const step1: ClueStep = {
    id: 'step_1',
    tier: 'MEDIUM',
    type: 'COORDINATE_DIG',
    prompt: 'Dig 04 degrees North, 12 degrees East in the Meadows.',
    targetMapId: 'WILD_MEADOWS',
    targetX: 25,
    targetY: 30,
    targetRadius: 2.0,
  };

  const step2: ClueStep = {
    id: 'step_2',
    tier: 'MEDIUM',
    type: 'NPC_RIDDLE',
    prompt: 'Speak to the Wise Sage in the sanctuary.',
    targetMapId: 'DEMO_SANDBOX',
    targetNpcId: 'npc_wise_sage',
    riddleAnswer: '42',
  };

  it('evaluates coordinate dig progression and yields a reward casket on final step', () => {
    // 1-step clue to test completion
    const clue = createClueScroll('HARD', step1, 1);

    // Missing spade
    const noSpade = evaluateDigAction(clue, 'WILD_MEADOWS', 25, 30, false);
    expect(noSpade.success).toBe(false);
    expect(noSpade.reason).toContain('need a spade');

    // Wrong map
    const wrongMap = evaluateDigAction(clue, 'OTHER_MAP', 25, 30, true);
    expect(wrongMap.success).toBe(false);

    // Correct dig location with spade
    const successDig = evaluateDigAction(clue, 'WILD_MEADOWS', 25.5, 30.2, true);
    expect(successDig.success).toBe(true);
    expect(successDig.stepCompleted).toBe(true);
    expect(successDig.trailFinished).toBe(true);
    expect(successDig.casketItemId).toBe('item_casket_hard');
    expect(clue.isFinished).toBe(true);
  });

  it('evaluates NPC riddle answers accurately', () => {
    const clue = createClueScroll('MEDIUM', step2, 2);

    // Wrong answer
    const wrongAns = evaluateNpcRiddleAction(clue, 'DEMO_SANDBOX', 'npc_wise_sage', '7');
    expect(wrongAns.success).toBe(false);
    expect(wrongAns.reason).toBe('Incorrect answer.');

    // Correct answer
    const rightAns = evaluateNpcRiddleAction(clue, 'DEMO_SANDBOX', 'npc_wise_sage', ' 42 ');
    expect(rightAns.success).toBe(true);
    expect(rightAns.stepCompleted).toBe(true);
    expect(clue.stepsCompleted).toBe(1);
  });
});
