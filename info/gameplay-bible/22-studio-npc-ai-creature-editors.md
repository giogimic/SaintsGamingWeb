# Saints Studio — NPC, AI & Creature Editors (22)

**Status:** Production editor + data contract (audit-backed)  
**Date:** 2026-08-04  
**Scope:** Every editor and supporting data structure for NPCs, behaviour, schedules, dialogue, relationships, patrols, combat AI, shops, quests, reputation, creature definitions, capture, spawning, evolution, companions, bosses, world bosses, and events.

> **Companions (do not fork)**
> - [`15-quests-dialogue-npc-ai.md`](./15-quests-dialogue-npc-ai.md) — dialogue/quest/FSM philosophy
> - [`24-studio-quest-editor.md`](./24-studio-quest-editor.md) — **complete quest editor** (graphs, schedules, testing)
> - [`18`](./18-studio-master-architecture.md) — registries, hot-reload
> - [`19`](./19-studio-ux-design.md) — docks, Inspector, graphs, shortcuts
> - [`20`](./20-studio-entity-system.md) — entity components / prefabs / spawners
> - [`21`](./21-studio-world-building-tools.md) — place vs paint; spawn regions
> - [`07`](./07-technical-economic-rules.md) / [`11`](./11-turn-based-battle-engine.md) — capture & combat constitution

**This document is the NPC/AI/creature editor master.** Quest graph/schedules/cutscenes/testing detail: **`24`**. Evolve existing docks — do not invent parallel “AI Studio” apps.

---

# 0. Non-Negotiable Rules

1. **Maps place instances; registries define behaviour.** NPC instances reference dialogue/quest/shop/AI profile ids (`20`).
2. **Dialogue in production is static JSON** — Ollama only at authoring time (`15`).
3. **Capture is turn-based only** (`07`/`11`) — never RT hotbar.
4. **AI ticks are cheap** — 1 Hz overworld FSM/BT; combat uses existing RT/TB pipelines.
5. **Editors bind to schemas/components** — new AI feature = data + optional graph UI, not a new dock framework.
6. **Reuse** CreatureManager FSM, DialogueManager actions, QuestManager events, EncounterManager capture, ShopManager, `CreatureDef` / `NpcDialogueTree` / `QuestTemplate`.
7. **Boss ≠ new mesh system** — boss is creature/NPC archetype + encounter rules + events.

---

# 1. Audit → Target

| Today | Target |
| :--- | :--- |
| NPC place: name/sprite/greeting/questSlug | Full NPC entity + AI/schedule/shop/faction |
| Dialogue: flat nodes + actions | Graph editor + conditions + Ollama assist |
| Quest: partial fields | Full objectives/rewards/reputation hooks |
| CreatureDef: strong catalog | + evolution, boss tags, spawn hooks |
| CreatureManager FSM | Data-driven AI profiles + optional BT |
| DEMO_WILD_SPOTS hardcoded | Spawner entities + encounter tables |
| `CreatureEvolution` on Tuxemon templates only | Unified evolution on `CreatureDef` |
| No schedules/reputation/world bosses | Designed registries + editors below |
| SchemaFieldRenderer orphaned | Wire into NPC/Creature Inspectors |

---

# 2. System Map & Editors Inventory

```
┌─────────────────────────────────────────────────────────────────┐
│ POPULATE MODE (19)                                               │
│  Outliner · Inspector · Place tool                               │
│  Docks: NPC · Dialogue · Quest · Creature · Loot · (Shop) · Event│
└─────────────┬───────────────────────────┬───────────────────────┘
              │                           │
              ▼                           ▼
     Definition Registries          Map Instances (entities)
     AIProfile · Schedule           NPC / Monster / Spawner /
     DialogueTree · Quest           EncounterZone / BossAnchor
     Shop · Faction · Reputation
     CreatureDef · Evolution
     EncounterTable · WorldEvent
```

### Editor surfaces (complete set)

