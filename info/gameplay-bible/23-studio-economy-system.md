# Saints Studio — Complete Economy System (23)

**Status:** Production economy architecture (audit-backed)  
**Date:** 2026-08-04  
**Scope:** Item Creator, equipment, consumables, materials, currencies, loot pools/groups/overrides/simulation, crafting, gathering, refining, trading, auction, vendors, drop/economy balancing, rarity, tags, collections, achievements, global modifiers, seasonal events — all **data-driven**, minimizing duplicated balancing values.

> **Companions (do not fork)**
> - [`17-studio-world-builder-economy.md`](./17-studio-world-builder-economy.md) — Phase 1 loot refs / Loot Manager
> - [`14-skills-economy-deep-dive.md`](./14-skills-economy-deep-dive.md) — 27 skills, sinks, ARPG gear intent
> - [`07-technical-economic-rules.md`](./07-technical-economic-rules.md) — constitution (server authority)
> - [`18`](./18-studio-master-architecture.md) · [`20`](./20-studio-entity-system.md) · [`22`](./22-studio-npc-ai-creature-editors.md)
> - [`ALIGNMENT.md`](./ALIGNMENT.md)

**This document is the economy master.** One **Item** id space, one **LootRef** roll path, one **wallet**, one **recipe** table, one **vendor/shop** registry. Evolve `ItemTemplate`, `LootTable`, `lootRefs.ts`, `CraftingRecipe`, `ShopManager`, `GtcListing`, `InventoryManager` — do not add parallel catalogs.

---

# 0. Non-Negotiable Rules

1. **Single item identity:** `itemId` (= `ItemTemplate.slug`). No parallel `ITEM_DB` as SoT; client hydrates from API/cache.
2. **Maps/entities store refs only:** `LootRef`, `shopId`, recipe ids — never embed prices/stats blobs in map JSON (`17`/`20`).
3. **One roll authority:** Server `LootService.roll(LootRef, ctx)` used by death, chests, gather, quests, events. Studio simulate uses the **same pure function** with a seeded RNG.
4. **Balance lives in definitions + modifiers** — not scattered magic numbers in managers. Managers apply formulas; tables hold knobs.
5. **Canonical slug list** — aliases (`wood_logs`→`wood_log`) live in one alias map; migrate then delete duplicates.
6. **Capture films** stay in `captureItems` / Item effects — TB only (`07`/`11`).
7. **Studio editors bind to registries** — Item Creator, Loot Manager, Recipe, Shop, Economy Ops — not one-off React constants.

---

# 1. Audit → Unification Targets

| Today (duplicated) | Keep as SoT | Demote |
| :--- | :--- | :--- |
| `ITEM_DB` vs `ItemTemplate` | **ItemTemplate** | `ITEM_DB` = hydrate cache |
| `shopCatalog.buyPrice` vs `ITEM_DB.value` | **ShopListing** price **or** `ItemEconomy.vendorValue` with listing override | Dual silent prices |
| `CRAFTING_RECIPES` / overlay hardcode / `SHOP_CRAFT` / Prisma | **CraftingRecipe** | Delete dead arrays; overlay loads API |
| Death loot hardcoded bones/coins | **LootRef** on entity / default pool | Hardcoded `handleEntityDeath` drops |
| `RESOURCE_NODE_MAP` magic tile ids | ResourceNode entity + gather def | Magic map |
| Quest `gold` vs wallet `credits` | Wallet currency id **`credits`**; quest rewards use currency map | Rename in docs/UI |
| Platform vs lobby achievements | Split namespaces; economy collections ≠ forum badges | Shared id collisions |
| GTC buyout only | Evolve to trade + auction modes | — |
| Loot rarity weights unused | Wire into roll + Economy Ops | Orphan columns |

---

# 2. Economy Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                 DEFINITION REGISTRIES (Studio)                │
│  ItemTemplate · Currency · LootPool · DropGroup · Recipe      │
│  GatherNodeDef · RefineChain · ShopDef · Collection ·         │
│  AchievementDef · EconomyModifier · SeasonEvent               │
└────────────────────────────┬─────────────────────────────────┘
                             │ refs only
