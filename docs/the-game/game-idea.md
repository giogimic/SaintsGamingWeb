# MISSION BRIEF: THE SAINTS TAMER RPG

**Role:** You are an Expert React Architect and Game Developer working inside Antigravity, with full access to the local repo, terminal, and package manager.
**Objective:** Continue development of "Saints Tamer" — a 2D top-down Sandbox MMO RPG built entirely within a React component.
**Context:** This game is embedded inside the **SaintsGaming** web profile, a **Next.js 16** app. The component must work as a client-only island inside that app (App Router, React Server Components by default), so treat SSR-safety as a first-class constraint, not an afterthought.
**Tone:** Teen/adult, organic fantasy, survival.
**Inspirations:** RuneScape (Old School), Pokémon, Yokai Watch.

**CRITICAL COPYRIGHT & LORE CONSTRAINTS:**
- DO NOT use copyrighted terms (Pokémon, Digimon, Pikachu, Pokédex, RuneScape, etc.) in ANY code, UI text, variables, comments, or asset names.
- NO religious references. NO sports references. NO "Saints Row" references.
- **S.A.I.N.T.** stands for **Society of Animists, Invokers, Naturalists, and Tamers**.

---

## 0. OPERATING PROTOCOL
1. **Plan first, in text only.** Before writing or editing any file, output a short numbered plan.
2. **Wait for confirmation on multi-file plans.**
3. **Patch, don't rewrite.** Make the smallest diff that satisfies the objective.
4. **Self-check against constraints** before presenting the change.
5. **State assumptions, don't stall on them.**
6. **Stay inside the declared dependency list** (`zustand`, `immer`, `easystarjs`, `howler`, `vitest`).
7. **One objective at a time.**

---

## 1. ARCHITECTURE & STATE (BABYLON.JS + SERVER AUTHORITY)
- **The Game Engine (Babylon.js):** 3D/2.5D rendering using Babylon.js. The client provides visual representation (smooth interpolation of movement, visual FX for projectiles), but all logic is strictly server-authoritative.
- **Server Authority (Socket.io):** A robust game server layer handles all true game state, entity positions, collision, and combat calculations. The client only sends player input (intent) to the server.
- **State Management:** **Zustand** (with `immer` middleware) for global client-side UI store (hotbars, inventory), while the Server dictates the spatial grid, MMO combat math, and dynamic instancing.
- **Next.js integration:** Export the game as `<CyberTerminal />` (keep the component name for backwards compatibility, but UI says Saints Tamer) marked `'use client'`, and load it via `next/dynamic` with `ssr: false`.

---