| Editor ID | UI home | Edits |
| :--- | :--- | :--- |
| **NPC Instance** | Place + Inspector (+ NPC list dock) | Transform, component refs |
| **NPC Prefab** | Assets → Prefabs | Reusable NPC packages |
| **AI Profile** | Dev/Catalog → AI Profiles (new catalog dock tab or subpanel) | FSM/BT definitions |
| **Schedule** | Sub-editor on NPC or shared Schedule registry | Time→state/location |
| **Dialogue Graph** | Dialogue dock (evolve) | Trees, conditions, actions |
| **Relationship / Faction** | Faction catalog + NPC Inspector | Factions, standings |
| **Patrol Path** | Viewport gizmo + Inspector | Waypoints on map |
| **Combat AI** | Part of AI Profile + CreatureDef | Aggro, abilities, TB/RT |
| **Shop Catalog** | Shop dock (new; or Items sibling) | Listings by `shopId` |
| **Quest** | Quest dock (evolve) | Stages, rewards, reputation |
| **Reputation** | Faction/Reputation catalog | Tracks + thresholds |
| **Creature Def** | Creature dock (evolve) | Species bible |
| **Evolution** | Creature dock tab | Chains / items / levels |
| **Capture Tuning** | Creature + Items (films) | catchRate, films |
| **Spawner** | Place spawner entity | Pools, caps, conditions |
| **Companion Rules** | Creature / GameConfig | Party slots, follow AI |
| **Boss** | Creature tag + Boss Encounter editor | Phases, enrage, locks |
| **World Boss** | World Event + Boss Anchor entity | Schedule, shard rules |
| **World Event** | Event dock (new) | Calendar, spawns, modifiers |

---

# 3. Supporting Data Structures (canonical)

All types live conceptually under `src/shared/game/` (implement in phases). JSON columns / Prisma as noted.

## 3.1 References (shared)

```ts
type Id = string;
type MapRef = { mapId: string };
type EntityRef = { mapId: string; entityId: string };
type CreatureDefRef = { slug: string }; // CreatureDef.slug
type QuestRef = { slug: string };
type DialogueRef = { treeId: string }; // NpcDialogueTree.npcId or tree cuid
type ShopRef = { shopId: string };
type FactionRef = { factionId: string };
type AiProfileRef = { profileId: string };
type ScheduleRef = { scheduleId: string };
type LootRef = import("./lootRefs").LootRef;
```

## 3.2 NPC instance (entity components — extends `20`)

```ts
type NpcIdentity = {
  displayName: string;
  title?: string;          // "Warden"
  tags: string[];          // "vendor","trainer","boss_minion"
};

type NpcSprite = {
  spriteId: string;
  scale?: number;
  animSet?: string;
  facing?: "up"|"down"|"left"|"right";
};

type NpcDialogueBind = {
  treeId: string;          // NpcDialogueTree.npcId convention OR tree id
  greetingFallback?: string[];
};

type NpcQuestGiver = {
  questSlugs: string[];
  autoOffer?: boolean;
};

type NpcVendor = {
  shopId: string;
};

type NpcAiBind = {
  profileId: string;       // AiProfile
  behaviourPreset?: "idle"|"wander"|"patrol"|"guard"|"scripted";
  wanderRadius?: number;
  hostile?: boolean;
  level?: number;
};

type NpcPatrol = {
  pathId?: string;         // PatrolPath on this map
  waypoints?: Vec2[];      // inline if no shared path
  loop: boolean;
  pauseMsAtWaypoint?: number;
};

type NpcScheduleBind = {
  scheduleId: string;
};

type NpcFactionBind = {
  factionId: string;
  rank?: number;
};

type NpcCombat = {
  trainerBattle?: {
    party: Array<{ speciesSlug: string; level: number }>;
    rewardGold?: number;
    rebattle?: boolean;
  };
  rtCombatant?: boolean;   // rare — usually monsters
};

type NpcLoot = { loot: LootRef };
```

**Legacy adapter:** `MapNpcData { id,name,x,y,sprite,direction?,dialogue? }` → Identity+Sprite+transform; dialogue[] → greetingFallback until tree exists (`placeMapNpc` already creates trees).

## 3.3 AI Profile

