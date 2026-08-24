# Creator Guide: World Building & Multi-Map Design

This tutorial outlines best practices for architecting interconnected multi-map worlds, configuring seamless warp gates, defining biome zones, and executing pre-flight validation.

---

## 1. World Design & Biome Planning

When structuring a game world or dungeon zone, plan layout topology beforehand:

```
┌─────────────────┐       Warp Gate       ┌─────────────────┐
│  Town Hub Map   │◄─────────────────────►│ Forest Wilds   │
│  (Safe Zone 5)  │                       │ (Encounter 4)   │
└────────┬────────┘                       └────────┬────────┘
         │ Warp Gate                               │ Warp Gate
         ▼                                         ▼
┌─────────────────┐                       ┌─────────────────┐
│ Dungeon Level 1 │                       │ Mountain Caves  │
│ (Hazard Zone 6) │                       │ (Boss Arena)    │
└─────────────────┘                       └─────────────────┘
```

- **Town Hubs:** Safe zones (Logic Tag `5`) with NPC vendors, banks, and quest hubs.
- **Wilderness:** Open routes containing tall grass (Logic Tag `4`), wandering mobs, and resource gathering nodes.
- **Dungeons:** Instanced or shared hazardous zones (Logic Tag `6`) with environmental hazards and boss spawners.

---

## 2. Map Creation Workflow in Studio

1. **New Map Initialization:** Click `+ New Map` in Studio toolbar. Specify `id` (e.g. `forest_outpost`), name, and dimensions ($32 \times 32$, $64 \times 64$, or $128 \times 128$).
2. **Base Ground Pass (Layer 0):** Use Stamp (`B`) or Flood Fill (`G`) to paint ground terrain (grass, stone, sand).
3. **Collision Logic Pass (Layer -1):** Paint Solid tags (`1`) on impassable boundaries, trees, walls, and water.
4. **Detail Pass (Layer 1 & 2):** Add roofs, fences, signs, lighting lanterns, and decorative foliage.

---

## 3. Inter-Map Warps & Gateways

Connect neighboring maps using **Logic Tag `3` (Warp)**:

1. Select **Logic Layer (-1)** and choose Tag `3: Warp Gate`.
2. Paint the warp trigger onto the transition tile (e.g. door, road exit).
3. In the **Properties Panel**, configure:
   - `targetMapId`: Destination map string (e.g. `forest_wilds`).
   - `targetX` / `targetY`: Landing coordinate on destination map.
   - `transitionEffect`: `fade_black` or `instant`.

> [!IMPORTANT]
> Always verify that the landing tile $(X, Y)$ on the destination map has Logic Tag `0` (Walkable) to prevent players from spawning stuck inside walls.

---

## 4. Pre-Flight Validation Checklist

Before saving and syncing maps to production shards:

- [ ] Ground layer has no missing GID voids ($GID > 0$ across all cells).
- [ ] All warp gates have bidirectional exit/entry links.
- [ ] Spawners have valid level ranges ($L_{\text{min}} \le L_{\text{max}}$) and assigned loot tables.
- [ ] Towns are protected by Logic Tag `5` (Safe Zone).
- [ ] Click **Save (Ctrl+S)** and verify **Problems Panel** reports 0 errors.
- [ ] Press **Ctrl+E** to execute a 60-second Play-In-Editor (PIE) test.