┌────────────────────────────▼─────────────────────────────────┐
│  INSTANCES: map entities, vendors, quests, spawners, players   │
└────────────────────────────┬─────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────┐
│  RUNTIME SERVICES (server)                                     │
│  LootService · InventoryService · CraftService · GatherService │
│  RefineService · ShopService · TradeService · AuctionService   │
│  WalletService · ModifierBus · AchievementEconomyHooks         │
└──────────────────────────────────────────────────────────────┘
```

**Balancing knobs appear once:** item vendor value, loot weights, recipe costs, modifier multipliers. UI “balance tools” edit those rows — never fork copies into combat code.

---

# 3. Canonical Data Structures

## 3.1 ItemTemplate (Item Creator SoT)

```ts
type ItemCategory =
  | "WEAPON" | "ARMOR" | "TOOL" | "RESOURCE" | "CONSUMABLE"
  | "CURRENCY_TOKEN" | "QUEST" | "CONTAINER" | "MISC";

type EquipSlot = "HEAD" | "CHEST" | "LEGS" | "WEAPON" | "OFFHAND" | "RING" | "AMULET" | "NONE";

type ItemRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

type ItemEffect =
  | { type: "heal"; amount: number }
  | { type: "capture_film"; multiplier: number } // bridges captureItems
  | { type: "buff"; stat: string; amount: number; durationMs: number }
  | { type: "unlock_recipe"; recipeId: string }
  | { type: "grant_currency"; currencyId: string; amount: number }
  | { type: "custom"; id: string; params?: Record<string, unknown> };

type ItemEconomy = {
  /** Default NPC buy price in primary soft currency; shop listings may override */
  vendorValue: number;
  /** Default sell-to-vendor = floor(vendorValue * sellRate) unless listing overrides */
  sellRate?: number; // default from EconomyConfig
  bindOnPickup?: boolean;
  tradeable: boolean;
  auctionable: boolean;
  maxStack: number; // 1 if non-stackable
};

type ItemTemplateDoc = {
  id: string;              // slug
  name: string;
  description?: string;
  category: ItemCategory;
  subCategory?: string;    // SWORD, PICKAXE, ORE, FILM…
  tier: number;            // 1..N — progression band
  rarity: ItemRarity;      // default drop/display rarity
  tags: string[];          // "metal","wood","capture","tier2"
  icon?: string;           // asset id
  equipSlot: EquipSlot;
  stackable: boolean;
  baseDurability?: number | null;
  /** Base stats before affix rolls — single place for gear power */
  baseStats?: Record<string, number>;
  /** Affix pool id for crafted/dropped rares — not inline affix tables per item */
  affixPoolId?: string;
  effects?: ItemEffect[];
  economy: ItemEconomy;
  /** Collection membership */
  collectionIds?: string[];
  gameId?: string | null;
  isActive: boolean;
};
```

**Prisma:** extend `ItemTemplate` with `rarity`, `tags` JSON, `economy` JSON or columns, `equipSlot`, `effects` JSON, `affixPoolId`, `isActive`. Migrate `ITEM_DB` → seed/hydrate.

**Alias map (temporary):**

```ts
const ITEM_ID_ALIASES: Record<string, string> = {
  wood_logs: "wood_log",
  copper_ore: "ore_copper",
  binding_crystal: "film_standard", // or keep crystal as distinct quest item — pick one in ECO-1
};
```

## 3.2 Currencies

```ts
type CurrencyId = "credits" | "premium" | string;

type CurrencyDef = {
  id: CurrencyId;
  name: string;            // "Credits"
  icon?: string;
  /** Soft vs premium */
  kind: "soft" | "premium" | "seasonal";
  tradeable: boolean;
  auctionTaxExempt?: boolean;
};