```ts
type AiTickRate = "1hz" | "combat"; // overworld vs in-battle

type AiCondition =
  | { op: "hp_below"; pct: number }
  | { op: "hp_above"; pct: number }
  | { op: "player_in_range"; tiles: number; requiresLos?: boolean }
  | { op: "player_out_range"; tiles: number }
  | { op: "schedule_block"; blockId: string }
  | { op: "quest_status"; questSlug: string; status: "ACTIVE"|"COMPLETED"|"NONE" }
  | { op: "reputation_at_least"; factionId: string; value: number }
  | { op: "var"; key: string; cmp: "eq"|"neq"|"gt"|"lt"; value: unknown }
  | { op: "time_between"; startHour: number; endHour: number }
  | { op: "and"|"or"; of: AiCondition[] };

type AiAction =
  | { op: "set_state"; state: AiStateId }
  | { op: "move_random"; radius: number }
  | { op: "move_to"; x: number; y: number }
  | { op: "follow_patrol" }
  | { op: "chase_player" }
  | { op: "flee_player" }
  | { op: "attack_aoe"; radius: number; damage: number } // bridges today
  | { op: "start_dialogue"; treeId?: string }
  | { op: "emit_event"; name: string; payload?: Record<string, unknown> }
  | { op: "play_anim"; anim: string };

/** Keep existing enum as AiStateId */
type AiStateId = "IDLE"|"WANDER"|"CHASE"|"ATTACK"|"RETURN"|"FLEE"|"SCRIPTED"|"PATROL"|"SCHEDULED";

type AiFsmTransition = {
  id: string;
  from: AiStateId | "*";
  to: AiStateId;
  when: AiCondition;
  priority?: number;
};

type AiFsmProfile = {
  kind: "fsm";
  id: string;
  name: string;
  initial: AiStateId;
  states: AiStateId[];
  transitions: AiFsmTransition[];
  stateActions?: Partial<Record<AiStateId, AiAction[]>>; // per-tick or on-enter
  aggroRange?: number;      // default 7 — matches CreatureManager today
  tick: AiTickRate;
};

/** Behaviour tree — authoring format; runtime interpreter Phase NAC-3 */
type BtNode =
  | { type: "sequence"|"selector"; children: BtNode[] }
  | { type: "condition"; when: AiCondition }
  | { type: "action"; do: AiAction }
  | { type: "cooldown"; ms: number; child: BtNode }
  | { type: "subtree"; profileId: string };

type AiBtProfile = {
  kind: "bt";
  id: string;
  name: string;
  root: BtNode;
  tick: AiTickRate;
};

type AiProfile = AiFsmProfile | AiBtProfile;
```

**Runtime bridge:** Until BT interpreter ships, Studio may author BT but export **compiled FSM** or only enable FSM profiles in production. CreatureManager reads `AiProfile` instead of hardcoded thresholds when `profileId` present.

## 3.4 Schedules

```ts
type DayPhase = "dawn"|"morning"|"midday"|"afternoon"|"dusk"|"night";

type ScheduleBlock = {
  id: string;
  /** 0–24 exclusive end; wraps midnight if end < start */
  startHour: number;
  endHour: number;
  label?: string;
  /** Where to be */
  goTo?: { mapId?: string; x: number; y: number };
  /** Override AI while active */
  aiProfileId?: string;
  behaviourPreset?: NpcAiBind["behaviourPreset"];
  /** Dialogue override tree for this window */
  dialogueTreeId?: string;
  /** Hide/despawn NPC */
  visible?: boolean;
};

type ScheduleDef = {
  id: string;
  name: string;
  timezone?: "world";      // single shared world clock
  blocks: ScheduleBlock[];
};
```

World clock: server `worldHour` 0–23 (existing or add). Schedule system each AI tick picks active block.

## 3.5 Patrol paths (map-local)

```ts
type PatrolPath = {
  id: string;
  mapId: string;
  name: string;
  waypoints: Vec2[];
  loop: boolean;
};
```

Store in `WorldMap.patrolsData` JSON **or** as entities with only transform+meta. Prefer map JSON array for shared paths.

## 3.6 Dialogue (extends today’s tree)

