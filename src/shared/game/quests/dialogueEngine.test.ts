import { describe, it, expect } from 'vitest';
import {
  evaluateDialogueOption,
  resolveDialogueOptionSelection,
  DialogueNode,
  DialoguePlayerContext,
} from './dialogueEngine';

describe('Dialogue Tree & Branching Condition Resolver (Bible 15)', () => {
  const baseContext: DialoguePlayerContext = {
    questStages: { quest_starter: 1 },
    completedQuests: new Set(),
    inventoryItemCounts: { ore_copper: 5 },
    playerSkills: { mining: 25 },
  };

  const sampleNode: DialogueNode = {
    id: 'node_start',
    speaker: 'Blacksmith Doran',
    text: 'Welcome to the forge! What can I do for you?',
    options: [
      {
        id: 'opt_quest',
        label: 'I have the copper ore you requested.',
        nextNodeId: 'node_turn_in',
        condition: {
          reqQuestId: 'quest_starter',
          reqQuestStage: 1,
          reqItemId: 'ore_copper',
          reqItemCount: 3,
        },
        action: {
          type: 'PROGRESS_QUEST',
          payload: { questId: 'quest_starter', newStage: 2 },
        },
      },
      {
        id: 'opt_master',
        label: 'Teach me master smithing.',
        nextNodeId: 'node_master',
        condition: {
          reqSkill: 'Mining',
          reqSkillLevel: 50,
        },
      },
      {
        id: 'opt_exit',
        label: 'Just looking around, thanks.',
        nextNodeId: 'exit',
      },
    ],
  };

  it('evaluates available options when all prerequisites are met', () => {
    const questOption = sampleNode.options[0];
    const res = evaluateDialogueOption(questOption, baseContext);

    expect(res.isAvailable).toBe(true);
    expect(res.lockReason).toBeUndefined();
  });

  it('locks options when skill level prerequisite is missing', () => {
    const masterOption = sampleNode.options[1]; // Requires Mining 50 (player has 25)
    const res = evaluateDialogueOption(masterOption, baseContext);

    expect(res.isAvailable).toBe(false);
    expect(res.lockReason).toContain('Requires Mining level 50');
  });

  it('resolves dialogue progression and returns action payload', () => {
    const step = resolveDialogueOptionSelection(sampleNode, 'opt_quest', baseContext);

    expect(step.isExit).toBe(false);
    expect(step.nextNodeId).toBe('node_turn_in');
    expect(step.actionToExecute?.type).toBe('PROGRESS_QUEST');
  });

  it('resolves exit option as conversation termination', () => {
    const step = resolveDialogueOptionSelection(sampleNode, 'opt_exit', baseContext);

    expect(step.isExit).toBe(true);
    expect(step.message).toContain('Conversation concluded');
  });
});
