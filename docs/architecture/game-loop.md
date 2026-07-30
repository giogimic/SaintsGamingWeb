# The Game Loop & Dual-Combat Engine

Saints Gaming features a unique hybrid combat system that bridges the gap between Real-Time MMO action and classic Creature Collection mechanics. The game loop seamlessly transitions players between these two distinct states depending on the entity they are engaging.

## 1. Real-Time MMO Combat (Monsters & World Bosses)
Combat in the open world happens in real-time, functioning exactly like a classic MMORPG.

- **Movement & Targeting:** Players move freely in the 2.5D world, clicking targets to engage.
- **The Hotbar:** Players rely on a bottom hotbar containing Player Abilities (Melee, Magic, Ranged), Creature Commands, and consumables.
- **Party Combat:** Up to 4 players can group together to take down Elite Encounters and World Bosses, assuming distinct roles (Tank, Healer, DPS, Control) while their active creature acts as a combat partner.
- **Why Real-Time?** Turn-based combat in a multiplayer open world creates massive pacing issues (other players waiting in line). Real-time combat keeps the world feeling alive, fluid, and dangerous.

## 2. Turn-Based Battle Engine (Creature Capturing)
While standard monsters are fought in real-time, capturing a new creature requires transitioning into a specialized Turn-Based Encounter.

### The Architectural Boundary
The Turn-Based Battle is a strictly controlled, server-authoritative state machine:
1. **Triggering:** The player steps into a logic tile (e.g., Tall Grass) and triggers an encounter.
2. **Transition:** The server locks the player's MMO movement (`isMoving: false`) and transitions the client to `'BATTLE'` mode.
3. **The View:** The Real-Time World blurs, and a React UI overlay displays a classic split-screen Battle UI.
4. **Isolation:** The player is phased out of the MMO world. They cannot take damage from roaming monsters or cast hotbar abilities.

### The Turn-Based State Machine
The server manages the flow of the battle:
- **WAITING_FOR_INPUT:** Waiting for the player to select a move (Attack, Item, Flee).
- **RESOLUTION:** Speed (Tempo) determines turn order. The server applies damage based on elemental modifiers (Rock-Paper-Scissors) and stats.
- **CAPTURE_CALCULATION:** If a Binding Crystal is thrown, the server rolls capture math. Chance increases as the wild creature's HP drops and status effects (Asleep, Paralyzed) are applied.
- **RESOLUTION:** If defeated, the player is returned to the overworld (they are not killed, but their creature faints). If captured, the creature is serialized to the `PlayerCreature` database table.

## The Core Philosophy
> **"Combat should feel like an MMO, but every creature should still feel like a collectible companion."**

Players never have to wonder if they are fighting a monster or attempting to capture a creature. The mechanics clearly dictate the intent: **Monsters are fought on the Canvas; Creatures are captured in the UI.**