```ts
type DialogueCondition =
  | { op: "quest_status"; questSlug: string; status: "NONE"|"ACTIVE"|"COMPLETED" }
  | { op: "quest_stage"; questSlug: string; stage: number; cmp?: "eq"|"gte" }
  | { op: "has_item"; itemId: string; qty?: number }
  | { op: "reputation"; factionId: string; min: number }
  | { op: "flag"; key: string; value?: boolean }
  | { op: "level_gte"; level: number };

type DialogueActionId =
  | "" | "ACCEPT_QUEST" | "OPEN_SHOP" | "HEAL_PARTY" | "START_TRAINER_BATTLE"
  | "GRANT_DEMO_TOOLS" | "GRANT_DEMO_FILM" | "OPEN_LAB" | "DEMO_QUEST_REPORT"
  | "GRANT_SPYDER_STARTER"  // add to KNOWN_ACTIONS
  | "ADJUST_REPUTATION" | "SET_FLAG" | "GIVE_ITEM" | "OPEN_CRAFTING"
  | "START_EVENT" | "WARP_PLAYER";

type DialogueOption = {
  label: string;
  nextNode: string | "exit";
  action?: DialogueActionId;
  questSlug?: string;
  /** action payload */
  params?: Record<string, unknown>; // e.g. { factionId, delta } for reputation
  condition?: DialogueCondition;
};

type DialogueNode = {
  id: string;
  text: string;
  options: DialogueOption[];
  /** Editor graph layout */
  editor?: { x: number; y: number };
};

type DialogueTreeDoc = {
  v: 1;
  npcId: string;           // binding key
  name: string;
  startNode: string;       // default "node_start"
  nodes: Record<string, DialogueNode>;
  idleQuotes?: string[];   // from Ollama assist
  personalityPrompt?: string; // authoring only — strip on export optional
};
```

Prisma: keep `NpcDialogueTree.data` as stringified `DialogueTreeDoc` (migrate from flat `{ node_start: {text, options} }` via adapter).

## 3.7 Relationships & Reputation

```ts
type FactionDef = {
  id: string;
  name: string;
  description?: string;
  color?: string;
  /** Standing toward other factions */
  relations?: Array<{ otherFactionId: string; disposition: "allied"|"neutral"|"hostile" }>;
};

type ReputationTrack = {
  factionId: string;
  /** Player-facing thresholds */
  ranks: Array<{ min: number; id: string; label: string }>; // e.g. -100..100
};

type ReputationAdjust = {
  factionId: string;
  delta: number;
  reason?: string;
};

/** Player cold state — new Prisma PlayerReputation or JSON on profile */
type PlayerFactionStanding = {
  userId: string;
  factionId: string;
  value: number;
};
```

NPC `factionId` feeds dialogue conditions + shop discounts (future) + aggro exceptions.

## 3.8 Shops

```ts
type ShopListing = {
  itemId: string;
  priceGold: number;
  stock?: number | null;   // null = infinite
  requiredReputation?: { factionId: string; min: number };
  requiredQuest?: QuestRef;
};

type ShopDef = {
  id: string;
  name: string;
  gameId?: string;
  listings: ShopListing[];
  buyback?: boolean;
};
```

Migrate `shopCatalog.ts` → DB/`ShopDef` registry. NPC `Vendor.shopId` + dialogue `OPEN_SHOP` with `params.shopId` (default from Vendor component).

## 3.9 Quests (evolve QuestTemplate)

```ts
type QuestObjectiveType =
  | "TALK" | "CLAIM" | "BATTLE" | "GATHER" | "KILL" | "EXPLORE"
  | "CRAFT" | "CLEAR" | "DELIVER" | "ESCORT" | "REPUTATION";

type QuestObjectiveDoc = {
  stage: number;
  type: QuestObjectiveType;
  targetSlug: string;
  requiredQty: number;
  description: string;
  /** Optional map gate */
  mapId?: string;
};

type QuestRewardsDoc = {
  xp?: number;
  gold?: number;
  items?: Array<{ slug: string; qty: number }>;
  nextQuest?: string;
  reputation?: ReputationAdjust[];
  unlockFlags?: string[];
};

type QuestTemplateDoc = {
  slug: string;
  gameId: string;
  title: string;
  description: string;
  levelReq: number;
  isRepeatable: boolean;
  timeLimitMins?: number | null;
  rewards: QuestRewardsDoc;
  objectives: QuestObjectiveDoc[];
  /** Giver hint for Studio */
  defaultGiverNpcId?: string;
};
```

