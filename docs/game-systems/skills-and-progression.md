# 📊 27-Skill Progression & Master Capstone Systems

Saints Gaming features a comprehensive **27-skill proficiency matrix** inspired by classic sandbox RPGs (like Old School RuneScape), divided across four distinct skill categories.

---

## 1. Skill Typings & Categories

Every character can train all 27 skills without class lockouts. Starting classes simply provide initial level deltas:

### ⚔️ Combat Skills (9)
- **Attack:** Weapon accuracy and melee weapon tiers (Bronze → Celestial).
- **Strength:** Maximum melee damage output and carry capacities.
- **Defence:** Armor tier requirements and damage mitigation.
- **Hitpoints:** Maximum character health pool.
- **Ranged:** Bows, crossbows, throwing knives, and ranged accuracy.
- **Agility:** Energy recovery rates, obstacle navigation, and dodge chance.
- **Perception:** Critical hit chance, trap detection, and stealth awareness.
- **Wisdom:** Spell potency, buff durations, and passive magic resistance.
- **Intelligence:** Maximum mana capacity and cooldown reduction.

### 🌲 Gathering Skills (5)
- **Farming:** Seed planting, compost tiers, and crop harvesting.
- **Fishing:** Harpoons, rods, nets, and fish tiers (Shrimp → Celestial Leviathan).
- **Hunter:** Box traps, bird snares, tracking footprints, and pelt gathering.
- **Mining:** Pickaxes and metal ores (Copper/Tin → Runite / Celestial Ores).
- **Woodcutting:** Hatchets and tree tiers (Normal → Elder / Magic Trees).

### 🔨 Artisan Skills (8)
- **Construction:** Player-owned house furniture, workshops, and portal chambers.
- **Cooking:** Raw meat/fish preparation, stews, pies, and stat-boosting feasts.
- **Crafting:** Leather armor stitching, gemstone cutting, and jewelry enchanting.
- **Firemaking:** Bonfires, incense burners, and warmth buff modifiers.
- **Fletching:** Arrow shafts, bow carving, and crossbow stringing.
- **Herblore:** Potion brewing (Attack/Strength potions, Super Restores, Overloads).
- **Runecrafting:** Essence binding at altars into elemental and combination runes.
- **Smithing:** Metal bar smelting at furnaces and anvil hammering into armor/weapons.

### 🔮 Support Skills (5)
- **Thieving:** Pickpocketing NPCs, lockpicking chests, and cracking vaults.
- **Summoning:** Soul charm binding, familiar beasts of burden (Pack Yak), and combat pets.
- **Magic:** Elemental strikes, continental teleports, high alchemy, and barrage spells.
- **Prayer:** Bone offerings, altar consecrations, overhead protection prayers (Melee/Ranged/Magic), and Piety.
- **Necromancy:** Soul harvesting, necrotic bone wands, and undead thrall summons.

---

## 2. Mathematical Formulas & Curves

### Combat Level XP Curve
Combat skill levels are calculated using a square root formula:
$$\text{Level} = \min(50, \max(1, \lfloor\sqrt{\text{XP} / 50}\rfloor + 1))$$

### Standard Gathering / Artisan / Support Curve (1–99)
Standard non-combat skills progress up to Level 99:
$$\text{XP to Next Level} = \lfloor\text{Level} + 300 \cdot 2^{(\text{Level} / 7)}\rfloor$$

- Total skills in game: **27**
- Maximum Total Level: **2,232** ($9 \times 50 + 18 \times 99$)

---

## 3. Grandmaster Capstones & Master Totems

When players advance their skill progression, they unlock exclusive Grandmaster items defined in `src/shared/game/skillTypings.ts` and `src/shared/game/items.ts`:

- **Max Cape of the Grandmaster (`max_cape_grandmaster`):** Unlocked when achieving max level across all 27 proficiencies. Provides best-in-slot bonuses and universal skill teleports.
- **Max Hood of the Grandmaster (`max_hood_grandmaster`):** Matching cosmetic headpiece.
- **Sanctum Master Totem Relic (`sanctum_master_totem`):** Bestows a permanent **+10% global XP buff** across all 27 skills.
- **Grandmaster Completionist Cape (`grandmaster_completionist_cape`):** Awarded for unlocking all 270 Battlepass reward tiers.

---

## 4. Battlepass Cosmetic Tracks & Skill Cape Emotes

Each of the 27 skills contains a **10-tier Battlepass reward progression** spanning Lv 10 through Lv 99:
1. **Tier 1 (Lv 10):** Novice Title (e.g., *Novice Blacksmith*)
2. **Tier 2 (Lv 20):** Skill Emote (e.g., *Anvil Heavy Strike*)
3. **Tier 3 (Lv 30):** Novice Aura (e.g., *Furnace Hearth Shimmer*)
4. **Tier 4 (Lv 40):** Apprentice Title
5. **Tier 5 (Lv 50):** Halo Cosmetic (e.g., *Molten Ember Halo*)
6. **Tier 6 (Lv 60):** Journeyman Title
7. **Tier 7 (Lv 70):** Supernova Corona Aura
8. **Tier 8 (Lv 80):** Master Title
9. **Tier 9 (Lv 90):** Master Artisan Hat / Vestments
10. **Tier 10 (Lv 99):** Prestigious Cape of Skill (e.g., *Cape of Smithing*)

### 🎭 Centralized Skill Cape Emote Registry (`skillCapeEmotes.ts`)
29 unique cape emotes feature custom WebAudio sound synthesis and pulsing particle banners when activated in-game or previewed inside `SkillGuideModal.tsx`.
