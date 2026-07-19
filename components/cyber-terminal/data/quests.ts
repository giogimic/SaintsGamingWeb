export interface QuestSchema {
  id: string;
  name: string;
  npcId: string;
  description: string;
  dialogs: {
    start: string;
    inProgress: string;
    complete: string;
  };
  requirements: {
    itemId?: string;
    amount?: number;
    skillId?: string;
    level?: number;
  };
  rewards: {
    xp?: number;
    credits?: number;
    itemId?: string;
    amount?: number;
  };
}

export const QUEST_DB: Record<string, QuestSchema> = {
  'q_first_armor': {
    id: 'q_first_armor',
    name: 'A Sturdy Start',
    npcId: 'npc-1',
    description: 'The Village Elder wants you to craft a Bronze Helm.',
    dialogs: {
      start: 'Welcome to Saints Village. The wilderness outside is extremely dangerous. I want to make sure you are prepared. Bring me 1 Bronze Helm, and I will reward you.',
      inProgress: 'Have you crafted that Bronze Helm yet? You can mine Copper Ore in the northeast and smelt it at the anvil.',
      complete: 'Excellent craftsmanship! This will protect you from the weaker Beasts. Here is your reward.'
    },
    requirements: {
      itemId: 'bronze_helm',
      amount: 1
    },
    rewards: {
      credits: 250,
      xp: 50,
      itemId: 'patch_kit',
      amount: 3
    }
  }
};