Studio must expose `levelReq`, `isRepeatable`, `requiredQty`, `timeLimitMins`, structured rewards (not JSON-only).

## 3.10 Creature definition (evolve CreatureDef)

```ts
type CreatureRole =
  | "standard" | "starter" | "wild" | "companion_focus"
  | "boss" | "world_boss" | "trainer_only" | "event";

type EvolutionMethod =
  | { type: "level"; atLevel: number }
  | { type: "item"; itemId: string }
  | { type: "trade" }
  | { type: "quest"; questSlug: string }
  | { type: "location"; mapId: string }
  | { type: "affection"; min: number }; // future

type EvolutionEdge = {
  id: string;
  fromSlug: string;
  toSlug: string;
  method: EvolutionMethod;
  keepShiny?: boolean;
};

type CreatureDefDoc = {
  // existing CreatureDef fields…
  slug: string;
  name: string;
  gameId?: string | null;
  dexNumber: number;
  typePrimary: string;
  typeSecondary: string;
  sprites: { overworld: string; battle?: string; back?: string };
  shiny: { enabled: boolean; useGlobalChance: boolean; chancePercent: number; sprites?: {...} };
  baseStats: { hp: number; physicalPower: number; physicalDefense: number; abilityPower: number; abilityDefense: number; combatTempo: number };
  catchRate: number;
  starterLevel: number;
  passives: Array<{ id: string; name: string; description: string; isDefault: boolean }>;
  abilities: Array<{ abilitySlug: string; currentCooldown?: number }>;
  worldSkill?: { name: string; description: string };
  flavor?: string;
  tag: string;
  tagColor: string;
  stage: string;           // "basic"|"stage2"|…
  roles: CreatureRole[];   // replaces ad-hoc flags + extends
  isStarter: boolean;
  isWildSpawn: boolean;
  isActive: boolean;
  sortOrder: number;
  /** Combat AI profile for overworld CREATURE spawns */
  aiProfileId?: string;
  loot?: LootRef;
  /** Boss tuning */
  boss?: BossTuning;
};
```

Unify evolution: prefer `EvolutionEdge` rows keyed by CreatureDef slug (migrate from `CreatureEvolution`/`CreatureTemplate`).

## 3.11 Capture

```ts
type CaptureFilmDef = {
  itemId: string;
  multiplier: number;      // film_standard:1, film_fine:2, film_soul:255
};

type CaptureRollContext = {
  speciesSlug: string;
  catchRate: number;       // from CreatureDef
  wildLevel: number;
  filmId: string;
  // future: status, HP factor already in EncounterManager — keep server authority
};
```

Editor: CreatureDef `catchRate` + Items dock for films. No separate “capture editor” — **Capture Tuning** view filters CreatureDef by catchRate + links films.

## 3.12 Spawning

```ts
type SpawnWeight = { speciesSlug: string; weight: number; minLevel: number; maxLevel: number };

type SpawnerComponent = {
  pool: SpawnWeight[];
  maxPopulation: number;
  wanderRadius: number;
  respawnDelayMs: number;
  spawnMode: "ROAMING" | "STATIC" | "ENCOUNTER_PRIVATE" | "EVENT_GLOBAL";
  aiProfileId?: string;
  conditions?: AiCondition[];
  despawnBehaviour: "keep" | "despawn_distant" | "despawn_idle";
};

type EncounterTableDoc = {
  id: string;
  name: string;
  gameId?: string;
  entries: SpawnWeight[];
  /** Optional link from encounter_zone / tall grass */
};
```

Replace DEMO_WILD_SPOTS with map spawner entities; `EncounterManager.loadWildSpawnDefs` may still seed pools, but zones reference `EncounterTableDoc` / spawner pools.

## 3.13 Companions

```ts
type CompanionRules = {
  maxParty: number;          // existing party slots
  maxStorage?: number;
  follow?: {
    enabled: boolean;
    offsetTiles: number;
    aiProfileId?: string;    // calm follow FSM
  };
  // Lab already OPEN_LAB — keep
};
```

Party = `PlayerCreature.isParty`. Companion follow is optional overworld pet entity bound to player — Phase NAC-5.

## 3.14 Bosses & World bosses

