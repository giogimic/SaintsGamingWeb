# Creator Guide: Multi-Stage Quest Authoring

This guide covers constructing branching dialogue trees, defining multi-stage quest objectives, binding quest givers, and distributing experience rewards across the 27 skills.

---

## 1. Quest Architecture & Lifecycle

Quests progress through four standardized lifecycle states:

```
[UNSTARTED] ──(Accept Quest)──► [IN_PROGRESS] ──(Complete Objectives)──► [READY_TO_TURN_IN] ──(Claim)──► [COMPLETED]
```

- **Prerequisites:** Can enforce minimum total level, specific skill thresholds (e.g. Mining Lv 15), or prior completed quest IDs (`reqCompletedQuestId`).
- **Journal Integration:** Active stages automatically generate waypoints on the MiniMap radar.

---

## 2. Branching Dialogue Trees & Node Graphs

In Script Mode, use the **Dialogue Graph Editor** (`DialogueEditorPanel.tsx`) to map conversational paths:

```
[Node 1: Elder NPC Greeting]
   │
   ├─► Choice A: "Tell me about the shadow rift." ────► [Node 2: Lore Explanation]
   │                                                           │
   │                                                           └─► Choice: "I'll investigate." ──► [Trigger: ACCEPT_QUEST]
   │
   └─► Choice B: "I'm just passing through." ──────────► [Node 3: Polite Farewell]
```

Each dialogue node specifies:
- `prompt`: Text spoken by the NPC.
- `choices`: Array of player selectable answers.
- `onSelect`: Trigger actions such as `ACCEPT_QUEST`, `OPEN_SHOP`, or `TELEPORT`.

---

## 3. Quest Objective Types

Quests support four fundamental objective criteria that update dynamically in `playerQuestStates`:

| Objective Type | Engine Identifier | Example Parameter |
| :--- | :--- | :--- |
| **Defeat Monsters** | `KILL_ENTITY` | `targetId: "goblin_warrior"`, `count: 10` |
| **Gather Items** | `GATHER_ITEM` | `itemId: "iron_ore"`, `count: 15` |
| **Speak to NPC** | `TALK_NPC` | `npcId: "npc_alchemist_elena"` |
| **Explore Area** | `REACH_COORDINATE` | `mapId: "dark_cave"`, `x: 24`, `y: 40` |

---

## 4. Rewards & Conditional Payouts

Define quest reward bundles in `QuestEditorPanel.tsx`:

```typescript
export const GoblinMenaceQuest = {
  id: 'quest_goblin_menace',
  name: 'The Goblin Menace',
  category: 'novice',
  rewards: {
    gold: 250,
    skillXp: [
      { skill: 'attack', xp: 500 },
      { skill: 'defence', xp: 500 }
    ],
    items: [
      { itemId: 'iron_longsword', quantity: 1 },
      { itemId: 'health_potion', quantity: 3 }
    ]
  }
};
```

> [!TIP]
> Completing milestone quests can also reward Quest Points (QP) required to wear the legendary Quest Point Cape of Mastery.