## 2. ASSET STRATEGY (LPC & OPENGAMEART)
We leverage open-source assets to build a massive world without API costs. All assets adhere strictly to a **16x16 Baseline** to prevent clashing art styles.
- **World Tiles:** We use the `zelda-like-tilesets-and-sprites` pack from OpenGameArt to draw the massive maps.
- **UI System:** We use the `rpg-gui-construction-kit-v10` for premium React overlay frames, using CSS `border-image`.
- **Items:** All inventory icons use the `16x16-rpg-items` pack for consistency.
- **Beast Assets (Tuxemon):** We use the massive [Tuxemon Set](https://opengameart.org/content/tuxemon-set-1-154-monsters-front-and-back-sprites-and-menu-animations).
- **Player Assets (LPC):** We use the Liberated Pixel Cup (LPC) base assets for naked character bodies and dynamic armor/weapon layers.
- **NPCs:** We use the `48-animated-old-school-rpg-characters` pack (16x16) for Keepers, Villagers, and Shopkeepers.
- **Ambient Animals:** We use the `lpc-style-farm-animals` pack for ambiance and Gathering/Hunter skills.
- **Roaming Monsters:** We use `limbo-land-monster-sprites` and `bat-sprite` for aggressive mobs in Player vs Monster combat.
- **Dynamic Lore & Quests (Ollama Pre-Generation):** We use local LLMs (like Llama 3 via Ollama) strictly during **development** to procedurally generate hundreds of NPC dialogues, Keeper taunts, and Beast lore entries, saving them to static JSON databases.

---

## 3. THE 27-SKILL SANDBOX MATRIX (LEVEL 1-50 PROGRESSION)
The core of the game is leveling up 27 distinct skills. `store.ts` tracks XP for every single skill using the curve `Lvl = floor(sqrt(XP / 50)) + 1`. Max level is 50.

### Combat Skills (Player vs Keeper)
Govern the player's ability to survive direct attacks from enemy Keepers.
- **Summoning:** XP is gained passively by entering Beast-vs-Beast combat. Governs the max tier of Beast you can bind.
- **Strength / Attack / Defence:** XP is gained by engaging a Keeper in melee combat with equipped weapons.
  - *Lv 1-10:* Bronze/Wood gear
  - *Lv 11-20:* Iron gear
  - *Lv 21-30:* Steel gear
  - *Lv 31-40:* Mithril gear
  - *Lv 41-50:* Rune/Dragon tier gear
- **Magic:** XP gained by casting spells in combat.
- **Ranged:** XP gained by using bows/crossbows.

### Gathering Skills
Clicking a tile checks your level and grants resources + XP.
- **Woodcutting:** Lv 1: Normal Trees, Lv 20: Oak Trees, Lv 40: Willow Trees.
- **Mining:** Lv 1: Copper/Tin, Lv 15: Iron, Lv 30: Coal/Iron, Lv 50: Mithril.
- **Fishing:** Lv 1: Net fishing, Lv 20: Harpoon fishing.
- **Farming & Hunter:** Trapping roaming critters and growing herbs in patches.

### Artisan Skills (RNG Affix Modernization)
- **Smithing & Crafting:** Turn Ore into armor/weapons for Player Combat. **Modernization:** Crafted gear rolls random Rarities (Common to Legendary) and Affixes (e.g., *+5% Fire Damage*, *Lifesteal*), creating an addictive ARPG loot chase.
- **Cooking & Herblore:** Cook fish or mix farmed herbs into potions to heal.
- **Fletching:** Lv 1: Shortbows, Lv 20: Oak Longbows, Lv 40: Willow Crossbows.
- **Runecrafting:** Craft magic runes.
- **Construction:** Build player housing/guild halls.

### Support Skills & Base Automation
- **Base Automation:** Caught Beasts do not sit idle. You can assign a Fire Beast to the Furnace to passively smelt bars, or a Plant Beast to Farm herbs while you are exploring. This provides an idle-game resource loop.
- **Agility:** Lv 1: Hop over fences. Lv 25: Swing across ravines. Lv 50: Traverse crumbling floors.
- **Thieving:** Pickpocket NPCs and pick locks.

---

## 4. DUAL-COMBAT & SYNERGY SYSTEM
Combat has distinct phases and encounter types, modernized for active engagement:
1. **Wild Encounters (Beast vs Beast):** Standard turn-based elemental combat against wild Beasts hiding in tall grass. You use your active Beast to fight and throw Binding Crystals to capture them.
2. **Keeper Battles (Player vs Keeper):** When fighting an enemy trainer (a "Keeper"), you first defeat their Beast. Once their Beast falls, the Keeper attacks YOU directly. Your Beast retreats, and your personal **Combat Skills** dictate your damage output. You use crafted weapons and armor here.
3. **Synergy & Action Commands:** During Keeper combat, if your Beast previously applied an elemental debuff (e.g., "Soaked"), you can trigger an **Elemental Reaction** (e.g., Lightning magic) for massive bonus damage. Furthermore, you can press the Spacebar at the exact moment of an enemy attack to execute an **Action Command Block**, halving incoming damage.
4. **Roaming Monsters (Player vs Monster):** While exploring dungeons or dark forests, distinct "Monsters" (unlike tameable Beasts) roam the procedural Canvas. Walking into one triggers immediate Player Combat.

---

## 5. WEBSITE INTEGRATION (PHASE 12)
The game must tie into the larger Saints Web platform seamlessly:
- **Cloud Saves:** `store.ts` state is pushed to a Prisma `GameSave` model linked to the NextAuth `User`.
- **Achievements:** Milestones (Level 50 skill, catching first Beast) trigger Server Actions to unlock `UserAchievement` badges on the main platform.
- **The Feed:** Manual "Share" buttons allow players to brag about rare catches directly to the `SocialPost` feed.
- **Profiles:** Users can select a "Pinned Beast" which renders as a pixel-art sprite on their public Saints Web profile.

---

## 6. EXECUTION OBJECTIVES
Work through these in order. (Items 1-12 completed previously, system currently operating in Phase 13+).

13. **Dynamic Equipment State:** Build out the `equipment` object in `store.ts` to allow players to wear Head, Chest, Legs, and Weapon items.
14. **Player Combat Math:** Map out the specific `gainXp` triggers for Combat Styles (Summoning XP on Beast battle, Strength XP on Player melee hit).
15. **LPC Rendering Integration:** Prepare the Canvas engine to support drawing layered PNGs for the player (base body + equipped armor).
