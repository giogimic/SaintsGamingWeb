# MMO Sockets & Managers Map

Companion to [`OVERVIEW.md`](./OVERVIEW.md).  
Process: `server.ts` → `GameEngine` + managers → `SocketHandler` (socket.io).  
Client: `src/web/components/the-lobby/` (Babylon + store).

High-frequency ticks stay on the **game** socket. Only coarse events go to the **website** realtime bus ([`../realtime/EVENTS.md`](../realtime/EVENTS.md)).

---

## Server managers (`src/server/`)

| Manager | Role |
| :--- | :--- |
| `GameEngine.ts` | Sim / net tick, event bus between managers |
| `SocketHandler.ts` | Auth join, inbound socket events, AOI fan-out, presence |
| `PlayerManager.ts` | Players, maps, join/leave, ecosystem broadcast |
| `WorldManager.ts` | World / map state |
| `EntityManager.ts` | Generic entities |
| `CreatureManager.ts` | Wild creatures, movement broadcasts |
| `CombatManager.ts` | Combat |
| `EncounterManager.ts` | Encounter checks |
| `DialogueManager.ts` | NPC dialogue |
| `QuestManager.ts` | Quests |
| `InventoryManager.ts` | Inventory |
| `EconomyManager.ts` | Economy / GTC hooks |
| `CraftingManager.ts` | Crafting |
| `SkillManager.ts` | Skills |
| `PartyManager.ts` | Parties |
| `PersistenceManager.ts` | Persist player state |

Net helpers: `src/server/net/InterestManager.ts` (AOI), `movementCodec` (shared), optional Redis adapter.

---

## Inbound socket events (`SocketHandler`)

Website room helpers (also used by forum live threads):

| Event | Notes |
| :--- | :--- |
| `join_room` / `leave_room` | e.g. `thread:{id}`, `user:{id}` |
| `force_disconnect` | Admin / breaker |

MMO gameplay (non-exhaustive — see handler for payloads):

| Event | Notes |
| :--- | :--- |
| `join_map` | Enter map; may set presence `playing` |
| `input` | Movement / controls |
| `player_moved` path | Outbound via AOI neighborhood (binary or JSON) |
| `combat_action` / `combat_cast` / `battle_submit_action` | Combat |
| `encounter_check` | Wild encounter |
| `npc_interact` / `dialogue_select` | NPCs |
| `gather_interact` / `pickup_loot` | Gathering / loot |
| `gtc_create_listing` / `gtc_purchase_listing` | Trading |
| `party_chat` / `party_invite` / `party_join` / `party_leave` | Parties |
| `global_chat` / `chat_message` | Chat channels |
| `staff_announce` | Moderator+ map-wide staff chat |
| `staff_kick` | Admin+ remove target socket from map |
| `craft_item` | Crafting |
| `admin_save_map` | Studio map save |

Engine → socket bridge events: `directMessage`, `joinRoom`, `leaveRoom` on `engine.events`.

---

## Website bus (coarse only)

Emitted from MMO when wired (not every tick):

| Event | When |
| :--- | :--- |
| `game.player.online` / `offline` | Join/leave ecosystem broadcast |
| `presence.updated` | Connect / disconnect / playing |

Do **not** put per-tick coords on `/api/internal/events` or `RealtimeService` for website clients.

---

## Client lobby map

| Piece | Path |
| :--- | :--- |
| Entry | `app/(main)/lobby/page.tsx` |
| Root | `the-lobby/index.tsx` |
| Store | `the-lobby/store.ts` |
| Canvas | `the-lobby/babylon/GameCanvasBabylon.tsx` (**fragile**) |
| Maps | `the-lobby/data/maps.ts` → `/api/maps` ([`../database/WORLDMAP.md`](../database/WORLDMAP.md)) |
| Studio panels | `the-lobby/editor/` |

---

## Rules

1. Extend `GameEngine` / existing managers — no second tick loop.  
2. New inbound events: add handler in `SocketHandler`, validate auth, keep AOI for spatial broadcasts.  
3. New website-visible events: register in `registry.ts` + document in realtime EVENTS.md.  
4. Treat atlas / `vOffset` edits in `GameCanvasBabylon.tsx` as high risk.
