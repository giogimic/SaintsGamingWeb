# Ultimate Game & Lobby Editor Plan

> **The master plan for recreating the Saints Tamer game/lobby system as a fully modular, multi-game engine with a complete editor — using Tuxemon as the fully playable AND editable demo reference.**
>
> **Scope:** Game & Lobby Editor System ONLY. No changes to broader platform features (forums, profiles, admin dashboard, etc.).
> **Last Updated:** 2026-07-26
> **Status:** Planning — ready for implementation

---

## Table of Contents

- [Part 1: Current State Audit & Reality Check](#part-1-current-state-audit--reality-check)
- [Part 2: Foundational Phases (0–3)](#part-2-foundational-phases-03)
- [Part 3: Core Editor Phases (4–18)](#part-3-core-editor-phases-418)
- [Part 4: Feature Phases (19–26)](#part-4-feature-phases-1926)
- [Part 5: Implementation Order, Success Criteria & File Structure](#part-5-implementation-order-success-criteria--file-structure)

---

# Part 1: Current State Audit & Reality Check

Before building the ultimate editor, we must understand exactly what exists and what's broken. Every finding below was verified against the actual codebase on 2026-07-26.

## 1.1 What Works (Keep & Enhance)

| System | Location | Status |
|---|---|---|
| Babylon 2.5D billboard engine | `lib/game/BabylonEngine.ts`, `components/the-lobby/babylon/GameCanvasBabylon.tsx` | ✅ Functional — real tileset rendering, billboard sprites, shadows, chat bubbles |
| Integrated Dev Editor (9 tabs) | `components/the-lobby/editor/IntegratedDevEditor.tsx` | ✅ Tabs: `maps, spawns, encounters, npcs, battles, quests, chars, index, assets` |
| Tuxemon data import pipeline | `scripts/import-tuxemon-data.ts` | ✅ 411 species, 274 techniques, 14 elements, 223 items, 31 encounters, 35 statuses |
| Tile registry | `scripts/build-tile-registry.ts` → `TileRegistry` model | ✅ 3,891 tiles with animation support |
| Texture atlas generation | `scripts/generate-atlases.ts` | ✅ Produces `npc_atlas.json/png`, `item_atlas.json/png`, `tilesets_*.json/png` |
| Tuxemon DB models | `prisma/schema.prisma` | ✅ `TuxemonSpecies, TuxemonMove, TuxemonEvolution, TuxemonTechnique, TuxemonItem, TuxemonEncounter, TuxemonStatus, TuxemonElement, TuxemonTypeEffectiveness, TuxemonMap, TileRegistry` |
| Basic GameAsset model | `prisma/schema.prisma` (line 743) | ⚠️ Exists but minimal (id, name, category, subCategory, filePath, width, height) — needs replacement |
| Battle engine | `lib/game/battle-engine.ts` | ⚠️ Functional but uses 14 Pokémon types / 5 stats — must unify to Tuxemon 15 types / 6 stats |
| Multiplayer | `game-server.js` + Socket.IO | ✅ Position sync, chat, battle invitations, map transitions |

## 1.2 Critical Problems (Must Fix)

### Problem 1: Maps Render as "Wallpaper" Colored Blocks
**Evidence:** `components/the-lobby/game-canvas.tsx` renders tiles as flat `ctx.fillRect` colored blocks:
```typescript
// game-canvas.tsx — tiles are solid colors, not art
ctx.fillStyle = '#166534'; // grass = dark green rectangle
ctx.fillRect(destX, destY, TILE_SIZE, TILE_SIZE);
```
**Root cause:** The Canvas2D path (`game-canvas.tsx`) is the legacy renderer. The Babylon path (`GameCanvasBabylon.tsx` → `BabylonEngine.loadTilemap`) DOES have real tileset rendering, but:
- `campaign-maps.ts` (11.3 MB!) has many maps with `tileLayers: []` and `tilesets: []` → no art data → fallback to colors
- Tileset image paths are split: BabylonEngine loads from `/assets/tilesets/` but Tuxemon tilesets live in `/tuxemon-assets/tilesets/`
- The 11.3 MB `campaign-maps.ts` is embedded in the client bundle — massive performance problem

**Fix:** Phase 2 (True Map Recreation) — move map data to DB + API, ensure all maps have real `tileLayers` + `tilesets` with correct paths, retire Canvas2D path.

### Problem 2: Character Sprites Are Procedurally Drawn, Forward-Only
**Evidence:** `game-canvas.tsx` draws the player with `fillRect` pixel-by-pixel:
```typescript
// game-canvas.tsx — player drawn in code, faces screen only
ctx.fillStyle = pantsColor;
ctx.fillRect(x + 10, y + 21, 4, 7); // left leg
ctx.fillRect(x + 18, y + 21, 4, 7); // right leg
ctx.fillStyle = mainColor;
ctx.fillRect(x + 8, y + 11, 16, 11); // torso
```
**Root cause:** The Canvas2D renderer never loads real sprite sheets for the player. The character creator points to `/tuxemon-assets/npc/npc_001.png` which **doesn't exist** — the NPC folder has named files like `adventurer.png`, `barmaid.png`, etc.

**Fix:** Phase 3 (Directional Animated Entities) — use real NPC sprite sheets (48×128, containing 4 directions × 3 walk frames), render as animated billboards in Babylon.

### Problem 3: NPC Sprites Show as Static Full-Sheet Blobs
**Evidence:** `npc_atlas.json` packs each 48×128 NPC sheet as a single frame:
```json
{ "filename": "adventurer.png", "x": 192, "y": 0, "width": 48, "height": 128 }
```
The Babylon engine renders this as a single billboard plane showing the entire sheet. Tuxemon NPC sheets are actually **4 directions × 3 walk frames** (each 16×32 within the 48×128 sheet) — but the atlas treats each as one blob.

**Fix:** Phase 0 (Native Asset Interpretation) — slice sheets into individual frames/directions, rebuild atlases with per-frame metadata.

### Problem 4: Three Mashed Rendering Engines
**Evidence:** Three rendering paths coexist:
1. `components/the-lobby/game-canvas.tsx` — Canvas2D (legacy, procedural, wallpaper)
2. `components/the-lobby/GameCanvasWebGL.tsx` + `lib/game/GameRenderer.ts` — PixiJS (partially built)
3. `components/the-lobby/babylon/GameCanvasBabylon.tsx` + `lib/game/BabylonEngine.ts` — Babylon.js (most advanced, currently active)

**Fix:** Phase 1 (System Unification) — retire Canvas2D + PixiJS, Babylon as single engine.

### Problem 5: Two Incompatible Dex Systems
**Evidence (from `.plan-from-devin`):**
- `saints-dex.ts`: 9 types (Solar, Hydro, Bio, Volt, Geo, Cryo, Aero, Cyber, None), 4 stats (HP, ATK, DEF, SPD)
- `tuxemon-dex.ts`: 15 types (fire, water, earth, wood, metal, lightning, aether, cosmic, frost, heroic, normal, shadow, sky, venom, none), 6 stats (HP, ATK, DEF, SPD, RATK, RDEF)
- `battle-engine.ts`: 14 Pokémon types, 5 stats (meleeAtk, meleeDef, rangedAtk, rangedDef, speed)

**Fix:** Phase 1 — unify to Tuxemon standard (15 types, 6 stats) across all systems.

### Problem 6: Two State Stores
**Evidence:** `components/the-lobby/store.ts` (Zustand, the active one) and `lib/game/store.ts` (duplicate/legacy).

**Fix:** Phase 1 — merge into single store.

### Problem 7: 11.3 MB Map Data in Client Bundle
**Evidence:** `components/the-lobby/data/campaign-maps.ts` is 11.3 MB of inline JSON grids, imported directly into the client via `data/maps.ts`:
```typescript
// maps.ts
export const GAME_MAPS: Record<string, GameMapData> = {
  ...TUXEMON_CAMPAIGN_MAPS // 11.3 MB embedded!
};
```
**Fix:** Phase 2 — move to database (`WorldMap` / `TuxemonMap` models already exist) + API with lazy chunk loading.

### Problem 8: Split Asset Paths
**Evidence:**
- `public/assets/tilesets/` — OpenGameArt/LPC tilesets (basictiles.png, buildings.png, etc.)
- `public/tuxemon-assets/tilesets/` — Tuxemon tilesets (same files duplicated: Basic_Buch_Tiles_Compiled.png, buildings.png, etc.)
- `public/tuxemon-assets/npc/` — 208 NPC sprite sheets
- `public/tuxemon-assets/monster/` — subdirs: `battle/`, `flairs/`, `player/`
- BabylonEngine loads from `/assets/tilesets/` but Tuxemon maps reference `core_outdoor.png` etc. which live in `/tuxemon-assets/tilesets/`

**Fix:** Phase 0 — unified asset path strategy + AssetManager.

### Problem 9: Missing Tuxemon Mechanics
**Evidence (from `.plan-from-devin`):**
- No PP consumption in battle
- No move learning on level up
- No evolution trigger logic (level/item/steps/variables)
- Catch rate hardcoded to 100 (species-specific rates exist in DB but unused)
- No status effects (burn, poison, freeze, sleep, paralysis)
- Party system incomplete (no 4v4 battles)
- No story/chapter progression tracking

**Fix:** Phase 19 (Combat Recreation) + Phase 22 (Story Progression).

### Problem 10: SQLite Limitations
**Evidence:** `prisma/dev.db` is SQLite. Prisma `String[]` fields (tags, categories, spritePackIds, perks, etc.) are **unsupported on SQLite**. The repo has `scripts/prepare-mysql-schema.js` indicating MySQL is the production target.

**Fix:** All new schema fields that would be arrays must use `Json` columns (SQLite-compatible) or the plan must note MySQL/Postgres requirement for production. Phase 4 schema uses `Json` throughout.

---

# Part 2: Foundational Phases (0–3)

These phases MUST come first — everything else depends on a correct foundation.

## Phase 0: Native Asset Interpretation Layer

### 0.1 Sprite Sheet Slicer
**File:** `lib/game/assets/SpriteSheetSlicer.ts`

Tuxemon sprite sheets are NOT single images — they're grids of frames. This module interprets them natively:

```typescript
class SpriteSheetSlicer {
  // NPC sheets are 48×128 = 3 columns × 4 rows of 16×32 frames
  // Row 0: down (3 walk frames), Row 1: up, Row 2: left, Row 3: right
  sliceNpcSheet(sheetPath: string): SpriteFrame[] {
    // Returns 12 frames: { direction: 'down'|'up'|'left'|'right', frame: 0|1|2, x, y, w: 16, h: 32 }
  }

  // Monster front sprites: single 64×64 or 96×96 frame
  // Monster back sprites: single frame
  // Monster overworld sprites: 4 directions × 3 frames (like NPCs but 16×16 or 24×24)
  sliceMonsterSheet(sheetPath: string, type: 'front'|'back'|'overworld'): SpriteFrame[]

  // Tileset sheets: firstgid + columns metadata from TMX
  // Each tile is a 16×16 or 32×32 cell in a grid
  sliceTileset(sheetPath: string, columns: number, tileWidth: number, tileHeight: number): TileFrame[]

  // Item icons: single 16×16 or 32×32 frame
  sliceItemIcon(iconPath: string): SpriteFrame

  // UI elements: variable dimensions, single frame
  sliceUiElement(uiPath: string): SpriteFrame
}

interface SpriteFrame {
  sheetPath: string;
  x: number; y: number; width: number; height: number;
  direction?: 'down' | 'up' | 'left' | 'right';
  frameIndex?: number; // 0, 1, 2 for walk cycle
  isAnimated: boolean;
  frameCount?: number;
  frameRate?: number;
}
```

#### Detailed Slicing Algorithms

**NPC Sheet Layout (48×128 pixels):**
```
┌────────┬────────┬────────┐
│ Down_0 │ Down_1 │ Down_2 │  Row 0 (y=0,   h=32)  ← facing camera
├────────┼────────┼────────┤
│  Up_0  │  Up_1  │  Up_2  │  Row 1 (y=32,  h=32)  ← facing away
├────────┼────────┼────────┤
│ Left_0 │ Left_1 │ Left_2 │  Row 2 (y=64,  h=32)  ← facing left
├────────┼────────┼────────┤
│Right_0 │Right_1 │Right_2 │  Row 3 (y=96,  h=32)  ← facing right
└────────┴────────┴────────┘
  x=0     x=16     x=32    (each w=16)
```

```typescript
// Exact slicing implementation:
function sliceNpcSheet(sheetPath: string): SpriteFrame[] {
  const FRAME_W = 16, FRAME_H = 32;
  const COLS = 3, ROWS = 4;
  const DIRECTIONS = ['down', 'up', 'left', 'right'] as const;
  const frames: SpriteFrame[] = [];

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      frames.push({
        sheetPath,
        x: col * FRAME_W,
        y: row * FRAME_H,
        width: FRAME_W,
        height: FRAME_H,
        direction: DIRECTIONS[row],
        frameIndex: col,        // 0=standing, 1=left foot, 2=right foot
        isAnimated: true,
        frameCount: 3,
        frameRate: 8,           // 8 FPS walk cycle
      });
    }
  }
  return frames; // 12 frames per NPC sheet
}
```

**Walk Cycle Semantics:**
- `frameIndex 0` = standing (idle pose, feet together)
- `frameIndex 1` = left foot forward (mid-stride)
- `frameIndex 2` = right foot forward (mid-stride)
- Animation order when moving: `0 → 1 → 0 → 2 → 0 → 1 → ...` (ping-pong)
- When idle: display `frameIndex 0` only

**Monster Overworld Sheet Layout (48×64 or 48×48):**
```
┌────────┬────────┬────────┐
│ Down_0 │ Down_1 │ Down_2 │  Row 0 (h=16 or h=24)
├────────┼────────┼────────┤
│  Up_0  │  Up_1  │  Up_2  │  Row 1
├────────┼────────┼────────┤
│ Left_0 │ Left_1 │ Left_2 │  Row 2
├────────┼────────┼────────┤
│Right_0 │Right_1 │Right_2 │  Row 3
└────────┴────────┴────────┘
  (each 16×16 or 24×24)
```

**Monster Front/Back Sprites:**
- Front: Single frame, typically 64×64 or 96×96 (check actual file dimensions)
- Back: Single frame, same dimensions as front
- These are NOT animated in battle (static battle sprites)
- Some species have animated front sprites (menu animations) — detect via `_anim` suffix or `tuxemon-db/animation/` directory

**Tileset Slicing (from TMX metadata):**
```typescript
function sliceTileset(
  sheetPath: string,
  columns: number,      // from TMX .tsx file
  tileWidth: number,    // typically 16
  tileHeight: number,   // typically 16
  firstgid: number      // global tile ID offset
): TileFrame[] {
  // Read actual PNG dimensions to calculate rows
  const { imgWidth, imgHeight } = getImageDimensions(sheetPath);
  const rows = Math.floor(imgHeight / tileHeight);
  const totalTiles = columns * rows;
  const tiles: TileFrame[] = [];

  for (let i = 0; i < totalTiles; i++) {
    const col = i % columns;
    const row = Math.floor(i / columns);
    tiles.push({
      tileId: firstgid + i,        // global ID used in map grid
      localId: i,                  // local within tileset
      sheetPath,
      x: col * tileWidth,
      y: row * tileHeight,
      width: tileWidth,
      height: tileHeight,
    });
  }
  return tiles;
}
```

**Animation Detection for Tiles:**
```typescript
// Some tiles are animated (e.g., water, flowers, fire)
// Detect from TileRegistry metadata or TMX animation elements
interface AnimatedTile {
  tileId: number;
  frames: { tileId: number; duration: number }[]; // ms per frame
}
// Example: water tile cycles through 4 frames at 200ms each
// The RenderEngine must swap tile textures on a timer for animated tiles
```

**Intelligent Tag Derivation from Filenames:**
```typescript
// NPC filename pattern analysis:
const NPC_TAG_PATTERNS = {
  gender: {
    female: /(heroine|barmaid|catgirl|christie|fashionista|florist)/i,
    male: /(warrior|brute|dragonrider|firefighter|boss|ceo|adventurer)/i,
    neutral: /(enby|childactor|alien|chrome_robo|cochini)/i,
  },
  role: {
    combat: /(warrior|brute|dragonrider|firefighter|boss|ceo)/i,
    civilian: /(barmaid|florist|fisher|beachcomber|fashionista|beachgoer)/i,
    mystical: /(disciple|alchemist|firenymph|enbyasian)/i,
    adventurer: /(adventurer|cooldude|aviator|baller|coach)/i,
  },
  color: /(_black|_blonde|_brown|_fiery|_green|_red|_blue|_violet|_lapi|_rose|_beige|_copper|_gray|_yellow)$/i,
};

// Example derivations:
// "heroine_blue" → tags: ["hero", "female", "blue", "adventurer"]
// "warrior" → tags: ["warrior", "combat", "melee", "neutral"]
// "barmaid_blonde" → tags: ["barmaid", "female", "blonde", "civilian"]
// "dragonrider_fiery" → tags: ["dragonrider", "combat", "fiery", "male"]

// Alt variants (_alt1, _alt2, _alt3) get tag "variant" + parent tags
// Missing sprites (_missing) get tag "missing" + "placeholder"
```

### 0.2 Rebuild Atlases with Per-Frame Metadata
**File:** `scripts/rebuild-atlases.ts`

Replace the current whole-sheet atlas with per-frame atlases:
```typescript
// Instead of:
//   { filename: "adventurer.png", x: 192, y: 0, width: 48, height: 128 }
// Produce:
//   { id: "adventurer_down_0", x: 0, y: 0, width: 16, height: 32, direction: "down", frame: 0 }
//   { id: "adventurer_down_1", x: 16, y: 0, width: 16, height: 32, direction: "down", frame: 1 }
//   { id: "adventurer_down_2", x: 32, y: 0, width: 16, height: 32, direction: "down", frame: 2 }
//   { id: "adventurer_up_0", x: 0, y: 32, width: 16, height: 32, direction: "up", frame: 0 }
//   ... etc for all 12 frames

// Generate:
// - npc_frames_atlas.png/json (all NPC frames, sliced — 208 sheets × 12 = 2,496 frames)
// - monster_front_atlas.png/json (all monster front sprites — 411 species)
// - monster_back_atlas.png/json (all monster back sprites — 411 species)
// - monster_overworld_atlas.png/json (all overworld sprites, sliced into directions — 411 × 12 = 4,932 frames)
// - item_atlas.png/json (already correct — single frames, 177 items)
// - tileset atlases (already correct — tiles are grid cells, 6 category atlases)
```

**Atlas Packing Algorithm:**
```typescript
// Use a shelf-packing algorithm (simple, fast, minimal waste):
interface AtlasPacker {
  width: number;   // 2048 or 4096
  height: number;  // grows as needed
  shelves: Shelf[]; // horizontal rows of frames
}

interface Shelf {
  y: number;
  height: number;
  currentX: number;
  frames: PackedFrame[];
}

function packFrames(frames: SpriteFrame[], maxAtlasWidth: number = 2048): AtlasResult {
  // 1. Sort frames by height (tallest first — reduces shelf fragmentation)
  // 2. For each frame:
  //    a. Try to fit on an existing shelf (if height <= shelf height and space remains)
  //    b. If no shelf fits, create a new shelf below the tallest existing one
  // 3. Calculate total atlas height = sum of shelf heights
  // 4. Generate composite PNG using sharp (like existing generate-atlases.ts)
  // 5. Output JSON with frame coordinates

  // NPC frames: 16×32 each, 2,496 total
  //   At 2048 width: 128 frames per shelf row → 20 shelves → atlas = 2048×640
  // Monster overworld: 16×16 each, 4,932 total
  //   At 2048 width: 128 per row → 39 shelves → atlas = 2048×624
}
```

**Note:** Existing `scripts/generate-atlases.ts` produces whole-sheet atlases. This new script supersedes it with per-frame slicing. Run order: `copy-tuxemon-assets.ts` → `rebuild-atlases.ts` → `import-tuxemon-assets.ts`.

### 0.3 Unified Asset Path Strategy
**File:** `lib/game/assets/AssetPathResolver.ts`

Consolidate the split asset roots:
```typescript
class AssetPathResolver {
  // Canonical paths (no more split between /assets/ and /tuxemon-assets/)
  private static ROOTS = {
    sprites: '/game-assets/sprites',     // NPC + player sprites (sliced frames)
    monsters: '/game-assets/monsters',   // Monster front/back/overworld
    tilesets: '/game-assets/tilesets',   // All tilesets (Tuxemon + custom)
    items: '/game-assets/items',         // Item icons
    ui: '/game-assets/ui',               // UI elements
    audio: '/game-assets/audio',         // Music + SFX
    atlases: '/game-assets/atlases',     // Generated atlases
  };

  static resolve(type: keyof typeof AssetPathResolver.ROOTS, filename: string): string {
    return `${AssetPathResolver.ROOTS[type]}/${filename}`;
  }

  // Migration script: scripts/migrate-asset-paths.ts
  // 1. Create /public/game-assets/ directory structure
  // 2. Copy (not move — keep originals as fallback during transition):
  //    /tuxemon-assets/npc/          → /game-assets/sprites/
  //    /tuxemon-assets/monster/      → /game-assets/monsters/
  //    /tuxemon-assets/tilesets/     → /game-assets/tilesets/
  //    /assets/tilesets/             → /game-assets/tilesets/ (merge, skip duplicates)
  //    /tuxemon-assets/items/        → /game-assets/items/
  //    /tuxemon-assets/ui/           → /game-assets/ui/
  //    /tuxemon-assets/audio/        → /game-assets/audio/
  //    /tuxemon-assets/atlases/      → /game-assets/atlases/
  // 3. Update all code references from old paths to new paths
  // 4. After all references updated, delete old directories
}
```

### 0.4 Asset Import with Intelligent Tagging
**File:** `scripts/import-tuxemon-assets.ts`

Supersedes existing `scripts/seed-game-assets.ts` with the new schema. Import all Tuxemon assets with intelligent tags derived from filename patterns:
```typescript
// Import pipeline:
// 1. Scan /game-assets/ directory tree
// 2. For each file, determine type (SPRITE, MONSTER, TILESET, etc.) from path
// 3. Use SpriteSheetSlicer to compute frame metadata
// 4. Derive intelligent tags from filename patterns
// 5. Cross-reference with TuxemonSpecies for monster sprites (match by slug)
// 6. Cross-reference with TileRegistry for tilesets (match by filename)
// 7. Upsert into GameAsset table

// NPC sprites (208 sheets → 2,496 sliced frames)
// Each sheet becomes ONE GameAsset with metadata.frames = SpriteFrame[12]
// Tags: ["tuxemon", "npc", "official", gender?, role?, color?]

// Monster sprites (771 files across battle/, flairs/, player/ subdirs)
// Front: tags: ["tuxemon", "monster", "front", species_slug]
// Back: tags: ["tuxemon", "monster", "back", species_slug]
// Overworld: tags: ["tuxemon", "monster", "overworld", species_slug]
//   metadata.frames = SpriteFrame[12] (4 directions × 3 walk frames)

// Tilesets (96 files with TMX metadata)
// Tags: ["tuxemon", "tileset", category]
// metadata: { firstgid, columns, tileWidth, tileHeight, tileCount }

// Item icons (177)
// Tags: ["tuxemon", "item", item_type]
// Cross-reference with TuxemonItem by slug

// UI elements (259)
// Tags: ["tuxemon", "ui", ui_type]

// Audio files (143)
// Tags: ["tuxemon", "audio", "music"|"sfx"]
```

### 0.5 Asset Database Schema (Replacement)
**File:** `prisma/schema.prisma`

**IMPORTANT:** The existing `GameAsset` model (line 743) must be REPLACED, not appended. The existing model is:
```prisma
// EXISTING (to be replaced via migration):
model GameAsset {
  id          String   @id @default(cuid())
  name        String
  category    String
  subCategory String?
  filePath    String
  width       Int      @default(16)
  height      Int      @default(16)
  createdAt   DateTime @default(now())
}
```

New model (SQLite-compatible — uses `Json` instead of `String[]`):
```prisma
model GameAsset {
  id            String   @id @default(cuid())
  gameId        String?  // null = shared across all games
  type          String   // SPRITE, TILESET, AUDIO, ITEM_ICON, MONSTER, UI_ELEMENT, EFFECT, BACKGROUND, PARTICLE
  source        String   // canonical file path
  atlasSource   String?  // atlas file if from atlas
  atlasFrame    Json?    // {x, y, width, height} for atlas extraction
  tags          Json     // ["tuxemon", "npc", "male"] — Json for SQLite compat
  categories    Json     // ["npcs", "heroes"] — Json for SQLite compat
  metadata      Json     // {frames, directions, animations, rarity, speciesSlug, etc.}
  customLabels  Json?    // {en: "Hero", es: "Héroe"}
  isActive      Boolean  @default(true)
  usageCount    Int      @default(0)
  fileSize      Int      @default(0)
  cdnUrl        String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([gameId])
  @@index([type])
}

model GameConfig {
  id            String   @id @default(cuid())
  slug          String   @unique
  name          String
  version       String
  description   String?
  isActive      Boolean  @default(false)

  // Game rules
  maxLevel      Int      @default(100)
  baseStats     Json     // {hp: 100, atk: 50, ...}
  combatFormula String   @default("tuxemon-standard")
  skillFormula  String   @default("runescape-style")
  xpCurve       String   @default("exponential")

  // Asset pack references
  spritePackIds  Json     // ["tuxemon-npcs", "tuxemon-monsters"]
  tilesetPackIds Json     // ["tuxemon-outdoor", "tuxemon-indoor"]

  // Performance settings
  maxEntitiesPerMap  Int    @default(100)
  maxPlayersPerMap   Int    @default(50)
  chunkSize          Int    @default(32)
  optimizationLevel  String @default("medium")

  // Social settings
  enableChat     Boolean @default(true)
  enableParties  Boolean @default(true)
  enableTrading  Boolean @default(true)
  enablePvP      Boolean @default(true)
  maxPartySize   Int     @default(4)

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model CharacterClass {
  id            String   @id @default(cuid())
  gameId        String
  name          String
  description   String
  iconAssetId   String?

  baseStats     Json     // {hp: 100, atk: 50, ...}
  growthRates   Json     // {hp: 1.5, atk: 1.2, ...}

  allowedSpriteTags Json  // ["hero", "player", "male"]
  spriteFilters     Json  // {gender: ["male"], style: ["warrior"]}

  startingEquipment  Json
  learnableSkills    Json

  perks         Json     // ["MASTER_TAMER"]
  abilities     Json     // ["beast_empathy"]

  // RPG progression
  skillProgression   Json  // skill unlocks per level
  abilityProgression Json  // ability unlocks per level
  perkProgression    Json  // perk unlocks per level

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([gameId])
}

model LootTable {
  id            String   @id @default(cuid())
  gameId        String
  name          String
  description   String?

  entries       Json     // array of loot entries
  rollsPerDrop  Int      @default(1)
  guaranteedDrops Json

  commonWeight    Int @default(60)
  uncommonWeight  Int @default(25)
  rareWeight      Int @default(10)
  epicWeight      Int @default(4)
  legendaryWeight Int @default(1)

  minLevel      Int?
  maxLevel      Int?
  requiredTags  Json     // Json for SQLite compat

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([gameId])
}

model MonsterSpritePool {
  id            String   @id @default(cuid())
  gameId        String
  speciesSlug   String   // references TuxemonSpecies.slug
  spriteAssetId String   // primary sprite (front)
  shinySpriteAssetId String?
  backSpriteAssetId String?
  overworldSpriteAssetId String? // overworld (directional)

  frameCount    Int      @default(4)
  directions    Int      @default(4)
  frameRate     Int      @default(8)

  variants      Json     // { male: spriteId, female: spriteId }

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([gameId])
  @@index([speciesSlug])
}
```

**Migration note:** Phase 17 covers the migration. Existing `GameAsset` records (seeded by `seed-game-assets.ts`) must be re-imported with the new schema fields. The `WorldMap` and `GameCharacter` models should get a `gameId` field added.

---

## Phase 1: System Unification

### 1.1 Unify Type & Stat Systems
**Files:** `lib/game/battle-engine.ts`, `components/the-lobby/data/saints-dex.ts`, `components/the-lobby/data/tuxemon-dex.ts`

Unify to Tuxemon standard:
- **15 types:** fire, water, earth, wood, metal, lightning, aether, cosmic, frost, heroic, normal, shadow, sky, venom, none
- **6 stats:** HP, ATK, DEF, SPD, RATK, RDEF
- Update `battle-engine.ts` to use Tuxemon type chart from `TuxemonTypeEffectiveness` table
- Either migrate `saints-dex.ts` creatures into `TuxemonSpecies` table OR keep as separate "Saints exclusive" event species

**Detailed Type Mapping (saints-dex → tuxemon):**
```typescript
const TYPE_MIGRATION_MAP = {
  'Solar': 'fire',
  'Hydro': 'water',
  'Bio': 'wood',
  'Volt': 'lightning',
  'Geo': 'earth',
  'Cryo': 'frost',
  'Aero': 'sky',
  'Cyber': 'metal',
  'None': 'none',
};

// battle-engine.ts Pokémon types → Tuxemon types:
const BATTLE_ENGINE_TYPE_MAP = {
  'fire': 'fire',
  'water': 'water',
  'grass': 'wood',
  'electric': 'lightning',
  'ice': 'frost',
  'ground': 'earth',
  'flying': 'sky',
  'psychic': 'aether',
  'bug': 'normal',      // closest match
  'rock': 'earth',
  'dragon': 'cosmic',   // closest match
  'dark': 'shadow',
  'ghost': 'shadow',
  'normal': 'normal',
  // Tuxemon-only types (no Pokémon equivalent): metal, heroic, venom
};

// Stat mapping (battle-engine → Tuxemon):
// meleeAtk  → ATK
// meleeDef  → DEF
// rangedAtk → RATK
// rangedDef → RDEF
// speed     → SPD
// (HP stays HP)
```

**Type Effectiveness Loading:**
```typescript
// Load from TuxemonTypeEffectiveness table (196 matchups already imported)
async function loadTypeChart(): Promise<TypeChart> {
  const effectiveness = await prisma.tuxemonTypeEffectiveness.findMany();
  // Build 15×15 matrix: chart[attackingType][defendingType] = multiplier
  // Values: 0 (immune), 0.5 (not very effective), 1 (normal), 2 (super effective)
  const chart: Record<string, Record<string, number>> = {};
  for (const eff of effectiveness) {
    if (!chart[eff.attackingType]) chart[eff.attackingType] = {};
    chart[eff.attackingType][eff.defendingType] = eff.multiplier;
  }
  return chart;
}
```

### 1.2 Merge State Stores
**Files:** `components/the-lobby/store.ts` (keep), `lib/game/store.ts` (remove if duplicate)

Single Zustand store with Immer middleware. All game state flows through one store.

**Unified Store Shape:**
```typescript
interface GameStore {
  // Player state
  player: {
    id: string;
    name: string;
    classId: string;
    spriteAssetId: string;     // references GameAsset
    position: { x: number; y: number };
    direction: 'down' | 'up' | 'left' | 'right';
    isMoving: boolean;
    level: number;
    xp: number;
    stats: { hp, atk, def, spd, ratk, rdef };
    equipment: { head?, chest?, legs?, weapon? };
    skills: Record<string, number>; // skillName → level
    skillXP: Record<string, number>;
    perks: string[];
    abilities: string[];
  };

  // Tuxemon party (max 6 beasts)
  tuxemonParty: PlayerTuxemon[];

  // Multiplayer party (max 4 players)
  party: PartyMember[];

  // Current game
  currentGameId: string;
  currentMapId: string;
  currentMapData: GameMap | null;  // loaded from API, not bundled

  // UI state
  isDevEditorOpen: boolean;
  activeOverlay: string | null;
  activeBattle: BattleState | null;

  // Inventory
  inventory: InventoryItem[];
  credits: number;
}
```

### 1.3 Retire Legacy Rendering Paths
**Files to delete:**
- `components/the-lobby/game-canvas.tsx` (Canvas2D, procedural, wallpaper)
- `components/the-lobby/GameCanvasWebGL.tsx` (PixiJS, incomplete)
- `lib/game/GameRenderer.ts` (PixiJS renderer, unused after unification)
- `components/the-lobby/MapEditorWebGL.tsx` (PixiJS map editor)

**Keep:** `components/the-lobby/babylon/GameCanvasBabylon.tsx` + `lib/game/BabylonEngine.ts` as the single rendering path.

**Safety check before deletion:**
```typescript
// Before deleting, search for all imports of these files:
// search_files for: game-canvas|GameCanvasWebGL|GameRenderer|MapEditorWebGL
// Update any remaining imports to use GameCanvasBabylon instead
// Verify no runtime references remain
```

### 1.4 Move Map Data to Database + API
**Files:** `scripts/migrate-campaign-maps-to-db.ts`, `app/api/maps/[id]/route.ts`

The 11.3 MB `campaign-maps.ts` must be moved to the database:
```typescript
// scripts/migrate-campaign-maps-to-db.ts
import { TUXEMON_CAMPAIGN_MAPS } from '../components/the-lobby/data/campaign-maps';
import { prisma } from '../lib/prisma';

async function migrateMaps() {
  for (const [mapId, mapData] of Object.entries(TUXEMON_CAMPAIGN_MAPS)) {
    await prisma.worldMap.upsert({
      where: { id: mapId },
      create: {
        id: mapId,
        name: mapData.name,
        width: mapData.width,
        height: mapData.height,
        // Store grid, tileLayers, tilesets, gates, npcs, encounterPool as Json
        // (WorldMap model may need additional Json fields added)
        grid: mapData.grid,
        tileLayers: mapData.tileLayers || [],
        tilesets: mapData.tilesets || [],
        gates: mapData.gates || {},
        npcs: mapData.npcs || [],
        encounterPool: mapData.encounterPool || null,
        gameId: 'tuxemon', // new field
      },
      update: { /* same */ },
    });
  }
  console.log(`Migrated ${Object.keys(TUXEMON_CAMPAIGN_MAPS).length} maps to database`);
}
```

**API Route:**
```typescript
// app/api/maps/[id]/route.ts
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const map = await prisma.worldMap.findUnique({
    where: { id: params.id },
  });

  if (!map) {
    return Response.json({ error: 'Map not found' }, { status: 404 });
  }

  return Response.json(map);
}

// app/api/maps/route.ts — map index
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get('gameId') || 'tuxemon';

  const maps = await prisma.worldMap.findMany({
    where: { gameId },
    select: { id: true, name: true, width: true, height: true },
  });

  return Response.json({ maps });
}
```

**Client-side lazy loading:**
```typescript
// components/the-lobby/data/maps.ts (REPLACED — no more 11.3MB import)
let mapCache: Record<string, GameMapData> = {};

export async function loadMap(mapId: string): Promise<GameMapData> {
  if (mapCache[mapId]) return mapCache[mapId];

  const res = await fetch(`/api/maps/${mapId}`);
  if (!res.ok) throw new Error(`Failed to load map: ${mapId}`);
  const mapData = await res.json();

  mapCache[mapId] = mapData;
  return mapData;
}

export function getCachedMap(mapId: string): GameMapData | null {
  return mapCache[mapId] || null;
}

// Preload adjacent maps on gate proximity (smooth transitions)
export async function preloadAdjacentMaps(currentMapId: string): Promise<void> {
  const current = mapCache[currentMapId];
  if (!current?.gates) return;
  for (const gate of Object.values(current.gates)) {
    if (gate.targetMapId && !mapCache[gate.targetMapId]) {
      loadMap(gate.targetMapId).catch(() => {}); // fire and forget
    }
  }
}
```

### 1.5 Update Map Data Path References
**File:** `lib/game/BabylonEngine.ts`

Fix the tileset path mismatch:
```typescript
// BEFORE: tex = new Texture(`/assets/tilesets/${ts.imageSource}`, this.scene);
// AFTER:  tex = new Texture(`/game-assets/tilesets/${ts.imageSource}`, this.scene);
// Or use AssetPathResolver: tex = new Texture(AssetPathResolver.resolve('tilesets', ts.imageSource), this.scene);
```

---

## Phase 2: True Map Recreation

### 2.1 TMX-Native Multi-Layer Rendering
**File:** `lib/game/BabylonEngine.ts` (enhance `loadTilemap`)

The Babylon engine already has tileset rendering — ensure ALL maps use it:

**Multi-Layer Rendering Detail:**
```typescript
// Layer system: each layer is a separate set of ground meshes
interface TileLayer {
  name: string;           // 'ground', 'walls', 'objects', 'decorations'
  grid: number[][];       // tile IDs per cell
  visible: boolean;
  locked: boolean;
  opacity: number;        // 0.0 to 1.0
  renderOrder: number;    // lower = rendered first (below)
}

// Rendering pipeline:
// 1. Sort layers by renderOrder
// 2. For each visible layer:
//    a. For each cell (r, c) in layer.grid:
//       - If tileId === 0, skip (empty)
//       - Find which tileset contains this tileId (by firstgid range)
//       - Calculate source UVs from tileset: col = (tileId - firstgid) % columns, row = floor((tileId - firstgid) / columns)
//       - Create or reuse a ground mesh at (r, c)
//       - Apply tileset texture with correct UV offset
//    b. For animated tiles, register with animation system
// 3. Collision layer: not rendered, but used by PhysicsEngine
// 4. Encounter zone layer: not rendered, but used by encounter system

// Special tile rendering (already partially in BabylonEngine):
// - Tile 2/3: Tall grass → 2 crossed billboard planes (BILLBOARDMODE_Y)
// - Tile 5: Tree → trunk box + billboard foliage
// - Tile 4: Water → animated texture (swap frames on timer)
// - Ledges/tile 6: One-way jump → visual ledge mesh + physics hop check
```

**Re-importing maps with empty tileLayers:**
```typescript
// For maps in DB with tileLayers: [] or tilesets: []:
// Re-run scripts/reimport-rich-tuxemon-maps.ts
// This script reads TMX files from Tuxemon source and populates tileLayers + tilesets
// After re-import, validate with scripts/validate-maps.ts
```

### 2.2 Map Data API with Chunk Loading
**File:** `app/api/maps/[id]/route.ts`, `lib/game/MapChunkLoader.ts`

```typescript
class MapChunkLoader {
  private chunkCache: Map<string, ChunkData> = new Map();
  private chunkSize: number = 32; // 32×32 tile chunks

  // Load map in chunks for large worlds
  async loadChunk(mapId: string, chunkX: number, chunkY: number): Promise<ChunkData> {
    const cacheKey = `${mapId}_${chunkX}_${chunkY}`;
    if (this.chunkCache.has(cacheKey)) return this.chunkCache.get(cacheKey)!;

    // For maps > 64×64, fetch only the needed chunk
    const res = await fetch(`/api/maps/${mapId}/chunk?x=${chunkX}&y=${chunkY}`);
    const chunk = await res.json();
    this.chunkCache.set(cacheKey, chunk);
    return chunk;
  }

  async loadMap(mapId: string): Promise<GameMap> {
    // Full map for small maps (< 64×64)
    const res = await fetch(`/api/maps/${mapId}`);
    return res.json();
  }

  // Determine which chunks are visible based on camera position
  getVisibleChunks(cameraX: number, cameraZ: number, viewportWidth: number, viewportHeight: number): ChunkCoord[] {
    const startChunkX = Math.floor((cameraX - viewportWidth/2) / this.chunkSize);
    const endChunkX = Math.ceil((cameraX + viewportWidth/2) / this.chunkSize);
    const startChunkY = Math.floor((cameraZ - viewportHeight/2) / this.chunkSize);
    const endChunkY = Math.ceil((cameraZ + viewportHeight/2) / this.chunkSize);

    const chunks: ChunkCoord[] = [];
    for (let cx = startChunkX; cx <= endChunkX; cx++) {
      for (let cy = startChunkY; cy <= endChunkY; cy++) {
        chunks.push({ x: cx, y: cy });
      }
    }
    return chunks;
  }

  // Unload chunks outside viewport + 1 chunk buffer
  unloadDistantChunks(visibleChunks: ChunkCoord[], mapId: string): void {
    const visibleKeys = new Set(visibleChunks.map(c => `${mapId}_${c.x}_${c.y}`));
    for (const key of this.chunkCache.keys()) {
      if (!visibleKeys.has(key) && key.startsWith(mapId)) {
        this.chunkCache.delete(key);
      }
    }
  }
}
```

### 2.3 Map Validation
**File:** `scripts/validate-maps.ts`

```typescript
// For each map in database:
// 1. Check tileLayers and tilesets are populated (not empty)
//    → If empty, flag for re-import from TMX
// 2. Check all tileset imageSource files exist at /game-assets/tilesets/
//    → If missing, check /tuxemon-assets/tilesets/ as fallback
// 3. Check all tile IDs in grid reference valid tiles in tilesets
//    → For each tileId in grid, find tileset where firstgid <= tileId < firstgid + tileCount
//    → If no tileset matches, flag as orphan tile
// 4. Check all gates reference valid target maps
//    → gate.targetMapId must exist in WorldMap table
// 5. Check all NPCs reference valid sprite assets
//    → npc.spriteKey must resolve to a GameAsset
// 6. Check encounter pools reference valid species
//    → pool[].speciesId must exist in TuxemonSpecies
// 7. Report maps that would fall back to "wallpaper" rendering
//    → Maps with empty tileLayers/tilesets = wallpaper fallback
// 8. Output report: { totalMaps, validMaps, invalidMaps, wallpaperMaps, issues[] }
```

---

## Phase 3: Directional Animated Entities

### 3.1 Animated Billboard Entity Renderer
**File:** `lib/game/BabylonEngine.ts` (enhance `updateEntity`)

Replace static billboard with animated, directional sprite:

```typescript
class AnimatedBillboard {
  private mesh: Mesh;
  private frames: Map<string, Texture>; // key: "down_0", "down_1", etc.
  private currentDirection: 'down' | 'up' | 'left' | 'right' = 'down';
  private currentFrame: number = 0;
  private isMoving: boolean = false;
  private frameTimer: number = 0;
  private frameRate: number = 8; // FPS
  private walkSequence: number[] = [0, 1, 0, 2]; // ping-pong walk cycle
  private walkIndex: number = 0;

  // Load all 12 frames from atlas (or individual files)
  async loadSprite(spriteAssetId: string): Promise<void> {
    const asset = await assetManager.getAsset(spriteAssetId);
    const frames = asset.metadata.frames as SpriteFrame[];

    for (const frame of frames) {
      const texture = new Texture(
        AssetPathResolver.resolve('atlases', asset.atlasSource),
        scene
      );
      // Set UV offset to frame coordinates within atlas
      const u0 = frame.x / atlasWidth;
      const v0 = frame.y / atlasHeight;
      const u1 = (frame.x + frame.width) / atlasWidth;
      const v1 = (frame.y + frame.height) / atlasHeight;
      texture.uScale = u1 - u0;
      texture.vScale = v1 - v0;
      texture.uOffset = u0;
      texture.vOffset = v0;
      texture.hasAlpha = true;

      this.frames.set(`${frame.direction}_${frame.frameIndex}`, texture);
    }
  }

  update(dt: number, direction: string, isMoving: boolean) {
    // Direction change — immediate
    if (direction !== this.currentDirection) {
      this.currentDirection = direction as any;
      this.walkIndex = 0;
      this.currentFrame = 0;
    }

    this.isMoving = isMoving;

    if (isMoving) {
      // Advance walk cycle
      this.frameTimer += dt;
      const frameDuration = 1000 / this.frameRate;
      if (this.frameTimer >= frameDuration) {
        this.walkIndex = (this.walkIndex + 1) % this.walkSequence.length;
        this.currentFrame = this.walkSequence[this.walkIndex];
        this.frameTimer = 0;
      }
    } else {
      // Standing — show frame 0
      this.currentFrame = 0;
      this.walkIndex = 0;
    }

    // Swap texture
    const key = `${this.currentDirection}_${this.currentFrame}`;
    const texture = this.frames.get(key);
    if (texture) {
      (this.mesh.material as StandardMaterial).diffuseTexture = texture;
    }
  }
}
```

**Billboard Mesh Configuration:**
```typescript
// Create a plane that always faces the camera (Y-axis only — keeps upright)
const spriteMesh = MeshBuilder.CreatePlane(
  `entity_${entity.id}`,
  { width: 1, height: 2 }, // 1 tile wide, 2 tiles tall (16×32 ratio)
  scene
);
spriteMesh.billboardMode = Mesh.BILLBOARDMODE_Y;
spriteMesh.position = new Vector3(entity.x, 1, entity.y);

// Material with alpha for transparency
const mat = new StandardMaterial(`mat_${entity.id}`, scene);
mat.diffuseTexture = initialTexture;
mat.diffuseTexture.hasAlpha = true;
mat.useAlphaFromDiffuseTexture = true;
mat.specularColor = new Color3(0, 0, 0); // no shine on pixel art
mat.backFaceCulling = false; // visible from both sides
spriteMesh.material = mat;
```

### 3.2 Player Sprite from NPC Sheet Pool
**File:** `components/the-lobby/character-creator.tsx`

Replace the broken `PRESET_SPRITES` (pointing to non-existent `npc_001.png`) with real sprites from the AssetManager:
```typescript
// BEFORE: { id: "hero_male", path: "/tuxemon-assets/npc/npc_001.png" } // DOESN'T EXIST
// AFTER:  Load sprites from AssetManager filtered by class allowedSpriteTags
//         Each sprite is a sliced frame set (12 frames: 4 directions × 3 walk frames)
//         Player selects a sprite SET, not a single image

// Character creator flow:
// 1. User selects class (Tamer, Animist, etc.)
// 2. CharacterClassSystem.getSpritesForClass(classId) returns filtered GameAsset[]
// 3. SpriteBrowser displays them in a grid with animation preview
// 4. User selects a sprite → spriteAssetId stored in player state
// 5. BabylonEngine loads the 12 frames and creates AnimatedBillboard
```

### 3.3 NPC Directional Rendering
**File:** `lib/game/BabylonEngine.ts`

NPCs use the same animated billboard system. NPC movement patterns drive the direction + frame animation:

```typescript
// NPC movement patterns:
type MovementPattern = 'static' | 'pace_horizontal' | 'pace_vertical' | 'wander' | 'patrol';

// static: no movement, always frame 0, facing initial direction
// pace_horizontal: walks left-right between two points, flips direction at bounds
// pace_vertical: walks up-down between two points, flips direction at bounds
// wander: random walk within radius, picks new direction periodically
// patrol: follows predefined waypoint list, loops

// NPC update loop (in BabylonEngine render tick):
function updateNPC(npc: NPC, dt: number) {
  const pattern = npc.movementPattern;
  let direction = npc.facing;
  let isMoving = false;

  switch (pattern) {
    case 'pace_horizontal':
      // Move horizontally between npc.x - range and npc.x + range
      // Flip direction at bounds
      // isMoving = true while transitioning
      break;
    case 'wander':
      // Every 3-5 seconds, pick a random direction
      // Walk for 1-2 seconds, then stop
      // isMoving = true while walking
      break;
    case 'static':
    default:
      // No movement
      break;
  }

  npc.billboard.update(dt, direction, isMoving);
}
```

### 3.4 Monster Overworld Sprites
**File:** `lib/game/BabylonEngine.ts`

Monsters in the overworld (roaming, following player) use directional overworld sprites from the `MonsterSpritePool`:

```typescript
// Roaming monsters: spawn in encounter zones, walk randomly
// Following monsters: player's active beast follows behind them
// Both use AnimatedBillboard with overworld sprite frames

// Following monster offset:
// Position = player position - 1 tile in player's facing direction
// Direction = same as player
// isMoving = same as player
```

---

# Part 3: Core Editor Phases (4–18)

## Phase 4: Asset Management Foundation

### 4.1 AssetManager Core
**File:** `lib/game/assets/AssetManager.ts`

```typescript
class AssetManager {
  private cache: Map<string, GameAsset> = new Map();
  private lruCache: LRUCache<string, GameAsset>;
  private prisma: PrismaClient;

  constructor(maxCacheSize: number = 500) {
    this.lruCache = new LRUCache({ max: maxCacheSize, ttl: 1000 * 60 * 30 }); // 30 min TTL
  }

  // Tagging operations
  async addTag(assetId: string, tag: string): Promise<void> {
    const asset = await this.prisma.gameAsset.findUnique({ where: { id: assetId } });
    if (!asset) throw new Error('Asset not found');
    const tags = [...(asset.tags as string[]), tag].filter((t, i, arr) => arr.indexOf(t) === i); // dedupe
    await this.prisma.gameAsset.update({ where: { id: assetId }, data: { tags } });
    this.invalidateCache(assetId);
  }

  async removeTag(assetId: string, tag: string): Promise<void> {
    const asset = await this.prisma.gameAsset.findUnique({ where: { id: assetId } });
    if (!asset) throw new Error('Asset not found');
    const tags = (asset.tags as string[]).filter(t => t !== tag);
    await this.prisma.gameAsset.update({ where: { id: assetId }, data: { tags } });
    this.invalidateCache(assetId);
  }

  async bulkAddTags(assetIds: string[], tags: string[]): Promise<void> {
    // Single transaction for efficiency
    await this.prisma.$transaction(
      assetIds.map(id =>
        this.prisma.gameAsset.update({
          where: { id },
          data: { tags: { push: tags } } // Note: Json push may need raw SQL
        })
      )
    );
    assetIds.forEach(id => this.invalidateCache(id));
  }

  async getAssetsByTag(tag: string, gameId?: string): Promise<GameAsset[]> {
    // Json field query: tags contains tag
    // SQLite: use JSON_EXTRACT or Prisma's Json filter
    return this.prisma.gameAsset.findMany({
      where: {
        type: 'SPRITE',
        // Json filter for tags containing the tag string
      }
    });
  }

  // Search with pagination
  async searchAssets(
    query: string,
    filters: AssetFilters,
    page: number = 0,
    limit: number = 50
  ): Promise<PaginatedResult<GameAsset>> {
    const where: Prisma.GameAssetWhereInput = {
      type: filters.type,
      isActive: true,
    };

    // Full-text search on source path (filename)
    if (query) {
      where.source = { contains: query, mode: 'insensitive' };
    }

    // Tag filtering (Json contains)
    if (filters.tags?.length) {
      // For SQLite: use raw query or filter in application
      // For MySQL/Postgres: use Json contains operators
    }

    const [items, total] = await Promise.all([
      this.prisma.gameAsset.findMany({
        where,
        skip: page * limit,
        take: limit,
        orderBy: filters.sortBy
          ? { [filters.sortBy]: filters.sortOrder || 'asc' }
          : { createdAt: 'desc' },
      }),
      this.prisma.gameAsset.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      hasMore: (page + 1) * limit < total,
    };
  }

  // Reclassify — fix mislabeled assets
  async reclassifyAsset(assetId: string, newType: string, newCategories: string[]): Promise<void> {
    await this.prisma.gameAsset.update({
      where: { id: assetId },
      data: {
        type: newType,
        categories: newCategories,
      },
    });
    this.invalidateCache(assetId);
  }

  // Duplicate detection — find visually similar assets
  async findDuplicates(gameId?: string): Promise<DuplicateGroup[]> {
    // Group by dimensions + type
    // Assets with same dimensions and similar filenames are likely duplicates
    const allAssets = await this.prisma.gameAsset.findMany({
      where: { gameId, isActive: true },
    });

    const groups: Map<string, GameAsset[]> = new Map();
    for (const asset of allAssets) {
      const metadata = asset.metadata as any;
      const key = `${asset.type}_${metadata.width}x${metadata.height}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(asset);
    }

    return Array.from(groups.entries())
      .filter(([_, assets]) => assets.length > 1)
      .map(([key, assets]) => ({ key, assets }));
  }

  private invalidateCache(assetId: string): void {
    this.cache.delete(assetId);
    this.lruCache.delete(assetId);
  }
}

interface AssetFilters {
  type?: string;
  tags?: string[];
  categories?: string[];
  minSize?: number;
  maxSize?: number;
  gameId?: string;
  sortBy?: 'source' | 'createdAt' | 'fileSize' | 'usageCount';
  sortOrder?: 'asc' | 'desc';
}

interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
```

### 4.2 Asset Editor UI
**File:** `components/the-lobby/editor/AssetEditor.tsx`

Comprehensive asset management interface:
- Grid/list toggle view with thumbnails (shows sliced frames, not whole sheets)
- Category tree navigation (expandable/collapsible)
- Tag management panel (add/remove/suggest tags)
- **Bulk selection** (shift+click, ctrl+click) and **bulk operations** (tag all, move all, rename all)
- **Reclassify tool** — fix mislabeled assets (user's specific request: "ways to retag or resort items mislabeled")
- Advanced search (name, tags, type, size, date, dimensions, frame count, direction count)
- Asset preview with zoom (2x, 4x, 8x) + animation preview + direction preview
- Upload new assets (drag & drop, file picker)
- Edit asset metadata (JSON editor)
- Relabel dialog (multi-language support)
- Export selected assets (ZIP download)
- Import assets (ZIP upload)
- Asset validation (check dimensions, format, size)
- Duplicate detection (find similar assets — helps find mislabeled items)
- Usage statistics (where is this asset used?)
- Asset history (version tracking)

**AssetEditor Component Structure:**
```typescript
// Layout:
// ┌─────────────────────────────────────────────────────┐
// │ [Search Bar] [Type Filter] [Sort] [View Toggle]     │
// ├──────────┬──────────────────────────┬───────────────┤
// │ Category │  Asset Grid              │  Preview Pane │
// │ Tree     │  ┌──┐ ┌──┐ ┌──┐         │  ┌─────────┐  │
// │ ▸ npcs   │  │  │ │  │ │  │         │  │ Sprite  │  │
// │ ▸ heroes │  └──┘ └──┘ └──┘         │  │ Preview │  │
// │ ▸ monsters│ ┌──┐ ┌──┐ ┌──┐         │  │ + Anim  │  │
// │ ▸ tiles  │  │  │ │  │ │  │         │  └─────────┘  │
// │          │  └──┘ └──┘ └──┘         │  Tags: [...]  │
// │ Tags:    │                          │  Categories:  │
// │ [tuxemon]│  [Bulk Ops Bar]         │  Usage: 5    │
// │ [npc]    │  [Tag] [Move] [Rename]  │  [Edit]      │
// │ [male]   │  [Reclassify] [Delete]  │  [Reclassify]│
// └──────────┴──────────────────────────┴───────────────┘
```

### 4.3 Asset Editor Integration
**File:** `components/the-lobby/editor/IntegratedDevEditor.tsx`

**NOTE:** The `assets` tab ALREADY EXISTS (it's the 9th tab). This phase REPLACES the existing basic assets viewer with the new AssetEditor:
```typescript
type EditorTab = 'maps' | 'spawns' | 'encounters' | 'npcs' | 'battles' | 'quests' | 'chars' | 'index' | 'assets' | 'classes' | 'loot' | 'rpg' | 'social' | 'sprites';

// Replace existing assets tab content:
{activeTab === 'assets' && (
  <AssetEditor
    onAssetSelect={(asset) => handleAssetSelection(asset)}
    onAssetEdit={(asset) => handleAssetEdit(asset)}
  />
)}

// New tabs added in later phases:
// {activeTab === 'classes' && <ClassEditor />}
// {activeTab === 'loot' && <LootTableEditor />}
// {activeTab === 'rpg' && <RPGProgressionEditor />}
// {activeTab === 'social' && <SocialFeaturesEditor />}
// {activeTab === 'sprites' && <MonsterSpritePoolEditor />}
```

---

## Phase 5: Game Configuration System

### 5.1 GameConfigManager
**File:** `lib/game/GameConfigManager.ts`

```typescript
class GameConfigManager {
  async loadGameConfig(slug: string): Promise<GameConfig> {
    return this.prisma.gameConfig.findUnique({ where: { slug } });
  }

  async createGameConfig(config: GameConfigInput): Promise<GameConfig> {
    // Validate config
    const validation = this.validateConfig(config);
    if (!validation.valid) throw new Error(validation.errors.join(', '));

    return this.prisma.gameConfig.create({
      data: {
        slug: config.slug,
        name: config.name,
        version: config.version,
        description: config.description,
        maxLevel: config.maxLevel,
        baseStats: config.baseStats,
        combatFormula: config.combatFormula,
        skillFormula: config.skillFormula,
        xpCurve: config.xpCurve,
        spritePackIds: config.spritePackIds,
        tilesetPackIds: config.tilesetPackIds,
        maxEntitiesPerMap: config.maxEntitiesPerMap,
        maxPlayersPerMap: config.maxPlayersPerMap,
        chunkSize: config.chunkSize,
        optimizationLevel: config.optimizationLevel,
        enableChat: config.enableChat,
        enableParties: config.enableParties,
        enableTrading: config.enableTrading,
        enablePvP: config.enablePvP,
        maxPartySize: config.maxPartySize,
      }
    });
  }

  async switchActiveGame(slug: string): Promise<void> {
    // Deactivate all, activate selected
    await this.prisma.$transaction([
      this.prisma.gameConfig.updateMany({ data: { isActive: false } }),
      this.prisma.gameConfig.update({ where: { slug }, data: { isActive: true } }),
    ]);
  }

  async cloneGame(id: string, newSlug: string): Promise<GameConfig> {
    const original = await this.prisma.gameConfig.findUnique({ where: { id } });
    if (!original) throw new Error('Game not found');

    // Clone config
    const cloned = await this.prisma.gameConfig.create({
      data: { ...original, id: undefined, slug: newSlug, name: `${original.name} (Copy)`, isActive: false }
    });

    // Clone classes
    const classes = await this.prisma.characterClass.findMany({ where: { gameId: id } });
    for (const cls of classes) {
      await this.prisma.characterClass.create({
        data: { ...cls, id: undefined, gameId: cloned.id }
      });
    }

    // Clone loot tables
    const lootTables = await this.prisma.lootTable.findMany({ where: { gameId: id } });
    for (const lt of lootTables) {
      await this.prisma.lootTable.create({
        data: { ...lt, id: undefined, gameId: cloned.id }
      });
    }

    return cloned;
  }

  validateConfig(config: GameConfigInput): ValidationResult {
    const errors: string[] = [];
    if (!config.slug?.match(/^[a-z0-9-]+$/)) errors.push('Slug must be lowercase alphanumeric + hyphens');
    if (config.maxLevel < 1 || config.maxLevel > 200) errors.push('Max level must be 1-200');
    if (config.maxPartySize < 1 || config.maxPartySize > 8) errors.push('Max party size must be 1-8');
    return { valid: errors.length === 0, errors };
  }
}
```

### 5.2 CharacterClassSystem
**File:** `lib/game/CharacterClassSystem.ts`

```typescript
class CharacterClassSystem {
  // Sprite filtering — classes filter the available sprite pool
  async getSpritesForClass(classId: string): Promise<GameAsset[]> {
    const cls = await this.prisma.characterClass.findUnique({ where: { id: classId } });
    if (!cls) return [];

    const allowedTags = cls.allowedSpriteTags as string[];
    const spriteFilters = cls.spriteFilters as Record<string, string[]>;

    // Query GameAsset where:
    // - type = 'SPRITE'
    // - tags contains ANY of allowedTags
    // - matches spriteFilters (gender, style, etc.)
    const allSprites = await this.prisma.gameAsset.findMany({
      where: { type: 'SPRITE', isActive: true }
    });

    // Filter in application (Json field filtering varies by DB)
    return allSprites.filter(sprite => {
      const tags = sprite.tags as string[];
      const metadata = sprite.metadata as any;

      // Must have at least one allowed tag
      const hasAllowedTag = allowedTags.some(t => tags.includes(t));
      if (!hasAllowedTag) return false;

      // Check sprite filters
      for (const [filterKey, filterValues] of Object.entries(spriteFilters)) {
        const spriteValue = metadata[filterKey];
        if (spriteValue && !filterValues.includes(spriteValue)) return false;
      }

      return true;
    });
  }
}
```

### 5.3 Game Config Editor UI
**File:** `components/the-lobby/editor/GameConfigEditor.tsx`

- Game metadata editor (name, version, description)
- Rules configuration: max level, base stats, combat/skill formula, XP curve
- Asset pack selector (multi-select with preview)
- Class management panel (create/edit/delete, icon selector, stats, growth, sprite tags, filters, equipment, skills, perks)
- Game export/import buttons
- Clone game button
- Validation status indicator
- Preview game button (test in sandbox)

### 5.4 Class Editor UI
**File:** `components/the-lobby/editor/ClassEditor.tsx`

- Class name, description, icon picker
- Base stats editor (numeric + sliders)
- Growth rate editor (multipliers per stat)
- **Sprite tag management** — add/remove tags that filter which sprites this class can use
- **Sprite filter builder** (visual AND/OR logic: tags, categories, gender, style)
- **Sprite preview grid** — shows all matching sprites from the pool (user's request: "characters we select from the available sprite list have it well sorted")
- Starting equipment slots
- Skill progression timeline
- Perk/ability selection
- Test class button, clone, delete

---

## Phase 6: Enhanced Sprite Browser

### 6.1 SpriteBrowser Component
**File:** `components/the-lobby/editor/SpriteBrowser.tsx`

The ultimate sprite selection interface — this is what the character creator and NPC editor use:

**SpriteBrowser Props:**
```typescript
interface SpriteBrowserProps {
  classId?: string;              // if provided, filter by class
  filterTags?: string[];         // additional tag filters
  filterType?: string;           // SPRITE, MONSTER, etc.
  multiSelect?: boolean;         // allow multiple selection
  selectedIds?: string[];        // currently selected
  onSelect: (assets: GameAsset[]) => void;
  onAssetEdit?: (asset: GameAsset) => void; // open AssetEditor
}
```

**Features:**
- Visual grid of sprites with thumbnails (sliced frames, not whole sheets)
- Grid size controls (small=64px, medium=96px, large=128px, xl=192px)
- **Filter by class** (if class selected, show only allowed sprites)
- Filter by tags (multi-select tag chips)
- Filter by category (tree navigation)
- Fuzzy search by name (debounced 300ms)
- Advanced filters: dimensions, frame count, direction count, atlas source, date, usage
- Sort options (name, date, size, usage)
- **Animation preview** (play/pause, speed control) — shows the 3-frame walk cycle
- **Direction preview** (cycle through down/up/left/right)
- Context menu: view details, edit, copy path, find usages, add to favorites
- Multi-selection (ctrl+click)
- Save/load filter presets
- Virtual scrolling for large lists (only render visible items)

**Thumbnail Rendering:**
```typescript
// Each thumbnail shows the "down_0" frame (standing, facing camera)
// On hover: play walk cycle animation (down direction)
// On click: open SpritePreview with full details

function SpriteThumbnail({ asset }: { asset: GameAsset }) {
  const [isHovering, setIsHovering] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const frames = asset.metadata.frames as SpriteFrame[];

  // Animation on hover
  useEffect(() => {
    if (!isHovering) { setCurrentFrame(0); return; }
    const interval = setInterval(() => {
      setCurrentFrame(f => (f + 1) % 3);
    }, 125); // 8 FPS
    return () => clearInterval(interval);
  }, [isHovering]);

  const frame = frames.find(f => f.direction === 'down' && f.frameIndex === currentFrame);
  // Render: <img src={atlasUrl} style={{ objectFit, objectPosition }} />
  // Use CSS object-position to show the correct frame from the atlas
}
```

### 6.2 SpritePreview Component
**File:** `components/the-lobby/editor/SpritePreview.tsx`

- Large sprite display with zoom
- Animation playback + direction cycling + frame-by-frame navigation
- Background toggle (transparent, white, black, checkerboard)
- Info panel: dimensions, frame count, direction count, file size, atlas source, tags, categories, usage
- Copy path, open in AssetEditor, download

### 6.3 Enhanced Character Creator
**File:** `components/the-lobby/character-creator.tsx`

Replace broken sprite selector with SpriteBrowser:
- Use SpriteBrowser filtered by selected class
- Show class-specific sprite options (sorted, tagged)
- Preview selected sprite with animations (all 4 directions)
- "Manage Sprites" button (opens AssetEditor for retagging/resorting)
- Sprite search, favorites, recently used

### 6.4 Enhanced NPC Editor
**File:** `components/the-lobby/editor/IntegratedDevEditor.tsx` (NPCs tab)

- Replace sprite dropdown with SpriteBrowser
- Filter by NPC category tags
- Preview NPC sprite in context (directional + animated)
- NPC template system, cloning, validation, usage stats, bulk operations

---

## Phase 7: Enhanced Map Editor

### 7.1 TilesetBrowser Component
**File:** `components/the-lobby/editor/TilesetBrowser.tsx`

- Visual tileset grid with thumbnails
- Filter by category (indoor, outdoor, terrain, water, etc.)
- Filter by tags (grass, water, wall, etc.)
- Search by name
- Tileset preview (zoom, pan)
- Tile selection (single, rectangle, flood fill)
- Tile info panel (name, dimensions, ID, tags, categories)
- Tile palette (recently used), favorites, custom collections
- Collision indicator overlay, animation preview
- Multi-tileset support, custom tileset upload

### 7.2 Enhanced Map Editor
**File:** `components/the-lobby/editor/IntegratedDevEditor.tsx` (Maps tab)

- Integrate TilesetBrowser for tile selection
- Multi-layer support (ground, walls, objects, decorations, collision, encounters)
- Layer visibility toggles, lock/unlock
- Painting tools: single tile, rectangle fill, flood fill, line tool, brush size
- Tile eraser, tile picker
- Undo/redo (history stack — max 50 operations)
- Map resize, template system, cloning
- Map validation, statistics
- Export/import (JSON, TMX)
- Mini-map preview, grid overlay, collision overlay
- Spawn point editor (visual drag)
- Gate/portal editor (visual connection)
- Encounter zone editor (visual zone painter)
- NPC placement (drag from NPC list)
- Object placement (trees, rocks, etc.)
- Map metadata editor (name, description, music)
- Map thumbnail generator

**Undo/Redo Implementation:**
```typescript
class MapEditHistory {
  private undoStack: MapEditOperation[] = [];
  private redoStack: MapEditOperation[] = [];
  private maxStack: number = 50;

  push(op: MapEditOperation): void {
    this.undoStack.push(op);
    if (this.undoStack.length > this.maxStack) this.undoStack.shift();
    this.redoStack = []; // clear redo on new operation
  }

  undo(): MapEditOperation | null {
    const op = this.undoStack.pop();
    if (op) {
      this.redoStack.push(op);
      // Reverse the operation (restore previous tile values)
    }
    return op;
  }

  redo(): MapEditOperation | null {
    const op = this.redoStack.pop();
    if (op) {
      this.undoStack.push(op);
      // Re-apply the operation
    }
    return op;
  }
}

interface MapEditOperation {
  type: 'paint' | 'erase' | 'fill' | 'resize';
  layer: string;
  cells: { x: number; y: number; oldTileId: number; newTileId: number }[];
  timestamp: number;
}
```

### 7.3 Encounter Zone Editor
**File:** `components/the-lobby/editor/IntegratedDevEditor.tsx` (Encounters tab)

- Visual zone painter on map
- Zone color coding by encounter pool
- Encounter pool editor: species selector, level range, spawn weight, time/weather restrictions
- Encounter rate slider
- Zone validation, statistics, cloning, templates
- Encounter preview (test encounter)

---

## Phase 8: Enhanced Quest Editor

### 8.1 QuestEditor UI
**File:** `components/the-lobby/editor/QuestEditor.tsx`

- Quest metadata (name, description, rewards)
- Quest stages editor (add/remove/reorder)
- Stage objectives: kill, collect, talk, reach, craft, catch, defeat, select
- Quest requirements: level, items, skills, quest prerequisites, reputation
- Quest rewards: XP, credits, items, skill XP, unlocks
- Quest dialogue editor (branching trees)
- Quest triggers: start, complete, fail
- Quest validation, cloning, templates, statistics
- Quest preview, dependency graph

**Quest Data Structure:**
```typescript
interface Quest {
  id: string;
  gameId: string;
  name: string;
  description: string;
  category: 'main_story' | 'side_quest' | 'daily' | 'event';
  stages: QuestStage[];
  requirements: QuestRequirement;
  rewards: QuestRewards;
  prerequisites: string[]; // quest IDs that must be completed first
  triggers: QuestTriggers;
}

interface QuestStage {
  id: string;
  objectives: QuestObjective[];
  rewards?: Partial<QuestRewards>; // stage-specific rewards
}

interface QuestObjective {
  type: 'kill' | 'collect' | 'talk' | 'reach' | 'craft' | 'catch' | 'defeat' | 'select';
  target: string;     // species slug, item slug, NPC id, map id, etc.
  quantity: number;   // how many to kill/collect/etc.
  optional?: boolean;
}

interface QuestRewards {
  xp?: number;
  credits?: number;
  items?: { slug: string; quantity: number }[];
  skillXP?: { skill: string; xp: number }[];
  unlocks?: string[]; // feature/area unlocks
}
```

### 8.2 DialogueEditor
**File:** `components/the-lobby/editor/DialogueEditor.tsx`

- Visual dialogue tree (nodes + edges)
- Node types: text, choice, condition, action, end
- Node editing, drag-to-connect
- Dialogue preview, validation (infinite loop check)
- Export/import, templates
- NPC portrait preview, dialogue variables, history

**Dialogue Node Structure:**
```typescript
interface DialogueNode {
  id: string;
  type: 'text' | 'choice' | 'condition' | 'action' | 'end';
  // Text node: NPC says something
  text?: string;
  speaker?: string;        // NPC name
  portraitAssetId?: string; // NPC portrait
  // Choice node: player picks an option
  choices?: { text: string; nextNodeId: string; condition?: string }[];
  // Condition node: branch based on game state
  condition?: string;      // e.g., "player.level >= 10"
  trueNext?: string;       // node ID if condition true
  falseNext?: string;      // node ID if condition false
  // Action node: perform game action
  action?: 'give_item' | 'start_quest' | 'complete_quest' | 'give_xp' | 'teleport' | 'set_flag';
  actionParams?: Record<string, any>;
  // End node: end dialogue
  nextNodeId?: string;     // for text nodes, next node to show
}
```

---

## Phase 9: Enhanced Battle System Editor

### 9.1 BattleConfigEditor
**File:** `components/the-lobby/editor/BattleConfigEditor.tsx`

- Battle background selector (from assets)
- Weather effect selector, battle music selector
- AI difficulty, turn order rules, escape/capture mechanics
- Experience formula, level-up/evolution triggers
- Status effect configuration, animation presets, UI theme
- Validation, preview, templates

### 9.2 Monster/Species Editor
**File:** `components/the-lobby/editor/MonsterEditor.tsx`

**NOTE:** This editor works with the EXISTING `TuxemonSpecies`, `TuxemonMove`, `TuxemonEvolution`, `TuxemonTechnique` models — not parallel new tables.

- Monster metadata (name, description, element)
- Base stats (HP, ATK, DEF, SPD, RATK, RDEF — Tuxemon 6-stat standard)
- Growth rates, moveset editor, move PP
- Evolution editor (chain, conditions: level/item/steps/variables)
- Sprite selector (front/back/overworld from SpriteBrowser)
- Shiny sprite, cry audio, type effectiveness, abilities, held items
- Spawn locations, encounter rate
- Validation, cloning, preview, statistics

---

## Phase 10: Loot System Editor

### 10.1 LootTableEditor
**File:** `components/the-lobby/editor/LootTableEditor.tsx`

- Loot table metadata (name, description, conditions)
- Loot entry editor: item selector, quantity range, rarity, drop chance, conditions
- Guaranteed drops editor
- Rarity weight sliders (common/uncommon/rare/epic/legendary)
- Roll count configuration
- Loot preview (simulate drops)
- Validation, cloning, templates, statistics
- Import/export JSON

**Loot Table Data Structure:**
```typescript
interface LootTable {
  id: string;
  gameId: string;
  name: string;
  entries: LootEntry[];
  rollsPerDrop: number;     // how many items to roll per drop
  guaranteedDrops: LootEntry[]; // always dropped
  rarityWeights: {
    common: number;     // default 60
    uncommon: number;   // default 25
    rare: number;       // default 10
    epic: number;       // default 4
    legendary: number;  // default 1
  };
  conditions: {
    minLevel?: number;
    maxLevel?: number;
    requiredTags?: string[];
  };
}

interface LootEntry {
  itemSlug: string;        // references TuxemonItem
  quantityMin: number;
  quantityMax: number;
  dropChance: number;      // 0-100 percentage
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  conditions?: {
    minLevel?: number;
    timeOfDay?: 'day' | 'night' | 'dawn' | 'dusk';
    weather?: string;
  };
}
```

### 10.2 Creature Battle Loot Editor
**File:** Update `components/the-lobby/editor/MonsterEditor.tsx`

Add loot configuration to monster editor:
- Loot table selector (assign to monster)
- Custom loot entries (monster-specific drops)
- Shiny drop configuration
- Level-based loot scaling
- Capture bonus loot, defeat bonus loot
- Loot preview, validation

### 10.3 Player Battle Loot Editor
**File:** `components/the-lobby/editor/PlayerBattleLootEditor.tsx`

Player vs monster/keeper/PvP loot:
- PvP: winner rewards, loser consolation, streak bonuses, rank-based rewards
- Keeper battles: defeat rewards, keeper-specific tables, difficulty scaling
- Arena: reward structure, tournament prizes, leaderboard bonuses
- Validation, preview

### 10.4 LootSystem Core
**File:** `lib/game/LootSystem.ts`

```typescript
class LootSystem {
  // Generate loot from table
  async generateLoot(lootTableId: string, context: LootContext): Promise<LootResult> {
    const table = await this.prisma.lootTable.findUnique({ where: { id: lootTableId } });
    if (!table) return { items: [] };

    // Check conditions
    if (table.minLevel && context.level < table.minLevel) return { items: [] };
    if (table.maxLevel && context.level > table.maxLevel) return { items: [] };

    const items: LootDrop[] = [];

    // 1. Guaranteed drops
    for (const entry of table.guaranteedDrops as LootEntry[]) {
      const qty = this.randomInt(entry.quantityMin, entry.quantityMax);
      items.push({ itemSlug: entry.itemSlug, quantity: qty, rarity: entry.rarity });
    }

    // 2. Roll for random drops
    const weights = table.rarityWeights as any;
    for (let i = 0; i < table.rollsPerDrop; i++) {
      // Roll rarity
      const rarity = this.rollRarity(weights);
      // Filter entries by rarity
      const entries = (table.entries as LootEntry[]).filter(e => e.rarity === rarity);
      if (entries.length === 0) continue;

      // Roll for specific item within rarity
      const entry = entries[Math.floor(Math.random() * entries.length)];

      // Roll drop chance
      if (Math.random() * 100 > entry.dropChance) continue;

      const qty = this.randomInt(entry.quantityMin, entry.quantityMax);
      items.push({ itemSlug: entry.itemSlug, quantity: qty, rarity });
    }

    return { items };
  }

  rollRarity(weights: { common: number; uncommon: number; rare: number; epic: number; legendary: number }): Rarity {
    const total = weights.common + weights.uncommon + weights.rare + weights.epic + weights.legendary;
    const roll = Math.random() * total;
    let cumulative = 0;

    cumulative += weights.common;
    if (roll < cumulative) return 'common';
    cumulative += weights.uncommon;
    if (roll < cumulative) return 'uncommon';
    cumulative += weights.rare;
    if (roll < cumulative) return 'rare';
    cumulative += weights.epic;
    if (roll < cumulative) return 'epic';
    return 'legendary';
  }

  async generateCreatureLoot(speciesSlug: string, level: number, isShiny: boolean): Promise<LootResult> {
    // Find loot table assigned to this species
    // Shiny = better loot table or bonus rolls
    // Level scaling: higher level = more rolls
  }

  async generateBattleLoot(battleType: 'pvp'|'keeper'|'arena', winnerId: string, loserId: string): Promise<LootResult> {
    // PvP: winner gets rewards, loser gets consolation
    // Keeper: defeat rewards based on keeper difficulty
    // Arena: tournament prizes
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
```

---

## Phase 11: Monster Sprite Pool System

### 11.1 MonsterSpritePoolManager
**File:** `lib/game/MonsterSpritePoolManager.ts`

```typescript
class MonsterSpritePoolManager {
  async createSpritePool(poolData: SpritePoolInput): Promise<MonsterSpritePool> {
    return this.prisma.monsterSpritePool.create({ data: poolData });
  }

  async getSpritePoolBySpecies(speciesSlug: string): Promise<MonsterSpritePool | null> {
    return this.prisma.monsterSpritePool.findFirst({ where: { speciesSlug } });
  }

  // ONE pool feeds ALL uses — this is the key concept
  async getSpriteForSpecies(speciesSlug: string, variant?: string): Promise<string> {
    const pool = await this.getSpritePoolBySpecies(speciesSlug);
    if (!pool) throw new Error(`No sprite pool for species: ${speciesSlug}`);

    if (variant) {
      const variants = pool.variants as Record<string, string>;
      if (variants[variant]) return variants[variant];
    }

    return pool.spriteAssetId;
  }

  async getShinySpriteForSpecies(speciesSlug: string): Promise<string | null> {
    const pool = await this.getSpritePoolBySpecies(speciesSlug);
    return pool?.shinySpriteAssetId || null;
  }

  async getBackSpriteForSpecies(speciesSlug: string): Promise<string | null> {
    const pool = await this.getSpritePoolBySpecies(speciesSlug);
    return pool?.backSpriteAssetId || null;
  }

  async getOverworldSpriteForSpecies(speciesSlug: string): Promise<string | null> {
    const pool = await this.getSpritePoolBySpecies(speciesSlug);
    return pool?.overworldSpriteAssetId || null;
  }
}
```

### 11.2 Monster Sprite Pool Editor
**File:** `components/the-lobby/editor/MonsterSpritePoolEditor.tsx`

- Species selector (from TuxemonSpecies — 411 species)
- Primary sprite selector (from SpriteBrowser — front)
- Shiny sprite, back sprite, overworld sprite selectors
- Animation config: frame count, direction count, frame rate
- Sprite variant editor (male, female, child, etc.)
- Sprite preview: normal, shiny, animation, direction
- Validation, cloning, templates
- **Bulk sprite assignment** (assign sprites to multiple species)

### 11.3 Shared Creature/Monster Sprite Pool Concept

**Key insight (user's request):** "the sprites for monsters and creatures can be selected from the same monster pool of assets."

The `MonsterSpritePool` is the SINGLE source of truth for monster sprites. ALL systems draw from it:

```
┌─────────────────────────────────────────────────────────────┐
│                  MonsterSpritePool                           │
│  (411 species × front/back/overworld/shiny sprites)         │
└──────────┬──────────┬──────────┬──────────┬─────────────────┘
           │          │          │          │
     ┌─────▼────┐ ┌───▼────┐ ┌───▼────┐ ┌───▼────────────┐
     │   Wild   │ │ Player │ │  NPC   │ │    Roaming     │
     │Encounters│ │ Party  │ │Trainers│ │ PvM Monsters   │
     │(front +  │ │(front +│ │(front +│ │(overworld +    │
     │ overworld)│ │ back)  │ │ back)  │ │ front in battle)│
     └──────────┘ └────────┘ └────────┘ └────────────────┘
```

This means: edit a sprite in the pool → it updates EVERYWHERE (wild, party, trainers, roaming). No duplication.

### 11.4 Tuxemon Monster Sprite Pool Configuration
**File:** `lib/game/configs/tuxemon-sprite-pools.ts`

Configure sprite pools for all 411 Tuxemon species (generated from `TuxemonSpecies` table + asset import).

---

## Phase 12: RPG Progression Editor

### 12.1 RPGProgressionEditor
**File:** `components/the-lobby/editor/RPGProgressionEditor.tsx`

- XP curve editor (linear, exponential, custom; level → XP required; multiplier per level)
- Skill progression editor (27 skills: unlock timeline, XP requirements, mastery, synergy)
- Ability progression editor (unlock timeline, prerequisites, cooldowns, mana costs)
- Perk progression editor (unlock timeline, stacking rules, conflicts)
- Stat growth editor (base stats per level, growth rates per class, stat caps)
- Level-up rewards (stat points, skill points, ability points, milestone rewards)
- Validation, preview (simulate progression), cloning

**XP Curve Formulas:**
```typescript
// XP required to reach level L from level L-1:
type XPCurve = 'linear' | 'exponential' | 'custom';

function xpForLevel(level: number, curve: XPCurve, config: XPCurveConfig): number {
  switch (curve) {
    case 'linear':
      // XP = baseXP * level
      return config.baseXP * level;
    case 'exponential':
      // XP = baseXP * (multiplier ^ level)
      return Math.floor(config.baseXP * Math.pow(config.multiplier, level));
    case 'custom':
      // Look up from custom table
      return config.customTable[level] || 0;
  }
}

// Total XP to reach level L:
function totalXPForLevel(level: number, curve: XPCurve, config: XPCurveConfig): number {
  let total = 0;
  for (let l = 1; l <= level; l++) {
    total += xpForLevel(l, curve, config);
  }
  return total;
}

// RuneScape-style skill XP (from game-idea.md):
// Level = floor(sqrt(XP / 50)) + 1, max level 50
function skillLevelFromXP(xp: number): number {
  return Math.floor(Math.sqrt(xp / 50)) + 1;
}

function xpForSkillLevel(level: number): number {
  // Inverse: XP = 50 * (level - 1)^2
  return 50 * Math.pow(level - 1, 2);
}
```

### 12.2 SkillSystemEditor
**File:** `components/the-lobby/editor/SkillSystemEditor.tsx`

- Skill metadata (name, description, icon, type: combat/gathering/crafting/social)
- Skill level config (XP per level, unlockables, mastery bonuses)
- Skill actions (per level, success rates, XP gains)
- Skill tools (required tools, effectiveness multipliers)
- Skill synergy (combinations, bonuses)
- Validation, preview

**27-Skill Matrix (from game-idea.md):**
```typescript
const SKILLS = {
  // Combat Skills (Player vs Keeper)
  combat: ['summoning', 'strength', 'attack', 'defence', 'magic', 'ranged'],

  // Gathering Skills
  gathering: ['woodcutting', 'mining', 'fishing', 'farming', 'hunter'],

  // Artisan Skills
  artisan: ['smithing', 'crafting', 'cooking', 'herblore', 'fletching', 'runecrafting', 'construction'],

  // Support Skills
  support: ['agility', 'thieving'],

  // Base Automation
  automation: ['furnace_operation', 'farm_tending', 'fishing_automation', 'lumber_mill', 'quarry_operation'],
};
// Total: 6 + 5 + 7 + 2 + 5 = 25 base + 2 more = 27 skills
```

### 12.3 Tuxemon RPG Progression Configuration
**File:** `lib/game/configs/tuxemon-rpg-progression.ts`

---

## Phase 13: Social Features Editor

### 13.1 SocialFeaturesEditor
**File:** `components/the-lobby/editor/SocialFeaturesEditor.tsx`

- Chat config (channels, rate limiting, word filters, moderation)
- Party config (max size, XP sharing, loot distribution, leader permissions)
- Trading config (enable, cooldowns, level requirements, restrictions)
- PvP config (enable, level ranges, rewards, penalties)
- Friend system (max friends, request cooldowns, groups)
- Guild/clan config (enable, max size, creation requirements, permissions)
- Validation, preview

### 13.2 Tuxemon Social Configuration
**File:** `lib/game/configs/tuxemon-social.ts`

---

## Phase 14: Game Export/Import System

### 14.1 GameExporter
**File:** `lib/game/GameExporter.ts`

```typescript
class GameExporter {
  async exportGame(gameId: string): Promise<GamePackage> {
    const config = await this.prisma.gameConfig.findUnique({ where: { id: gameId } });
    const classes = await this.prisma.characterClass.findMany({ where: { gameId } });
    const lootTables = await this.prisma.lootTable.findMany({ where: { gameId } });
    const spritePools = await this.prisma.monsterSpritePool.findMany({ where: { gameId } });
    const maps = await this.prisma.worldMap.findMany({ where: { gameId } });
    const quests = await this.prisma.gameQuest.findMany({ where: { gameId } });

    // Get all assets referenced by this game
    const assetIds = new Set<string>();
    classes.forEach(c => c.iconAssetId && assetIds.add(c.iconAssetId));
    spritePools.forEach(p => {
      assetIds.add(p.spriteAssetId);
      if (p.shinySpriteAssetId) assetIds.add(p.shinySpriteAssetId);
      if (p.backSpriteAssetId) assetIds.add(p.backSpriteAssetId);
      if (p.overworldSpriteAssetId) assetIds.add(p.overworldSpriteAssetId);
    });
    const assets = await this.prisma.gameAsset.findMany({
      where: { id: { in: Array.from(assetIds) } }
    });

    return {
      version: '1.0.0',
      metadata: {
        name: config.name,
        version: config.version,
        description: config.description,
        author: 'Saints Gaming',
        createdAt: new Date().toISOString(),
      },
      config,
      assets: assets,
      content: {
        classes,
        maps,
        quests,
        lootTables,
        spritePools,
        // Monsters and items come from TuxemonSpecies/TuxemonItem (shared)
      },
    };
  }
}
```

### 14.2 GameImporter
**File:** `lib/game/GameImporter.ts`

```typescript
class GameImporter {
  async importGame(pkg: GamePackage): Promise<GameConfig> {
    // 1. Validate package
    const validation = await this.validatePackage(pkg);
    if (!validation.valid) throw new Error(validation.errors.join(', '));

    // 2. Check for conflicts
    const conflicts = await this.checkConflicts(pkg);
    if (conflicts.length > 0) {
      // Handle based on conflict resolution strategy
    }

    // 3. Create game config
    const config = await this.prisma.gameConfig.create({
      data: { ...pkg.config, id: undefined, slug: `${pkg.config.slug}_imported` }
    });

    // 4. Import assets (skip if already exist)
    for (const asset of pkg.assets) {
      await this.prisma.gameAsset.upsert({
        where: { id: asset.id },
        create: asset,
        update: asset,
      });
    }

    // 5. Import classes, loot tables, sprite pools, maps, quests
    // (all with gameId = config.id)

    return config;
  }

  async checkConflicts(pkg: GamePackage): Promise<ConflictReport> {
    // Check if slug already exists
    // Check if asset IDs already exist
    // Check if map IDs already exist
    // Return report of all conflicts
  }
}
```

### 14.3 Export/Import UI
**File:** `components/the-lobby/editor/GameExportImport.tsx`

- Export: complete game, assets only, maps only, quests only, custom selection
- Import: replace, merge, create new; preview; conflict resolution; dependency checking
- Package browser, sharing, versioning, validation, statistics

---

## Phase 15: Engine Modularization

### 15.1 RenderEngine Module
**File:** `lib/game/engine/RenderEngine.ts`

Extract BabylonJS rendering logic:
```typescript
class RenderEngine {
  private scene: Scene;
  private engine: BabylonEngine;
  private camera: FreeCamera;
  private tileMeshes: Map<string, Mesh> = new Map();
  private entityMeshes: Map<string, Mesh> = new Map();
  private animatedTiles: Map<number, AnimatedTile> = new Map();

  createScene(canvas: HTMLCanvasElement): Scene {
    this.engine = new BabylonEngine(canvas, { antialias: true, preserveDrawingBuffer: true });
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.05, 0.05, 0.1, 1);
    return this.scene;
  }

  setupCamera(config: CameraConfig): FreeCamera {
    this.camera = new FreeCamera('camera', new Vector3(0, 10, -5), this.scene);
    this.camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
    // Orthographic for crisp pixel art (no perspective distortion)
    this.camera.orthoTop = config.viewHeight / 2;
    this.camera.orthoBottom = -config.viewHeight / 2;
    this.camera.orthoLeft = -config.viewWidth / 2;
    this.camera.orthoRight = config.viewWidth / 2;
    return this.camera;
  }

  setCameraPosition(x: number, z: number, lerp: number = 0.15): void {
    const target = new Vector3(x, 10, z - 5);
    this.camera.position = Vector3.Lerp(this.camera.position, target, lerp);
  }

  loadTilemap(data: TilemapData): void {
    // Clear old meshes
    this.clearScene();

    // For each layer, for each cell, create ground mesh with tile texture
    // (detailed in Phase 2.1)
  }

  startRenderLoop(onTick?: (dt: number) => void): void {
    this.engine.runRenderLoop(() => {
      const dt = this.engine.getDeltaTime();
      // Update animated tiles
      this.updateAnimatedTiles(dt);
      // Update water animation
      this.updateWaterAnimation(dt);
      // Custom tick
      onTick?.(dt);
      // Render
      this.scene.render();
    });
  }
}
```

### 15.2 PhysicsEngine Module
**File:** `lib/game/engine/PhysicsEngine.ts`

```typescript
class PhysicsEngine {
  checkTileCollision(x: number, y: number, map: GameMap): boolean {
    const tile = map.grid[y]?.[x];
    // Tile 1 = solid wall, other collision tiles defined in map metadata
    return tile === 1; // simplified — real implementation checks collision layer
  }

  canMoveTo(from: Vector3, to: Vector3, map: GameMap): boolean {
    const targetX = Math.floor(to.x);
    const targetZ = Math.floor(to.z);
    // Check bounds
    if (targetX < 0 || targetX >= map.width) return false;
    if (targetZ < 0 || targetZ >= map.height) return false;
    // Check collision
    return !this.checkTileCollision(targetX, targetZ, map);
  }

  checkTileTrigger(x: number, y: number, map: GameMap): Trigger | null {
    // Check for gates, encounter zones, NPC proximity, resource nodes
    if (map.gates) {
      const tile = map.grid[y]?.[x];
      const gate = map.gates[tile];
      if (gate) return { type: 'gate', data: gate };
    }
    // Check encounter zones (tall grass)
    // Check NPC proximity
    return null;
  }

  canHopTo(from: Vector3, to: Vector3, map: GameMap): boolean {
    // Ledge hopping: one-way directional jumps
    // Check if tile is a ledge and direction matches allowed hop direction
    return false; // simplified
  }
}
```

### 15.3 EntityManager Module
**File:** `lib/game/engine/EntityManager.ts`

```typescript
class EntityManager {
  private entities: Map<string, Entity> = new Map();
  private billboards: Map<string, AnimatedBillboard> = new Map();

  createEntity(config: EntityConfig): Entity {
    const entity: Entity = {
      id: config.id,
      type: config.type,
      position: config.position,
      direction: config.direction || 'down',
      isMoving: false,
      spriteAssetId: config.spriteAssetId,
    };
    this.entities.set(entity.id, entity);

    // Create animated billboard
    const billboard = new AnimatedBillboard();
    billboard.loadSprite(config.spriteAssetId);
    this.billboards.set(entity.id, billboard);

    return entity;
  }

  updateEntityPosition(id: string, x: number, y: number): void {
    const entity = this.entities.get(id);
    if (entity) {
      entity.position = { x, y };
      entity.isMoving = true;
    }
  }

  updateAll(dt: number): void {
    for (const [id, entity] of this.entities) {
      const billboard = this.billboards.get(id);
      if (billboard) {
        billboard.update(dt, entity.direction, entity.isMoving);
      }
      // Reset isMoving after update (set by movement system each frame)
      entity.isMoving = false;
    }
  }
}
```

### 15.4 MapSystem Module
**File:** `lib/game/engine/MapSystem.ts`

```typescript
class MapSystem {
  private currentMap: GameMap | null = null;
  private mapChunkLoader: MapChunkLoader;

  async loadMap(mapId: string): Promise<GameMap> {
    this.currentMap = await this.mapChunkLoader.loadMap(mapId);
    return this.currentMap;
  }

  getTile(x: number, y: number, layer?: string): Tile | null {
    if (!this.currentMap) return null;
    const layerData = layer
      ? this.currentMap.tileLayers?.find(l => l.name === layer)
      : this.currentMap.tileLayers?.[0];
    if (!layerData) return null;
    const tileId = layerData.grid[y]?.[x];
    if (tileId === undefined || tileId === 0) return null;
    return { tileId, x, y };
  }

  setTile(x: number, y: number, tileId: number, layer?: string): void {
    if (!this.currentMap) return;
    const layerData = layer
      ? this.currentMap.tileLayers?.find(l => l.name === layer)
      : this.currentMap.tileLayers?.[0];
    if (layerData && layerData.grid[y]) {
      layerData.grid[y][x] = tileId;
    }
  }

  getGate(tileId: number): MapGate | null {
    if (!this.currentMap?.gates) return null;
    return this.currentMap.gates[tileId] || null;
  }
}
```

### 15.5 Refactor BabylonEngine
**File:** `lib/game/BabylonEngine.ts`

Refactor to delegate to modules:
```typescript
class BabylonEngine {
  private renderEngine: RenderEngine;
  private physicsEngine: PhysicsEngine;
  private entityManager: EntityManager;
  private mapSystem: MapSystem;

  constructor(canvas: HTMLCanvasElement) {
    this.renderEngine = new RenderEngine();
    this.physicsEngine = new PhysicsEngine();
    this.entityManager = new EntityManager();
    this.mapSystem = new MapSystem();

    // Initialize
    this.renderEngine.createScene(canvas);
    this.renderEngine.setupCamera({ viewWidth: 20, viewHeight: 15 });
    this.setupBabylonSpecifics(); // procedural textures, shadows, GUI
  }

  loadTilemap(data: TilemapData) {
    this.mapSystem.loadMapFromDefinition(data);
    this.renderEngine.loadTilemap(data);
  }

  updateEntity(id: string, data: EntityData) {
    this.entityManager.updateEntityPosition(id, data.x, data.y);
  }

  private setupBabylonSpecifics() {
    // Procedural textures (wood floor, wall, water)
    // Shadow generator
    // GUI texture (chat bubbles)
    // BabylonJS-specific optimizations
  }
}
```

**Note:** `components/the-lobby/babylon/GameCanvasBabylon.tsx` is the React wrapper that instantiates `BabylonEngine` — it stays as the bridge between React and the engine modules.

---

## Phase 16: Tuxemon Demo Configuration

### 16.1 Create Tuxemon Game Config
**File:** `lib/game/configs/tuxemon-config.ts`

```typescript
export const TUXEMON_CONFIG: GameConfigInput = {
  slug: 'tuxemon',
  name: 'Tuxemon Demo',
  version: '1.0.0',
  description: 'Official Tuxemon campaign as demo content',
  maxLevel: 100,
  baseStats: { hp: 100, atk: 50, def: 40, spd: 50, ratk: 50, rdef: 40 },
  combatFormula: 'tuxemon-standard',
  skillFormula: 'runescape-style',
  xpCurve: 'exponential',
  spritePackIds: ['tuxemon-npcs', 'tuxemon-monsters'],
  tilesetPackIds: ['tuxemon-outdoor', 'tuxemon-indoor', 'tuxemon-terrain'],
};
```

### 16.2 Configure Character Classes (6 classes)
**File:** `lib/game/configs/tuxemon-classes.ts`

```typescript
export const TUXEMON_CLASSES: ClassInput[] = [
  {
    name: 'Tamer',
    description: 'Beast-focused class with enhanced capture rates',
    iconAssetId: null, // set after asset import
    baseStats: { hp: 100, atk: 45, def: 45, spd: 55, ratk: 40, rdef: 40 },
    growthRates: { hp: 1.4, atk: 1.3, def: 1.3, spd: 1.5, ratk: 1.2, rdef: 1.2 },
    allowedSpriteTags: ['hero', 'player', 'tamer', 'adventurer'],
    spriteFilters: { gender: ['male', 'female', 'neutral'], style: ['adventurer', 'civilian'] },
    startingEquipment: { head: null, chest: 'tuxeball_pouch', legs: null, weapon: 'basic_net' },
    learnableSkills: [
      { level: 1, skill: 'capture', xp: 0 },
      { level: 5, skill: 'beast_knowledge', xp: 100 },
      { level: 10, skill: 'quick_capture', xp: 500 }
    ],
    perks: ['MASTER_TAMER'],
    abilities: ['beast_empathy'],
  },
  {
    name: 'Animist',
    description: 'Spirit-focused class with enhanced summoning',
    // ... stats, sprites, skills, perks, abilities
  },
  {
    name: 'Invoker',
    description: 'Magic-focused class with elemental combat',
    // ...
  },
  {
    name: 'Naturalist',
    description: 'Nature-focused class with gathering bonuses',
    // ...
  },
  // 2 more classes...
];
```

### 16.3 Configure Maps (38 maps)
**File:** Database (WorldMap model) — migrated from `campaign-maps.ts`

All 38 campaign maps with proper `tileLayers` + `tilesets` + `gates` + `npcs` + `encounterPool`.

### 16.4 Configure NPCs (70+)
**File:** `lib/game/configs/tuxemon-npcs.ts`

```typescript
export const TUXEMON_NPCS: NPCConfig[] = [
  {
    id: 'mom',
    name: 'Mom',
    mapId: 'PLAYER_HOUSE_DOWNSTAIRS',
    position: { x: 8, y: 4 },
    spriteKey: 'npc:barmaid', // references GameAsset by tag:id
    dialogueKey: 'mom_greeting',
    movementPattern: 'static',
  },
  {
    id: 'professor_oakwood',
    name: 'Professor Oakwood',
    mapId: 'PROFESSOR_LAB',
    position: { x: 12, y: 8 },
    spriteKey: 'npc:disciple',
    dialogueKey: 'professor_intro',
    movementPattern: 'pace_horizontal',
  },
  // ... 68+ more NPCs
];
```

### 16.5 Set as Default Game
**File:** `components/the-lobby/index.tsx`

```typescript
const defaultGame = await gameConfigManager.loadGameConfig('tuxemon');
if (!defaultGame) {
  await gameConfigManager.createGameConfig(TUXEMON_CONFIG);
}
await gameConfigManager.switchActiveGame('tuxemon');
```

---

## Phase 17: Tuxemon Full Playability

### 17.1 Complete Campaign Configuration
**File:** `lib/game/configs/tuxemon-campaign.ts`

```typescript
export const TUXEMON_CAMPAIGN = {
  starterQuest: {
    id: 'starter_journey',
    name: 'Beginning Your Journey',
    stages: [
      {
        id: 'wake_up',
        objectives: [
          { type: 'talk', target: 'mom', quantity: 1 },
          { type: 'reach', target: 'PLAYER_HOUSE_DOWNSTAIRS', quantity: 1 }
        ],
        rewards: { xp: 50, credits: 100 }
      },
      {
        id: 'meet_professor',
        objectives: [
          { type: 'talk', target: 'professor_oakwood', quantity: 1 },
          { type: 'reach', target: 'PROFESSOR_LAB', quantity: 1 }
        ],
        rewards: { xp: 100, credits: 200, items: [{ slug: 'tuxeball', quantity: 5 }] }
      },
      {
        id: 'choose_starter',
        objectives: [
          { type: 'select', target: 'starter_beast', quantity: 1 }
        ],
        rewards: { xp: 200, credits: 500, items: [{ slug: 'potion', quantity: 3 }] }
      }
    ]
  },
  maps: TUXEMON_MAPS,
  npcs: TUXEMON_NPCS,
  quests: TUXEMON_QUESTS,
  encounterPools: TUXEMON_ENCOUNTER_POOLS,
  spritePools: TUXEMON_SPRITE_POOLS,
  lootTables: TUXEMON_LOOT_TABLES,
  rpgProgression: TUXEMON_RPG_PROGRESSION,
  socialConfig: TUXEMON_SOCIAL_CONFIG,
};
```

### 17.2 Tuxemon Quest Database
**File:** `lib/game/configs/tuxemon-quests.ts`

50+ quests: starter journey, first catch, gym badges (8), story quests, side quests.

### 17.3 Tuxemon Encounter Pools
**File:** `lib/game/configs/tuxemon-encounters.ts`

```typescript
export const TUXEMON_ENCOUNTER_POOLS = {
  'PLAYER_HOUSE_BEDROOM': null, // No encounters indoors
  'SPYDER_ROUTE1': [
    { speciesId: 'ignis', minLevel: 2, maxLevel: 5, weight: 30 },
    { speciesId: 'aqua_fox', minLevel: 2, maxLevel: 5, weight: 30 },
    { speciesId: 'leafling', minLevel: 3, maxLevel: 6, weight: 25 },
    { speciesId: 'spark_rat', minLevel: 3, maxLevel: 6, weight: 15 },
  ],
  // ... encounter pools for all 38 maps
};
```

### 17.4 Tuxemon Loot Tables
**File:** `lib/game/configs/tuxemon-loot.ts`

20+ loot tables: common monster, rare monster, boss/gym leader, PvP, keeper, arena.

### 17.5 Tuxemon Editor Integration
**File:** `components/the-lobby/editor/IntegratedDevEditor.tsx`

Add all new tabs:
```typescript
{activeTab === 'loot' && <LootTableEditor />}
{activeTab === 'rpg' && <RPGProgressionEditor />}
{activeTab === 'social' && <SocialFeaturesEditor />}
{activeTab === 'sprites' && <MonsterSpritePoolEditor />}
{activeTab === 'classes' && <ClassEditor />}
```

### 17.6 Tuxemon Playability Validation
**File:** `scripts/validate-tuxemon-playability.ts`

```typescript
// Validate:
// - All 38 maps have real tileLayers + tilesets (no wallpaper fallback)
// - All maps render real tile art
// - All NPCs have valid sliced sprite assets
// - All NPCs have dialogue
// - All quests have objectives + rewards
// - All encounter pools have valid species
// - All loot tables have valid items
// - All 411 sprite pools have valid assets
// - All RPG progression is complete (27 skills)
// - All social features configured
// - Starter quest flow complete
// - Gym leader progression complete
// - Evolution chains complete
// - Move learnsets complete
// - All characters render 4-direction animated
// - All monsters render from shared sprite pool
```

---

## Phase 18: Cleanup & Optimization

### 18.1 Remove Legacy Code
Delete:
- `components/the-lobby/game-canvas.tsx` (Canvas2D, procedural, wallpaper)
- `components/the-lobby/GameCanvasWebGL.tsx` (PixiJS)
- `components/the-lobby/MapEditorWebGL.tsx` (PixiJS map editor)
- `lib/game/GameRenderer.ts` (PixiJS renderer)
- `lib/game/store.ts` (if duplicate of `components/the-lobby/store.ts`)
- `components/the-lobby/dex-overlay.tsx` (duplicate of SaintsDexOverlay)
- `components/the-lobby/data/sprites.ts` (hardcoded, use AssetManager)
- `components/the-lobby/data/generated-assets.ts` (use database)
- `components/the-lobby/data/campaign-maps.ts` (11.3 MB — moved to DB in Phase 1.4)

### 18.2 Update Imports
- Update BabylonEngine imports to use new engine modules
- Update asset references to use AssetManager + AssetPathResolver
- Update sprite references to use asset IDs + MonsterSpritePool
- Update map references to use MapSystem + API
- Update NPC references to use EntityManager

### 18.3 Database Migration
**File:** `prisma/migrations/xxx_game_editor_system.ts`

- Replace `GameAsset` model with new schema
- Add `GameConfig`, `CharacterClass`, `LootTable`, `MonsterSpritePool` models
- Add `gameId` to `WorldMap` and `GameCharacter` records
- Migrate existing `GameAsset` records to new schema
- Migrate `campaign-maps.ts` data to `WorldMap` table

### 18.4 Performance Optimization
- LRU cache in AssetManager
- Sprite atlas texture caching in RenderEngine
- Instanced meshes for repeated tiles
- Viewport culling for entities
- Lazy chunk loading for large maps
- Virtual scrolling in sprite browser
- Debouncing search inputs (300ms)
- Pagination for large asset lists (50 per page)
- Move 11.3 MB map data out of bundle (Phase 1.4)

### 18.5 Testing
- Asset tagging/searching/relabeling
- Sprite browser filtering
- Character creation with new system (4-direction animated)
- NPC placement with sprite browser
- Map editor with tileset browser (real tile art)
- Quest editor with dialogue tree
- Battle configuration
- Game export/import
- Game switching
- Tuxemon demo game (full campaign)
- Loot system (creature + player battles)
- Monster sprite pool (shared across all systems)
- RPG progression (27 skills)
- Social features
- Complete Tuxemon campaign playability
- All 9 existing editor tabs remain functional
- All existing game/lobby features still playable

---

# Part 4: Feature Phases (19–26)

## Phase 19: Combat Recreation

### 19.1 Complete Battle Engine
**File:** `lib/game/battle-engine.ts` (rewrite)

**Damage Formula (Tuxemon Standard):**
```typescript
function calculateDamage(
  attacker: BattleMonster,
  defender: BattleMonster,
  move: TuxemonTechnique,
  typeChart: TypeChart
): DamageResult {
  // 1. Determine if physical or special
  const isRanged = move.category === 'special';
  const atkStat = isRanged ? attacker.stats.ratk : attacker.stats.atk;
  const defStat = isRanged ? defender.stats.rdef : defender.stats.def;

  // 2. Base damage
  const baseDamage = Math.floor(
    ((2 * attacker.level / 5 + 2) * move.power * (atkStat / defStat)) / 50 + 2
  );

  // 3. Type effectiveness
  const effectiveness = getTypeEffectiveness(move.element, defender.element, typeChart);
  // Returns: 0 (immune), 0.5, 1, 2

  // 4. STAB (Same Type Attack Bonus)
  const stab = attacker.element === move.element ? 1.5 : 1.0;

  // 5. Critical hit (6.25% base, modified by luck/perks)
  const isCritical = Math.random() < (attacker.critRate || 0.0625);
  const critMultiplier = isCritical ? 1.5 : 1.0;

  // 6. Random variance (0.85 to 1.0)
  const randomFactor = 0.85 + Math.random() * 0.15;

  // 7. Status effect modifiers
  const statusMultiplier = getStatusDamageModifier(attacker.statusEffects);

  // 8. Final damage
  const damage = Math.floor(
    baseDamage * effectiveness * stab * critMultiplier * randomFactor * statusMultiplier
  );

  return {
    damage: Math.max(1, damage), // minimum 1 damage if not immune
    effectiveness,
    isCritical,
    stab,
  };
}
```

**PP System:**
```typescript
interface BattleMove {
  technique: string;     // references TuxemonTechnique.slug
  pp: number;            // current PP
  maxPp: number;         // max PP
}

// On move use:
function useMove(monster: BattleMonster, moveIndex: number): boolean {
  const move = monster.moves[moveIndex];
  if (move.pp <= 0) return false; // cannot use — no PP
  move.pp--;
  return true;
}

// PP restoration:
// - Items: potion restores HP, ether restores PP
// - Healing center: full restore HP + PP
// - Level up: does NOT restore PP
```

**Move Learning on Level Up:**
```typescript
async function checkMoveLearning(monster: BattleMonster): Promise<string | null> {
  const species = await prisma.tuxemonSpecies.findUnique({
    where: { slug: monster.speciesSlug },
    include: { moves: true }
  });

  // Find moves learnable at current level
  const newMoves = species.moves.filter(
    m => m.levelLearned === monster.level && !monster.moves.some(mm => mm.technique === m.technique)
  );

  if (newMoves.length === 0) return null;

  // If monster has 4 moves, prompt to forget one
  if (monster.moves.length >= 4) {
    // Trigger UI: "Forget a move to learn {newMove.name}?"
    // Player selects a move to forget
  }

  // Learn the move
  const technique = await prisma.tuxemonTechnique.findUnique({
    where: { slug: newMoves[0].technique }
  });

  monster.moves.push({
    technique: technique.slug,
    pp: technique.pp,
    maxPp: technique.pp,
  });

  return technique.name;
}
```

**Catch Rate System:**
```typescript
function calculateCatchRate(
  species: TuxemonSpecies,
  currentHP: number,
  maxHP: number,
  statusEffect: string | null,
  ballType: string
): number {
  // Base catch rate from species
  const baseRate = species.catchRate; // 0-255, from DB

  // HP factor (lower HP = easier to catch)
  const hpFactor = (3 * maxHP - 2 * currentHP) / (3 * maxHP);

  // Status bonus
  const statusBonus = {
    'sleep': 2.0,
    'freeze': 2.0,
    'burn': 1.5,
    'poison': 1.5,
    'paralysis': 1.5,
    null: 1.0,
  }[statusEffect] || 1.0;

  // Ball multiplier
  const ballMultiplier = {
    'tuxeball': 1.0,
    'grand_ball': 1.5,
    'mega_ball': 2.0,
    'ultra_ball': 2.5,
    'master_ball': 255, // always catches
  }[ballType] || 1.0;

  // Final catch rate
  const catchRate = (baseRate * hpFactor * statusBonus * ballMultiplier) / 255;

  // Roll: if random < catchRate, catch succeeds
  return Math.min(1.0, catchRate);
}
```

### 19.2 Evolution Engine
**File:** `lib/game/EvolutionEngine.ts`

```typescript
class EvolutionEngine {
  async checkLevelEvolution(speciesSlug: string, level: number): Promise<Evolution | null> {
    const evolutions = await this.prisma.tuxemonEvolution.findMany({
      where: { speciesSlug, atLevel: level }
    });
    return evolutions[0] || null;
  }

  async checkItemEvolution(speciesSlug: string, itemSlug: string): Promise<Evolution | null> {
    const evolutions = await this.prisma.tuxemonEvolution.findMany({
      where: { speciesSlug, itemRequired: itemSlug }
    });
    return evolutions[0] || null;
  }

  async checkStepEvolution(speciesSlug: string, steps: number): Promise<Evolution | null> {
    const evolutions = await this.prisma.tuxemonEvolution.findMany({
      where: { speciesSlug, steps: { lte: steps } }
    });
    return evolutions[0] || null;
  }

  async triggerEvolution(monsterId: string, evolution: Evolution): Promise<void> {
    // 1. Show evolution animation (screen flash, sprite morph)
    // 2. Update monster speciesSlug to evolution.evolvesTo
    // 3. Recalculate stats based on new species base stats
    // 4. Update moveset (learn new species moves, keep old ones)
    // 5. Update sprite pool reference
    // 6. Save to database
  }
}
```

### 19.3 Dual-Combat System
**File:** `lib/game/battle-engine.ts`

From `game-idea.md`:
1. **Wild Encounters (Beast vs Beast):** Turn-based elemental combat, capture with Tuxeballs
2. **Keeper Battles (Player vs Keeper):** Defeat keeper's beast → keeper attacks YOU directly → your combat skills + equipped weapons/armor
3. **Synergy & Action Commands:** Elemental reactions (Soaked + Lightning = bonus damage), Spacebar action command block (halve damage)
4. **Roaming Monsters (Player vs Monster):** Walking into roaming monster triggers immediate player combat

**Dual-Combat Flow:**
```
┌─────────────────────────────────────────────────────┐
│ KEEPER BATTLE                                       │
│                                                     │
│ Phase 1: Beast vs Beast                             │
│   Player's active beast ←→ Keeper's beast           │
│   Turn-based: attack, switch beast, use item        │
│   ↓ Keeper's beast faints                           │
│                                                     │
│ Phase 2: Player vs Keeper                           │
│   Player (with weapons/armor) ←→ Keeper             │
│   Combat skills: Strength, Attack, Defence, Magic   │
│   Action commands: Spacebar to block (halve damage) │
│   Elemental synergy: beast debuff + magic = bonus   │
│   ↓ Keeper defeated                                 │
│                                                     │
│ Rewards: XP (combat skills), credits, items         │
└─────────────────────────────────────────────────────┘
```

### 19.4 Party Battle System (4v4)
**File:** `lib/game/battle-engine.ts`, `lib/game/party-manager.ts`

- 4v4 party battles (player party vs trainer party)
- Party XP sharing (25% shared XP bonus to all party members)
- Party leader controls (switch active beast, use items)
- Socket.IO party battle sync

---

## Phase 20: Story & Campaign Progression

### 20.1 Story Progression System
**File:** `lib/game/StoryProgression.ts`

```typescript
class StoryProgression {
  private prisma: PrismaClient;

  async getChapter(playerId: string): Promise<StoryChapter> {
    const character = await this.prisma.gameCharacter.findUnique({
      where: { id: playerId }
    });
    return {
      act: character.storyAct || 1,
      chapter: character.storyChapter || 1,
      completedQuests: character.completedStoryQuests as string[] || [],
    };
  }

  async advanceChapter(playerId: string): Promise<void> {
    const chapter = await this.getChapter(playerId);
    const nextChapter = chapter.chapter + 1;
    // Check if chapter has requirements (quest completion, level, etc.)
    // If requirements met, advance
    await this.prisma.gameCharacter.update({
      where: { id: playerId },
      data: { storyChapter: nextChapter }
    });
  }

  async onQuestComplete(playerId: string, questId: string): Promise<void> {
    // If quest is main_story, advance chapter
    const quest = await this.prisma.gameQuest.findUnique({ where: { id: questId } });
    if (quest?.category === 'main_story') {
      await this.advanceChapter(playerId);
    }
  }

  async getUnlockedAreas(playerId: string): Promise<string[]> {
    const chapter = await this.getChapter(playerId);
    // Areas unlock based on story chapter
    const areaUnlocks: Record<number, string[]> = {
      1: ['PLAYER_HOUSE', 'SPYDER_PAPER_TOWN'],
      2: ['SPYDER_ROUTE1', 'PROFESSOR_LAB'],
      3: ['SPYDER_ROUTE2', 'FIRST_GYM'],
      // ... more chapters
    };
    const unlocked: string[] = [];
    for (let ch = 1; ch <= chapter.chapter; ch++) {
      unlocked.push(...(areaUnlocks[ch] || []));
    }
    return unlocked;
  }
}
```

### 20.2 Story Editor
**File:** `components/the-lobby/editor/StoryEditor.tsx`

- Chapter/act editor (create, reorder, requirements)
- Story quest chains (visual flow diagram)
- World state effects (unlock areas, change NPC dialogue, spawn/despawn NPCs)
- Story preview (simulate playthrough)

---

## Phase 21: Base Automation & Housing

### 21.1 Base Automation Editor
**File:** `components/the-lobby/editor/BaseAutomationEditor.tsx`

From `game-idea.md` — caught beasts assigned to facilities:

**Facility Configuration:**
```typescript
interface Facility {
  id: string;
  type: 'furnace' | 'farm' | 'fishing_hut' | 'lumber_mill' | 'quarry';
  name: string;
  position: { x: number; y: number }; // on player's base map
  assignedBeastId?: string; // PlayerTuxemon assigned to this facility
  productionRate: number;   // resources per hour
  level: number;            // facility upgrade level (1-5)
}

// Beast effectiveness multipliers:
const FACILITY_BEAST_BONUSES = {
  furnace: { fire: 2.0, earth: 1.5, metal: 1.3 }, // fire beasts best for smelting
  farm: { wood: 2.0, earth: 1.5, water: 1.3 },     // plant beasts best for farming
  fishing_hut: { water: 2.0, ice: 1.5 },            // water beasts best for fishing
  lumber_mill: { wood: 2.0, earth: 1.3 },           // plant beasts best for lumber
  quarry: { earth: 2.0, metal: 1.5, fire: 1.2 },    // earth beasts best for mining
};
```

### 21.2 Player Housing Editor
**File:** `components/the-lobby/editor/HousingEditor.tsx`

- House layout editor (visual grid)
- Furniture/decoration placement
- Base sharing with friends/guild
- Base upgrades and expansion
- Base defense mechanics

---

## Phase 22: Dynamic Events & Live-Ops

### 22.1 Event System
**File:** `lib/game/EventSystem.ts`

```typescript
class EventSystem {
  async createEvent(eventConfig: EventConfig): Promise<GameEvent> {
    // Create scheduled event
    // Types: boss_battle, resource_boost, double_xp, special_encounter, seasonal
  }

  async startEvent(eventId: string): Promise<void> {
    // Activate event
    // Apply global modifiers (double XP, boosted spawns, etc.)
    // Broadcast to all connected players via Socket.IO
  }

  async endEvent(eventId: string): Promise<void> {
    // Deactivate event
    // Remove modifiers
    // Distribute rewards to participants
  }

  applySeasonalChanges(season: 'spring' | 'summer' | 'autumn' | 'winter'): void {
    // Spring: increased plant encounters, flower decorations
    // Summer: increased fire encounters, beach events
    // Autumn: increased harvest yields, falling leaves
    // Winter: increased ice encounters, snow overlay
  }
}
```

### 22.2 Event Editor
**File:** `components/the-lobby/editor/EventEditor.tsx`

- Event creation (scheduled, conditional, manual)
- Event types: boss battle, resource boost, double XP, special encounters, seasonal
- Reward configuration
- Notification system
- Leaderboards for events

---

## Phase 23: Multiplayer Enhancement

### 23.1 Real-time Multiplayer Features
**File:** `game-server.js` (enhance)

- Global chat system (map, world, party, friends channels)
- Trade system between players (secure, validated server-side)
- PvP matchmaking (level-based)
- Guild/clan system (creation, management, housing, shared resources)
- World events and broadcasts
- Anti-cheat: server-side validation for all game actions

**Socket.IO Event Extensions:**
```typescript
// Existing events: position sync, chat, battle invitations, map transitions
// New events:
socket.on('trade_request', (data) => { /* ... */ });
socket.on('trade_offer', (data) => { /* ... */ });
socket.on('trade_accept', (data) => { /* ... */ });
socket.on('trade_cancel', (data) => { /* ... */ });
socket.on('pvp_challenge', (data) => { /* ... */ });
socket.on('pvp_accept', (data) => { /* ... */ });
socket.on('guild_create', (data) => { /* ... */ });
socket.on('guild_invite', (data) => { /* ... */ });
socket.on('event_broadcast', (data) => { /* ... */ });
```

### 23.2 Social UI
**Files:** `components/the-lobby/` overlays

- Friends list with online status
- Friend-to-friend trading UI
- Guild management UI
- Social achievements and badges
- Player-to-player messaging
- Reputation system

---

## Phase 24: Multi-Game Reusability

### 24.1 Game Module Packs
**File:** `lib/game/GameModulePack.ts`

Every feature is a linkable module/pack so new games can be assembled from shared asset pools (user's request: "linking features that can be used for other assets so we can create new games"):

```typescript
interface GameModulePack {
  id: string;
  name: string;
  type: 'asset-pack' | 'ruleset' | 'class-pack' | 'map-pack' | 'quest-pack' | 'monster-pack' | 'loot-pack' | 'skill-pack' | 'social-pack';
  dependencies: string[]; // other pack IDs this depends on
  data: any; // pack-specific data
}

class GameModulePackManager {
  async createPack(pack: GameModulePack): Promise<void> {
    // Validate pack
    // Check dependencies exist
    // Store in database
  }

  async assembleGame(packIds: string[], config: GameConfigInput): Promise<GameConfig> {
    // 1. Validate all packs exist and dependencies are satisfied
    // 2. Create GameConfig from config input
    // 3. For each pack, apply its data:
    //    - asset-pack: link assets to game
    //    - ruleset: set game rules (combat formula, XP curve, etc.)
    //    - class-pack: create CharacterClass records
    //    - map-pack: link maps to game
    //    - quest-pack: link quests to game
    //    - monster-pack: link sprite pools to game
    //    - loot-pack: create LootTable records
    //    - skill-pack: configure RPG progression
    //    - social-pack: configure social features
    // 4. Return created GameConfig
  }
}
```

**Example: Assembling a New Game**
```
New Game "Crystal Beasts":
  + Tuxemon asset pack (shared sprites)
  + Custom ruleset (different combat formula)
  + Custom class pack (3 new classes)
  + Custom map pack (20 new maps)
  + Tuxemon monster pack (shared 411 species)
  + Custom quest pack (30 new quests)
  + Custom loot pack (15 new loot tables)
  + Tuxemon skill pack (shared 27 skills)
  + Custom social pack (different party size)
  = New playable game using shared assets!
```

### 24.2 Module Pack Browser
**File:** `components/the-lobby/editor/ModulePackBrowser.tsx`

- Browse available packs (asset, ruleset, class, map, quest, monster, loot, skill, social)
- Pack details (contents, dependencies, size)
- Assemble new game from packs
- Pack import/export (share with community)
- Pack versioning

---

## Phase 25: Accessibility & Localization

### 25.1 Accessibility
- Screen reader support for game UI (ARIA labels on all interactive elements)
- Keyboard navigation for all menus (Tab, Enter, Escape, arrow keys)
- Colorblind-friendly type indicators (shapes + colors, not just colors)
- Adjustable text sizes (small, medium, large, XL)
- High contrast mode
- Reduced motion options (disable animations)
- Customizable control schemes (remap keys)

### 25.2 Localization
- i18n framework integration (next-intl or react-i18next)
- Translation management for game text
- Region-specific content
- Translation for species names/moves (uses `customLabels` in GameAsset)
- Currency localization
- Time zone handling for events

---

## Phase 26: Analytics & Moderation

### 26.1 Game Analytics
**File:** `app/api/analytics/game/route.ts`

- Player engagement metrics (DAU, MAU, session length)
- Economy flow tracking (credits in/out, item distribution)
- Balance monitoring (species usage rates, win rates, catch rates)
- Performance metrics (load times, frame rates, error rates)
- Real-time admin dashboards

### 26.2 Game Moderation
- Player behavior monitoring (chat logs, trade logs)
- Chat moderation (word filters, auto-mute on violations)
- Economy abuse detection (duplicate item detection, trade anomalies)
- Exploit reporting system
- Player suspension/banning tools
- Audit logging for admin actions

---

# Part 5: Implementation Order, Success Criteria & File Structure

## Implementation Order

### Foundation (MUST come first)
1. **Phase 0.1–0.5:** Sprite sheet slicer, rebuild atlases, unified paths, asset import, new schema
2. **Phase 1.1–1.5:** Unify types/stats, merge stores, retire legacy engines, move maps to DB, fix paths
3. **Phase 2.1–2.3:** True map recreation (real tile art everywhere), chunk loading, validation
4. **Phase 3.1–3.4:** Directional animated entities (player + NPC + monster overworld)

### Core Editor
5. **Phase 4.1–4.3:** AssetManager + AssetEditor UI + integration (replace existing assets tab)
6. **Phase 5.1–5.4:** GameConfig system + Class system + editors
7. **Phase 6.1–6.4:** SpriteBrowser + SpritePreview + character creator + NPC editor integration
8. **Phase 7.1–7.3:** TilesetBrowser + enhanced map editor + encounter zone editor
9. **Phase 8.1–8.2:** QuestEditor + DialogueEditor
10. **Phase 9.1–9.2:** BattleConfigEditor + MonsterEditor
11. **Phase 10.1–10.4:** Loot system (tables, creature loot, player battle loot, LootSystem core)
12. **Phase 11.1–11.4:** Monster sprite pool (manager, editor, shared pool concept, Tuxemon config)
13. **Phase 12.1–12.3:** RPG progression (27 skills, editor, Tuxemon config)
14. **Phase 13.1–13.2:** Social features editor + Tuxemon config
15. **Phase 14.1–14.3:** Export/Import system
16. **Phase 15.1–15.5:** Engine modularization (Render, Physics, Entity, Map, refactor Babylon)

### Tuxemon Demo
17. **Phase 16.1–16.5:** Tuxemon game config, classes, maps, NPCs, set as default
18. **Phase 17.1–17.6:** Full playability (campaign, quests, encounters, loot, validation)

### Features
19. **Phase 19.1–19.4:** Combat recreation (PP, evolution, dual-combat, 4v4)
20. **Phase 20.1–20.2:** Story progression + editor
21. **Phase 21.1–21.2:** Base automation + housing
22. **Phase 22.1–22.2:** Dynamic events + live-ops
23. **Phase 23.1–23.2:** Multiplayer enhancement
24. **Phase 24.1–24.2:** Multi-game reusability (module packs)

### Polish
25. **Phase 25.1–25.2:** Accessibility + localization
26. **Phase 26.1–26.2:** Analytics + moderation
27. **Phase 18.1–18.5:** Cleanup + optimization + testing

## Success Criteria

### Foundation
- [ ] Sprite sheets sliced into individual frames (4 directions × 3 walk frames for NPCs)
- [ ] Atlases rebuilt with per-frame metadata (not whole-sheet blobs)
- [ ] Unified asset paths (no more split between `/assets/` and `/tuxemon-assets/`)
- [ ] Type system unified to Tuxemon 15 types, 6 stats across ALL systems
- [ ] Single state store (Zustand)
- [ ] Single rendering engine (Babylon — Canvas2D + PixiJS retired)
- [ ] 11.3 MB `campaign-maps.ts` moved to database + API
- [ ] All 38 maps render REAL tile art (no wallpaper colored blocks)
- [ ] All characters render 4-direction animated (not procedural fillRect)
- [ ] All NPCs render directional animated sprites (not static full-sheet blobs)

### Editor
- [ ] AssetManager can tag, categorize, search, relabel, reclassify all assets with pagination
- [ ] AssetEditor UI with bulk operations, duplicate detection, retagging/resorting
- [ ] SpriteBrowser filters by class, tags, categories with animation + direction preview
- [ ] Character creator uses SpriteBrowser with class filtering (real sprites, not broken paths)
- [ ] NPC editor uses SpriteBrowser for sprite selection
- [ ] Map editor uses TilesetBrowser for tile selection
- [ ] Quest editor with dialogue tree functional
- [ ] Battle configuration editor functional
- [ ] GameConfig system with performance settings
- [ ] Character class system with sprite filters and RPG progression
- [ ] Loot system functional (tables, creature drops, player battle rewards)
- [ ] Monster sprite pool functional (411 species, shared across all systems)
- [ ] RPG progression editor functional (27 skills, abilities, perks)
- [ ] Social features editor functional (chat, party, trading, PvP)
- [ ] Game export/import functional with all systems
- [ ] Engine modularized into separate, testable modules
- [ ] All 9 existing editor tabs remain functional + new tabs added

### Tuxemon Demo
- [ ] Tuxemon fully configured as playable demo game
- [ ] Complete Tuxemon campaign playable (38 maps, 70+ NPCs, 50+ quests)
- [ ] All 411 monster species with sprite pools configured
- [ ] All encounter pools configured for all maps
- [ ] All loot tables configured
- [ ] All RPG progression configured (27 skills)
- [ ] All social features configured
- [ ] Tuxemon playability validation passes
- [ ] PP system, move learning, evolution engine all functional
- [ ] Dual-combat system functional (beast vs beast + player vs keeper)
- [ ] 4v4 party battles functional
- [ ] Story progression system functional

### Multi-Game
- [ ] New games can be assembled from shared module packs
- [ ] Asset sharing across games with game-specific overrides
- [ ] Game switching functional
- [ ] Multi-game scalability tested

### Quality
- [ ] All existing game/lobby features still playable
- [ ] Performance optimized (caching, culling, lazy loading, chunk loading)
- [ ] Legacy code removed without breaking functionality
- [ ] All tests passing

## File Structure After Refactor

```
components/the-lobby/
├── index.tsx                          # Main game container
├── babylon/
│   └── GameCanvasBabylon.tsx          # React wrapper for BabylonEngine
├── editor/
│   ├── IntegratedDevEditor.tsx        # Main editor hub (14 tabs)
│   ├── AssetEditor.tsx                # Asset management UI
│   ├── GameConfigEditor.tsx           # Game configuration UI
│   ├── ClassEditor.tsx                # Character class editor
│   ├── SpriteBrowser.tsx              # Sprite selection UI
│   ├── SpritePreview.tsx              # Sprite preview UI