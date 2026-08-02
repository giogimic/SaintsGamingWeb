# Saints Gaming — The Turn-Based Battle Engine (11.txt)

To bridge the gap between the Real-Time MMO world and the Creature Collection mechanics, Saints Gaming utilizes a dedicated Turn-Based Battle Engine for all wild creature encounters. 

---

# 1. The Architectural Boundary

The Turn-Based Battle is a strictly controlled, instanced state machine.

* **Triggering**: A player steps into a logic tile (e.g., Tall Grass) or interacts with a specific node. The server rolls an encounter.
* **Transition**: The server locks the player's world movement (`isMoving: false`), pauses their MMO combat state, and transitions their client's `gameMode` to `'BATTLE'`.
* **The View**: The Real-Time World (Babylon.js) blurs or dims, and a React UI overlay takes over, displaying the classic split-screen Battle UI (Player's Creature vs. Wild Creature).
* **Isolation**: While in a battle, the player cannot take damage from roaming MMO monsters, nor can they cast MMO Hotbar abilities. They are temporarily phased out of Real-Time combat.

---

# 2. The Core State Machine (Server-Side)

Turn-Based battles are not client-authoritative. The server maintains a rigid state machine for each active encounter.

1. **Phase: WAITING_FOR_INPUT**
   * The server waits for the player to select a move (Attack, Item, Flee, Swap).
2. **Phase: RESOLUTION**
   * Once input is received, the server calculates speed order, executes attacks, applies status effects, and calculates damage.
3. **Phase: CAPTURE_CALCULATION** (Optional)
   * If the player threw a Capture Item, the server runs the capture math.
4. **Phase: TURN_END**
   * Buffs/Debuffs tick down. 
   * If HP reaches 0, the server transitions to a defeat/victory state.
   * If the creature is captured, it is inserted into the Prisma database and the encounter ends.

---

# 3. The Math & Stat Conversion

Creatures have distinct stats (HP, Power, Resistance, Tempo) derived from their generic templates.

### The Damage Formula
A simplified but scalable ARPG damage formula ensures low numbers remain meaningful:

`Damage = (Move Power * (Attacker Power / Defender Resistance)) * Elemental Modifier`

### Elemental Modifiers
Standard Rock-Paper-Scissors multipliers apply:
* Super Effective: 2.0x Damage
* Not Very Effective: 0.5x Damage
* Immune: 0.0x Damage

### Tempo (Speed)
In turn-based combat, "Speed" determines turn order. If Tempo is tied, the server flips a coin.

---

# 4. Capturing Math

Capturing relies on weakening the creature and selecting the right tier of capture item.

`Capture Chance = ((Max HP - Current HP) / Max HP) * Status Modifier * Item Modifier * Base Catch Rate`

* **Status Modifiers**: Asleep (2.5x), Paralyzed (1.5x), Burned (1.5x).
* **Item Modifiers**: Basic Crystal (1x), Advanced Crystal (2x), Perfect Crystal (255x).

The server rolls a random number between 0 and 255. If the random number is less than the calculated `Capture Chance`, the capture succeeds.

---

# 5. Ending the Encounter

When the battle concludes, the server resolves the state and returns the player to the Real-Time MMO world.

* **Victory**: The active creature gains Summoning XP. The player receives generic loot (e.g., Fangs, Leather) added to their MMO inventory.
* **Capture**: The creature is serialized and saved to the player's `PlayerCreature` database table. It is immediately available in their Creature Box.
* **Defeat (Player's Creature Faints)**: The encounter ends abruptly. The player is NOT killed. They simply return to the overworld and must use a Revive item or visit a healing station before they can use that creature again.
* **Fleeing**: The player successfully runs away. The encounter is deleted from server memory.
