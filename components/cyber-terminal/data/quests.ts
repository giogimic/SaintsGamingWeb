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
  },
  'q_fishing_trip': {
    id: 'q_fishing_trip',
    name: 'A Hearty Meal',
    npcId: 'npc-2',
    description: 'The Hungry Villager wants 3 Cooked Fish.',
    dialogs: {
      start: 'Ugh, I am so hungry. If you can catch some Raw Fish from the pond and cook them for me, I will give you a Binding Crystal.',
      inProgress: 'You still do not have 3 Cooked Fish? Check the pond to the south-west, then use the fire or anvil area to cook it.',
      complete: 'Delicious! Here, take this crystal. You can use it to catch wild beasts.'
    },
    requirements: {
      itemId: 'cooked_fish',
      amount: 3
    },
    rewards: {
      credits: 100,
      xp: 25,
      itemId: 'capture_script',
      amount: 1
    }
  },
  'q_monster_hunter': {
    id: 'q_monster_hunter',
    name: 'The Outpost Guard',
    npcId: 'npc-guard',
    description: 'The Guard wants you to prove yourself by bringing a Bronze Sword.',
    dialogs: {
      start: 'Halt! The Verdant Outpost is dangerous. Prove you can defend yourself by equipping a Bronze Sword. Hand one to me for inspection.',
      inProgress: 'Still no Bronze Sword? Talk to the Elder in Saints Village if you are lost.',
      complete: 'Impressive blade. You may proceed freely. Take this gold for your trouble.'
    },
    requirements: {
      itemId: 'bronze_sword',
      amount: 1
    },
    rewards: {
      credits: 500,
      xp: 150
    }
  }
};