```ts
type BossPhase = {
  id: string;
  hpPctBelow: number;        // enter when HP% < threshold
  aiProfileId: string;
  abilities?: string[];
  announce?: string;
  spawnAdds?: SpawnWeight[];
};

type BossTuning = {
  encounterKind: "overworld_rt" | "turn_based" | "hybrid";
  phases: BossPhase[];
  enrageAfterMs?: number;
  lockFlee?: boolean;
  lockCapture?: boolean;     // bosses usually true
  remarkableTag?: string;    // feeds remarkableCapture
  loot: LootRef;
  musicId?: string;
};

type WorldBossAnchor = {
  /** Entity archetype world_boss_anchor */
  bossCreatureSlug: string;
  eventId: string;           // WorldEvent that enables spawn
  spawnMode: "EVENT_GLOBAL";
  leashRadius?: number;
  contributionScoring?: boolean;
};
```

## 3.15 World events

```ts
type WorldEventDef = {
  id: string;
  name: string;
  gameId?: string;
  enabled: boolean;
  /** Cron-like or window */
  schedule: {
    type: "window" | "cron" | "manual";
    startAt?: string;        // ISO
    endAt?: string;
    cron?: string;
  };
  modifiers?: {
    weatherId?: string;
    musicId?: string;
    spawnMultiplier?: number;
    shopListingsExtra?: ShopListing[];
  };
  spawnAnchors?: string[];   // entity ids / prefab stamps to enable
  questHooks?: QuestRef[];
  announcement?: string;
};
```

`SpawnMode.EVENT_GLOBAL` activates when parent event is live.

---

# 4. Editor Designs (detail)

## 4.1 NPC Creation (Instance + Prefab)

**Workflow (min clicks — `19`):**
1. Populate mode → drag sprite or Place → NPC prefab  
2. Inspector: Identity, Sprite, Dialogue, Quests, Vendor, AI, Schedule, Faction, Patrol  
3. Optional: “Generate dialogue” (Ollama) → review in Dialogue Graph  
4. Save map + defs · live `map_entities` reload  

**NPC List dock:** table of map NPCs; select syncs Outliner; delete/duplicate.

**NPC Prefab browser:** packaged components for vendors, trainers, quest givers.

## 4.2 Behaviour trees & AI Profile Editor

**UI:** Catalog list | graph canvas (BT) or transition table (FSM).

| Mode | Default for |
| :--- | :--- |
| FSM table | Most NPCs / wilds (maps to CreatureManager) |
| BT graph | Advanced Tier / bosses |

**Actions:** New profile · Clone · Validate (unreachable states) · Simulate (dry-run conditions) · Assign to selection.

**Shortcuts:** Align with `19` Catalog mode.

## 4.3 Schedule Editor

Timeline 0–24h with blocks as ranges; drag to resize; pick goTo via “Pick on map”; assign AI/dialogue overrides.

Preview: scrub world hour in Studio Advanced → NPC ghosts move (editor overlay).

## 4.4 Dialogue Editor

Evolve `DialogueEditorPanel`:

| Tab | Content |
| :--- | :--- |
| Graph | Node cards positioned; edges; drag options |
| Nodes | Today’s list (keep) |
| Raw JSON | Advanced only |
| Assist | Personality prompt → Ollama draft → merge |

**Add:** condition builder on options; action params; idle quotes; start node picker; Play-from-node preview (`19`).

**KNOWN_ACTIONS:** add missing runtime actions + reputation/flag/item.

## 4.5 Relationships / Faction Editor

Small catalog: factions, colors, relation matrix, reputation ranks. NPC Inspector dropdown `factionId`.

## 4.6 Patrol Editor

Viewport tool: click to add waypoints · Enter finish · assign to selected NPC. Gizmo shows path (`19`/`21`).

## 4.7 Combat AI

- **Overworld RT:** AI Profile states CHASE/ATTACK/FLEE + params (aggro, AoE)  
- **TB trainer:** `NpcCombat.trainerBattle.party` editor (species picker + level)  
- **Creature wild:** CreatureDef `aiProfileId` + abilities JSON (expose in Creature dock — today hidden)

## 4.8 Shop Editor

