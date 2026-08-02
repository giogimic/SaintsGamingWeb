# Saints Gaming — Progression & The 27-Skill Matrix (9.txt)

The core loop of Saints Gaming revolves around leveling up a massive web of 27 distinct skills. Inspired by classic MMOs, everything the player does contributes to their long-term account value.

---

# 1. The Skill Math & Curve

All 27 skills follow a unified experience curve. 

* **The Curve**: `Level = Math.floor(Math.sqrt(XP / 50)) + 1`
* **Max Level**: 50.
* **Philosophy**: Early levels are extremely fast, rewarding the player constantly during their first hours. Reaching level 50 requires dedication, forming the basis of the end-game economy and bragging rights.

*Example Curve:*
- Level 1: 0 XP
- Level 2: 50 XP
- Level 5: 800 XP
- Level 10: 4,050 XP
- Level 25: 28,800 XP
- Level 50: 120,050 XP

---

# 2. Combat Skills (Player vs Keeper)

These skills govern the player's direct combat power during **Real-Time MMO Encounters** (where the player fights enemy NPCs/Monsters directly).

* **Strength / Attack / Defense**: Leveled up by engaging in melee combat.
  * Level requirements restrict gear: Bronze (Lv 1), Iron (Lv 11), Steel (Lv 21), etc.
* **Magic**: Leveled up by casting spells in combat. Restricts equipping higher-tier staves and robes.
* **Ranged**: Leveled up by using bows and crossbows.
* **Summoning**: Leveled up passively by participating in **Turn-Based Creature Battles**. A high Summoning level dictates the max tier/rarity of creature the player can successfully command without it disobeying.

---

# 3. Gathering Skills

Gathering is done via the **World Interaction System** (facing a Logic Tile and pressing E).

* **Woodcutting**: Harvest trees for logs.
* **Mining**: Mine rocks for ores and gems.
* **Fishing**: Catch fish at water nodes.
* **Farming**: Plant seeds in designated patches and wait for real-world time to harvest.
* **Hunter**: Track and trap ambient creatures (not the Turn-Based battle creatures).

**Gathering Mechanics:**
* Gathering is NOT a 100% guaranteed drop per interaction.
* The server calculates a success roll based on: `(Player Level - Node Requirement) / Node Difficulty`.
* Success grants the item and XP. Failure grants nothing (or a junk item) and a tiny amount of XP.

---

# 4. Artisan Skills (The Modern ARPG Crafting System)

This is where Saints Gaming modernizes the classic MMO formula. Instead of crafting 1,000 identical Iron Swords, crafting uses an **ARPG RNG Affix System**.

* **Smithing**: Smelt ores into bars, hammer bars into weapons/heavy armor.
* **Crafting**: Turn leather and gems into ranged armor and jewelry.
* **Fletching**: Craft bows and arrows from wood.
* **Runecrafting**: Imbue blank slates with elemental energy to cast Magic.
* **Cooking**: Cook raw food to create high-tier healing items.
* **Herblore**: Combine herbs to create temporary buff potions.
* **Construction**: Build furniture and utilities for Player Housing.

**The ARPG Crafting Loop:**
When a player crafts an "Iron Sword" (Lv 11), the server rolls for Rarity and Affixes:
1. **Rarity Roll**: Common (White), Uncommon (Green), Rare (Blue), Epic (Purple), Legendary (Gold).
2. **Affix Roll**: If the item is Rare, it rolls 2 random modifiers (e.g., `+5% Fire Damage`, `+10 Max HP`).
3. **Outcome**: The player is incentivized to craft the same item multiple times hoping for a "God Roll", creating a massive sink for gathered materials and keeping the economy healthy.

---

# 5. Support Skills & Base Automation

* **Agility**: Unlocks traversal shortcuts on the map (jumping fences, swinging over rivers). Regenerates run energy faster.
* **Thieving**: Pickpocket specific NPCs or pick locks on chests.

**Base Automation (Idle Game Loop):**
Captured creatures don't just sit in a PC box. They can be assigned to Base Stations.
* Example: Assign a Fire-type creature to a Furnace. It will passively smelt Ores into Bars while the player is offline or exploring.
* The speed of the automation depends on the creature's level and stats.

---

# 6. Inventory & State Management

Because players will collect hundreds of different items, the inventory must be scalable.

* **Client**: Uses `Zustand` to manage a visual grid (e.g., 28 slots for the backpack, infinite slots for the Bank).
* **Server**: The true authority. The database stores inventory as a structured JSON object:
  ```json
  {
    "slots": [
      { "id": "iron_sword", "qty": 1, "instanceId": "uuid-1234", "affixes": [...] },
      { "id": "copper_ore", "qty": 45 }
    ]
  }
  ```
* **Stacking**: Basic materials (Ores, Logs) stack infinitely. Crafted gear (Swords, Armor) takes up 1 slot per item due to unique ARPG affixes (`instanceId`).
