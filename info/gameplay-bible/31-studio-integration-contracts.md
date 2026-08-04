# Saints Studio — Integration Contracts (31)

**Status:** Normative cross-system wiring  
**Date:** 2026-08-04  
**Scope:** Ensure every Studio system integrates cleanly with every other — call sequences, id shapes, failure modes. Closes integration holes between 18–28.

> **Depends on:** [`29`](./29-studio-glossary-canonical.md), [`30`](./30-studio-editor-kernel-standard.md), [`28`](./28-studio-backend-architecture.md).  
> Domain depth remains in 20–27.

---

# 0. Rules

1. Integrations are **sequences**, not vibes — each contract has trigger, actors, payloads, errors.  
2. Ids follow **29**.  
3. Mutate path follows **28** service template + **30** §4.1.  
4. If a pair of systems shares data without a contract here, it is a bug in the architecture.

---

# 1. Shared modules (single ownership)

| Module | Path (target) | Consumers |
| :--- | :--- | :--- |
| RewardBundle | `src/shared/game/rewards.ts` | Quest, Dialogue, Chest, Achievement, WorldEvent |
| ConditionGraph | `src/shared/game/conditions.ts` | Quest, Dialogue, Spawner, Loot gate, Shop |
| LootService.roll | server LootService | Death, gather, chest, quest, simulate |
| DependencyIndex | studio DependencyService | Publish, delete, Ref Viewer, Used-by |
| ContentReloadBus | studio ContentReloadBus | All services |
| AuditService | studio AuditService | All mutates |
| LocaleKeys | shared + L10n service | All string fields |
| validateContentForPublish | PublishService | Publish wizard |
| validateMapSave | existing shared | Map save |

---

# 2. Economy ↔ Quest ↔ Dialogue ↔ NPC

## 2.1 Quest rewards → wallet/items/reputation

```
Quest complete (runtime)
  → RewardBundle
  → WalletService.apply(credits)
  → InventoryManager.grant(items)
  → optional LootService.roll(lootPoolId)
  → FactionService.delta(reputation)
  → SkillManager.grantXp(xp)
```

Authoring: Quest dock RewardBuilder **only** emits RewardBundle (no `gold` field).

## 2.2 NPC gives quest

```
Npc entity components:
  NpcProfile { dialogueTreeId?, questGiverSlugs: string[] }
Dialogue node action ACCEPT_QUEST { questSlug }
  → QuestManager.offer(questSlug)
```

Canonical bind fields: `questGiverSlugs` on quest def + `dialogueTreeId` on NPC.  
**Forbidden parallel fields:** `questSlug` alone on NPC without dialogue; `questId` cuid-only without slug.

## 2.3 Dialogue grants

Dialogue actions may attach RewardBundle (same module). Runtime authority server-side.

---

# 3. Loot ↔ Death ↔ Gather ↔ Chest ↔ ResourceNode

## 3.1 Single roll path

```
Any drop event
  → resolve poolId from:
      entity.components.Loot.poolId
      OR CreatureDef.defaultLootPoolId
      OR GatherNodeDef.lootPoolId
      OR chest prefab Loot
  → LootService.roll(poolId, ctx)
  → spawn loot bag / grant
```

## 3.2 Migrate order (complexity cut)

1. Wire death → LootService (ECO1)  
2. Chest / Place prefabs use Loot component  
3. GatherNodeDef supersedes `RESOURCE_NODE_MAP` magic  
4. Logic harvest tiles become component brushes that set Gather refs  
5. Delete hardcoded drop tables  

## 3.3 Inheritance

| Source | Rule |
| :--- | :--- |
| Creature instance | Override pool if set; else CreatureDef.defaultLootPoolId |
| NPC hostile | Same as creature if combatant |
| Gather node | GatherNodeDef required |

---

# 4. Items ↔ Loot ↔ Recipes ↔ Shops ↔ Hotbar

