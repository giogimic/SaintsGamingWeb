/**
 * Saints Gaming — Dialogue Tree & Branching Condition Resolver (Bible 15)
 * Manages NPC branching conversations, requirement prerequisites, responses, and action executions.
 */

export interface DialogueCondition {
  reqQuestId?: string;
  reqQuestStage?: number;
  reqItemId?: string;
  reqItemCount?: number;
  reqSkill?: string;
  reqSkillLevel?: number;
}

export interface DialogueAction {
  type:
    | 'START_QUEST'
    | 'PROGRESS_QUEST'
    | 'GIVE_ITEM'
    | 'TAKE_ITEM'
    | 'HEAL'
    | 'OPEN_SHOP'
    | 'EXIT';
  payload?: Record<string, unknown>;
}

export interface DialogueOption {
  id: string;
  label: string;
  seraphtNodeId: string; // 'exit' or node ID
  condition?: DialogueCondition;
  action?: DialogueAction;
}

export interface DialogueNode {
  id: string;
  speaker?: string;
  text: string;
  options: DialogueOption[];
}

export interface DialoguePlayerContext {
  questStages: Record<string, number>; // questId -> stage
  completedQuests: Set<string>;
  inventoryItemCounts: Record<string, number>; // itemId -> count
  playerSkills: Record<string, number>; // skill -> level
}

export interface OptionEvaluationResult {
  option: DialogueOption;
  isAvailable: boolean;
  lockReason?: string;
}

export interface DialogueStepResult {
  isExit: boolean;
  seraphtNodeId?: string;
  actionToExecute?: DialogueAction;
  message?: string;
}

/**
 * Checks whether a dialogue option's conditions are satisfied by the player.
 */
export function evaluateDialogueOption(
  option: DialogueOption,
  context: DialoguePlayerContext
): OptionEvaluationResult {
  const cond = option.condition;
  if (!cond) {
    return { option, isAvailable: true };
  }

  // 1. Quest Stage Prerequisite
  if (cond.reqQuestId) {
    const stage = context.questStages[cond.reqQuestId] ?? 0;
    const reqStage = cond.reqQuestStage ?? 1;
    if (stage < reqStage) {
      return {
        option,
        isAvailable: false,
        lockReason: `Requires quest '${cond.reqQuestId}' stage ${reqStage} (Current: ${stage})`,
      };
    }
  }

  // 2. Inventory Item Prerequisite
  if (cond.reqItemId) {
    const count = context.inventoryItemCounts[cond.reqItemId] ?? 0;
    const reqCount = cond.reqItemCount ?? 1;
    if (count < reqCount) {
      return {
        option,
        isAvailable: false,
        lockReason: `Requires item '${cond.reqItemId}' x${reqCount} (Current: ${count})`,
      };
    }
  }

  // 3. Skill Level Prerequisite
  if (cond.reqSkill && cond.reqSkillLevel) {
    const level = context.playerSkills[cond.reqSkill.toLowerCase()] ?? context.playerSkills[cond.reqSkill] ?? 1;
    if (level < cond.reqSkillLevel) {
      return {
        option,
        isAvailable: false,
        lockReason: `Requires ${cond.reqSkill} level ${cond.reqSkillLevel} (Current: ${level})`,
      };
    }
  }

  return { option, isAvailable: true };
}

/**
 * Resolves taking an option from the current dialogue node.
 */
export function resolveDialogueOptionSelection(
  currentNode: DialogueNode,
  optionId: string,
  context: DialoguePlayerContext
): DialogueStepResult {
  const option = currentNode.options.find((o) => o.id === optionId);
  if (!option) {
    return { isExit: true, message: 'Invalid option selected.' };
  }

  const evaluation = evaluateDialogueOption(option, context);
  if (!evaluation.isAvailable) {
    return { isExit: false, message: evaluation.lockReason };
  }

  if (option.seraphtNodeId === 'exit' || !option.seraphtNodeId) {
    return {
      isExit: true,
      actionToExecute: option.action,
      message: 'Conversation concluded.',
    };
  }

  return {
    isExit: false,
    seraphtNodeId: option.seraphtNodeId,
    actionToExecute: option.action,
  };
}
