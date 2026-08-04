# Saints Gaming — Quests, Dialogue, & NPC AI (15.txt)

Saints Gaming features a rich narrative world. To scale the writing process without bloating the real-time server, we utilize a hybrid approach of LLM pre-generation and strict server-side state machines.

> **Studio editors & full data contracts:** [`22-studio-npc-ai-creature-editors.md`](./22-studio-npc-ai-creature-editors.md)  
> Entity components: [`20`](./20-studio-entity-system.md) · UX docks: [`19`](./19-studio-ux-design.md)

---

# 1. The Pre-Generation Philosophy (Ollama)

We do **not** use real-time LLM generation for standard NPC dialogue in production. Doing so is expensive, introduces latency, and risks players breaking the lore.

Instead, we use local LLMs (like Llama 3 via Ollama) **strictly during the development and map-building phase**.

### The Developer Workflow
1. A developer places an NPC in the Map Editor.
2. The developer assigns a "Personality Prompt" (e.g., "Grumpy old fisherman who hates the cold").
3. The Editor triggers an internal API call to Ollama.
4. Ollama generates a branching dialogue tree and 5 dynamic idle quotes.
5. The developer reviews, edits, and saves the dialogue tree to the Database as a static JSON object.

### The Production Benefit
In production, players interact with NPCs instantly. The server just traverses the pre-approved JSON dialogue tree. It costs zero API credits and guarantees 100% lore safety.

---

# 2. The Dialogue State Machine

When a player interacts with an NPC, the client requests the dialogue state.

### The Dialogue JSON Structure
```json
{
  "node_start": {
    "text": "What do you want, Tamer?",
    "options": [
      { "label": "Who are you?", "nextNode": "node_who" },
      { "label": "Do you have any work?", "nextNode": "node_quest", "condition": "quest_1_locked" },
      { "label": "Goodbye.", "nextNode": "exit" }
    ]
  }
}
```

### Server Authority
The client renders the text and options. When a player clicks an option, the client sends `{ input: "node_who" }` to the server. The server verifies the player meets the conditions (e.g., level requirement, quest state) before advancing the dialogue.

---

# 3. The Quest Engine

Quests in Saints Gaming are tracked globally in the player's Cold State (Prisma) and Hot State (Zustand).

### Quest Architecture
Every Quest is defined by a series of **Stages**.
* `stage: 0` = Unaccepted
* `stage: 1` = Accepted, needs 10 Iron Ores.
* `stage: 2` = 10 Iron Ores delivered, needs to defeat 5 Goblins.
* `stage: 99` = Completed.

### Event-Driven Triggers
Quests do not constantly check every tick if a player has 10 Iron Ores. Instead, quests listen to specific **Event Hooks**:
* `onInventoryChange(item, qty)`
* `onMonsterKill(monsterId)`
* `onNpcTalk(npcId)`
* `onMapEnter(mapId)`

When an event fires, the Server Quest Engine checks if the player has any active quests listening for that event, and advances the Stage if the conditions are met.

---

# 4. Dynamic NPC Behavior

While standard NPCs stand still or follow strict patrol paths, some entities utilize a server-side finite state machine (FSM).

### The FSM Loop (1 Tick per Second)
To save performance, NPC AI ticks only once per second (unlike the combat loop which ticks 20 times per second).

**States:**
* `IDLE`: Stands still, occasionally plays an idle animation.
* `WANDER`: Picks a random logic tile within a 5-tile radius and walks to it using A* pathfinding.
* `CHASE`: If a hostile Monster detects a player within its aggro radius, it paths toward the player.
* `FLEE`: If a weak creature is attacked by a high-level player, it paths away.

### Aggro Rules
* Hostile monsters check the player's Combat Level. If the player is 2x the monster's level, the monster will ignore them (reducing annoyance for high-level players traveling through starting zones).
* Line of Sight (LoS): Monsters cannot aggro players through Solid Logic Tiles (walls). The server casts a simple Bresenham line algorithm to verify LoS.
