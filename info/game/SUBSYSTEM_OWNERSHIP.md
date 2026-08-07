# Subsystem Ownership & Architectural Boundaries

**Version**: 2.1.128  
**Last Updated**: 2026-08-07  
**Status**: Active Specification  

---

## Overview

To ensure Saints Gaming remains performant, maintainable, and scalable across long live-operation lifecycles, all game logic is partitioned into distinct subsystems. Each subsystem operates under strict ownership rules.

---

## Subsystem Matrix

| Subsystem | Owner Module | DB Tables Owned | Communication Rules |
|---|---|---|---|
| **Map System** | `src/shared/game/mapLoader` | `WorldMap`, `GameMap`, `MapLogicTile` | Access solely through `mapLoader`, `mapCache`, `mapQueries`. No raw DB queries outside this module. |
| **Inventory** | `src/server/inventoryService` | `playerInventoryItem`, `InventoryLog` | All item grants, removals, and trades must execute via `executeTransaction()`. Direct CRUD forbidden. |
| **Combat** | `src/server/CombatManager` | None (hot state) | Calculates real-time overworld interactions. Emits events to `gameEvents` (e.g. `combat.kill`). |
| **Encounters** | `src/server/EncounterManager` | `PlayerCreature` (captures) | Owns turn-based encounters & capture state. Emits events to `gameEvents` (e.g. `creature.captured`). |
| **Dialogue** | `src/server/DialogueManager` | `NpcDialogue` | Evaluates dialogue trees & choices. Emits events to `gameEvents` (e.g. `npc.interacted`). |
| **Quests** | `src/server/QuestManager` | `QuestTemplate`, `PlayerQuestProgress` | Evaluates data-driven quest conditions. Emits events to `gameEvents` (e.g. `quest.completed`). |
| **Crafting** | `src/server/CraftingManager` | `CraftingRecipe` | Evaluates recipes, uses `inventoryService` for transactions, emits `item.crafted`. |
| **Economy/Trading**| `src/server/EconomyManager` | `User.credits` | Processes marketplace/store transactions via `inventoryService`, emits `trade.completed`. |
| **Achievements** | `src/web/lib/achievements` | `UserAchievement` | Pure listener: subscribes to `gameEvents` topics to award badges automatically. |
| **Persistence** | `src/server/PersistenceManager` | `PlayerGameState` | Manages hot/cold state serialization & DB flushing on disconnect/interval. |
| **Networking** | `src/server/SocketHandler` | None | Protocol bridge between Socket.io transport and domain managers. No inline business logic. |
| **Leaderboards** | `app/api/leaderboards/` | `PlayerStats` | Reads indexed aggregate table. Never performs heavy `GROUP BY` aggregations on raw domain tables. |

---

## Mandatory Architectural Rules

1. **Database Table Isolation**: No subsystem or API route may query or mutate a database table owned by another subsystem directly. Always use the subsystem's owner module/service.
2. **Event-Driven Communication**: Asynchronous side-effects (achievements, statistics, notifications, quests, analytics) must listen to `gameEvents` rather than being directly invoked in action handlers.
3. **Isomorphic Types**: Shared schemas and data transfer objects (DTOs) live in `src/shared/game/types/`. Client and server code must import these shared interfaces rather than Prisma-generated models.
4. **Transaction Integrity**: Mutations involving items or currency must be wrapped in `InventoryTransaction` records with a valid reason code for auditability and rollback support.