type EconomyConfig = {
  primaryCurrencyId: CurrencyId; // "credits"
  defaultSellRate: number;       // 0.5 — single sink knob
  marketplaceTaxRate: number;    // 0.05 — bible 14
  repairCostPerDurability: number;
  /** Quest JSON key "gold" maps here */
  questGoldAlias: CurrencyId;    // "credits"
};
```

**Wallet:** `GameCharacter.stateData.credits` (and future `wallets: Record<CurrencyId, number>`).  
**Not** `User.coins` / FiveM cash — different products.  
**Death `copper_coin`:** either real currency grant via WalletService **or** item token — pick **item** OR **currency**, not both confusingly; prefer currency grant from loot entry `{ currencyId, amount }`.

```ts
type LootGrant =
  | { kind: "item"; itemId: string; min: number; max: number; weight?: number; chance?: number; rarity?: ItemRarity }
  | { kind: "currency"; currencyId: CurrencyId; min: number; max: number; weight?: number; chance?: number };
```

## 3.3 Loot pools, groups, overrides

Extend `lootRefs.ts` (already close):

```ts
type LootDropEntry = LootGrant & {
  conditions?: string[];   // level, event, season tags — resolved by ModifierBus
};

type DropGroupKind = "guaranteed" | "equipment" | "rare" | "event" | "quest";

type DropGroupDef = {
  id: string;
  kind: DropGroupKind;
  triggerChance: number;   // 0–100
  rollCount: number;
  entries: LootDropEntry[];
  conditions?: string[];
  priority?: number;
  exclusive?: boolean;
};

type LootPoolDef = {
  id: string;
  name: string;
  description?: string;
  gameId?: string;
  rollsPerDrop: number;
  entries: LootDropEntry[];      // weighted
  guaranteedDrops?: LootDropEntry[];
  groups?: DropGroupDef[];       // independent group rolls
  /** Optional rarity bias — use OR entry.rarity, not both conflicting */
  rarityWeights?: Partial<Record<ItemRarity, number>>;
  minLevel?: number;
  maxLevel?: number;
  requiredTags?: string[];
  version: number;               // for hot-reload / balance history
};

type LootRef =
  | { strategy: "pool"; poolId: string }
  | { strategy: "override"; drops: LootDropEntry[] }
  | { strategy: "pool_then_override"; poolId: string; drops: LootDropEntry[] };
```

**Roll algorithm (single):**

1. Apply `EconomyModifier` multipliers to weights/chances (ctx: season, event, map tags).  
2. Grant all `guaranteedDrops`.  
3. For `i in rollsPerDrop`: weighted pick from `entries`.  
4. For each `group` by priority: roll `triggerChance`; if success, `rollCount` weighted picks; if `exclusive`, stop lower groups.  
5. If override strategy, use override drops (chance-based).  
6. `pool_then_override`: pool then append override rolls.

Prisma `LootTable` maps 1:1; **wire rarity weight columns** into step 1 or deprecate them in favor of `rarityWeights` JSON.

## 3.4 Drop simulation

```ts
type SimOptions = { iterations: number; seed?: number; ctx?: RollContext };
type SimResult = {
  rates: Record<string, { count: number; totalQty: number; rate: number }>;
  expectedValueCredits: number; // sum qty * vendorValue / iterations
};
```

Studio Loot Manager + Economy Ops use **shared** `simulateLootPool` / `rollLootRef` from `lootRefs` (move pure roll to shared; server imports same module).

## 3.5 Crafting recipes

```ts
type RecipeKind = "craft" | "refine" | "cook" | "smith" | "alchemy";

type RecipeIngredient = { itemId: string; qty: number };

type CraftingRecipeDoc = {
  id: string;                // slug
  kind: RecipeKind;
  outputItemId: string;
  outputQty: number;
  ingredients: RecipeIngredient[];
  stationTags?: string[];    // "anvil","furnace","range","crafting_table"
  skillSlug: string;
  levelReq: number;
  xpReward: number;
  timeMs: number;
  /** Fail/burn chance for cooking etc. */
  failChance?: number;
  failOutputItemId?: string;
  gameId?: string;
  isActive: boolean;
};
```

**Refine** = `kind: "refine"` (ore→bar, log→plank) — same table, not a second system.  
Stations = logic tags / entities with `stationTags` (`20`/`21`).

## 3.6 Gathering

```ts
type GatherNodeDef = {
  id: string;
  label: string;
  requiredSkill: string;
  requiredLevel: number;
  toolTags?: string[];       // "axe","pickaxe" — item tags, not hardcoded bronze only
  toolItemIds?: string[];    // optional exact tools
  harvestDurationMs: number;
  xpReward: number;
  /** Prefer loot ref so drops aren't duplicated as single slug */
  loot: LootRef;
  depletion: "respawn" | "permanent" | "seasonal";
  respawnMs: number;
  durabilityCost?: number;
  seasonalBehaviour?: { seasons: string[]; active: boolean };
};
```

Entity `ResourceNode` component references `gatherNodeDefId` **or** inlines loot+skill once — prefer **def id** to avoid duplicating XP/respawn on every tree.

## 3.7 Trading & Auction

```ts
type TradeSession = {
  id: string;
  aUserId: string;
  bUserId: string;
  aOffer: { items: Array<{ itemId: string; qty: number; instanceId?: string }>; credits: number };
  bOffer: /* same */;
  status: "open" | "a_ready" | "b_ready" | "completed" | "cancelled";
};

