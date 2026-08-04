# Saints Studio — Complete Gameplay Editors (25)

**Status:** Production gameplay-authoring contract (audit-backed)  
**Date:** 2026-08-04  
**Scope:** Every gameplay editor — player combat, creature combat, turn-based battles, abilities, status effects, skills, classes, professions, gathering, crafting, fishing, mining, woodcutting, smithing, cooking, alchemy, experience, level scaling, balancing tools — **reusable and data-driven**.

> **Companions (do not fork)**
> - [`02-combat-system.md`](./02-combat-system.md) · [`11-turn-based-battle-engine.md`](./11-turn-based-battle-engine.md) — combat constitution
> - [`09-progression-27-skills.md`](./09-progression-27-skills.md) · [`14-skills-economy-deep-dive.md`](./14-skills-economy-deep-dive.md) — skill matrix intent
> - [`23-studio-economy-system.md`](./23-studio-economy-system.md) — items, recipes, gather defs, loot
> - [`22`](./22-studio-npc-ai-creature-editors.md) · [`24`](./24-studio-quest-editor.md) · [`18`](./18-studio-master-architecture.md) · [`19`](./19-studio-ux-design.md)

**This document is the gameplay-editor master.** One **Ability** registry, one **Status** registry, one **Skill** registry, one **Class** dock, one **Profession/Recipe** pipeline, one **XP curve** config — editors are thin shells over shared catalogs (`CatalogEditorShell` / `SchemaFieldRenderer`).

**This document is the gameplay-editor master.** One **Ability** registry, one **Status** registry, one **Skill** registry, one **Class** dock, one **Profession/Recipe** pipeline, one **XP curve** config — editors are thin shells over shared catalogs (`CatalogEditorShell` / `SchemaFieldRenderer`).

---

# 0. Non-Negotiable Rules

1. **Data drives runtime.** CombatManager / EncounterManager / Hotbar / SkillManager read registries — not parallel hardcoded lists (migrate `combatAbilities.ts` → Ability registry).
2. **Reuse shells.** List|form|simulate|import pattern from Creature/Loot/Class docks — do not invent per-skill UIs.
3. **Capture remains TB-only** (`07`/`11`); ability flag `isCapture` never appears on RT hotbar.
4. **Economy owns items/recipes/gather node defs** (`23`); gameplay editors **link** skillSlug / ability ids — don’t duplicate vendorValue or loot weights.
5. **One XP policy module** — end dual combat/OSRS curves without documenting both as truth; bible 09 unified curve is the target unless GameConfig explicitly selects otherwise.
6. **Retire Dev Tools nested `ClassEditor`** when ClassEditorPanel has field parity (`18`).
7. **Balancing tools call the same pure simulate functions** the server uses (seeded RNG).

---

# 1. Audit → Unification

| Today | Target SoT | Demote |
| :--- | :--- | :--- |
| `combatAbilities.ts` + Hotbar hardcode | **AbilityDef** registry (wire Prisma `AbilityDictionary`) | Duplicate hotbar arrays |
| `AbilityDictionary` unused by combat | Same AbilityDef | Import-only drift |
| `StatusEffectDictionary` unused | **StatusDef** + TB/RT apply | Capture `statusModifier: 1` stub |
| ClassEditorPanel partial + ClassEditor memory | **ClassEditorPanel** full fields | Nested ClassEditor |
| CreatureDef stats; abilitiesJson hidden | Creature dock **Abilities** tab | — |
| `RESOURCE_NODE_MAP` 5/6 | GatherNodeDef (`23`) + skill link | Magic tiles |
| CraftingRecipe + overlay hardcode | Recipe Editor → Prisma | Client recipe arrays |
| skillTypings vs bible 14 matrix | **SkillDef** registry + alignment table | Silent label drift |
| Dual XP curves | `XpCurveDef` + GameConfig selector | Two formulas in SkillManager |
| No balance dock | **Balance Ops** (simulate DPS/XP/EV) | Spreadsheet-only |

---

# 2. Shared Editor Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  GAMEPLAY HUB (Studio mode Catalog / Dev)                    │
│  Tabs or docks: Abilities · Status · Skills · Classes ·      │
│  Professions · Combat Tuning · Balance Ops                   │
└───────────────┬─────────────────────────────────────────────┘
                │ uses
