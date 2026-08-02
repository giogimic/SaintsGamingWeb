# Aethervale Demo Tutorial → Current Code / Bible Adaptation

**Date:** 2026-08-02  
**Draft source:** `DEMO_TUTORIAL_AETHERVALE.md`  
**Locked MPV decisions (do not silently override):**

- Capture item slug = `binding_crystal` (real inventory only)
- Gather tools = real inventory only (quest grant OK — this draft is that path)
- Single test creature for now = Tuxemon **Rockitten** (TB + RT)
- Server-authoritative; client requests, server decides (bible 07)

---

## Proposed name → code mapping (v1)

| Draft term | Proposed code slug / system | Notes |
| :--- | :--- | :--- |
| Warden Vance | `npc_warden_vance` | New dialogue NPC near spawn |
| Emberwood Basin / Crossroads | Reuse current starter map (`SAINTS_VILLAGE` or camp map) until new map exists | Fantasy name can be display-only |
| Rook Hatchet | `axe_bronze` (display: Rook Hatchet) | Matches gather check today |
| Crude Pickaxe | `pickaxe_bronze` | Matches gather check today |
| Mesh Net | `net_mesh` (new) | Fishing not fully wired — Q1 node 3 may stub |
| Flint Tinderbox | `tinderbox_flint` (new) | Firemaking not fully wired — Q2 step 1 may stub |
| Pine Logs | `wood_log` or `pine_log` | Today gather drops `wood_log` |
| Copper Ore | `ore_copper` / `copper_ore` | Align gather + craft slugs |
| Freshwater Minnow | `minnow_fresh` (new) | Needs fish node + item |
| Empty Core Capsule | **`binding_crystal`** | Draft flavor; bible/code use Binding Crystal |
| Standard Core Capsules | `binding_crystal` (qty reward) | Same item, higher tier later |
| Basin Anvil / furnace | Existing `OPEN_CRAFTING` tile / shop CRAFT | Or dedicated smithy interact |
| Grove Sanctuary | Professor Lab flow / `PROFESSOR_LAB` | Instanced trial later |
| 3 starter familiars | **Blocked by MPV lock** — Rockitten only for now | Expand when product unlocks 3 |
| Coins | character `credits` | |
| Aethervale Map Access | unlock warp / flag in quest state | |

---

## Quest stage sketch (bible 15)

| Quest | Stages (sketch) | Event hooks |
| :--- | :--- | :--- |
| Q1 Tools of the Trade | 0 unaccepted → 1 talk Vance → 2 tools granted → 3 gather counts → 99 | `onNpcTalk`, `onInventoryChange` |
| Q2 Forging the Vessel | cook/smelt/craft capsule → report Vance → 99 | `onInventoryChange`, `onNpcTalk`, craft events |
| Q3 First Bond | claim/capture starter → feed → 99 | `claim_starter` / capture / use item |
| Q4 Wilderness Clearance | bramble interact + synergy → map unlock → 99 | custom interact + companion ability |

---

## Conflicts needing product call (before coding)

1. **Starter count:** Draft has 3 familiars; MPV lock is **Rockitten only**. Adapt Q3 to Rockitten nest/trial for demo?
2. **Capture item name in UI:** Show "Empty Core Capsule" as display name for `binding_crystal`, or keep "Binding Crystal" everywhere?
3. **Map scope:** Implement on existing lobby/village tiles first, or block until Emberwood/Grove maps exist in Studio?
4. **Q1 fishing + Q2 firemaking/cooking/smelting:** Many systems are partial — implement **full Q1 tool grant + wood/ore gather** first, stub the rest?

---

## Recommended implement order (once answered)

1. Persist Vance NPC + Q1 accept/grant tools (`axe_bronze`, `pickaxe_bronze`, optional net/tinderbox)
2. Wire gather progress counters → quest stage advance
3. Q2 craft Binding Crystal (already have shop craft path) as "forge vessel"
4. Q3 = claim Rockitten + one TB capture with crystal
5. Q4 bramble synergy later (needs obstacle + companion world ability)
