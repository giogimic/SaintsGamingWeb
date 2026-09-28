# Saints Gaming

> **Time To Play** — Welcome to the Saints Gaming community platform & game project!

Hey everyone! Welcome to the repository for **Saints Gaming**. 

I'm building this for our community. This is a passion project I build for fun in my spare time, designed to serve as our community's home base. It's a completely open-source hybrid that fuses a web forum with an in-browser multiplayer MMO!

---

## 🎮 What is Saints Gaming?

Saints Gaming started way back in 2007 as a chill group of friends hanging out on TeamSpeak, playing sandbox builders, and whatever else sounded fun. Over the years, our motto has always been simple: *Time To Play* — just hang out, game together, and have a good time with zero drama.

This project brings our community hub together with an interactive multiplayer game:

- **The Community Hub**: Forums to chat, news updates, and game server status trackers (so you can see who's online on our servers).
- **The Lobby (The Game)**: A browser-based multiplayer world where you can explore, build a Saint from a playable Archetype and modular Classes, grow long-term skills, collect Creatures, and fight Monsters with friends.
- **World Studio**: A built-in creator suite for Tile Maps, Voxel Maps, infinite procedural Fractal Domains, Archetypes, Classes, abilities, quests, dialogue, creatures, monsters, assets, and live world releases.
- **Combat**: Creature Battles are turn-based and capture-focused. Monster Battles are real-time, open-world action combat.

---

## 🏗️ Architecture

The project is built on a modern, full-stack monorepo architecture:

- **Web Frontend & API (Next.js)**: The core website, Studio tools, and API routes are built with Next.js 15, React 19, and TailwindCSS.
- **Database (Prisma)**: We use Prisma ORM connected to either MySQL or SQLite to manage all persistence (users, forum posts, game releases, and world data).
- **Game Engine (Babylon.js)**: The browser game client is powered by Babylon.js for rendering both 2.5D and 3D worlds, alongside a robust Redux/Zustand state layer.
- **MMO Server (Go)**: The authoritative multiplayer game backend (`the-lobby`) is written in Go, featuring a high-performance TCP/WebSocket layer, deterministic map routing, and SQLite snapshots for seamless runtime syncing.
- **Desktop App (Electron)**: A desktop wrapper wrapper located in `saints-app/` allowing standalone play.

---

## 📂 Repository Structure

- `app/` - Next.js App Router (pages, API routes, layout, Server Actions).
- `src/web/` - React components, hooks, UI elements (shadcn/ui), and frontend logic.
- `src/server/` - Backend services, Prisma configuration, setup logic, and game loop controllers.
- `src/engine/` - Shared game logic, rendering abstractions, Babylon.js controllers, and physics.
- `src/shared/` - Isomorphic types, constants, and utilities shared between client and server.
- `the-lobby/` - Authoritative Go MMO backend source code.
- `saints-app/` - Electron desktop application wrapper.
- `public/` - Static web assets, game sprites, and UI images.
- `prisma/` - Database schema (`schema.prisma`) and seed scripts.
- `docker/` - Docker Compose configurations and environment definitions.

---

## 🛠️ How to Install & Run Locally

If you want to poke around the code, run it on your own machine, or test things out:

### Prerequisites
- **Node.js** (v22 or newer recommended)
- **Git**
- **Docker** (optional, but highly recommended for full-stack DB/Redis/Go running)
- **Go** (v1.22+ if running the MMO server manually)

### Setup & Installation

Linux is the primary deployment target, but Windows is fully supported for local development.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/giogimic/SaintsGamingWeb.git
   cd SaintsGamingWeb
   ```

2. **Automated Setup (Recommended for Linux/WSL):**
   Run the unified setup script which handles `.env` generation, database initialization, Docker builds, and starting the stack.
   ```bash
   bash saints.sh setup
   ```
   *To update in the future, simply run `bash saints.sh update`.*

3. **Manual Setup (Windows/Node):**
   ```bash
   # Copy environment variables
   cp .env.example .env
   
   # Install dependencies
   npm install
   
   # Setup database (ensure SQLite or MySQL is configured in .env)
   npx prisma generate
   npx prisma db push
   
   # Run the development server
   npm run dev
   ```

Once running, navigate to [http://localhost:24001](http://localhost:24001) in your browser. Upon your first visit, you will be redirected to the Setup Wizard to initialize the admin account and generate the starting world.

### Important Development Commands

- `npm run dev` - Starts the Next.js development server on port 24001.
- `npm run build` - Compiles the Next.js production build and worker scripts.
- `npm run start` - Starts the Next.js production server.
- `npm run lint` - Runs ESLint.
- `npm run test` - Runs Vitest unit tests.
- `npm run test:e2e` - Runs E2E integration tests.
- `npm run dev:app` - Runs the Electron desktop client locally.

---

## 🚢 Deployment

The project is designed to be deployed primarily via Docker on Linux environments.

1. **Production Build:**
   ```bash
   npm run build
   ```
2. **Docker Compose:**
   The `docker-compose.yml` file defines the standard stack (Next.js Web, Redis, Go MMO Server).
   ```bash
   docker-compose up -d --build
   ```
3. **Caddy Reverse Proxy:**
   If using the `saints.sh` automated deployer, Caddy will be configured automatically to provision Let's Encrypt SSL certificates for your domain.

For remote Server Administrators, a setup wizard is accessible out of the box to configure the database connection, Discord OAuth, and generate the procedural world map seamlessly from a browser.

---

## ⚖️ Licensing & Dependencies

This project is a hybrid open-source repository (BSL-1.1). 
For a complete breakdown of third-party software, SDKs, and open-source library licenses, please read the [LICENSES.md](./LICENSES.md) file. 

---

## 📖 Documentation

If you are looking for **deep technical breakdowns**, engine architecture, and creator guides, please check out our interactive **Wiki** directly on the website once you have the app running, or navigate to the `/wiki` page on saintsgaming.net!

---

## 💬 Community & Links
Visit us at [saintsgaming.net](https://saintsgaming.net)

## Changelog

### v2.2.050
- **Deterministic Wardrobe Group Sorting, Category Icons, Model URL Fallbacks & 3D Preview Guardrails**:
  - **Deterministic Wardrobe Group Sorting (`modelWardrobe.ts`)**: Upgraded `groupModelWardrobeItems` to sort all items within their respective category groups with default-visible items first (`defaultVisible !== false`), followed alphabetically by label using natural numeric collation (`numeric: true`), eliminating erratic item ordering across all creator and customizer interfaces.
  - **Universal Wardrobe Category Icons (`modelWardrobe.ts`, `character-creator.tsx`, `AppearanceCustomizer.tsx`)**: Exported canonical `WARDROBE_CATEGORY_ICONS` across all 18 component categories (`face: 😐`, `head_accessory: 👓`, `beard: 🧔`, `hat: 🎩`, `mask: 😷`, `shirt: 👕`, `jacket: 🧥`, `clothing: 👔`, `pants: 👖`, `shoes: 👟`, etc.). Integrated category icons, item count badges, and per-category "Clear" buttons into both `character-creator.tsx` and `AppearanceCustomizer.tsx`.
  - **Model URL Fallbacks & Presentation Safety (`worldModelPresentation.ts`, `CharacterCreateScene.tsx`, `character-creator.tsx`)**: In `worldModelPresentation.ts`, relaxed the strict `model.assetId` check by accepting `model.modelUrl`, `model.source`, or `model.url` as fallback identifiers, ensuring 3D archetypes configured with direct URLs resolve cleanly. Added URL fallbacks to `modelAssetId` in `character-creator.tsx` and `CharacterCreateScene.tsx`.
  - **3D Preview Sprite Rejection Guardrail (`ArchetypeModelPreview3D.tsx`)**: Fixed a runtime error where non-3D entity keys fell back to 2D sprite paths (`/game-assets/npc/adventurer.png`), causing Three.js `GLTFLoader` to throw JSON parse errors. `effectiveBaseUrl` now strictly validates 3D model formats.
  - **Unit Testing Expansion (`modelWardrobeTaxonomy.test.ts`)**: Added unit tests verifying `groupModelWardrobeItems` provides category icons and natural sorting without lumping faces and glasses together (12/12 passing).

### v2.2.049
- **Universal Wardrobe Slot Healing, Face & Eyewear Disambiguation, Taxonomy Expansion & Category Filtering**:
  - **Universal Slot Healing & Broad Tag Refinement (`modelWardrobe.ts`, `assetTaxonomy.ts`)**: Resolved a core limitation where `getModelWardrobeSlotId` previously bypassed categorization if `item.slot` was already an explicit valid category name (such as `face` or `clothing`). This caused items stored in the database with broad legacy tags to permanently stick to `'face'`, preventing glasses/eyewear from being unbundled. `getModelWardrobeSlotId` now directly delegates to `getModelWardrobeCategory(item)` so broad slot tags (`face`, `clothing`, `accessory`, `hair`, `hat`, `shirt`, `other`) are continuously healed and refined by semantic keyword matching.
  - **Self-Poisoning Prevention & Specific-First Precedence (`modelWardrobe.ts`)**: Removed `item.slot` and `item.category` from `descriptiveText` in `getModelWardrobeCategory` to prevent self-poisoning where an item with `slot: 'clothing'` prematurely matched the broad suit regex before inspecting specific garment keywords (e.g. `sabatons`, `boots`, `jacket`). Specific piece checks (`head_accessory`, `accessory`, `mask`, `beard`, `hair`, `hat`, `face`, `shoes`, `gloves`, `pants`, `back`, `belt`, `weapon_off`, `weapon_main`, `jacket`, `shirt`) now strictly evaluate before broad fullbody outfits (`clothing`).
  - **Comprehensive Asset Taxonomy & Keyword Expansion**: Added support for pauldrons and shoulder armor (`pauldron`, `spaulder`, `shoulder_armor`, `mantle`) mapped to `jacket`; animal tails (`tail`, `cat_tail`, `wolf_tail`, etc.), quivers, and jetpacks mapped to `back`; neckwear (`scarf`, `choker`, `necktie`, `collar`) mapped to `accessory`; holsters, hip pouches, and toolbelts mapped to `belt`; horns, halos, and antennae mapped to `head_accessory`; offhand gear (`shield`, `tome`, `orb`, `lantern`, `grimoire`, `parrying dagger`) mapped to `weapon_off`; and main weapons (`katana`, `greatsword`, `rapier`, `scythe`, `halberd`, `spear`, `crossbow`) mapped to `weapon_main`. Expanded text sources to evaluate `item.name`, `item.source`, `item.modelUrl`, and metadata labels, enabling clean classification of items imported with arbitrary database UUIDs.
  - **Character Wardrobe & Studio UI Enhancements (`CharacterWardrobeSlots.tsx`, `ModelWardrobeEditor.tsx`)**: Added slot icons and item count badges to all slots (e.g. `👓 Glasses / Eyewear (2)`). Implemented natural numeric sorting (`localeCompare` with `numeric: true`) so numbered clothing variants sort cleanly. Added slot category filter tabs (`All Slots`, `Head & Face`, `Clothing`, `Weapons & Gear`) allowing creators and players to instantly filter categories without long scrolling.
  - **3D Rigging & Babylon Engine Socket Fallbacks (`BabylonEngine.ts`, `ArchetypeModelPreview3D.tsx`)**: Added fallback neck bones (`neck`, `bip01 neck`, `mixamorigneck`) to `headmount`, and `upperchest`, `bip01 spine2`, `mixamorigupperchest`, and `pelvis` to `chestmount`.
  - **Unit Testing Suite (`modelWardrobeTaxonomy.test.ts`)**: Added comprehensive test suites verifying non-colliding slot assignments, legacy tag overrides, self-poisoning prevention, and simultaneous equipping across all 17 canonical slots with zero collisions.

### v2.2.048
- **Category Mutual Exclusion, Jewelry & Costume Ear Taxonomy Disambiguation & Sub-Model Cleanup**:
  - **Category Mutual Exclusion in 2D Creator Views (`character-creator.tsx` & `AppearanceCustomizer.tsx`)**: Fixed a multi-selection bug where checking a wardrobe option in 2D fallback mode appended the new item without evicting other selections from the same category. Selecting an item now deterministically deselects conflicting items in that category, preventing multi-face, multi-hair, or multi-pants mesh clipping.
  - **Jewelry & Costume Ear Taxonomy Disambiguation (`assetTaxonomy.ts`, `modelWardrobe.ts`)**: Resolved a taxonomy flaw where items like `gold_earrings` and costume headwear like `cat_ears` / `bunny_ears` were incorrectly captured as human face meshes due to substring matching on `ears`. Jewelry and earrings are now evaluated into `accessory` before face meshes, and costume animal ears are mapped to `head_accessory`.
  - **3D Attachment Cleanup Lifecycle (`ArchetypeModelPreview3D.tsx`)**: Added a cleanup return function to the Three.js sub-model attachment effect, guaranteeing previously attached sockets and skinned sub-models are completely unparented when switching equipment or toggling visibility.
  - **Unit Testing Expansion (`modelWardrobeTaxonomy.test.ts`)**: Added unit tests verifying that animal ears resolve to `head_accessory` and earrings resolve to `accessory` without colliding with the `face` slot.

### v2.2.047
- **Studio Wardrobe Attachment Auto-Assignment, Idle Animation Auto-Selection & Dynamic Slot Safety**:
  - **Studio Wardrobe Attachment & Socket Auto-Detection (`ModelWardrobeEditor.tsx`)**: Upgraded single-item toggles and bulk additions in the Studio wardrobe manager to automatically detect and assign `attachmentMode` (`SKINNED` for wearables vs. `RIGID_SOCKET` for weapons, shields, and props) and canonical sockets (`RightHandMount`, `LeftHandMount`, `ChestMount`) via `getDefaultModelWardrobeAttachmentMode` and `getDefaultModelWardrobeSocket`, eliminating manual configuration mistakes.
  - **Dynamic Unmapped Slot Catch-All (`CharacterWardrobeSlots.tsx`)**: Replaced rigid single-category `other` filtering with a dynamic catch-all that collects all items with custom or unmapped slot IDs into the "Additional Items" section, ensuring no wardrobe piece is ever hidden or lost during character creation.
  - **3D Preview Idle Animation Auto-Selection (`ArchetypeModelPreview3D.tsx`)**: Implemented `handleLoadedAnimations` in the 3D model compositor to automatically detect and select `idle`, `stand`, or `rest` clips upon loading, preventing characters from being stuck in action, death, or T-pose clips when opened in Character Creation, the Vault, or Archetype Studio.
  - **Archetype Visual Data Fallback (`CharacterDetailPreview.tsx`)**: Added relational fallback to `character.archetype.visualData` and `character.archetypeVisualData` in the Character Select Vault preview, guaranteeing characters created from 3D archetypes display their full 3D interactive models even if custom instance overrides are empty.

### v2.2.046
- **Wardrobe Slot Granularity, Face & Eyewear Mixing, Studio Auto-Mapping & Rigid Mesh Socket Fallbacks**:
  - **Face vs. Eyewear Slot Disambiguation & Mixing (`modelWardrobe.ts`, `CharacterWardrobeSlots.tsx`)**: Completely eliminated slot collisions where glasses, shades, and goggles were lumped together with face meshes or hats. Reordered semantic classification heuristics so specific facial attachment keywords override broad legacy database tags (`face`, `hair`, `hat`, `clothing`, `accessory`), allowing players to freely equip and mix face options, glasses/shades, beards, and masks simultaneously.
  - **Unified Studio Category Auto-Mapping (`AssetDefinitionStudio.tsx`)**: Replaced fragmented legacy heuristics across multi-file drops, single imports, and ZIP companion archives with centralized `getModelWardrobeCategory` and `detectAssetTaxonomy`. Added icons and explicit mappings for all 17 canonical component categories (`beard`, `mask`, `gloves`, `back`, `belt`, `weapon_main`, `weapon_off`, etc.).
  - **Deterministic Wardrobe Sorting & Creator Grouping (`CharacterWardrobeSlots.tsx`, `character-creator.tsx`, `AppearanceCustomizer.tsx`)**: Replaced unorganized checkbox lists with categorized wardrobe groupings across both 3D and 2D/fallback appearance customizers using `groupModelWardrobeItems`. Wardrobe slot options now sort deterministically with default-visible items first, followed alphabetically by label.
  - **Rigid Mesh Socket Fallbacks (`ArchetypeModelPreview3D.tsx` & `BabylonEngine.ts`)**: Resolved an issue where modular accessories marked `SKINNED` or modular that lack bone weights or skeletons (such as static glasses, rigid hats, or weapons) were dumped at origin `(0, 0, 0)` on the ground. Both Three.js preview and Babylon in-game engine now dynamically detect unskinned geometry and gracefully fall back to socket parenting using `getDefaultModelWardrobeSocket` (`HeadMount`, `RightHandMount`, `ChestMount`).
  - **Comprehensive Unit Testing (`modelWardrobeTaxonomy.test.ts`)**: Added 8 comprehensive test suites verifying non-colliding slot assignments, legacy tag overrides, slot alias normalization, and default socket mapping.

### v2.2.045
- **Modular Asset Taxonomy Heuristics & Default Outfit Retention**:
  - **Asset Taxonomy Precedence Alignment (`assetTaxonomy.ts`)**: Reordered modular piece classification heuristics so that specific facial attachments (`glasses`, `sunglasses`, `shades`, `goggles`, `masks`, `bandanas`, `beards`, `facial_hair`) are strictly evaluated before generic face/head base meshes. Files named `face_glasses.glb`, `face_mask.glb`, or `face_beard.glb` are now properly mapped to `head_accessory`, `mask`, or `beard` instead of being incorrectly captured as `face`.
  - **Default Outfit Preservation in Character Creation (`CharacterCreateScene.tsx` & `modelWardrobe.ts`)**: Fixed an issue where hero archetypes without explicit `availableInCharacterCreation: true` flags had their default outfits unselected (`selectedWardrobeAssetIds = []`), causing characters to load without clothes. Default outfits now preserve all `defaultVisible !== false` pieces automatically on hero pick or roll, while ensuring 3D model archetypes always open the Avatar Appearance customizer.
  - **Category Alias Expansion (`modelWardrobe.ts`)**: Added canonical category aliases for `sunglasses`, `shades`, `headphone`, and `headphones` mapping to `head_accessory`.
  - **Unit Testing (`modelWardrobeTaxonomy.test.ts`)**: Added tests covering `sunglasses` and `shades` category resolution and default wardrobe outfit fallback handling.

### v2.2.044
- **Modular Clothing Taxonomy, Granular Slot Separation & Character Select 3D Preview**:
  - **Granular Slot Separation & Multi-Category Mixing (`modelWardrobe.ts`, `assetTaxonomy.ts`, `assetImportProfiles.ts`)**: Expanded wardrobe categories into discrete canonical slots: `face`, `hair`, `beard`, `head_accessory` (eyewear/glasses), `mask`, `hat` (headwear), `shirt`, `jacket` (outerwear/robes), `pants` (legs), `shoes` (feet), `gloves`, `back` (capes/backpacks), `belt`, `weapon_main`, `weapon_off`, and `accessory`. Eliminated slot collisions between faces, glasses/shades, beards, and masks so players can customize and wear each simultaneously.
  - **Sanitized Token Boundary Detection (`modelWardrobe.ts`)**: Fixed JavaScript RegExp `\b` boundary issues where underscored identifiers (`male_face_01`, `face_accessory_glasses`) failed word boundary assertions. Sanitized descriptive tokens to space-delimited text before evaluation and added support for shades, sunglass, eyewear, mask, and facial hair variants.
  - **Studio Wardrobe Slot Selector (`ModelWardrobeEditor.tsx`)**: Added a dedicated slot override dropdown for all configured wardrobe items and unconfigured mesh pieces in Studio, allowing creators to assign explicit slots (`face`, `eyewear`, `mask`, `beard`, `jacket`, `shirt`, `belt`, `shoes`, `gloves`) and override auto-detected categories.
  - **Granular Character Creation Layout (`CharacterWardrobeSlots.tsx`)**: Replaced rigid headwear/eyewear columns with an organized 3-column responsive layout: Head & Appearance (`face`, `hair`, `beard`, `eyewear`, `mask`, `headwear`), Center 3D Character Viewport, and Clothing & Gear (`shirt`, `jacket`, `legs`, `feet`, `gloves`, `back`, `belt`, `weapons`, `accessories`), with one-click toggles and active item indicators.
  - **Real-Time 3D Character Select Preview (`CharacterDetailPreview.tsx` & `ArchetypeModelPreview3D.tsx`)**: Integrated 3D character rendering on the Character Select Vault screen. Characters created with 3D model archetypes and modular clothing now render live in 3D with live bone attachments, animations, and gentle turntable auto-rotation instead of falling back to 2D sprites.
  - **Design System Harmonization (`ArchetypeModelPreview3D.tsx`)**: Removed unstyled pink accents from the 3D compositor viewport and replaced them with authoritative Saints Gaming dark/gold brand styling (`border-primary/30`, `bg-[#050b14]`, amber grid lines). Added `hideToolbar` and `autoRotateDefault` properties for embeddable preview cards.
  - **Taxonomy Unit Testing (`modelWardrobeTaxonomy.test.ts`)**: Added comprehensive test coverage verifying distinct slot IDs, non-collision between faces, glasses, beards, and masks, and correct attachment mode defaults.

### v2.2.043
- **Modular Clothing & 3D Character Animation Pipeline Fix**:
  - **Shared Model URL Resolution (`worldModelPresentation.ts`)**: Eliminated the 2D sprite fallback trap where GLTF/GLB models or modular clothing attachments without pre-baked URLs resolved to `/game-assets/creatures/[id].png`, causing 3D WebGL loaders to fail silently. Added pure isomorphic `resolveModelAssetUrl()` with 3D model validation.
  - **Studio Wardrobe Item Persistence (`modelWardrobe.ts` & `ModelWardrobeEditor.tsx`)**: Ensured all wardrobe additions preserve `modelUrl` and `source` alongside `assetId`. Expanded item category aliases and regex detection for standard RPG armor (chestplate, cuirass, hauberk, robes, armor, legs) to automatically assign `SKINNED` attachment mode.
  - **Character Creator Preview & Canvas Stability (`CharacterWardrobeSlots.tsx` & `ArchetypeModelPreview3D.tsx`)**: Removed dynamic composite key from the Three.js viewport container to prevent destroying and remounting WebGL canvases on every wardrobe checkbox toggle. Implemented normalized bone name matching (`normalizeBoneName`) and called `clothingMesh.bind(newSkeleton, clothingMesh.bindMatrix)` to deform clothing meshes with zero latency.
  - **Babylon.js Modular Coordinate & Skeleton Hierarchy Alignment (`BabylonEngine.ts`)**: Parented modular clothing meshes as siblings within `baseModelWrapper` with normalized local transforms ($T=0, R=0, S=1$), inheriting actor scaling and coordinate inversion cleanly. Linked clothing bones to base transform nodes using fuzzy bone taxonomy, and isolated base model animation groups so accessory clips never fight the master character skeleton.
  - **Semantic Animation Categorization & Smooth Playback (`Renderer.ts` & `EntityRenderer.ts`)**: Implemented cached regex matching for locomotion (`run|walk|jog|sprint|locomotion|move`), idling (`idle|stand|wait|breath|rest`), and action clip avoidance (`attack|death|die|jump`), with non-action fallback pooling for models with generic Mixamo or Take 001 animation names.

### v2.2.042
- **Character Creator Preview Fix**: Fixed an issue in `ArchetypeModelPreview3D.tsx` where modular clothing attachments would break the Three.js preview because they attempted to force the base skeleton onto a mesh with a different bone array size/indices. The system now maps bones by name and constructs a valid matched skeleton, making clothing visible during creation.
- **Modular Clothing Animations**: Fixed a bug in `Renderer.ts` where only the base mesh's `idle`/`run` animation was played, leaving modular clothing attachments stuck in a static T-pose (or invisible). The loop now plays the matched animation state across *all* loaded animation groups.

### v2.2.041
- **Critical Animation Fix**: Fixed a bug in `Renderer.ts` where the animation loop was checking `state.animationGroups` (which is always undefined, as it comes from the network) instead of `mesh.metadata.animationGroups`. Animations will now actually play in-game.

### v2.2.040
- **Ghost Entity & Player Sync Fixes**:
  - **Local Player Duplicate Filtering (`index.tsx`)**: The `map_players` event index key was corrected to filter by `accountId` and `id` in addition to `socket.id`. This prevents the MMO server's authoritative state broadcast from spawning a visual "ghost" clone of the local player with a duplicate nameplate at the spawn location.
  - **3D Model Rotation Fix (`Renderer.ts`)**: The mesh rotation vector `Math.atan2(-dir.x, dir.z)` now correctly inverts the X-axis for `modelWrapper` glTF scaled meshes. Characters now smoothly rotate to face their true walking direction rather than pivoting backwards.
  - **Idle Direction Snapping**: When a 3D character is blocked by an obstacle or pivots in place (`dist <= 0.01`), `Renderer.ts` now intercepts the `state.direction` string and snaps the entity rotation cleanly to the requested vector, preventing visual desync when bumping into walls.
  - **Modular Clothing Skeleton Extraction (`BabylonEngine.ts`)**: Fixed an issue where clothing items exported without explicit `result.skeletons` arrays would trigger a destructive `skeleton = baseSkeleton` override. The engine now manually extracts embedded skeletons from the imported meshes before fallback, ensuring wearable meshes no longer explode or disappear in-game.

### v2.2.039
- **Animation System Fixes for 3D Models**:
  - **Fallback Animation Profile**: Added missing fallback to the `MocapMobility` animation profile for humanoid characters that do not explicitly specify an animation profile. This prevents default player models from being stuck in a T-pose when spawned, ensuring core movement animations (run, idle, walk, jump) are bound properly.

### v2.2.037
- **Client-Trust Movement Synchronization, Speed Envelopes & Wall Penetration Prevention (Debian First)**:
  - **Authoritative Speed Envelopes & Latency Headroom (`the-lobby` Go Server)**: Replaced the fixed 2-meter divergence check (`distSq > 4.0`) with a physical speed envelope ($\Delta d_{\text{max}} = 40.0 \times \max(\Delta t, 0.15) \times 1.5 + 4.0\text{m}$). Allows players to sprint (22+ m/s), dash, leap, and ride mounts without false-positive rubber-banding caused by network packet arrival jitter.
  - **Wall Penetration Interception & Safe Contact Clamping**: The Go MMO server (`engine.go`) now validates destination coordinates against solid obstacle AABBs. If a player moving fast strikes a wall, the server no longer snaps them backwards across the map or into blind velocity projections. It resolves continuous swept collision along the displacement vector and smoothly clamps the player to the safe outer contact surface of the wall with depenetration.
  - **Collision Skin Margins (`VoxelCollision.ts` & `voxel.go`)**: Introduced a 1mm skin margin (`1e-3`) to axis-separated obstacle clamping on both client and Go server. Prevents floating-point rounding from settling bounding boxes inside obstacle boxes, eliminating wall sticking and enabling smooth wall-sliding.
  - **Minimum Translation Vector (MTV) Depenetration (`pushOutOfBlocks`)**: Implemented `Depenetrate` in `voxel.go` and `SweptAABBController.depenetrate` in `VoxelCollision.ts`. If an entity ever overlaps solid voxels (due to chunk streaming, knockback, or sudden geometry changes), it immediately ejects to the nearest open air boundary.
  - **Client Reconciliation Epsilon Smoothing (`MovementPrediction.ts`)**: Increased client-side reconciliation tolerance from 5cm to 25cm (`RECONCILIATION_EPSILON = 0.25`), eliminating micro-stutters and jitter while preserving full server authority over impossible movements.
  - **Saints Gaming Bible Section 50**: Codified the Client-Trust Movement Synchronization, Speed Envelopes & Wall Penetration Prevention policy in `.docs/Saints_Gaming_Bible.md`.

### v2.2.036
- **Docker Build & Postinstall Patching Safeguards (Debian First)**:
  - **Docker Build Layer Alignment**: Added `COPY scripts/patch-three-stdlib.js ./scripts/patch-three-stdlib.js` immediately before `RUN npm ci` in `Dockerfile`. Resolves fatal container build failure (`MODULE_NOT_FOUND: Cannot find module '/app/scripts/patch-three-stdlib.js'`) during production Docker builds where `npm ci` triggers `postinstall` before the application source tree is copied.
  - **Defensive Postinstall Invocation**: Wrapped `postinstall` in `package.json` with an inline file existence check (`if (require('fs').existsSync(f)) ...`) to guarantee `npm install` and `npm ci` never abort when executed in partial build stages or minimal container caches.

### v2.2.029
- **Equipment Sockets, Grip Calibration & Modular Loadout Compositor**:
  - **Comprehensive Socket Architecture**: Added full data contracts (`GripTransform`, `STANDARD_SOCKET_OPTIONS`, `HIDEABLE_COMPONENT_OPTIONS`) to `WorldModelSelector.tsx` for hand mounts (`RightHandMount`, `LeftHandMount`, `TwoHandedGrip`), mounted accessories (`HeadMount`, `ChestMount`), and sheathed mounts (`SheathedBack`, `SheathedHip_L`, `SheathedHip_R`).
  - **Studio Grip Calibration Viewport**: Built `ItemModelPreview3D.tsx` and integrated it directly into `ItemEditorPanel.tsx`. Creators can now calibrate XYZ position offsets (meters) and XYZ rotation offsets (degrees) in real time while viewing an interactive Three.js 3D viewport with OrbitControls and a toggleable RGB bone socket origin gizmo (`AxesHelper`).
  - **Composite Character 3D Studio Preview**: Built `ArchetypeModelPreview3D.tsx` and integrated it into `ArchetypeEditorWorkspace.tsx`. Creators can now view full composite 3D characters with base body meshes, modular attachments (clothing and armor sets), equipped starting weapons, live animation testing (with clip selector, play/pause, and turntable rotation), and skeleton bone helpers.
  - **Skinned Mesh & Rigid Socket Engine Integration**: Upgraded `BabylonEngine.ts` to dynamically handle both skinned attachments (sharing the base character skeleton for clothing/armor deformation) and rigid bone sockets (mounting weapons/tools/helmets to bones with calibrated offsets via `attachToBone` and bone transform nodes).
  - **Anti-Clipping Component Hiding**: Added component suppression matrix (`hair`, `beard`, `head_accessory`, `torso`, `legs`, `feet`) in Studio and runtime renderer, automatically hiding base body meshes when covered by armor or helmets to prevent clipping.
  - **Saints Gaming Bible Expansion**: Documented Section 46 ("Equipment Sockets, Grip Calibration & Modular Loadout Compositor") codifying socket contracts, attachment modes, anti-clipping matrices, and runtime bone retargeting rules.

### v2.2.028
- **Expanded 3D Model Format Pipeline & PBR Texture Suite**:
  - **Comprehensive 3D Format Converters**: Added native client-side GLB conversion for popular 3D game asset formats: FBX, Wavefront OBJ (+ MTL), MagicaVoxel VOX (preserving voxel vertex colors for Cube World / Minecraft style voxel assets), Collada DAE, Stereolithography STL, and Stanford PLY.
  - **Multi-File & Direct Drag-and-Drop Ingestion**: Enhanced `AssetUploadView.tsx` to accept direct drops and multi-file selections of all 7 formats along with companion textures and `.mtl` material definitions.
  - **Expanded Texture Format Support**: Integrated Three.js `TGALoader` and `DDSLoader` to handle `.tga`, `.dds`, and `.bmp` files seamlessly alongside standard `.png`, `.jpg`, and `.webp` images.
  - **Full PBR Material Channels in Studio**: Upgraded `AssetDefinitionStudio.tsx` Materials tab with dedicated slots for Albedo/BaseColor, Normal Map, Roughness, Metallic, Emissive, and Ambient Occlusion. Added **Batch Auto-Assign Textures** that infers material channels by filename suffixes (`_BaseColor`, `_Normal`, `_Roughness`, `_Metallic`, `_ORM`, `_Emissive`, `_AO`).
  - **GLB Scene Re-Export on Publish**: Connected external textures in `AssetDefinitionStudio.tsx` are baked directly into the GLB binary via `GLTFExporter` upon publishing, ensuring zero missing texture references in the live runtime.
  - **Multi-Format Modular Items**: Creators can now drop FBX, OBJ, VOX, DAE, STL, and PLY attachments (e.g. hair, armor, hats, weapons) directly into the Modular Set Items tab, converting them on the fly to GLB.
  - **Saints Gaming Bible Expansion**: Updated Section 45.5 with formal specification for multi-format 3D ingestion, PBR texture naming conventions, and client-side conversion rules.

### v2.2.027
- **3D Asset & Animation Import Pipeline Overhaul**:
  - **Animation Preservation in GLTF Export**: Fixed `fbxConverter.ts` omitting `animations: object.animations` in `GLTFExporter.parse()`, ensuring all skeletal animations inside FBX files are properly preserved and baked into converted GLBs.
  - **PBR Material Integrity**: Removed `--khr-materials-unlit` flag in Electron native conversion bridge (`saints-app/electron/main.cjs`), preserving roughness, metallic, normal maps, and standard lighting for imported FBX models.
  - **External Texture Resolution**: Updated `fbxConverter.ts` with `THREE.LoadingManager` URL interception to resolve and bundle external textures (e.g. `_D`, `_Normal`, `_Roughness`) directly into the output GLB payload.
  - **3D Model ZIP Packages & Multi-File Ingestion**: Added `modelPackage.ts` utility and updated `AssetUploadView.tsx` to detect and unpack 3D model archives (.zip) containing `.fbx`/`.glb` meshes, textures, and companion animation FBX clips. Enabled multi-file selection/drop for importing an FBX together with its texture maps.
  - **Studio Material & Texture Manager**: Added real-time texture connection slots and texture status indicators (`✓ Textured` vs `No Texture`) to the Materials tab in `AssetDefinitionStudio.tsx`. Creators can now directly attach or replace texture maps for each material slot and immediately preview the textured model in the 3D viewport.
  - **Saints Gaming Bible Update**: Added Section 45 ("Studio 3D Asset & Animation Pipeline Specification") codifying canonical runtime storage formats (GLB), PBR material integrity, standard humanoid animation action slots, external animation sets with runtime retargeting, and immutable release boundaries.

### v2.2.026
- **Saints Gaming Gameplay Bible Documentation**:
  - **HUD Studio Live Synchronization Architecture**: Formally documented the bidirectional relationship between Saints Studio's HUD authoring environment (`/studio/hud`) and the live game client (`The Lobby` / `BabylonEngine`). Added detailed canonical specification for the 9-zone anchored docking system, viewport scaling with corner-anchored `transform-origin`, Studio Quick Menu bar customization (`quickMenuButtons`), authoritative `useGameStore` window hierarchy, and theme presets.
  - **In-Game Options Menu & Unified Client Settings Architecture**: Formally documented the `FloatingWindow` obsidian glass design standards, community-first tone guidelines, 7-tab sidebar structure (Session & Character, Display & Graphics, Audio & Sound, Camera & View, Controls & Binds, Interface & HUD, Gameplay & Social), and the runtime client bridge with `ClientSettingsSchema` and `localStorage` persistence.

### v2.2.025
- **In-Game HUD & Game Options Menu Overhaul**:
  - **In-Game HUD Buttons & Windows Fix**: Fixed `ClassicPanel.tsx` importing from obsolete `useHudStore` instead of `useGameStore`. Clicking Inventory, Skills, Equipment, Quest Log, Marketplace (GTC), and Options now properly toggles their respective windows and system menu. Fixed keyboard shortcuts (`I`, `K`, `C`, `L`, `G`/`M`, `X`, `P`, `B`, `Esc`).
  - **HUD Studio Live Dock Synchronization**: Connected `hudConfig.quickMenuButtons` to `ClassicPanel.tsx`'s favorites dock bar. Toggling shortcut buttons inside HUD Studio's "Dock" tab now directly updates the in-game quick menu bar.
  - **HUD Viewport Scaling**: Wired `hudConfig.scale` into `DockZone.tsx` using corner-anchored `transformOrigin` and `scale(...)`, allowing the HUD viewport scaling slider (75% - 125%) to scale all docked HUD elements without distortion.
  - **Game Options Menu Overhaul**: Redesigned `GameOptionsMenu.tsx` to match the authentic Saints Gaming window style (`FloatingWindow` obsidian glass, amber trims, and clean typography). Replaced cluttered duplicate ribbons and pseudo-military labels with a clean, spacious 7-tab interface:
    - *Session & Character*: Live saint status, current map, instance, ping latency readout, emergency 5-second unstuck channel, character select, title screen return, and World Studio jump.
    - *Display & Graphics*: Windowed/Fullscreen toggle, resolution scale (50%-150%), quality presets (Low/Med/High/Ultra), FPS targets (30/60/120/144/Uncapped), dynamic 3D shadows, post-processing pipeline, floating damage numbers, floating ground loot, and footstep dust FX.
    - *Audio & Sound*: Master volume, music/jukebox (BGM), sound effects (SFX), world ambience, UI sounds, master mute, and background mute.
    - *Camera & View*: Camera perspectives (Dynamic, Third Person, First Person, 2.5D Isometric), FOV slider (60°-110°), spring follow smoothness, camera shake toggle, edge clamping, and lens vignette.
    - *Controls & Binds*: Mouse look sensitivity slider, invert Y-axis toggle, mobile control mode (floating joystick vs fixed D-pad), and structured keybinding reference table.
    - *Interface & HUD*: HUD theme palette selector (with color swatch swatches), scale, glass opacity, frame corner style, radar minimap shape, vitality gauge formats, visual badges toggles, live HUD layout editor launcher, and factory default reset.
    - *Gameplay & Social*: Player nameplates toggle, combat smart auto-targeting, auto-accept friend party invites, always auto-run, and chat timestamps.
  - **Multiplayer Nameplates Setting**: Connected `showNames` client setting to `BabylonEngine.ts` to toggle player overhead nameplates.
  - **Hotbar Consumable Cast Socket**: Updated `Hotbar.tsx` item consumption to use `emitSocketEvent` for reliable networked use of potions and consumables.

### v2.2.024
- **Animation Engine & Retargeting (T-Pose Fix)**:
  - **Bone Retargeting Engine**: Implemented `animationRetarget.ts` with cross-standard bone mapping between Mixamo, Unreal Engine Manny/Quinn, Paragon, Blender, and Biped skeletons.
  - **Safe Container Disposal**: Eliminated disposed-node crashes in Babylon.js by cloning targeted animations into isolated `AnimationGroup` instances bound exclusively to destination skeleton nodes before releasing source GLB containers.
  - **Multi-Runtime External Clip Loading**: Connected external animation clip loading, bone retargeting, and automatic state playback to both `BabylonEngine.ts` (Lobby, Studio, Playtest) and `EntityRenderer.ts` (MMO Client).
  - **Actor VisualData Model Resolution**: Resolved 3D character models, transforms, and mapped animation profiles directly from `visualData` when characters spawn with default or unmapped `assetProfileId`.
  - **Linux / Debian First Path Routing**: Updated `server.ts` animation route with URI decoding and Debian Linux server path priority.

### v2.2.023
- **3D Model Scale & Camera Fixes**:
  - **Scale Default & Range**: Set default 3D model scale to `0.8x` (humanoid scale in voxel coordinates) in Asset Studio and renderers. Added precise numeric inputs and slider range down to `0.05x` with quick scale preset buttons.
  - **Camera Chest Pivot**: Fixed camera orbit pivot calculation to rotate around the player's chest height (`pivotY = terrainY + playerChestHeight`) rather than ground/feet level (`terrainY`), preventing the camera from descending into the player's feet when zoomed in or when models are scaled down.
  - **Skeleton Head Bone World Space**: Fixed head bone world-space coordinate calculation across both client and lobby Babylon engines using `headBone.getAbsolutePosition(childMesh)` rather than raw skeleton matrix, eliminating the 4.5cm ankle height false positive.
  - **Camera Raycast Collision Exclusions**: Explicitly filtered all entity and model meshes (`sprite_`, `modelWrapper_`, `entity_`) from camera raycast occlusion checks and set `isPickable = false` on imported GLB meshes, preventing the camera from jamming inside the player's body at 0.5m distance.
  - **Asset Definition Transform Persistence**: Promoted `transform` properties (`modelScale`, `modelRotationY`, `grounding`, `cameraHeightOffset`) to top-level presentation fields during asset upload for full forward and backward compatibility.

### v2.2.015
- **3D Render Fixes**: Fixed a critical bounding box calculation bug where parent mesh transforms (scale) weren't correctly applied before computing child meshes, causing 3D characters to have giant 0-height bounding boxes, driving the camera straight into the floor/feet.
- **Embedded Animations Fix 2**: Forced animation loop state machine to automatically reset and play the mapped Idle/Walk targets immediately upon asynchronous model load, overriding Babylon's native default-play states that could leave the character in a T-pose.

### v2.2.014
- **Embedded Animations Mapping Fix**: Fixed a critical issue where selecting embedded animations (inside the same `.glb` model) in the Asset Studio did not correctly map them to engine action slots (like `idle`, `run_fwd`). The engine now properly renames embedded animation clips on load so the animation state machine can find and trigger them.

### v2.2.013
- **Adjustable Camera Target Height**: Added an explicitly configurable `Camera Target Height Offset` parameter to the Asset Studio, solving the issue where cameras snapped to the ground or feet. The Engine now smoothly tracks the provided offset height rather than blindly using bounding boxes.

### v2.1.986
- **Setup Wizard:** Fixed a critical parsing bug where Windows CRLF line endings corrupted `.env` secrets during `saints.sh` setup, preventing Admin account creation.
- **Studio Ability Workspace:** Upgraded the Animation Row string input field into an intuitive visual dropdown selector for standard 2D Sprite Actions and 3D Model Slots.

### v2.1.985
- **Studio Audit & Menus:** Added Audit Check to StudioMenuBar; officially deprecated the 2D Animation Studio and Spawn Editor in favor of 3D GLB capabilities.
- **UI Coherence:** The Navbar and Global Bottom Bar automatically hide when editing; integrated 3D empty Mesh placeholder rendering.
- **Cleanup:** Purged legacy SA-MP/FiveM/UCP references across project.

### v2.1.991
- **Settings Audit:** Cleaned up client settings schema to use correct camera profiles (dynamic, irstperson, ollow45, isometric).
- **Jargon Removal:** Removed military/sci-fi jargon ("Move Operative", "World Map Radar") from the keybinds menu, strictly adhering to the Saints Gaming laid-back MMO theme.
- **Procedural Generation Fix:** Fixed an issue where procedural/fractal maps would repeatedly request chunks on the client by correctly updating the `WorldStreamer` chunk residency state to `MESHED`.
- **Character Creator:** Improved asset studio sorting to automatically categorize modular clothing/hair based on filenames and updated character creator to display human-readable names for custom modular items.
- **Rendering & Viewport fixes:** Fixed mobile browser bottom cutoff by updating viewport scaling to `100dvh` and clamped max zoom out to 15 in dynamic/ortho modes.
