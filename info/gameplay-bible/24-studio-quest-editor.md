# Saints Studio — Complete Quest Editor (24)

**Status:** Production quest-authoring contract (audit-backed)  
**Date:** 2026-08-04  
**Scope:** Quest chains, dialogue trees, cutscenes, objectives, variables, conditions, branching, repeatable/daily/weekly quests, world events, NPC interactions, rewards, script nodes, visual quest graphs, testing & debugging — with every editor workflow defined.

> **Companions (do not fork)**
> - [`15-quests-dialogue-npc-ai.md`](./15-quests-dialogue-npc-ai.md) — philosophy (static dialogue, event-driven quests)
> - [`22-studio-npc-ai-creature-editors.md`](./22-studio-npc-ai-creature-editors.md) — NPC/dialogue/quest data sketches
> - [`19-studio-ux-design.md`](./19-studio-ux-design.md) — docks, graphs, Ctrl+K, Play-from-node
> - [`23-studio-economy-system.md`](./23-studio-economy-system.md) — reward items/currency via LootRef
> - [`18`](./18-studio-master-architecture.md) · [`20`](./20-studio-entity-system.md)

**This document is the quest-editor master.** Evolve `QuestEditorPanel`, `DialogueEditorPanel`, `QuestManager`, `DialogueManager`, `QuestTemplate` — retire dual SoT (`GameQuest` / client `QUEST_DB`) as authoring sources.

---

# 0. Non-Negotiable Rules

1. **One quest SoT:** `QuestTemplate` (+ objectives). Admin `GameQuest` becomes read-only legacy or migrates.
2. **Dialogue is static JSON in production** — Ollama assist at author time only (`15`).
3. **Quests advance on server events**, not client polls (`15`).
4. **Rewards are structured data** → `WalletService` / `LootService` / reputation (`23`) — not ad-hoc JSON keys ignored at runtime.
5. **Chains are first-class edges**, not only buried `nextQuest` strings (keep `nextQuest` as serialization).
6. **Visual graphs are views over the same documents** — graph never forks a second format.
7. **Test/debug tools never bypass server validation** in published builds; Studio Walk may use Admin force tools.

---

# 1. Audit → Target

| Today | Target |
| :--- | :--- |
| Quest panel: slug/title/desc/rewards JSON/partial objectives | Full fields + structured rewards + schedule + graph |
| Missing UI: levelReq, repeatable, requiredQty, timeLimit | Exposed + validated |
| Objective types missing CRAFT/CLEAR; EXPLORE unused | Full type set + EXPLORE listener |
| `nextQuest` only in JSON | Chain graph + field |
| Dialogue flat list | Graph + conditions + params |
| No variables/cutscenes/daily/weekly | Defined below |
| `acceptQuest` blocks COMPLETED forever | Honor `isRepeatable` + schedule resets |
| Dual GameQuest | Migrate / demote |
| No Studio test tools | Play, validate, force stage, sim |

---

# 2. Editor Surfaces (inventory)

| Surface ID | Home | Role |
| :--- | :--- | :--- |
| **Quest Library** | Quest dock — list | Search/filter by gameId, tag, schedule kind |
| **Quest Inspector** | Quest dock — form / right pane | All quest fields |
| **Quest Graph** | Quest dock — Graph tab | Stages, branches, chain links, cutscene/script nodes |
| **Chain Board** | Quest dock — Chains tab | Multi-quest DAG (Trail/Spyder view) |
| **Dialogue Graph** | Dialogue dock | Trees linked from quests/NPCs |
| **Cutscene Editor** | Tab or sub-dock | Timeline beats referenced by quest nodes |
| **Variable Browser** | Shared palette | Quest/player/world vars |
| **Condition Builder** | Popover | Reused by dialogue options + quest gates |
| **Reward Builder** | Popover | Items/currency/loot/reputation/flags/next |
| **NPC Link** | Populate + Inspector | Giver/turn-in bindings |
| **World Event Link** | Event dock (`22`) | Quests enabled by events |
| **Quest Test Bench** | Footer / Dev | Play, validate, force, reset |
| **Debug Overlay** | Walk Mode (Admin) | Active quests, stage, vars |

