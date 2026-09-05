/**
 * Saints Gaming — Treasure Trail Clue Step & Coordinate Evaluator (Bible 18 & Bible 25)
 * Evaluates clue scroll tiers, step types (Dig, Riddle, Emote, Object), radius checks, and casket rewards.
 */

export type ClueTier = 'EASY' | 'MEDIUM' | 'HARD' | 'ELITE' | 'MASTER';
export type ClueStepType = 'COORDINATE_DIG' | 'NPC_RIDDLE' | 'EMOTE_CHALLENGE' | 'OBJECT_SEARCH';

export interface ClueStep {
  id: string;
  tier: ClueTier;
  type: ClueStepType;
  prompt: string;
  targetMapId: string;
  targetX?: number;
  targetY?: number;
  targetRadius?: number; // In tiles (defaults to 1.5)
  targetNpcId?: string;
  riddleAnswer?: string;
  requiredEmoteId?: string;
}

export interface ClueScrollState {
  id: string;
  tier: ClueTier;
  stepsCompleted: number;
  totalStepsRequired: number;
  currentStep: ClueStep;
  isFinished: boolean;
}

export const CASKET_ITEM_MAP: Record<ClueTier, string> = {
  EASY: 'item_casket_easy',
  MEDIUM: 'item_casket_medium',
  HARD: 'item_casket_hard',
  ELITE: 'item_casket_elite',
  MASTER: 'item_casket_master',
};

/**
 * Creates a clue scroll state.
 */
export function createClueScroll(
  tier: ClueTier,
  initialStep: ClueStep,
  totalStepsRequired: number = 3
): ClueScrollState {
  return {
    id: `clue_${tier.toLowerCase()}_${Date.now()}`,
    tier,
    stepsCompleted: 0,
    totalStepsRequired,
    currentStep: initialStep,
    isFinished: false,
  };
}

/**
 * Evaluates a spade dig action against the current clue step.
 */
export function evaluateDigAction(
  clueState: ClueScrollState,
  currentMapId: string,
  playerX: number,
  playerY: number,
  hasSpade: boolean,
  seraphtStepProvider?: () => ClueStep
): {
  success: boolean;
  stepCompleted: boolean;
  trailFinished: boolean;
  casketItemId?: string;
  reason?: string;
} {
  if (clueState.isFinished) {
    return { success: false, stepCompleted: false, trailFinished: true, reason: 'This clue is already completed.' };
  }

  if (!hasSpade) {
    return { success: false, stepCompleted: false, trailFinished: false, reason: 'You need a spade to dig here.' };
  }

  const step = clueState.currentStep;
  if (step.type !== 'COORDINATE_DIG') {
    return { success: false, stepCompleted: false, trailFinished: false, reason: 'Nothing interesting happens.' };
  }

  if (currentMapId !== step.targetMapId) {
    return { success: false, stepCompleted: false, trailFinished: false, reason: 'You dig into the ground, but find nothing.' };
  }

  const radius = step.targetRadius ?? 1.5;
  const distance = Math.hypot((step.targetX ?? 0) - playerX, (step.targetY ?? 0) - playerY);

  if (distance > radius) {
    return { success: false, stepCompleted: false, trailFinished: false, reason: 'You dig into the ground, but find nothing.' };
  }

  // Step passed!
  clueState.stepsCompleted += 1;

  if (clueState.stepsCompleted >= clueState.totalStepsRequired) {
    clueState.isFinished = true;
    return {
      success: true,
      stepCompleted: true,
      trailFinished: true,
      casketItemId: CASKET_ITEM_MAP[clueState.tier],
    };
  }

  if (seraphtStepProvider) {
    clueState.currentStep = seraphtStepProvider();
  }

  return {
    success: true,
    stepCompleted: true,
    trailFinished: false,
  };
}

/**
 * Evaluates answering an NPC riddle.
 */
export function evaluateNpcRiddleAction(
  clueState: ClueScrollState,
  currentMapId: string,
  npcId: string,
  answer: string
): { success: boolean; stepCompleted: boolean; reason?: string } {
  const step = clueState.currentStep;
  if (step.type !== 'NPC_RIDDLE') {
    return { success: false, stepCompleted: false, reason: 'The NPC has nothing for your clue.' };
  }

  if (currentMapId !== step.targetMapId || npcId !== step.targetNpcId) {
    return { success: false, stepCompleted: false, reason: 'This is not the correct person.' };
  }

  if (answer.trim().toLowerCase() !== (step.riddleAnswer ?? '').trim().toLowerCase()) {
    return { success: false, stepCompleted: false, reason: 'Incorrect answer.' };
  }

  clueState.stepsCompleted += 1;
  return { success: true, stepCompleted: true };
}
