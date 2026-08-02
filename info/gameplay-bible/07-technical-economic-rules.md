# Saints Gaming — Technical & Economic Rules (7.txt)

This document represents the constitution of the game. While the gameplay bible explains the fantasy, this document locks down the systems that every future feature must obey.

---

# 1. Server Authority & Networking Philosophy

**Saints Gaming uses a strictly server-authoritative architecture.**

The core networking philosophy: **The client requests actions. The server decides outcomes.**

The server is the absolute and final authority for:
* Player position
* Combat calculations
* Damage
* Creature ownership
* Captures
* Inventory
* Currency
* Trading
* Skills
* Base ownership
* Creator content

The client is untrusted and only responsible for:
* Rendering the world
* Displaying UI
* Sending player actions
* Predicting visuals where safe

The client never decides outcomes.

**Example:**
*Bad:* Client: "I caught this rare creature." Server: "Okay."
*Good:* Client: "I attempted capture." Server checks encounter, creature, item existence, runs capture calculation, and responds "Capture successful."

This one rule protects the entire MMO.

---

# 2. Game Server Architecture

**Start inside Next.js, but architect for separation later.**

Do not split into a separate MMO service immediately. A separate service adds complexity before the architecture is proven.

*Current Setup:* Next.js + Socket.io + Game Server Layer.
*Future Migration:* Extract Game Server Layer into dedicated Node.js Microservices (Lobby Server, World Server, etc.).

**Crucial Rule:** Do not put game logic directly inside Socket.io event handlers. The Socket layer only communicates. The game server owns the rules.

**The Game Tick Loop:**
The server does not update only when messages arrive. It runs a consistent tick loop (e.g., 20 ticks per second) to process inputs, update players/NPCs/objects, resolve collisions, and broadcast changes.

---

# 3. Movement Authority & Client Prediction

**Decision: Input-Based Authority.**
Clients send intent; servers simulate reality.

The client does not send exact coordinates ("I am at 300,400"). The client sends input ("I am holding W").
The server checks collision, speed modifiers, and terrain, then approves the new position and broadcasts it.

**Client Prediction:**
To prevent laggy MMO movement, the client predicts movement immediately locally. If the server detects an invalid move, it forces a position correction.

---

# 4. Combat Translation Rules

The goal is: **Preserve creature identity while converting turn-based data into MMO combat.**

## Creature Stats Conversion

| Original Creature Concept | Saints MMO Translation |
| ------------------------- | ---------------------- |
| HP                        | Health                 |
| Attack                    | Physical Power         |
| Defense                   | Physical Resistance    |
| Special Attack            | Ability Power          |
| Special Defense           | Magic Resistance       |
| Speed                     | Combat Tempo           |

## Speed Rule

Speed does **not** control movement speed.

Instead it affects:
* Ability cooldown recovery
* Attack timing
* Reaction windows

*Example:*
**Fast creature**: Faster rotations, lower individual hits.
**Slow creature**: Bigger attacks, longer cooldowns.

## Move Conversion Rule

Traditional moves become MMO abilities. The creature keeps its identity, but the combat format changes.

*Example - Tackle:*
* Basic physical ability
* Short cooldown
* Melee range

* Example - Ember:
* Fire ability
* Medium range
* Burn effect

## Combat Location
**Decision: Combat happens organically on the open map.**

There are no dedicated "battle arena screens" for standard gameplay. Players engage in combat directly in the shared overworld. This allows for:
* MMO gameplay and partying.
* World events and roaming world bosses.
* Seamless spectating and social interaction.

*Exception*: Instanced arenas are strictly reserved for special activities such as structured PvP, Tournaments, major Story encounters, or specific Raids with unique mechanics.

## Encounters vs. Monsters
The game makes a distinct separation between these two entity types while sharing the same combat foundation:

> **Design Principle:** Players should never wonder whether they are fighting a monster or attempting to collect a creature. The interaction model should make the purpose immediately obvious.