Dialogue remains its own dock but **deep-links** from Quest Graph (“Open dialogue”).

---

# 3. Canonical Data Structures

## 3.1 Quest document

```ts
type QuestScheduleKind = "once" | "repeatable" | "daily" | "weekly" | "event";

type QuestSchedule = {
  kind: QuestScheduleKind;
  /** daily/weekly reset — server cron / world day boundary */
  resetCron?: string;          // e.g. "0 0 * * *" daily UTC
  weeklyDow?: number;          // 0–6 if weekly
  /** event-gated */
  eventId?: string;
  /** max completions per period; null = unlimited within kind rules */
  maxPerPeriod?: number | null;
  cooldownMs?: number;         // repeatable soft gate
};

type QuestVarDef = {
  key: string;
  type: "bool" | "number" | "string";
  default: boolean | number | string;
  /** scope: this quest instance vs account */
  scope: "quest" | "player" | "world";
};

type QuestObjectiveType =
  | "TALK" | "CLAIM" | "BATTLE" | "GATHER" | "KILL" | "EXPLORE"
  | "CRAFT" | "CLEAR" | "DELIVER" | "ESCORT" | "REPUTATION"
  | "FLAG" | "VAR" | "INTERACT" | "CUTSCENE";

type QuestObjectiveDoc = {
  id: string;                  // stable within quest — for graph edges
  stage: number;               // display/order; branching may share stages
  type: QuestObjectiveType;
  targetSlug: string;
  requiredQty: number;
  description: string;
  mapId?: string;              // EXPLORE / DELIVER gate
  /** Optional auto-advance when true without UI turn-in */
  autoComplete?: boolean;
  /** Graph position */
  editor?: { x: number; y: number };
};

type QuestBranchEdge = {
  id: string;
  fromObjectiveId: string;
  toObjectiveId: string;
  /** If omitted, advance on objective complete */
  when?: QuestCondition;
  label?: string;
};

type QuestRewardsDoc = {
  xp?: number;
  currency?: Array<{ currencyId: string; amount: number }>; // gold→credits via alias (`23`)
  /** Convenience; maps to currency credits */
  gold?: number;
  items?: Array<{ itemId: string; qty: number }>;
  loot?: import("./lootRefs").LootRef;  // optional pool roll
  reputation?: Array<{ factionId: string; delta: number }>;
  unlockFlags?: string[];
  setVars?: Array<{ key: string; value: unknown; scope?: "quest"|"player"|"world" }>;
  nextQuest?: string;          // primary chain edge
  nextQuestChoices?: Array<{ questSlug: string; label?: string; when?: QuestCondition }>;
};

type QuestTemplateDoc = {
  v: 1;
  slug: string;
  gameId: string;
  title: string;
  description: string;
  levelReq: number;
  /** Denormalized quick flag — derived from schedule.kind !== "once" when useful */
  isRepeatable: boolean;
  timeLimitMins?: number | null;
  schedule: QuestSchedule;
  tags: string[];
  variables: QuestVarDef[];
  objectives: QuestObjectiveDoc[];
  /** Linear default: sort by stage. Branching: edges win */
  branches?: QuestBranchEdge[];
  rewards: QuestRewardsDoc;
  /** Optional stage-keyed mid rewards */
  stageRewards?: Record<number, QuestRewardsDoc>;
  /** NPC hints for Studio */
  giverNpcIds?: string[];
  turnInNpcIds?: string[];
  dialogueTreeIds?: string[];  // related trees
  cutsceneIds?: string[];
  prerequisites?: QuestCondition[];  // accept gate
  failure?: {
    onTimeOut?: "fail" | "abandon";
    failRewards?: QuestRewardsDoc;
  };
  editor?: { graphPan?: { x: number; y: number }; graphZoom?: number };
};
```

## 3.2 Conditions (shared builder)