┌───────────────▼─────────────────────────────────────────────┐
│  CatalogEditorShell  +  SchemaFieldRenderer  +  pickers      │
│  (list · search · form · validate · simulate · deps viewer)  │
└───────────────┬─────────────────────────────────────────────┘
                │ writes
┌───────────────▼─────────────────────────────────────────────┐
│  Registries → hot-reload → Combat / Encounter / Skill / Craft│
└─────────────────────────────────────────────────────────────┘
```

**PanelId additions (register once — `19` checklist):**  
`abilities` · `status` · `skills` · `professions` · `combat` · `balance`  
(Classes / creatures / loot / items already exist — extend, don’t clone.)

---

# 3. Canonical Data Structures

## 3.1 AbilityDef (player RT + creature TB)

```ts
type AbilityDomain = "player_rt" | "creature_tb" | "both";

type AbilityTarget = "self" | "enemy" | "ally" | "aoe_enemies" | "aoe_allies" | "tile";

type AbilityEffect =
  | { type: "damage"; power: number; style: "physical"|"ability"|"true"; variance?: number }
  | { type: "heal"; power: number }
  | { type: "apply_status"; statusId: string; chance: number; turns?: number }
  | { type: "strip_status"; statusId?: string }
  | { type: "capture"; /* flagged; TB bag only */ }
  | { type: "modify_stat"; stat: string; delta: number; turns: number }
  | { type: "custom"; id: string; params?: Record<string, unknown> };

type AbilityDef = {
  id: string;                 // slug — strike, cleave, ram, tackle…
  name: string;
  description?: string;
  domain: AbilityDomain;
  style: "MELEE" | "MAGIC" | "RANGED" | "SUPPORT" | "TECH";
  target: AbilityTarget;
  rangeTiles?: number;        // RT
  cooldownMs?: number;        // RT
  cooldownTurns?: number;     // TB
  accuracy?: number;          // 0–1 or 0–100 — pick one in ECO/GP-1 and document
  manaCost?: number;
  staminaCost?: number;
  effects: AbilityEffect[];
  grantsSkillXp?: Array<{ skillSlug: string; amount: number }>; // replaces combatSkillXp hard map
  isCapture: boolean;
  icon?: string;
  animationId?: string;
  tags: string[];
  gameId?: string | null;
  isActive: boolean;
};
```

**Migrate:** `combatAbilities.ts` → seed AbilityDef; Hotbar loads by class `learnableAbilityIds` or style tags; EncounterManager resolves creature move ids from AbilityDef; Prisma `AbilityDictionary` columns map 1:1 or migrate JSON `effects`.

## 3.2 StatusDef

```ts
type StatusDef = {
  id: string;                 // burn, poison, sleep, expose…
  name: string;
  description?: string;
  maxStacks: number;
  durationTurnsDefault?: number;
  durationMsDefault?: number;
  tick: AbilityEffect[];      // on turn/tick
  onApply?: AbilityEffect[];
  onExpire?: AbilityEffect[];
  /** Capture chance multiplier contribution */
  captureModifier?: number;   // wires EncounterManager statusModifier
  tags: string[];
  isActive: boolean;
};
```

Wire Prisma `StatusEffectDictionary`.

## 3.3 SkillDef

```ts
type SkillCategory = "combat" | "gathering" | "artisan" | "support";

type SkillDef = {
  id: string;                 // slug — mining, smithing, attack…
  name: string;               // display — align rpg-stats labels here
  category: SkillCategory;
  description?: string;
  /** Which XP curve to use */
  xpCurveId: string;
  maxLevel: number;
  /** Icon / color for UI */
  icon?: string;
  tags: string[];
  /** Profession binding optional */
  professionId?: string;
  isActive: boolean;
};
```

**Single matrix:** seed from reconciled 09+14+`skillTypings` (product decision in GP-1: publish one canonical 27). Editors never hardcode skill lists.

## 3.4 XpCurveDef & level scaling

```ts
type XpCurveDef = {
  id: string;                 // "combat_sqrt50" | "osrs_99" | "linear"
  name: string;
  /** Pure function id known to server */
  algorithm: "sqrt_xp_div_50" | "osrs_table" | "exponential" | "table";
  maxLevel: number;
  /** For table algorithm */
  levelToXp?: number[];
  params?: Record<string, number>;
};