```
ItemTemplate.slug
  ← LootTable.entries[].itemSlug
  ← CraftingRecipe.outputItemSlug + ingredients
  ← ShopListing.itemSlug
  ← RewardBundle.items
  ← Ability/consumable refs
```

Price resolution (23): ShopListing.price ?? ItemTemplate.vendorValue.  
Delete dual OPEN_SHOP ids — one shop component → ShopDef id.

Hotbar: AbilityDef ids from Class/Creature loadout; consumables by itemSlug with `usableInField`.

---

# 5. Ability ↔ Class ↔ Creature ↔ Combat ↔ Skills

```
AbilityDef
  → Class.learnable / progression
  → CreatureDef moves / TB kit
  → Hotbar runtime (CombatManager)
  → capture flag → TB only (constitution)

SkillDef (27-matrix)
  → XP from gathering/craft/combat grants
  → profession gates on recipes
```

Accuracy units: **0–1 float** canonical (GP1); migrate any 0–100 displays as ×100 UI only.

---

# 6. Publish ↔ Dependencies ↔ Packages ↔ Audit ↔ Reload

## 6.1 Publish sequence

```
PublishService.publish(resource|project)
  1. auth canPublish
  2. validateContentForPublish (hard)
  3. DependencyIndex.hardBreaks? → block
  4. L10n required keys missing? → block
  5. project.requireReview → open task must be done
  6. $transaction:
       snapshot ContentRevision
       set live pointers / liveVersion
       AuditService.write(publish)
  7. emitContentReload(...)
  8. optional ContentPackage bump if “publish as package”
```

## 6.2 Delete sequence

```
Delete resource
  → DependencyIndex.hard dependents?
      yes → block + list Used-by
      no → delete + audit + reload + search/deps reindex
```

## 6.3 Package bind

ContentPackage.contents[] are ResourceRefs.  
Export resolves deps transitively (soft optional).  
Import runs conflict UI (26) then write defs + audit + reload.

---

# 7. Localization ↔ all string fields

## 7.1 Extraction map (minimum)

| Registry | Fields → LocaleString keys |
| :--- | :--- |
| Quest | title, description, stage text, journal |
| Dialogue | node text, choices |
| Item | name, description |
| Creature | displayName, description |
| Ability / Status / Skill | name, description |
| NPC | displayName |
| Sign / Region label | text |
| Cutscene | captions |
| UI Studio chrome | separate UI pack (not content) |

Pattern: `"{type}.{slug}.{field}"` e.g. `quest.trail_wake.title`.

## 7.2 Runtime

Registries store **keys**; LocaleString supplies values; fallback `StudioProject.defaultLocale`.

Publish gate: `requireL10nCompleteness` project setting.

---

# 8. WorldEvent orchestration

```
WorldEvent.enable
  → optional activate quests (questSlugs)
  → optional economy_modifier ids
  → optional spawner overrides / boss spawn
  → optional cutscene on first enter
  → content_reload { type: "world_event" }
```

Single timeline UI in `world_event` dock lists linked ResourceRefs.  
No silent side effects without listed refs (audit meta includes refs).

---

# 9. Cutscene ↔ Quest ↔ Walk

```
Quest objective CUTSCENE / dialogue action PLAY_CUTSCENE
  → CutscenePlayer
  → lock player input (server authoritative)
  → captions from l10n
  → on end → resume Walk / advance quest
  → skip allowed if cutscene.skippable && not forced
```

Rewards after cutscene still server-granted via RewardBundle — never client trust.

---

# 10. AI ↔ Creature ↔ Spawner ↔ Encounter

```
AiProfile (aiProfileId)
  ← NPC / CreatureDef.aiProfileId
Spawner
  → creatureSlug + count + AiProfile override?
EncounterTable
  → wild TB pool (not overworld AI)
```

