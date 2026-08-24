# Creator Guide: Companion Creature Design

This tutorial teaches creators how to design balanced companion beasts for **Saints Buddy Battles**, configure elemental typings, assemble level-up learnsets, and establish evolution chains.

---

## 1. Creature Concept & Base Stat Balancing

Each creature possesses 5 core base statistics that govern turn-based battle scaling:

$$\text{Base Stat Total (BST)} = \text{HP} + \text{ATK} + \text{DEF} + \text{SPD} + \text{SPC}$$

| Stage | Recommended BST Range | Typical Role |
| :--- | :--- | :--- |
| **Starter / Stage 1** | $300\text{--}350$ | Early game encounters with low initial HP and basic attacks. |
| **Mid-Evolution (Stage 2)** | $400\text{--}460$ | Intermediate combatants with specialized roles. |
| **Final Form (Stage 3)** | $500\text{--}550$ | Formidable endgame beasts with high single-stat specializations. |
| **Legendary / Mythic** | $580\text{--}620$ | Unique boss encounters and high-tier raid rewards. |

---

## 2. Elemental Typing & Affinity Matrix

Assign either a single primary type or a dual-typing combo from the 6 core elements:
- **Fire:** Offensive burst damage; counters Nature and Ice.
- **Water:** High HP/DEF hybrid; counters Fire and Rock.
- **Nature:** Status inflictions and health drains; counters Water and Ground.
- **Electric:** High speed and paralysis modifiers; counters Water and Flying.
- **Shadow:** Critical strike power; counters Divine and Psychic.
- **Divine:** Healing, team wards, and holy strikes; counters Undead and Shadow.

---

## 3. Move Pools & Level-Up Learnsets

Creatures can equip up to **4 active moves** during combat. Configure learnsets in `CreatureDefEditorPanel.tsx`:

```typescript
export const InfernofoxLearnset = [
  { level: 1,  moveId: 'scratch',       type: 'Normal', power: 40, acc: 100 },
  { level: 7,  moveId: 'ember',         type: 'Fire',   power: 40, acc: 100 },
  { level: 16, moveId: 'flame_wheel',   type: 'Fire',   power: 60, acc: 95  },
  { level: 24, moveId: 'will_o_wisp',   type: 'Fire',   power: 0,  acc: 85  }, // Burn status
  { level: 36, moveId: 'fire_blast',    type: 'Fire',   power: 110, acc: 85 }
];
```

---

## 4. Evolution Chains & Shiny Variants

- **Evolution Triggers:**
  - **Level Threshold:** Evolves automatically upon reaching target level (e.g. Lv 28).
  - **Elemental Stone:** Requires applying an evolutionary catalyst item (e.g. `fire_stone`).
  - **Trade Holding Item:** Evolves when traded to another player while holding a specific relic.
- **Shiny Variants:** Every creature automatically receives a shiny palette shift. When encountered in the wild, the engine rolls an RNG seed:
  $$P(\text{Shiny}) = \frac{1}{4096} \quad (\text{or } \frac{1}{512} \text{ with Prismatic Charm})$$