type LevelScalingRule = {
  id: string;
  /** e.g. mob HP scales with player level */
  appliesTo: "player_stat" | "creature_stat" | "ability_power" | "gather_xp" | "craft_xp";
  formula: "linear" | "exponential" | "none";
  params: Record<string, number>; // slope, base, cap
};
```

GameConfig references `defaultCombatXpCurveId`, `defaultGatherXpCurveId` — SkillManager switches on SkillDef.xpCurveId.

## 3.5 ClassDef (extend ClassEditorPanel)

```ts
type ClassDefDoc = {
  // existing ClassDefData fields…
  slug: string;
  classId: string;
  name: string;
  profileId?: string | null;
  statDeltas: Record<string, number>;
  skillDeltas: Record<string, number>;
  color: string;
  description: string;
  isPlayable: boolean;
  /** NEW — expose in editor */
  learnableAbilityIds: string[];
  startingEquipment: string[];      // itemIds
  growthRates?: Record<string, number>;
  skillProgression?: Array<{ level: number; skillSlug: string; unlock?: string }>;
  abilityProgression?: Array<{ level: number; abilityId: string }>;
  perkProgression?: Array<{ level: number; perkId: string }>;
  perks?: string[];
  combatStyleDefault?: "MELEE"|"MAGIC"|"RANGED";
};
```

Hotbar resolves: class progression ∪ style-tagged AbilityDefs — **not** hardcoded arrays.

## 3.6 ProfessionDef

```ts
type ProfessionId =
  | "woodcutting" | "mining" | "fishing" | "farming" | "hunter" | "foraging"
  | "smithing" | "crafting" | "fletching" | "cooking" | "herblore" | "runecrafting"
  | "alchemy" | "construction" | /* support as needed */;

type ProfessionDef = {
  id: ProfessionId | string;
  name: string;
  primarySkillId: string;     // SkillDef.id
  stationTags: string[];      // anvil, furnace, range, fishing_spot…
  relatedRecipeKinds: Array<"craft"|"refine"|"cook"|"smith"|"alchemy">;
  gatherNodeDefIds?: string[]; // optional index
  description?: string;
};
```

Professions are **views** over SkillDef + Recipe + GatherNodeDef (`23`) — editor groups them; no second XP system.

## 3.7 Combat tuning packs

```ts
type PlayerCombatTuning = {
  id: string;
  globalDamageMul: number;
  globalCooldownMul: number;
  losRequired: boolean;
  /** Ability id whitelist overrides per style — optional */
};

type CreatureCombatTuning = {
  id: string;
  tbDamageMul: number;
  tempoDefault: number;
  typeChartId?: string;       // reference chart doc
};

type TypeChartDef = {
  id: string;
  /** attacker → defender → multiplier */
  matrix: Record<string, Record<string, number>>;
};
```

Live TB should prefer one chart (retire unused `battle-engine.ts` chart or adopt it as data).

## 3.8 Balance scenario

```ts
type BalanceScenario = {
  id: string;
  name: string;
  playerClassId?: string;
  playerLevel: number;
  abilityId?: string;
  creatureSlug?: string;
  creatureLevel?: number;
  iterations: number;
  seed?: number;
};