New dock or Items sibling:

* List shops · listings table (item picker, price, stock, reputation gate)  
* “Assign to selected NPC Vendor”  
* Preview buy in Walk (existing ShopManager)

## 4.9 Quest Editor

Evolve panel:

* Expose levelReq, repeatable, timeLimit, requiredQty  
* Objective types include CRAFT/CLEAR/EXPLORE/DELIVER/REPUTATION  
* Rewards row editor + reputation deltas + nextQuest  
* “Assign to selected NPC”  
* Validate dangling targets  

## 4.10 Reputation

Faction editor ranks + Quest/Dialogue actions `ADJUST_REPUTATION`. Debug: Dev Tools “Set standing”.

## 4.11 Creature Definition Editor

Keep CreatureDefEditorPanel strength; add tabs:

| Tab | Fields |
| :--- | :--- |
| Identity | existing |
| Combat | stats + **abilities** list UI |
| World | world skill, flavor |
| Spawn | isWildSpawn, roles, aiProfileId, loot |
| Shiny | existing |
| Evolution | edges from/to this slug |
| Boss | BossTuning if role includes boss |

## 4.12 Capture tooling

* Creature catchRate + role flags `lockCapture` on bosses  
* Film items in Item Creator (`18` Phase 3)  
* Encounter smoke checklist in Help  

## 4.13 Spawner Editor

Place invisible spawner · Inspector `SpawnerComponent` via SchemaFieldRenderer · radius gizmo · pool row editor · link EncounterTable.

## 4.14 Evolution Editor

List edges; from/to creature pickers; method form; validate acyclic; runtime evolve API must **mutate** `PlayerCreature` (today check-only — design requires write path).

## 4.15 Companions

* Lab flow stays  
* CompanionRules in GameConfig / Dev  
* Optional follow toggle for Walk playtest  

## 4.16 Boss Editor

On CreatureDef Boss tab + optional **Boss Encounter** preset:

* Phases list · AI profile per phase · loot · lock flee/capture · music  
* Place boss as STATIC monster entity or TB gate NPC  

## 4.17 World Boss + Events Editor

**Event dock:** calendar list · enable windows · modifiers · linked anchors.

**World Boss:** Place `world_boss_anchor` entity · link `eventId` + creature slug · EVENT_GLOBAL spawn when live · announcement toast.

---

# 5. Runtime Conversion Matrix

| Authored | Runtime |
| :--- | :--- |
| NPC entity + Dialogue | `spawnCreature` NPC STATIC + DialogueManager |
| AI FSM profile | CreatureManager transitions (data-driven) |
| Schedule | Each tick pick block → move / swap dialogue / visibility |
| Patrol | Path follow in PATROL state |
| Vendor + ShopDef | OPEN_SHOP → ShopManager catalog by id |
| QuestTemplate | QuestManager (unchanged event verbs + new types) |
| Reputation actions | PlayerFactionStanding update |
| Spawner | Population controller replacing DEMO_WILD_SPOTS |
| Encounter table | EncounterManager wild pick / zone |
| CreatureDef | Party, wild, TB, sprites |
| Evolution edge | Evolve endpoint mutates speciesSlug/stats |
| BossTuning | Phase watcher on HP |
| WorldEvent | Scheduler enables anchors / modifiers |

---

# 6. Hot-Reload Channels (`18`)

| Save | Emit |
| :--- | :--- |
| NPC place/edit | `map_entities` |
| Dialogue tree | `dialogue` |
| Quest | `quest` |
| CreatureDef | `creature` |
| AI profile | `ai_profile` |
| Shop | `shop` |
| Faction/reputation defs | `faction` |
| Schedule | `schedule` |
| World event | `world_event` |
| Spawner | `map_entities` |

---

# 7. Validation

| Check | Level |
| :--- | :--- |
| Dialogue action unknown | Hard |
| Option condition unsatisfiable | Soft |
| Quest target slug missing | Warn draft / Hard publish |
| AI profile cycle / empty states | Hard |
| Schedule overlapping ambiguous | Soft (priority by list order) |
| Evolution cycle | Hard |
| Boss lockCapture + catch tutorial | Soft |
| Spawner empty pool | Hard |
| Shop itemId missing | Hard |
| NPC shopId without Vendor | Soft |

