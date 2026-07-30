# Vision & Game Design Document: Saints Tamer

## 1. Executive Summary
**Saints Tamer** is a 2D top-down Sandbox MMO RPG embedded within the SaintsGaming web platform. Built as an interactive React component using Next.js 16 (App Router), the game combines the organic fantasy of classic 16-bit RPGs with a robust server-authoritative multiplayer backend. 

The game draws mechanical inspiration from Old School RuneScape, Pokémon, and Yokai Watch, targeting a teen/adult demographic with a focus on survival, deep skill progression, and strategic combat.

**Core Lore Identity:** S.A.I.N.T. stands for the **Society of Animists, Invokers, Naturalists, and Tamers**. The game takes place in an original, organic fantasy setting.

## 2. Technical Architecture
The project maintains a strict separation between client-side rendering and server-side authority to ensure a secure, unexploitable MMO experience:

- **The Game Engine (Babylon.js):** Utilizes Babylon.js to render a 2.5D orthographic world. The client is solely responsible for visual representation, smooth movement interpolation, and FX rendering.
- **Server Authority (Socket.io):** The backend dictates all true game state. Spatial grids, collision detection, and combat mathematics are calculated server-side, with the client acting only to send player intent.
- **State Management:** Client-side UI state (hotbars, inventory) is managed via **Zustand** (with Immer middleware), ensuring predictable React data flows.
- **Web Integration:** The game is seamlessly integrated into the Next.js App Router via a dynamically loaded, SSR-disabled client wrapper.

## 3. Asset & Art Direction
The game utilizes a massive, unified 16x16 pixel art baseline to create a cohesive, expansive world:
- **Environment:** Classic RPG tilesets for sprawling maps and diverse biomes.
- **UI System:** Premium RPG GUI overlays constructed using CSS `border-image` framing.
- **Characters (LPC):** Liberated Pixel Cup (LPC) bases enable dynamic rendering of equipped armor and weapons.
- **Beasts & Encounters:** Hundreds of meticulously designed creatures, NPCs, and ambient wildlife populate the world, providing interactive hunting, gathering, and taming experiences.

## 4. The 27-Skill Sandbox Matrix
Progression is non-linear and deeply rewarding. Players can level up 27 distinct skills from Level 1 to 50, driving an interconnected economy.

### Combat Skills (Player vs Keeper)
- **Summoning:** Determines the maximum tier of Beast you can command.
- **Melee (Strength/Attack/Defence):** Progresses through tiers of crafted gear (Bronze → Dragon).
- **Ranged & Magic:** specialized combat trees for ranged attacks and spellcasting.

### Gathering & Artisan Skills
- **Gathering:** Woodcutting, Mining, Fishing, Farming, and Hunter skills fuel the economy.
- **Artisan:** Smithing, Crafting, Cooking, Herblore, Fletching, Runecrafting, and Construction. 
- *Modernization Note:* Crafted gear rolls random Rarities (Common to Legendary) and Affixes (e.g., +5% Fire Damage, Lifesteal), providing a deep ARPG-style loot chase.

### Base Automation
Captured Beasts can be assigned to automated tasks (e.g., a Fire Beast smelting bars at a Furnace), blending active exploration with idle-game resource generation.

## 5. Dual-Combat & Synergy System
Combat is active, strategic, and occurs seamlessly on the world map:
1. **Wild Encounters:** Turn-based elemental combat against wild Beasts. Players use their tamed Beasts to weaken targets before throwing Binding Crystals to capture them.
2. **Keeper Battles:** Multi-stage encounters. Defeat an enemy trainer's Beast first; once it falls, the trainer attacks you directly, shifting the fight to Player vs Keeper combat using crafted weapons and armor.
3. **Synergy & Action Commands:** Execute "Elemental Reactions" by exploiting debuffs, and use precisely timed Action Commands (e.g., pressing Spacebar on impact) to mitigate incoming damage.
4. **Roaming Monsters:** Aggressive, untameable monsters roam the overworld, triggering immediate, real-time player combat.

## 6. Saints Web Platform Integration
Saints Tamer is not an isolated game; it is the beating heart of the SaintsGaming platform:
- **Cloud Saves:** Game state is synchronized directly to the user's web account via Prisma.
- **Achievements:** In-game milestones unlock badges and titles on the user's community profile.
- **Social Feed:** Players can broadcast rare catches and achievements directly to the platform's social timeline.
- **Profile Showcases:** Users can pin their favorite tamed Beasts to their public web profile, bridging their forum identity with their in-game accomplishments.
