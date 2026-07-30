export interface QuestObjective {
  id: string;
  description: string;
  targetCount: number;
  currentCount?: number;
  type: 'TALK_NPC' | 'CATCH_BEAST' | 'WIN_BATTLE' | 'HARVEST_RESOURCE' | 'CRAFT_ITEM' | 'ASSIGN_FACILITY';
  targetId: string;
}

export interface GameQuest {
  id: string;
  npcId?: string;
  title?: string;
  name?: string;
  description?: string;
  summary?: string;
  requiredLevel?: number;
  category?: 'MAIN_STORY' | 'TAMER_CHALLENGE' | 'SKILLING' | 'BASE_AUTOMATION';
  rewardCredits?: number;
  rewardXp?: number;
  rewardItems?: Record<string, number>;
  objectives?: QuestObjective[];
  requirements?: {
    level?: number;
    itemId?: string;
    skillId?: string;
    amount?: number;
  };
  dialogs?: {
    intro?: string[];
    in_progress?: string[];
    inProgress?: string[];
    start?: string[];
    complete?: string[];
  };
  rewards?: {
    xp?: number;
    credits?: number;
    itemId?: string;
    amount?: number;
    items?: Array<{ id: string; amount: number }>;
  };
}

export const SAINTS_TAMER_QUESTS: Record<string, GameQuest> = {
  QUEST_STARTER_JOURNEY: {
    id: 'QUEST_STARTER_JOURNEY',
    npcId: 'npc_mom',
    title: 'The Tamer Awakening',
    name: 'The Tamer Awakening',
    summary: 'Awaken in your bedroom, speak to Mom downstairs, and head to Professor Oakwood in Paper Town to choose your first companion beast.',
    requiredLevel: 1,
    category: 'MAIN_STORY',
    rewardCredits: 500,
    rewardXp: 250,
    rewardItems: { binding_crystal: 5, potion: 3 },
    requirements: { level: 1 },
    dialogs: {
      intro: ['Awaken young Tamer! Speak to Mom downstairs to begin your journey.'],
      in_progress: ['Meet Prof. Oakwood in Paper Town to claim your starter beast.'],
      inProgress: ['Meet Prof. Oakwood in Paper Town to claim your starter beast.'],
      start: ['Awaken young Tamer! Speak to Mom downstairs to begin your journey.'],
      complete: ['You have chosen your starter beast!']
    },
    rewards: {
      xp: 250,
      credits: 500,
      itemId: 'binding_crystal',
      amount: 5,
      items: [{ id: 'binding_crystal', amount: 5 }]
    },
    objectives: [
      { id: 'obj_1', description: 'Speak to Mom in the living room downstairs', targetCount: 1, type: 'TALK_NPC', targetId: 'npc_mom' },
      { id: 'obj_2', description: 'Travel to Paper Town and meet Prof. Oakwood in his Lab', targetCount: 1, type: 'TALK_NPC', targetId: 'npc_professor' },
      { id: 'obj_3', description: 'Choose your starter Saints Beast (Rockitten, Gnawly, or Nuttywutty)', targetCount: 1, type: 'CATCH_BEAST', targetId: 'starter' }
    ]
  },
  QUEST_WILD_BINDING: {
    id: 'QUEST_WILD_BINDING',
    npcId: 'npc_guide',
    title: 'Binding Crystal Mastery',
    name: 'Binding Crystal Mastery',
    summary: 'Head into the tall grass on Route 1 and capture 3 wild beasts using Binding Crystals.',
    requiredLevel: 2,
    category: 'TAMER_CHALLENGE',
    rewardCredits: 750,
    rewardXp: 500,
    rewardItems: { grand_crystal: 2 },
    requirements: { level: 2 },
    dialogs: {
      intro: ['Test your skills in the tall grass on Route 1.'],
      in_progress: ['Capture 3 wild beasts using Binding Crystals.'],
      inProgress: ['Capture 3 wild beasts using Binding Crystals.'],
      start: ['Test your skills in the tall grass on Route 1.'],
      complete: ['Excellent work! You are now a master of Binding Crystals.']
    },
    rewards: {
      xp: 500,
      credits: 750,
      itemId: 'grand_crystal',
      amount: 2,
      items: [{ id: 'grand_crystal', amount: 2 }]
    },
    objectives: [
      { id: 'obj_1', description: 'Capture wild beasts on Route 1', targetCount: 3, type: 'CATCH_BEAST', targetId: 'wild_beast' }
    ]
  }
};

export const QUEST_DB: Record<string, GameQuest> = SAINTS_TAMER_QUESTS;
