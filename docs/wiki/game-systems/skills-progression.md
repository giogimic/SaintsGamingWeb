# 27-Skill Progression & Mastery Systems

Saints Gaming features a classless **27-skill proficiency matrix** divided across four distinct categories, allowing characters to train all disciplines to achieve the maximum total level of 2,232.

---

## 1. Skill Categories & Proficiency Matrix

Skills are organized into four dedicated disciplines:

| Category | Count | Max Lvl | Skills Included |
| :--- | :--- | :--- | :--- |
| **Combat** | 9 | 50 | Attack, Strength, Defence, Hitpoints, Ranged, Agility, Perception, Wisdom, Intelligence |
| **Gathering** | 5 | 99 | Farming, Fishing, Hunter, Mining, Woodcutting |
| **Artisan** | 8 | 99 | Construction, Cooking, Crafting, Firemaking, Fletching, Herblore, Runecrafting, Smithing |
| **Support** | 5 | 99 | Thieving, Summoning, Magic, Prayer, Necromancy |

```
Total Level Cap = (9 × 50) + (18 × 99) = 450 + 1,782 = 2,232
```

---

## 2. Experience Curves & Mathematical Formulations

Saints Gaming utilizes two mathematical formulas depending on the skill category:

### Combat Skill Level Formula (Levels 1–50)
Combat skill levels are calculated using a square root progression curve:
$$\text{Combat Level} = \min\left(50, \max\left(1, \left\lfloor\sqrt{\frac{\text{XP}}{50}}\right\rfloor + 1\right)\right)$$

### Standard Gathering, Artisan & Support Curve (Levels 1–99)
Non-combat skills use exponential tier scaling:
$$\text{XP}_{\text{required}}(\text{Level}) = \sum_{L=1}^{\text{Level}-1} \left\lfloor L + 300 \cdot 2^{\frac{L}{7}} \right\rfloor$$

> [!NOTE]
> Reaching Level 99 in a standard skill requires approximately $13,034,431\text{ XP}$, with Level 92 representing the exact halfway milestone.

---

## 3. Grandmaster Capstones & Master Totems

Mastering all proficiencies unlocks exclusive endgame capstones defined in `skillTypings.ts`:

- **Max Cape of the Grandmaster (`max_cape_grandmaster`):** Unlocked when achieving max level across all 27 skills. Provides universal teleports and best-in-slot defensive ratings.
- **Max Hood of the Grandmaster (`max_hood_grandmaster`):** Matching cosmetic headgear.
- **Sanctum Master Totem Relic (`sanctum_master_totem`):** Grants an account-wide passive **+10% global XP multiplier** across all 27 skills.
- **Grandmaster Completionist Cape (`grandmaster_completionist_cape`):** Awarded for completing all 270 Battlepass reward tiers.

---

## 4. Battlepass Cosmetic Tracks & Skill Cape Emotes

Each of the 27 skills features a 10-tier Battlepass progression path (from Level 10 to Level 99):

```
Lv 10: Novice Title  ──► Lv 30: Novice Aura  ──► Lv 50: Halo Cosmetic  ──► Lv 99: Skill Cape
```

- **Cape Emotes (`skillCapeEmotes.ts`):** 29 unique cape emotes trigger procedural WebAudio soundscapes and custom particle banners.
- **Skill Guide (`SkillGuideModal.tsx`):** Provides in-game previews of unlocked titles, halos, gathering milestones, and craftable recipes.
