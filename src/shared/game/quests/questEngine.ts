/**
 * Saints Gaming — Quest Journal & Objective Stage Evaluator (Bible 16)
 * Manages quest definitions, multi-step objective tracking, stage transitions, and completion rewards.
 */

export type ObjectiveType = 'TALK' | 'KILL' | 'GATHER' | 'DISCOVER';

export interface QuestObjective {
  id: string;
  type: ObjectiveType;
  targetId: string;
  targetCount: number;
  currentCount: number;
  isComplete: boolean;
}

export interface QuestStage {
  stageNumber: number;
  title: string;
  description: string;
  objectives: QuestObjective[];
}

export interface QuestReward {
  xp?: number;
  gold?: number;
  items?: Array<{ itemId: string; quantity: number }>;
}

export interface QuestDefinition {
  id: string;
  title: string;
  description: string;
  stages: QuestStage[];
  rewards: QuestReward;
}

export interface ActiveQuestState {
  questId: string;
  currentStage: number;
  objectives: QuestObjective[];
  isCompleted: boolean;
  rewardClaimed: boolean;
}

export class QuestJournal {
  private activeQuests: Map<string, ActiveQuestState> = new Map();
  private completedQuestIds: Set<string> = new Set();
  private definitions: Map<string, QuestDefinition> = new Map();

  constructor(definitions: QuestDefinition[] = []) {
    for (const def of definitions) {
      this.definitions.set(def.id, def);
    }
  }

  public registerDefinition(def: QuestDefinition): void {
    this.definitions.set(def.id, def);
  }

  public startQuest(questId: string): ActiveQuestState | null {
    const def = this.definitions.get(questId);
    if (!def || this.activeQuests.has(questId) || this.completedQuestIds.has(questId)) {
      return null;
    }

    const firstStage = def.stages[0];
    const state: ActiveQuestState = {
      questId,
      currentStage: 1,
      objectives: firstStage ? firstStage.objectives.map((o) => ({ ...o, currentCount: 0, isComplete: false })) : [],
      isCompleted: false,
      rewardClaimed: false,
    };

    this.activeQuests.set(questId, state);
    return state;
  }

  public progressObjective(
    questId: string,
    type: ObjectiveType,
    targetId: string,
    count: number = 1
  ): { updated: boolean; stageAdvanced: boolean; questCompleted: boolean } {
    const active = this.activeQuests.get(questId);
    const def = this.definitions.get(questId);
    if (!active || !def || active.isCompleted) {
      return { updated: false, stageAdvanced: false, questCompleted: false };
    }

    let updated = false;

    for (const obj of active.objectives) {
      if (obj.type === type && obj.targetId === targetId && !obj.isComplete) {
        obj.currentCount = Math.min(obj.targetCount, obj.currentCount + count);
        if (obj.currentCount >= obj.targetCount) {
          obj.isComplete = true;
        }
        updated = true;
      }
    }

    if (!updated) {
      return { updated: false, stageAdvanced: false, questCompleted: false };
    }

    // Check if all objectives in the current stage are completed
    const allStageDone = active.objectives.every((o) => o.isComplete);
    let stageAdvanced = false;
    let questCompleted = false;

    if (allStageDone) {
      const seraphtStageIndex = active.currentStage; // 1-based index pointing to serapht stage
      if (seraphtStageIndex < def.stages.length) {
        // Advance to serapht stage
        active.currentStage += 1;
        const seraphtStage = def.stages[active.currentStage - 1];
        active.objectives = seraphtStage.objectives.map((o) => ({ ...o, currentCount: 0, isComplete: false }));
        stageAdvanced = true;
      } else {
        // Complete the quest
        active.isCompleted = true;
        this.completedQuestIds.add(questId);
        questCompleted = true;
      }
    }

    return { updated: true, stageAdvanced, questCompleted };
  }

  public getActiveQuest(questId: string): ActiveQuestState | undefined {
    return this.activeQuests.get(questId);
  }

  public isQuestCompleted(questId: string): boolean {
    return this.completedQuestIds.has(questId);
  }

  public claimReward(questId: string): QuestReward | null {
    const active = this.activeQuests.get(questId);
    const def = this.definitions.get(questId);
    if (!active || !def || !active.isCompleted || active.rewardClaimed) {
      return null;
    }

    active.rewardClaimed = true;
    return def.rewards;
  }
}
