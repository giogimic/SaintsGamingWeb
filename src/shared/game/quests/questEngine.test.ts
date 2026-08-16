import { describe, it, expect, beforeEach } from 'vitest';
import { QuestJournal, QuestDefinition } from './questEngine';

describe('Quest Journal & Objective Stage Evaluator (Bible 16)', () => {
  let journal: QuestJournal;

  const starterQuest: QuestDefinition = {
    id: 'quest_woodcutter',
    title: 'The Forest Apprentice',
    description: 'Learn the basics of lumberjacking and reporting back.',
    stages: [
      {
        stageNumber: 1,
        title: 'Gather Wood',
        description: 'Chop 3 Oak Logs in Whispering Forest.',
        objectives: [
          {
            id: 'obj_logs',
            type: 'GATHER',
            targetId: 'log_oak',
            targetCount: 3,
            currentCount: 0,
            isComplete: false,
          },
        ],
      },
      {
        stageNumber: 2,
        title: 'Report to Master',
        description: 'Speak with Master Lumberjack in Saints Village.',
        objectives: [
          {
            id: 'obj_talk',
            type: 'TALK',
            targetId: 'npc_lumberjack',
            targetCount: 1,
            currentCount: 0,
            isComplete: false,
          },
        ],
      },
    ],
    rewards: {
      xp: 250,
      gold: 50,
      items: [{ itemId: 'axe_iron', quantity: 1 }],
    },
  };

  beforeEach(() => {
    journal = new QuestJournal([starterQuest]);
  });

  it('starts quest and initializes first stage objectives', () => {
    const active = journal.startQuest('quest_woodcutter');

    expect(active).not.toBeNull();
    expect(active?.currentStage).toBe(1);
    expect(active?.objectives.length).toBe(1);
    expect(active?.objectives[0].targetId).toBe('log_oak');
  });

  it('progresses stage 1 objectives and advances to stage 2', () => {
    journal.startQuest('quest_woodcutter');

    // Chop 2 logs (partial)
    const prog1 = journal.progressObjective('quest_woodcutter', 'GATHER', 'log_oak', 2);
    expect(prog1.updated).toBe(true);
    expect(prog1.stageAdvanced).toBe(false);

    // Chop 1 more log (completes stage 1 -> advances to stage 2)
    const prog2 = journal.progressObjective('quest_woodcutter', 'GATHER', 'log_oak', 1);
    expect(prog2.updated).toBe(true);
    expect(prog2.stageAdvanced).toBe(true);
    expect(prog2.questCompleted).toBe(false);

    const active = journal.getActiveQuest('quest_woodcutter');
    expect(active?.currentStage).toBe(2);
    expect(active?.objectives[0].type).toBe('TALK');
  });

  it('completes final stage and grants rewards', () => {
    journal.startQuest('quest_woodcutter');
    // Complete stage 1
    journal.progressObjective('quest_woodcutter', 'GATHER', 'log_oak', 3);
    // Complete stage 2
    const progFinal = journal.progressObjective('quest_woodcutter', 'TALK', 'npc_lumberjack', 1);

    expect(progFinal.questCompleted).toBe(true);
    expect(journal.isQuestCompleted('quest_woodcutter')).toBe(true);

    // Claim reward
    const reward = journal.claimReward('quest_woodcutter');
    expect(reward?.xp).toBe(250);
    expect(reward?.gold).toBe(50);
    expect(reward?.items?.[0].itemId).toBe('axe_iron');

    // Duplicate claim returns null
    expect(journal.claimReward('quest_woodcutter')).toBeNull();
  });
});