type BalanceReport = {
  avgDamage: number;
  dps?: number;
  ttk?: number;
  xpPerHourEstimate?: number;
  captureRateAvg?: number;
  warnings: string[];
};
```

---

# 4. Editor Specifications

## 4.1 Ability Editor (`abilities` dock)

| Region | Content |
| :--- | :--- |
| List | Filter domain/style/capture/tag |
| Form | All AbilityDef fields; effects as row editor |
| Preview | Icon + cooldown chip |
| Simulate | Apply BalanceScenario stub damage |
| Deps | Classes/creatures referencing this ability |

**Workflow:** New ability → set domain both → effects damage → assign to class progression / creature moveset → Save → hot-reload `ability` → Walk RT or TB test.

## 4.2 Status Effect Editor (`status` dock)

Form for StatusDef; simulate capture modifier; list abilities that apply this status.

## 4.3 Skill Editor (`skills` dock)

| Field | UI |
| :--- | :--- |
| Matrix grid | 27 cells by category |
| Curve picker | XpCurveDef |
| Max level | number |
| Align warn | Diff vs bible checklist |

Bulk import/export JSON. **No** per-skill unique React page.

## 4.4 Class Editor (evolve existing)

Expose progression arrays, learnable abilities (multi-picker), starting equipment (item picker), growth rates. Remove Dev Tools ClassEditor when parity+tests green.

## 4.5 Profession Hub (`professions` dock)

Tabs per profession OR filterable list:

* Primary skill link  
* Station tags  
* Deep links: open Recipe Editor filtered by kind; open Gather defs filtered by skill  
* Fishing / Mining / Woodcutting / Smithing / Cooking / Alchemy each appear as ProfessionDef rows — **same editor**

## 4.6 Gathering gameplay editor

Does **not** duplicate Item Creator:

* Embed or link **GatherNodeDef** editor (`23`)  
* Tool tag requirements (axe/pick/rod) via item tags  
* XP from node → SkillDef  
* Fishing: rod tool + fish loot pool + fishing skill (add runtime beyond wood/ore)

## 4.7 Crafting / Smithing / Cooking / Alchemy

**Recipe Editor** (`23`) with `kind` filter:

| Profession | Recipe kind | Station |
| :--- | :--- | :--- |
| Smithing | smith / refine | anvil, furnace |
| Cooking | cook | range |
| Alchemy | alchemy | alembic |
| General craft | craft | crafting_table |
| Fletching etc. | craft | — |

Fail/burn chance on cook; refine ore→bar. Overlay fetches `/api/recipes` — delete hardcoded lists.

## 4.8 Player combat editor (`combat` dock — Player tab)

* PlayerCombatTuning  
* Hotbar layout presets by style (ordered ability ids)  
* Link to Ability Editor  
* Validate: no `isCapture` on RT presets  

## 4.9 Creature combat editor

* CreatureDefEditor **Abilities** tab (move slots → AbilityDef ids)  
* Learnset table optional (`CreatureLearnedAbility` migrate to JSON on CreatureDef or keep table)  
* CreatureCombatTuning + type chart  
* AI profile link (`22`)  

## 4.10 Turn-based battle editor

| Tool | Purpose |
| :--- | :--- |
| Encounter table / zone | Already Properties + spawner (`21`/`22`) |
| Trainer party editor | NPC component trainerBattle (`22`) |
| TB move picker preview | Test Bench: start dummy battle (Admin) |
| Status application rules | StatusDef captureModifier |

Constitution checklist in Validate: capture only via film items; RT lock during TB.

## 4.11 Experience & level scaling editor

* XpCurveDef CRUD  
* GameConfig: default curves + maxLevel  
* LevelScalingRule list  
* Preview table: level → XP required  

## 4.12 Balancing tools (`balance` dock)

| Tool | Input | Output |
| :--- | :--- | :--- |
| Ability DPS | scenario | avg damage, DPS |
| TB TTK | player move set vs creature | turns-to-KO |
| Capture EV | film + status + catchRate | success rate |
| Gather XP/h | node def + tool | XP/hour |
| Craft XP/h | recipe | XP/hour |
| Loot EV | pool id | credits EV (`23`) |
| Bulk skill XP mul | modifier | writes EconomyModifier / combat tuning |

Compare scenarios side-by-side; export CSV. **Never** fork formulas — call shared simulate modules.

---

# 5. Runtime Wiring Matrix

| Registry | Consumers |
| :--- | :--- |
| AbilityDef | CombatManager, Hotbar, EncounterManager FIGHT, Class progression |
| StatusDef | EncounterManager, CombatManager DoT, capture modifier |
| SkillDef + XpCurve | SkillManager, Class skill deltas labels, Profession hub |
| ClassDef | Character create, Hotbar unlocks, stat resolve |
| ProfessionDef | UI grouping only (+ validation) |
| GatherNodeDef | GatherService (`23`) |
| CraftingRecipe | CraftService |
| Combat tuning | Managers on load |
| TypeChart | EncounterManager damage |

Hot-reload channels: `ability` · `status` · `skill` · `class` · `xp_curve` · `combat_tuning` · existing `recipe`/`item`/`loot`.

---

# 6. Reusable Component Checklist

Every new gameplay editor MUST:

1. Use `CatalogEditorShell` (list/form/seed/import)  
2. Use shared pickers (ability, skill, item, creature, status)  
3. Register `PanelId` + `STUDIO_DOCK_MIN_LEVEL`  
4. Emit `content_reload`  
5. Show dependency viewer  
6. Avoid embedding balance numbers that belong on Item/Loot/Gather defs  

---

# 7. Workflows

## 7.1 Add RT melee ability

1. Ability Editor → domain player_rt · MELEE · damage effect · cooldown  
2. grantsSkillXp → attack skill  
3. Class Warrior abilityProgression level 1  
4. Save · Walk · hotbar  

## 7.2 Add TB creature move

1. Ability Editor → creature_tb · effects  
2. CreatureDef Abilities tab → add move  
3. Walk tall grass · FIGHT uses ability  

## 7.3 Add status “Expose”

1. Status Editor → captureModifier 1.2 · duration turns  
2. Ability apply_status chance 100%  
3. TB test capture rate sim  

## 7.4 Mining profession loop

1. Skill mining on curve  
2. GatherNodeDef copper + loot + XP  
3. Recipe refine ore→bar (smithing)  
4. Place nodes (`21`) · craft at furnace  
5. Balance XP/h tool  

## 7.5 Cooking

1. Profession cooking · skill · station range  
2. Recipes kind cook · failChance  
3. Consumable food effects heal (`23` ItemEffect)  

## 7.6 Alchemy

1. Add SkillDef alchemy if missing from matrix  
2. Profession + recipes kind alchemy  
3. Potion ItemEffects buff  

## 7.7 Level curve change

1. Edit XpCurveDef params  
2. Preview table  
3. SkillManager reload — **one** place  

## 7.8 Balance pass

1. Balance Ops → TTK warrior vs rockitten  
2. Adjust Ability power OR creature baseHp (not both ad-hoc in manager)  
3. Re-sim · save  

---

# 8. Validation

| Check | Level |
| :--- | :--- |
| Capture ability on RT hotbar preset | Hard |
| Unknown abilityId on class/creature | Hard |
| Skill slug not in SkillDef | Hard |
| Dual ClassEditor both dirty | Soft warn / block nested save |
| Recipe skillSlug missing SkillDef | Hard |
| Gather tool tag matches no item | Soft |
| Curve maxLevel &lt; GameConfig maxLevel mismatch | Soft |
| Bible matrix missing active skill | Soft (alignment report) |

---

# 9. Phased Delivery

| Phase | Ship | Non-goals |
| :--- | :--- | :--- |
| **GP0 Docs** ✅ | This bible | — |
| **GP1 Abilities + wire RT** | AbilityDef from combatAbilities; Hotbar/CombatManager load registry; Class learnable UI | Full TB move UI |
| **GP2 Status + TB abilities** | StatusDef; Creature abilities tab; EncounterManager uses AbilityDef + captureModifier | New battle engine |
| **GP3 Skills + XP curves** | SkillDef registry; unify SkillManager curves via config; Skill dock | Rewrite all 27 content |
| **GP4 Class parity + kill nested editor** | Progression fields; delete/hide ClassEditor | — |
| **GP5 Professions + recipes/gather link** | Profession hub; Recipe API for overlay; fishing runtime | — |
| **GP6 Balance Ops** | DPS/TTK/XP/h/capture sims; type chart data | Spreadsheet import mandatory |

---

# 10. Anti-Patterns

1. New hardcoded ability list in Hotbar  
2. Second skill label map in rpg-stats-overlay  
3. Alchemy as one-off React page instead of Profession+Recipe  
4. Balancing by editing CombatManager constants  
5. Keeping AbilityDictionary and combatAbilities both authoritative  
6. Gathering XP only in RESOURCE_NODE_MAP  
7. Cooking recipes only in client overlay  
8. Status effects that exist in DB but never apply  
9. Per-profession Studio apps  
10. Capture on RT hotbar “just for testing” in production presets  

---

# Final Rule

**Gameplay editors author registries. Registries feed managers. Managers never own secret balance numbers.**  
If two editors edit the same knob, delete one. If a profession needs a new UI paradigm, extend Profession Hub + Recipe/Gather — don’t fork Studio.