Overworld FSM = AiProfile.  
TB moves = CreatureDef / AbilityDef.  
Do not mix encounter table into overworld chase logic.

---

# 11. Map save ↔ mirror ↔ reload ↔ client mesh

```
MapService.save
  → validateMapSave
  → $transaction WorldMap (+ GameMap mirror while demoting)
  → version++
  → audit
  → emitContentReload { type:"map", mapId, version }
  → map-loader invalidate
Client
  → refetch /api/maps/slug
  → chunked mesh rebuild
  → status bar shows version
  → progress toast if rebuild > 500ms
```

expectedVersion mismatch → 409 → 30 conflict dialog.

---

# 12. Search / Bookmarks / Tasks ↔ resources

| Action | Integration |
| :--- | :--- |
| Save any def/map | Upsert SearchDocument |
| Star | StudioBookmark on ResourceRef |
| “Create task” from Ref Viewer | StudioTask.linkedResources |
| Ctrl+K | Queries SearchDocument + commands (open PanelId) |

---

# 13. Audit coverage list (mandatory)

Every mutate endpoint/service must call AuditService:

MapService.save/publish/rollback · AssetService.patch · Loot/Item/Recipe/Quest/Dialogue/Creature/Class/Hero/Ability/Status/Skill/Shop/Spawner/WorldEvent/Cutscene/Package/L10n/Membership/ProjectSettings deletes & updates · Logic tile upsert · Prefab save.

**Test:** grep studio services for mutate without AuditService = fail CI (32).

---

# 14. Permission resolver

```
canOpenStudio(user)      = level >= 400
canWriteStudio(user, project) = level >= 400 && role in creator|developer|admin|owner
canPublishStudio(user, project) = level >= 400 && role in admin|owner
canOpenEngineDocks(user) = level >= 1000
```

API uses resolver only — no inline magic numbers beyond shared constants.

---

# 15. Validation soft vs hard

| Moment | API | Blocks save? | Blocks publish? |
| :--- | :--- | :---: | :---: |
| Map draft save | validateMapSave | hard errors only (dims, solid spawn) | — |
| Def draft save | schema validate | hard schema | — |
| Publish | validateContentForPublish | — | yes |
| Package export | deps + assets | yes on hard deps | — |

Problems panel (30) shows both levels.

---

# 16. Client static DB hydrate

```
Server defs change → content_reload
Client catalog stores refetch
ITEM_DB / QUEST_DB / shopCatalog become fallbacks only
```

Contract: no writer path to static DBs from Studio.

---

# 17. Website Slice E ↔ Studio (boundary)

| Website | Studio |
| :--- | :--- |
| Social feed rare capture | Runtime emit — not Studio |
| GTC player marketplace | Market Ops observes; does not replace |
| Community Modpack | Import adapter → ContentPackage (optional) |
| Forum search | Distinct from Omnisearch |

No Studio feature may require forum tables.

---

# 18. Integration test matrix (must pass for “complete”)

| # | Scenario |
| :--- | :--- |
| I1 | Quest reward credits + item appears in inventory |
| I2 | NPC dialogue ACCEPT_QUEST offers quest |
| I3 | Creature death rolls LootTable |
| I4 | Gather node rolls same LootService |
| I5 | Item used in loot+recipe+shop; delete blocked |
| I6 | Publish map bumps version; clients get content_reload |
| I7 | Broken hard dep blocks publish |
| I8 | Missing l10n key blocks publish when required |
| I9 | WorldEvent enables quest + modifier together |
| I10 | Cutscene then quest stage advance |
| I11 | Ability on class appears on Walk hotbar |
| I12 | Audit row written for map save |
| I13 | Ctrl+K finds item after save |
| I14 | Package export/import round-trip |
| I15 | 409 on stale expectedVersion |

---

# Final Rule

**Systems are finished only when their contracts are finished.**  
A dock that cannot name its RewardBundle, ResourceRef, reload event, and audit action is not integrated.