type AuctionListing = {
  id: string;
  sellerId: string;
  itemId: string;
  instanceId?: string;       // for unique gear
  qty: number;
  currencyId: CurrencyId;
  buyoutPrice?: number;
  startingBid: number;
  currentBid?: number;
  currentBidderId?: string;
  endsAt: string;            // ISO
  status: "active" | "sold" | "expired" | "cancelled";
};
```

**GTC today** = material buyout marketplace → becomes `MarketListing` mode `buyout` under one **TradeService**; auction is mode `auction`. Shared tax from `EconomyConfig.marketplaceTaxRate`.

```ts
type MarketListing = {
  id: string;
  mode: "buyout" | "auction";
  sellerId: string;
  itemType: "MATERIAL" | "EQUIPMENT" | "BEAST" | "CONSUMABLE";
  itemId: string;
  qty: number;
  rarity?: ItemRarity;
  affixes?: Record<string, number>;
  price?: number;            // buyout
  auction?: Omit<AuctionListing, "id"|"sellerId"|"itemId"|"qty"|"status">;
  createdAt: string;
};
```

Evolve `GtcListing` → `MarketListing` (rename optional).

## 3.8 Vendor systems

```ts
type ShopListing = {
  itemId: string;
  /** Override; null = use ItemTemplate.economy.vendorValue */
  buyPrice?: number | null;
  sellPrice?: number | null;
  stock?: number | null;
  restockMs?: number;
  requiredReputation?: { factionId: string; min: number };
  requiredQuest?: string;
  requiredSeason?: string;
};

type ShopDef = {
  id: string;
  name: string;
  gameId?: string;
  currencyId: CurrencyId;
  listings: ShopListing[];
  buyback: boolean;
};
```

**Price resolution:** `listing.buyPrice ?? item.economy.vendorValue` — **one** default value on the item.

NPC `Vendor.shopId` (`22`) + dialogue `OPEN_SHOP` params.

## 3.9 Rarity & Tags

- **Rarity** on items + loot entries + market listings — shared enum.  
- **Tags** on items for recipes (`toolTags`), loot filters (`requiredTags`), collections, modifiers.  
- Affix rarity rolls use `affixPoolId` → `AffixPoolDef` (weights once).

```ts
type AffixPoolDef = {
  id: string;
  rolls: number;
  entries: Array<{ stat: string; min: number; max: number; weight: number; rarity?: ItemRarity }>;
};
```

## 3.10 Collections

```ts
type CollectionDef = {
  id: string;
  name: string;
  description?: string;
  itemIds: string[];         // complete set
  rewards: LootRef;          // grant once on complete
  category?: string;         // "films","tier1_ores"
};
```

Player progress: `PlayerCollection { userId, collectionId, ownedItemIds[], completedAt? }`.

## 3.11 Achievements (economy-facing)

```ts
type EconomyAchievementDef = {
  id: string;                // namespace "eco_first_sale" — never collide with forum badges
  title: string;
  description: string;
  rarity: ItemRarity;
  trigger:
    | { type: "gather_count"; itemId?: string; count: number }
    | { type: "craft_count"; recipeId?: string; count: number }
    | { type: "market_sale"; count: number }
    | { type: "collection_complete"; collectionId: string }
    | { type: "wealth"; currencyId: CurrencyId; amount: number };
  rewards: LootRef;
};
```

Lobby Dex achievements stay separate; platform forum achievements stay separate. **Do not reuse `first_blood` across domains.**

## 3.12 Global modifiers & seasonal events

```ts
type ModifierScope =
  | { type: "global" }
  | { type: "map"; mapId: string }
  | { type: "tag"; tag: string }
  | { type: "pool"; poolId: string }
  | { type: "shop"; shopId: string };