**Encounters (Collection Gameplay)**
* Focus: Creature-collection gameplay (fishing, tall grass, hidden creatures).
* Primarily intended to be captured rather than fought to the death. The goal is capturing, not killing.
* Uses Pokémon-inspired interaction rules (engage, weaken, attempt capture, success/escape).

**Monsters (MMO Combat)**
* Focus: MMO physical enemies.
* Attack players, defend areas, guard resources, and participate in world events.
* Uses a Hybrid/RuneScape-style targeting system: Click to target, use hotbar abilities against the current target, and switch freely.
* While some can be captured, defeating them is the primary goal.

---

# 5. Capture Rules (Turn-Based Restriction)

**CRITICAL CORRECTION:** Capturing is strictly a mechanic of the **Turn-Based Creature Battle System**. 
There are NO capture buttons, capture skills, or throwing mechanics on the player's real-time MMO action bar.

The core capture flow:
1. Trigger a Turn-Based Encounter by stepping into tall grass, interacting with a specific node, or using an item.
2. Enter the dedicated Turn-Based Battle screen.
3. Use your active creature's abilities to weaken the wild creature and apply status effects.
4. Select a Capture Item (e.g., Binding Crystal) from your turn-based inventory menu.
5. The server calculates the capture math based on HP, statuses, and item tier.
6. The creature is either captured, breaks free, or attempts to flee.

## Capture States & Math
To add depth to capturing without reinventing the mechanic, creatures have simple behavioral states influenced by health and environment:
* **Calm**: Easier to capture.
* **Alert**: Normal capture chance.
* **Enraged**: Harder to capture, deals more damage.
* **Fleeing**: The creature attempts to escape the turn-based encounter entirely.

---

# 6. Economy Rules

The economy uses multiple currency layers.

## Standard Currency
* **Copper**: Used for early purchases and basic NPC transactions.
* **Silver**: Used for mid-game economy, trading, and services.
* **Gold**: Used for high-value purchases and player economy.
* **Platinum**: Used for premium high-value transactions, rare items, and end-game economy.

## Event Currency
Special currencies exist separately to avoid flooding the normal economy.

## Premium Currency
A premium currency system may exist but is separate from the normal economy. It cannot replace gameplay progression (Cosmetics/Convenience only).

---

# 7. Creature Trading Rules

Creatures are valuable because they represent player effort.

* **Normal Creatures**: Tradable.
* **Rare Creatures**: Tradable with tracking (Original owner, Capture history, Creation source).
* **Unique Creatures**: Restrictions apply (Account-bound, Achievement-bound, Limited transfer rules).

---

# 8. World Population Rules (Instancing)

Saints uses dynamic sharding. A world is not one physical server room.

*Example - Lobby:*
* Channel 1: 50 players
* Channel 2: 50 players

Players experience one connected world.
* **Social Areas**: Can shard automatically.
* **Personal Bases**: Use private instances.
* **Creator Worlds**: Can scale through multiple instances.

---

# 9. Death & Failure Rules

Saints should avoid extreme punishment. 

Default defeat:
* Player respawns at safe location
* Temporary effects removed
* Health restored

No losing creatures, losing permanent progress, or destroying bases. Higher-risk activities may have harsher mechanics, but rewards increase with risk.

---

# 10. Mobile & Cross Platform Rules

Saints Gaming is designed for Desktop browsers, Mobile browsers, and Touch devices.

## Mobile Gameplay
Supported: Exploration, Combat, Inventory, Creature management, Base building, Social systems.

## Desktop Advantage
Desktop gets: Advanced editor, Map creation, Logic tools, Creator workflows. 
*Mobile can play. Desktop creates.*

---

# 11. Persistence & Ownership Rules

The editor is one of Saints' biggest features. Everything persistent has ownership.

* **Creature**: Owner ID, History, Stats
* **Object**: Creator, Location, State
* **Map**: Creator, Version, Permissions

Creator content needs: Saves, Backups, Version history, Rollbacks. A creator should never lose months of work.