---

# 8. Workflows (placement → save)

## 8.1 Quest NPC

1. Create Quest in Quest dock → Save def  
2. Place NPC → Inspector questSlugs + dialogue  
3. Dialogue option ACCEPT_QUEST + questSlug  
4. Save map · reload entities · Walk · talk · accept  

## 8.2 Vendor

1. Shop Editor listings → Save  
2. NPC Vendor.shopId · Dialogue OPEN_SHOP  
3. Save · Walk · buy  

## 8.3 Patrol guard

1. Draw patrol path  
2. AI profile PATROL/IDLE · assign  
3. Schedule night → return to barracks waypoint  
4. Save · scrub hour / Walk  

## 8.4 Wild spawn + capture

1. CreatureDef isWildSpawn + catchRate  
2. Place Spawner with pool  
3. Tall grass encounter table optional  
4. Save · Walk · TB capture with film  

## 8.5 Evolution

1. Evolution edge Rockitten → Rockoun at level  
2. Player levels in TB/XP  
3. Evolve API applies; party UI updates  

## 8.6 World boss event

1. CreatureDef role world_boss + BossTuning  
2. Place anchor · WorldEvent weekend window  
3. Event starts → EVENT_GLOBAL spawn · announce  
4. Kill → loot · reputation · despawn  

---

# 9. Prisma / persistence plan (additive)

| Data | Storage |
| :--- | :--- |
| Dialogue / Quest / CreatureDef | Existing tables (evolve JSON shape) |
| ShopDef | New `ShopDef` or GameConfig JSON |
| Faction / Reputation ranks | New `FactionDef`; `PlayerReputation` |
| AiProfile / Schedule | New tables or `GameAsset`-like JSON registry |
| PatrolPath | `WorldMap.patrolsData` |
| EvolutionEdge | Extend/replace `CreatureEvolution` to ref CreatureDef.slug |
| WorldEvent | New `WorldEvent` table |
| NPC instance extras | Entity components in `entitiesData` (`20`) |

No big-bang drop of `npcsData` — adapters remain.

---

# 10. Phased Delivery

| Phase | Ship | Reuse |
| :--- | :--- | :--- |
| **NAC0 Docs** ✅ | This bible | — |
| **NAC1 Wire** | Schema Inspector for NPC; NPC list; dialogue defaults in Populate; expose quest fields; KNOWN_ACTIONS parity; NPC live reload | Existing panels |
| **NAC2 AI FSM data** | AiProfile registry + CreatureManager reads profileId; patrol waypoints | CreatureManager |
| **NAC3 Dialogue graph + shops DB** | Graph layout; ShopDef; Vendor.shopId | Dialogue/Shop managers |
| **NAC4 Schedules + reputation** | ScheduleDef; PlayerReputation; dialogue/quest hooks | — |
| **NAC5 Spawners + evolution write** | Spawner entities; evolve mutates party; EncounterTable | WorldManager / EncounterManager |
| **NAC6 BT + bosses + events** | BT interpreter (or compile); BossTuning; WorldEvent scheduler | EVENT_GLOBAL |

**Non-goals:** Real-time LLM dialogue in prod; replacing TB capture; per-NPC custom TypeScript AI classes.

---

# 11. Anti-Patterns

1. New AI written only in `CreatureManager` if/else without AiProfile data  
2. Shop catalogs diverging from Vendor.shopId  
3. Evolution only on Tuxemon `CreatureTemplate` while Studio edits `CreatureDef`  
4. Boss as one-off hardcoded map id  
5. Behaviour trees that cannot serialize to JSON  
6. Reputation checks only on client  
7. Parallel quest systems (`GameQuest` vs `QuestTemplate`) as dual SoT  
8. Orphan SchemaFieldRenderer remaining unwired  
9. World bosses that ignore `isEditorMode` soft suppress while painting  
10. Capture unlocked in RT combat  

---

# Final Rule

**NPCs are entities with refs. AI is data. Creatures are definitions. Events turn systems on.**  
Studio authors profiles, graphs, and tables — the server interprets them. If a new fantasy needs a one-off React AI panel instead of a profile/component, the architecture was skipped.