type EconomyModifier = {
  id: string;
  name: string;
  enabled: boolean;
  scope: ModifierScope;
  /** Multipliers — default 1 */
  dropRateMul?: number;
  sellPriceMul?: number;
  buyPriceMul?: number;
  craftXpMul?: number;
  gatherXpMul?: number;
  vendorValueMul?: number;
  /** Additive chance points for rare group */
  rareGroupChanceAdd?: number;
  startsAt?: string;
  endsAt?: string;
  seasonId?: string;
};

type SeasonEventDef = {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  modifierIds: string[];
  extraShopListings?: Array<{ shopId: string; listing: ShopListing }>;
  extraLootPoolIds?: string[];  // event pools entities may ref
  announcement?: string;
};
```

`ModifierBus.active(ctx)` merges multipliers — **single place** combat/loot/shop call.

Align with WorldEvent (`22`) — SeasonEvent may **be** a WorldEvent subtype or linked by id.

---

# 4. Studio Editors (complete set)

| Editor | Dock / location | Responsibilities |
| :--- | :--- | :--- |
| **Item Creator** | New `items` dock | CRUD ItemTemplate; stats; effects; economy; tags; rarity; dependencies (“used by loot/recipe/shop”) |
| **Loot Manager** | Existing `loot` | Pools, **row editors** (not JSON-only), groups UI, simulate, EV credits, version, clone |
| **Drop Group Editor** | Tab inside Loot | Guaranteed/equipment/rare/event/quest groups |
| **Recipe Editor** | New or craft tab | Craft+refine recipes; ingredients; skill; station tags |
| **Gather Def Editor** | Sub of Items or World | GatherNodeDef; link to ResourceNode entities |
| **Shop Editor** | New / with Vendors (`22`) | ShopDef listings; price override vs item default |
| **Market / Auction Ops** | Dev or Economy Ops | Tax rate, listing moderation, pause market |
| **Economy Ops** | New `economy` dock (Admin) | Modifiers, seasons, global sell rate, simulate EV across pools, slug alias tools |
| **Collection Editor** | Catalog | Sets + rewards |
| **Economy Achievements** | Achievements filter or sub | eco_* triggers |
| **Affix Pool Editor** | Advanced under Items | Affix weights |

Quest rewards / creature loot / NPC loot stay in their editors but **pick** itemId/LootRef via shared pickers (`19`).

---

# 5. Runtime Services (no duplicated formulas)

| Service | Calls |
| :--- | :--- |
| `LootService.roll(ref, ctx)` | death, chest, gather, quest, event |
| `WalletService.credit/debit` | shop, market tax, quest gold→credits |
| `InventoryService` | grant/consume; resolves aliases once |
| `CraftService` | recipes from DB only |
| `GatherService` | GatherNodeDef + LootService |
| `RefineService` | CraftService with `kind:"refine"` |
| `ShopService` | ShopDef + price resolution |
| `TradeService` | peer trade + GTC buyout |
| `AuctionService` | bids / expiry job |
| `ModifierBus` | wraps rolls & prices |

Replace `InventoryManager.handleEntityDeath` hardcoded drops with entity `Loot` component or default `poolId: "default_monster"`.

---

# 6. Balancing Workflows

## 6.1 Drop balancing

1. Open Loot Manager → simulate N=10k → rates + **expectedValueCredits**  
2. Adjust weights / groups — not item vendor values (unless intentional)  
3. Save → version++ → `content_reload { loot }`  
4. Economy Ops: compare EV vs mob combat time (manual target bands documented per tier)

## 6.2 Economy balancing

1. Edit `EconomyConfig` sell/tax/repair once  
2. Item Creator: tier vendorValue tables (bulk edit by tag `tier:2`)  
3. Modifiers for weekends — never copy pools  
4. Dependency viewer: changing `wood_log` value shows shops/recipes affected  

## 6.3 Minimize duplicated values

| Value | Single home |
| :--- | :--- |
| Item power | `ItemTemplate.baseStats` |
| Default price | `economy.vendorValue` |
| Sell fraction | `EconomyConfig.defaultSellRate` |
| Drop chance | Loot entry / group |
| Capture power | `ItemEffect capture_film` (one table) |
| Gather XP/respawn | `GatherNodeDef` |
| Recipe cost | ingredients list only |
| Tax | `marketplaceTaxRate` |
| Event boosts | `EconomyModifier` |

---

# 7. Workflows (author → save → live)

## 7.1 New consumable film

1. Item Creator → CONSUMABLE + effect capture_film ×2 → vendorValue 250  
2. Shop listing (or rely on vendorValue)  
3. Recipe optional  
4. Save · reload item · Walk buy/use in TB  

## 7.2 Harvestable with loot pool

1. Loot pool `wood_tier1` entries  
2. GatherNodeDef → loot pool ref  
3. Place ResourceNode entity → def id  
4. Save · gather · LootService grants  

## 7.3 Crafted equipment with affixes

1. Item WEAPON + affixPoolId  
2. Recipe ingredients → output  
3. CraftService rolls affixes from pool once  

## 7.4 Seasonal drop boost

1. SeasonEvent + Modifier dropRateMul 1.5 scope tag `event_mob`  
2. Enable → ModifierBus · no pool clone  

## 7.5 Auction listing

1. Player lists unique sword buyout/auction  
2. Tax on sale from EconomyConfig  
3. Achievement `eco_first_sale`  

---

# 8. Hot-reload (`18`)

| Content | Channel |
| :--- | :--- |
| Item | `item` |
| Loot pool | `loot` |
| Recipe | `recipe` |
| Shop | `shop` |
| Modifier / season | `economy_modifier` |
| Gather def | `gather_def` |
| Collection | `collection` |

---

# 9. Validation

| Check | Level |
| :--- | :--- |
| Loot entry unknown itemId | Hard |
| Recipe ingredient missing | Hard |
| Shop listing without item | Hard |
| Circular refine recipes | Hard |
| vendorValue < 0 | Hard |
| Simulate EV spike vs tier band | Soft warn |
| Duplicate slug aliases both active | Hard |
| Achievement id collides forum catalog | Hard |
| Tradeable=false but auctionable=true | Hard |

---

# 10. Phased Delivery

| Phase | Ship | Non-goals |
| :--- | :--- | :--- |
| **ECO0 Docs** ✅ | This bible | — |
| **ECO1 Unify ids** | ItemTemplate SoT + alias map; Item Creator v1; wire death loot to LootService; Loot row UI + groups; recipe API for overlay | Auction |
| **ECO2 Shops + gather defs** | ShopDef; Vendor.shopId; GatherNodeDef; deprecate RESOURCE_NODE_MAP for new nodes | Peer trade |
| **ECO3 Market** | GTC → MarketListing; equipment/beast paths; tax from config | Full AH UI polish |
| **ECO4 Auction + trade** | AuctionService; peer trade if `enableTrading` | — |
| **ECO5 Collections + eco achievements** | — | Forum achievement merge |
| **ECO6 Modifiers + seasons + Ops dock** | ModifierBus; bulk balance; pool versioning | Rewriting combat for economy |

---

# 11. Anti-Patterns

1. New hardcoded drop table in a manager  
2. Second price on `ITEM_DB.value` that shops ignore  
3. Cloning loot pools per season instead of modifiers  
4. Recipe lists in React overlays  
5. Gathering XP duplicated on every map entity  
6. Mixing forum `User.coins` into lobby wallet  
7. Capture balls in ITEM_DB without ItemEffect  
8. Balance spreadsheets that don’t write back to registries  
9. Parallel `GameConfigManager` loot writer bypassing `/api/loot` without shared service  
10. Achievement ids reused across lobby and platform  

---

# Final Rule

**One id. One price default. One roll function. One modifier bus.**  
Everything else is a reference. If balancing the same number in two places, the architecture failed — fix the registry, don’t patch the symptom.