```ts
type QuestCondition =
  | { op: "quest_status"; questSlug: string; status: "NONE"|"ACTIVE"|"COMPLETED"|"FAILED" }
  | { op: "quest_stage"; questSlug: string; stage: number; cmp?: "eq"|"gte"|"lte" }
  | { op: "has_item"; itemId: string; qty?: number }
  | { op: "level_gte"; level: number }
  | { op: "reputation"; factionId: string; min: number }
  | { op: "flag"; key: string; value?: boolean }
  | { op: "var"; key: string; scope?: "quest"|"player"|"world"; cmp: "eq"|"neq"|"gt"|"lt"; value: unknown }
  | { op: "event_active"; eventId: string }
  | { op: "time_between"; startHour: number; endHour: number }
  | { op: "and"|"or"; of: QuestCondition[] }
  | { op: "not"; of: QuestCondition };
```

Same shape as dialogue option conditions (`22`) — **one** `evaluateCondition(playerCtx, cond)` on server.

## 3.3 Player quest state (extend)

```ts
type PlayerQuestStateDoc = {
  userId: string;
  questSlug: string;
  status: "ACTIVE" | "COMPLETED" | "FAILED" | "COOLDOWN";
  currentObjectiveId?: string;  // prefer over stage alone when branching
  currentStage: number;
  progress: number;
  variables: Record<string, unknown>;
  acceptedAt: string;
  completedAt?: string;
  /** daily/weekly period key e.g. "2026-08-04" / "2026-W32" */
  periodKey?: string;
  completionCount?: number;
};
```

Prisma: add `variables` JSON, `currentObjectiveId`, `periodKey`, `completionCount`; keep stage/progress for compat.

## 3.4 Dialogue tree (quest-facing extensions)

Reuse `DialogueTreeDoc` (`22`) with:

* Option `condition?: QuestCondition`
* Option `params?: Record<string, unknown>`
* Actions include `ACCEPT_QUEST`, `COMPLETE_OBJECTIVE`, `SET_FLAG`, `SET_VAR`, `GIVE_ITEM`, `ADJUST_REPUTATION`, `START_CUTSCENE`, `START_EVENT`, …
* Graph `editor: {x,y}` per node

## 3.5 Cutscenes

```ts
type CutsceneBeat =
  | { type: "dialogue"; treeId?: string; nodeId?: string; text?: string }
  | { type: "camera"; x: number; y: number; ms: number }
  | { type: "move_npc"; npcId: string; x: number; y: number }
  | { type: "emote"; targetId: string; emote: string }
  | { type: "wait"; ms: number }
  | { type: "fade"; to: "in"|"out"; ms: number }
  | { type: "play_music"; trackId: string }
  | { type: "set_var"; key: string; value: unknown }
  | { type: "grant"; rewards: QuestRewardsDoc }
  | { type: "end" };

type CutsceneDoc = {
  id: string;
  name: string;
  gameId?: string;
  beats: CutsceneBeat[];
  skippable?: boolean;
  editor?: { /* timeline zoom */ };
};
```

Triggered by objective type `CUTSCENE`, dialogue action `START_CUTSCENE`, or script node. Runtime: client overlay; server authorizes start/end + rewards.

## 3.6 Script nodes (quest graph)

```ts
type QuestScriptOp =
  | { op: "set_var"; key: string; value: unknown; scope?: "quest"|"player"|"world" }
  | { op: "set_flag"; key: string; value: boolean }
  | { op: "emit_event"; name: string; payload?: Record<string, unknown> }
  | { op: "start_cutscene"; cutsceneId: string }
  | { op: "spawn"; prefabId: string; mapId: string; x: number; y: number }
  | { op: "despawn"; entityId: string }
  | { op: "open_shop"; shopId: string }
  | { op: "warp_player"; mapId: string; x: number; y: number }
  | { op: "grant"; rewards: QuestRewardsDoc }
  | { op: "fail_quest" }
  | { op: "complete_quest" };

type QuestScriptNode = {
  id: string;
  label: string;
  ops: QuestScriptOp[];
  editor?: { x: number; y: number };
};
```

Stored on quest as `scripts?: QuestScriptNode[]`; graph edges can target `script:{id}` after an objective. **Data-only** — no eval of JS strings.

## 3.7 World events ↔ quests

