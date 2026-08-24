# Combat Systems & Creature Encounters

Saints Gaming features a **dual-combat model**: real-time action MMO combat on the overworld (**Hero Battles**) alongside turn-based companion creature duels (**Saints Buddy Battles**).

---

## 1. Real-Time Overworld Hero Battles

Hero Battles occur seamlessly across live maps without instanced loading transitions:

- **Action Hotbar (`Hotbar.tsx`):** 8 configurable hotbar slots bound to keys `1`–`8` or touch pad taps, mapped to melee strikes, spells, consumables, and wards.
- **Target Frame (`target-frame.tsx`):** Selecting an enemy or peer locks targeting, displaying health bars, combat level, element type, and status buffs.
- **Floating Combat Text (FCT):** Renders dynamic damage numbers, critical strikes (gold), misses (gray), and healing (green) with upward drift and alpha fade.
- **Authoritative Cooldowns:** Client radial swipes reflect ability cooldowns validated server-side by the Go socket backend (`:3001`).

```
Physical Damage = Max(1, Floor((Attacker.Strength × WeaponPower) / (Defender.Defence × 0.5)))
```

---

## 2. Instanced Saints Buddy Battles

Stepping onto wild grass tiles (Logic Tag `4`) or challenging trainers triggers instanced creature battles:

```
┌──────────────────────────────────────────────────────────┐
│                   Creature Battle Screen                 │
│                                                          │
│  [Wild Ignifox Lv 14]            HP: [========  ] 80/100 │
│  Type: Fire                      Status: None            │
│                                                          │
│  [Active Aquashell Lv 16]        HP: [==========] 120/120│
│                                                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐  │
│  │ 💧 Water Gun │ │ 🛡️ Shell Ward│ │ 💎 Throw Crystal │  │
│  └──────────────┘ └──────────────┘ └──────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

- **Speed Resolution:** The creature with higher Speed (`SPD`) acts first in the turn queue.
- **Shiny Variants (`shiny.ts`):** Wild encounters roll a rare chance ($1/512$ base or $1/4096$ standard) for sparkling particle crowns and alternative palette textures.

---

## 3. Creature Capture Mechanics & Formulations

Capturing wild beasts requires Binding Crystals. The capture probability formula evaluates the target's current vitality, crystal potency, and status impairments:

$$\text{Capture Rate} = \frac{(3 \times \text{MaxHP} - 2 \times \text{CurrentHP}) \times \text{CrystalBonus} \times \text{StatusBonus}}{3 \times \text{MaxHP}}$$

| Status Effect | `StatusBonus` Multiplier | Description |
| :--- | :--- | :--- |
| **None** | $1.0\times$ | Standard baseline capture probability. |
| **Poison / Burn / Paralyze** | $1.5\times$ | Moderate capture assistance from lingering afflictions. |
| **Sleep / Freeze** | $2.0\times$ | High capture modifier from incapacitated state. |

> [!TIP]
> Weakening a wild beast below $20\%$ HP while applying Sleep or Freeze maximizes capture chance, especially when utilizing high-tier Prismatic Crystals.

---

## 4. Elemental Matchup Matrix

Abilities and creature typings follow an elemental multiplier matrix (`elementMatchups.ts`):

| Attacking Element | Strong Against ($2.0\times$) | Weak Against ($0.5\times$) |
| :--- | :--- | :--- |
| **Fire** | Nature, Ice | Water, Rock |
| **Water** | Fire, Rock, Ground | Electric, Nature |
| **Electric** | Water, Flying | Earth, Electric |
| **Nature** | Water, Ground, Earth | Fire, Poison, Flying |
| **Shadow** | Psychic, Divine | Divine, Shadow |
| **Divine** | Undead, Shadow | Nature, Steel |
