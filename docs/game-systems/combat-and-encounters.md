# ⚔️ Combat & Encounter Systems

Saints Gaming features a **dual-combat model**: real-time action MMO combat on the overworld combined with instanced turn-based creature battles.

---

## 1. Real-Time Overworld MMO Combat

Overworld combat takes place directly on the live map without separate loading screens:

### Key Components
- **Action Hotbar (`Hotbar.tsx`):** 8 configurable hotbar slots (`1`–`8` or touch pad taps) mapped to weapon attacks, spells, consumable potions, and defensive wards.
- **Target Frame (`target-frame.tsx`):** Clicking any hostile monster or player locks on, displaying current HP, level, element type, and status effects.
- **Floating Combat Text (FCT):** Floating damage, healing numbers, and critical hit indicators rendered in Babylon.js with upward drift and alpha fade.
- **Cooldown Manager:** Ability cooldowns tracked client-side with radial swipe overlays on hotbar slots and validated authoritatively by the Go socket server.

### Combat Calculations
- **Hit Chance:** Determined by Attacker Accuracy vs Defender Agility/Defence.
- **Damage Formula:** Base weapon power scaled by Strength/Magic/Ranged stats, modified by elemental resistance and defensive armor ratings.

---

## 2. Instanced Turn-Based Creature Encounters

When walking through tall grass or interacting with wild beasts, players trigger turn-based collection battles:

```
┌──────────────────────────────────────────────────────────┐
│                   Creature Battle Screen                 │
│                                                          │
│  [Wild Beast Lv 14: Ignifox]     HP: [========  ] 80/100 │
│  Type: Fire                      Status: None            │
│                                                          │
│  [Your Active Beast Lv 16: Aquashell] HP: [==========]   │
│                                                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐  │
│  │ 💧 Water Gun │ │ 🛡️ Shell Ward│ │ 💎 Throw Crystal │  │
│  └──────────────┘ └──────────────┘ └──────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### Turn Flow
1. **Action Selection:** Choose between elemental attack moves, switching beasts, using an inventory item, or attempting capture.
2. **Speed Resolution:** Higher agility beast acts first.
3. **Capture Mechanics:** Binding Crystals (`captureItems.ts`) calculate capture probability based on:
   $$\text{Capture Rate} = \frac{(3 \times \text{MaxHP} - 2 \times \text{CurrentHP}) \times \text{CrystalBonus} \times \text{StatusBonus}}{3 \times \text{MaxHP}}$$
4. **Shiny Variations (`shiny.ts`):** Wild encounters have a rare chance (e.g., 1/512 or 1/4096) to spawn shiny palette variations with shimmering particle rings.

---

## 3. Elemental Matchup Matrix

Combat damage incorporates standard elemental effectiveness multipliers (`elementMatchups.ts`):
- **Fire** deals $2.0\times$ vs Nature/Wood, $0.5\times$ vs Water.
- **Water** deals $2.0\times$ vs Fire/Rock, $0.5\times$ vs Electric/Nature.
- **Electric** deals $2.0\times$ vs Water/Flying, $0.5\times$ vs Earth.
- **Earth** deals $2.0\times$ vs Electric/Poison, $0.5\times$ vs Nature.
- **Holy / Divine** deals $2.0\times$ vs Undead / Necrotic.