```ts
// Link only — WorldEventDef owned by 22
type QuestEventGate = {
  eventId: string;
  /** Quest appears in journal / can accept only while event active */
  mode: "accept_only_during" | "progress_only_during" | "both";
};
```

`schedule.kind === "event"` requires `schedule.eventId`.

---

# 4. Visual Quest Graph

## 4.1 Node types (canvas)

| Node | Visual | Data |
| :--- | :--- | :--- |
| **Start / Accept** | Green | prerequisites |
| **Objective** | Blue | QuestObjectiveDoc |
| **Branch** | Diamond | QuestBranchEdge set |
| **Script** | Amber | QuestScriptNode |
| **Cutscene** | Purple | cutsceneId |
| **Reward** | Gold | stage or final rewards |
| **Dialogue ref** | Teal | treeId (opens Dialogue dock) |
| **Chain out** | Arrow off-board | nextQuest / choices |
| **Fail / TimeOut** | Red | failure config |

## 4.2 Interactions

* Drag to place; connect handles for branches  
* Double-click → Inspector fields  
* Del deletes node (confirm if referenced)  
* Auto-layout button (sugiyama) — optional  
* Minimap  
* Validate highlights broken edges  

## 4.3 Chain Board

Separate canvas: each **quest** is a card; edges = `nextQuest` / `nextQuestChoices`. Click card → open Quest Graph. Used for Saints Trail / Spyder overview.

---

# 5. Dialogue Trees (within quest workflows)

## 5.1 Workflow — wire giver

1. Create/select quest  
2. Graph: Accept node → “Link NPC” → pick map NPC  
3. Open Dialogue Graph for that NPC  
4. Option: `ACCEPT_QUEST` + `questSlug` + optional condition  
5. Turn-in node later: talk objective + reward dialogue  

## 5.2 Branching dialogue affecting quests

* Option conditions on quest stage/vars  
* Action `SET_VAR` / `COMPLETE_OBJECTIVE`  
* Azure Guide-style start-node resolution becomes **data**: `DialogueTreeDoc.startRules?: Array<{ when: QuestCondition; startNode: string }>` — replace hardcoded Spyder resolver over time  

---

# 6. Objectives — editor + runtime matrix

| Type | Target meaning | Runtime event | Editor helpers |
| :--- | :--- | :--- | :--- |
| TALK | npcId | `dialogue_start` | NPC picker |
| CLAIM | species / `capture_any` / starter id | `creatureCaptured` / `starterClaimed` | Creature picker |
| BATTLE | trainer npcId / species | `trainerDefeated` | NPC picker |
| GATHER | itemId | `itemGathered` | Item picker |
| KILL | speciesSlug | `monsterKilled` | Creature picker |
| EXPLORE | mapId or region id | **add** `mapEntered` / region enter | Map/region picker |
| CRAFT | recipeId or output itemId | `itemCrafted` | Recipe picker |
| CLEAR | bramble key / node id | `brambleCleared` | Preset |
| DELIVER | itemId (+ turn-in NPC via stage) | talk + inventory check | Item + NPC |
| ESCORT | npcId | future escort complete event | NPC |
| REPUTATION | factionId | standing changed | Faction picker |
| FLAG | flag key | flag set | Text |
| VAR | var key threshold | var set | Variable browser |
| INTERACT | entityId / logic tag | interact event | Entity picker |
| CUTSCENE | cutsceneId | cutscene_ended | Cutscene picker |

**Editor dropdown must list all runtime types** — fix CRAFT/CLEAR missing; implement EXPLORE listener.

---

# 7. Schedule kinds — behaviour

| Kind | Accept rules | Completion | Reset |
| :--- | :--- | :--- | :--- |
| **once** | If no COMPLETED row | Permanent COMPLETED | — |
| **repeatable** | If COMPLETED and cooldown elapsed (or always if cooldown 0) | Reopen: delete or set ACTIVE; `completionCount++` | cooldownMs |
| **daily** | periodKey = UTC date; allow if count &lt; maxPerPeriod | COMPLETED until reset | cron midnight → clear/reset period |
| **weekly** | periodKey = ISO week | same | weekly boundary |
| **event** | `event_active` | May fail when event ends | event scheduler |

