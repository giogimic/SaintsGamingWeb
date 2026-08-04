# Saints Gaming — The 27-Skill Matrix & Economy Deep Dive (14.txt)

The core loop of Saints Gaming relies on long-term progression. The 27-Skill Matrix is designed to create deep interdependencies between players, forming the foundation of a robust MMO economy.

> **Studio economy registries, editors, and anti-duplication rules:** [`23-studio-economy-system.md`](./23-studio-economy-system.md)  
> **Gameplay skill/profession/combat editors:** [`25-studio-gameplay-editors.md`](./25-studio-gameplay-editors.md)

---

# 1. The Interdependency Principle

No single player should be able to efficiently max out all 27 skills in a short timeframe without relying on the economy.
* A player who wants to level **Smithing** quickly needs ores. They must either grind **Mining** for weeks or buy ores from the Marketplace.
* A player who focuses entirely on **Combat** needs healing items. They must buy food from players who level **Fishing** and **Cooking**.
* A player who masters **Summoning** needs Binding Crystals. They must buy them from players who master **Runecrafting** and **Crafting**.

This forces trade, communication, and specialization.

---

# 2. The 27 Skills Breakdown

### The Combat Triad
1. **Strength**: Increases melee physical damage.
2. **Defense**: Reduces incoming physical damage and unlocks heavy armor.
3. **Attack**: Increases melee accuracy (hit chance) and unlocks higher-tier weapons.

### The Specialist Combat
4. **Magic**: Increases spell damage, unlocks robes and staves. Spells consume Runes.
5. **Ranged**: Increases bow damage, unlocks leather armor. Attacks consume Arrows.
6. **Summoning**: Increases max creature tier capacity. Essential for endgame tamers.

### The Gathering Professions
7. **Mining**: Extracts ores and gems from rocks. (Pickaxe required).
8. **Woodcutting**: Extracts logs from trees. (Hatchet required).
9. **Fishing**: Extracts raw fish from water nodes. (Net/Harpoon required).
10. **Farming**: Plants seeds in patches. Harvest yields herbs and vegetables over real-world time.
11. **Hunter**: Tracks and traps overworld critters (non-battle creatures) for furs, meat, and rare reagents.
12. **Foraging**: Gathers wild berries, mushrooms, and surface materials.

### The Artisan Professions
13. **Smithing**: Smelts ores into bars at a Furnace; hammers bars into Melee gear at an Anvil.
14. **Crafting**: Sews leather, strings amulets, and cuts gems.
15. **Fletching**: Carves wood into bows and arrows.
16. **Cooking**: Cooks raw meat/fish at a Range to create healing food. (Can burn food if level is too low).
17. **Herblore**: Cleans dirty herbs and mixes them with water in vials to create buff potions.
18. **Runecrafting**: Mines essence and binds it at elemental altars to create Magic Runes.
19. **Alchemy**: Transmutes base materials (e.g., turning iron into gold, or dissolving junk into pure essence).
20. **Construction**: Builds furniture, workbenches, and cosmetic walls for Player Bases.

### The Support Professions
21. **Agility**: Increases stamina regen, unlocks map shortcuts (grappling hooks, tightropes).
22. **Thieving**: Pickpockets NPCs for raw coins/seeds, picks locks on dungeon chests.
23. **Sailing**: Builds and captains ships to access island maps and deep-sea fishing.
24. **Archaeology**: Excavates ancient ruins for artifacts that provide account-wide passive buffs.
25. **Taming**: Increases the effectiveness of your creatures' base stats and unlocks advanced command abilities in Turn-Based combat.
26. **Divination**: Harvests memory wisps to create automated resource-gathering nodes.
27. **Invention**: Dissassembles max-level gear to create augmented tools with crazy perks (e.g., a Pickaxe that automatically smelts ores).

---

# 3. The ARPG Gear Economy

Unlike RuneScape where an Iron Sword is always an Iron Sword, Saints Gaming uses ARPG-style drops.

* **Durability & Sinks**: All equipment loses durability in combat. When it breaks, it is permanently destroyed (or requires expensive repair materials). This ensures that Crafters always have a market.
* **The "God Roll"**: Because crafted gear rolls random Affixes (`+5% Crit`, `+10 Max HP`), the economy never stagnates. The wealthiest players will pay millions of Gold for a "God Roll" weapon, funneling wealth down to dedicated Artisan players.

---

# 4. Currency Sinks

To prevent inflation, the game must aggressively remove currency from the economy:
1. **Marketplace Tax**: Every transaction on the Next.js website takes a 5% Gold cut.
2. **Instance Costs**: Players must pay Gold to purchase Base Claims or expand their private islands.
3. **Death Penalty**: While players don't drop their gear on death, repairing heavily damaged gear costs significant Gold.
4. **Fast Travel**: Warping between major cities costs Silver/Gold based on distance.