`isRepeatable` true when kind ∈ {repeatable, daily, weekly} or explicit.

`timeLimitMins`: on accept set deadline; tick/job fails quest per `failure.onTimeOut`.

---

# 8. Rewards pipeline

```
Quest complete / stage reward
  → normalize QuestRewardsDoc
  → gold → WalletService(credits)
  → currency[] → WalletService
  → items[] → InventoryService
  → loot → LootService.roll
  → reputation → PlayerReputation
  → unlockFlags / setVars
  → nextQuest / present choices
```

Trail `flags` in rewards become `unlockFlags` and **must** be applied (today ignored).

---

# 9. NPC interactions

| Binding | How authored |
| :--- | :--- |
| Giver | `giverNpcIds` + dialogue ACCEPT_QUEST |
| Turn-in | `turnInNpcIds` + TALK objective / DELIVER |
| Trainer | BATTLE objective + START_TRAINER_BATTLE |
| Vendor side quest | OPEN_SHOP + quest condition on option |
| Ambient | idle quotes; no quest |

Populate mode: select NPC → “Assign quest…” / drag quest onto NPC (`19`/`22`).

---

# 10. Testing & Debugging Tools

## 10.1 Validate (Quest Test Bench)

| Check | Level |
| :--- | :--- |
| No objectives | Hard |
| Orphan branch edges | Hard |
| Unknown item/npc/creature/recipe refs | Hard on publish |
| nextQuest missing | Warn |
| EXPLORE without mapId | Hard |
| Daily without resetCron | Hard |
| Unreachable objective | Soft |
| Dialogue ACCEPT without matching slug | Soft |
| Circular chain | Hard |

## 10.2 Play tools (Studio Admin)

| Tool | Behaviour |
| :--- | :--- |
| **Play from accept** | Force `acceptQuest` for local player |
| **Set stage / objective** | Admin socket → update PlayerQuestState |
| **Grant progress +1** | Emit synthetic engine event |
| **Complete quest** | Force rewards path |
| **Fail / Reset / Reset period** | Clear state |
| **Play cutscene** | Start cutscene overlay |
| **Play dialogue from node** | Existing bible `19` preview |
| **Watch vars** | Debug overlay list |
| **Sim daily rollover** | Advance periodKey in Studio only |

## 10.3 Walk Mode debug HUD (Admin)

Active quests: slug, stage, progress/qty, time left, vars. Click → open Quest dock.

## 10.4 Automated smoke

Keep `smoke-saints-trail` / `smoke-spyder-path`; generate checklist from Chain Board “Export smoke steps”.

---

# 11. Complete Editor Workflows

## 11.1 New linear quest (min clicks)

1. Quest Library → New  
2. Slug, title, levelReq  
3. + Objective TALK → pick NPC  
4. Reward Builder: gold + item  
5. Link dialogue option ACCEPT_QUEST (one click “Create accept option”)  
6. Validate → Save → `content_reload quest`  
7. Test Bench → Play from accept → Walk → talk  

## 11.2 Quest chain (Trail-style)

1. Create Q1…Qn linear  
2. Chain Board: drag edges Q1→Q2… **or** set nextQuest in Reward Builder  
3. Validate DAG  
4. Smoke export  
5. Save all  

## 11.3 Branching quest

1. Graph: Objective A → Branch → B or C with conditions (var/item)  
2. Script node on B sets flag  
3. Merge to shared Reward node  
4. Test each branch with Set var  

## 11.4 Daily quest

1. Schedule kind daily, maxPerPeriod 1, resetCron  
2. Objectives short (GATHER ×5)  
3. Rewards modest  
4. Test Bench → Complete → Sim rollover → Accept again  

## 11.5 Weekly + reputation

1. Schedule weekly  
2. Objective REPUTATION or KILL  
3. Rewards reputation delta  
4. Validate faction exists (`22`)  

## 11.6 World event quest

1. Create/enable WorldEvent (`22`)  
2. Quest schedule event + eventId  
3. prerequisites `event_active`  
4. While event live: accept; on event end: fail or lock per gate mode  

## 11.7 Cutscene intro

1. Cutscene Editor: fade → camera → dialogue beat → end  
2. Quest objective CUTSCENE or Accept script `start_cutscene`  
3. Play cutscene tool → then accept  

## 11.8 Deliver item

1. GATHER/CRAFT earlier stage  
2. DELIVER objective itemId + turn-in NPC TALK  
3. Server checks inventory on turn-in dialogue action / talk handler  

## 11.9 Repeatable farm quest

1. kind repeatable, cooldownMs 3600000  
2. On complete allow re-accept after cooldown  
3. completionCount for achievements (`23`)  

## 11.10 Debug stuck player (Admin)

1. Debug HUD → select quest  
2. Reset or Set stage  
3. Watch vars / force event  

---

# 12. Dock Layout (Quest Editor UX)

```
┌─ Quest Library ─────────┬─ Tabs: Inspector | Graph | Chains ──────────┐
│ Search · filters        │  [Canvas or Form]                           │
│ List                    │                                             │
├─ Related ───────────────┤  Inspector fields / node props              │
│ Dialogues · NPCs · Event│                                             │
└─────────────────────────┴─ Test Bench: Validate · Play · Reset ───────┘
```

Populate mode defaults open Quest + Dialogue (`19`). Keyboard: Ctrl+S save quest def; Ctrl+K “Quest: …”.

---

# 13. Runtime conversion checklist

| Authoring | Runtime change required |
| :--- | :--- |
| schedule kinds | acceptQuest period/cooldown logic |
| branching objectives | track currentObjectiveId; evaluate edges |
| EXPLORE | emit/listen map enter |
| structured rewards | grant xp/reputation/flags/loot |
| conditions | evaluateCondition on accept + dialogue options |
| cutscenes | CutsceneController + auth |
| script nodes | run QuestScriptOp list server-side |
| variables | persist on PlayerQuestState |
| timeLimit | deadline job |
| KNOWN_ACTIONS parity | extend DialogueManager + picker |

---

# 14. Hot-reload

| Save | Channel |
| :--- | :--- |
| QuestTemplate | `quest` |
| Dialogue tree | `dialogue` |
| Cutscene | `cutscene` |
| World event link | `world_event` |

---

# 15. Phased Delivery

| Phase | Ship | Reuse |
| :--- | :--- | :--- |
| **QE0 Docs** ✅ | This bible | — |
| **QE1 Parity** | Expose levelReq, repeatable, requiredQty, timeLimit; objective types CRAFT/CLEAR; structured rewards UI; nextQuest field; KNOWN_ACTIONS + GRANT_SPYDER_STARTER; validate | QuestEditorPanel |
| **QE2 Graph v1** | Visual objective graph + chain board; dialogue graph positions | Panels |
| **QE3 Conditions + vars** | Condition builder; player/quest vars; dialogue conditions; startRules data | Managers |
| **QE4 Schedules** | daily/weekly/repeatable accept path; Test Bench | QuestManager |
| **QE5 Cutscenes + scripts** | CutsceneDoc + script nodes | New overlay |
| **QE6 Events + EXPLORE + migrate GameQuest** | World event gates; map enter; retire GameQuest SoT | — |

**Non-goals:** Real-time LLM dialogue in prod; client-authored JS quest scripts; keeping GameQuest as parallel Studio.

---

# 16. Anti-Patterns

1. Rewards JSON with keys the grant path ignores  
2. Hardcoded start-node resolvers when `startRules` exist  
3. Daily quests implemented only as `isRepeatable` without periodKey  
4. Second quest DB for “web admin”  
5. Graph format different from saved QuestTemplateDoc  
6. Client advancing stages without server events  
7. Cutscenes that grant loot only on client  
8. EXPLORE in dropdown with no listener  
9. Test “complete” that skips reward validation in production shards  
10. Duplicating Condition types per dock  

---

# Final Rule

**Quests are event-driven documents. The graph is a lens. Dialogue and cutscenes are references. The server is the referee.**  
If a designer needs a code deploy to add a branch, the Quest Editor failed — add a node, condition, or script op instead.
