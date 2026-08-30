# 2.1.556
- **Social Feed Post Creation & Media Upload Restoration (PC & Mobile)**:
  - **PC Composer Visibility Fix**: Resolved client-side hydration condition where the post composer card was inadvertently hidden on desktop when `isMobileComposerExpanded` was uninitialized.
  - **Primary Post Action in Header**: Added a dedicated `+ Post` action button directly in the Feed sticky header for instant posting and media attachment across all screen sizes.
  - **Mobile Floating Action Button (FAB)**: Added a convenient floating `+` action button on mobile views that scrolls smoothly to top and opens the composer ready for uploading clips, media, or discussions.
  - **Mobile Collapsible Post Composer**: Enhanced mobile composer with a clean header toggle and collapse button `(X)` for smooth UX and maximum viewport efficiency.
- **Version Bump**: Bumped release version to `v2.1.556` across all application layouts, headers, footers, settings, and documentation.

# 2.1.555
- **Studio Menu Completeness & View Overlay System**:
  - **Comprehensive Windows & Panels Audit**: Audited all 32 Studio panels, docks, and tools. Added direct access entries in the `Windows` dropdown for **Hero Studio** (`hero`), **Dev Tools & Server Controls** (`dev`), and **Rule Debugger & Script Tracing**.
  - **Dedicated `View` Top-Level Menu**: Introduced a new top-level `View` menu in `StudioMenuBar` providing instant toggles for Tile Coordinates (XY), Warp Gate Overlays, Spawn Overlays, Free-Cam mode, Zoom In/Out/Reset, and Fit Map to View.
- **Version Bump**: Bumped release version to `v2.1.555` across all application layouts, headers, footers, settings, and documentation.

# 2.1.554
- **Unified Navigation & Persistent Shell Architecture**:
  - **Static Top/Bottom Bar Keeping Container**: Maintained persistent `Navbar` and `GlobalBottomBar` mounts across the entire application shell (Website, MMO Game Lobby, and World Studio) inside `MainLayoutShell` to prevent unmounting and UI flicker.
  - **Studio Mode Conversion**: `Navbar` and `GlobalBottomBar` dynamically adapt into the full-featured Studio top menu bar and bottom toolbars when navigating to `/studio`, providing access to all Studio tools, menus, shortcuts, and diagnostics while maintaining exclusive website links for `Home` and `Play Now` (Lobby).
  - **Game Mode Character Stats Integration**: Enhanced `GlobalBottomBar` in `/lobby` game mode to display live character and account stats (`Account Name ACCT LVL [X] | Character Name LVL [Y]`) cleanly without clutter.
  - **StudioEditorShell Deduplication**: Removed redundant internal mounts of `StudioMenuBar` and `StudioBottomToolbar`, ensuring the layout root acts as the single source of truth for global navigation and toolbars.
- **Version Bump**: Bumped release version to `v2.1.554` across all application layouts, headers, footers, settings, and documentation.

# 2.1.553
- **Social Feed & Shorts Viewer Build Fixes**:
  - **Syntax Error Fix in `app/actions/social/feed.ts`**: Restored the missing object closure and function return mapping in `searchFeed` that was accidentally corrupted when appending `getSuggestedCreators`.
  - **Variable Hoisting Fix in `the-feed.tsx`**: Moved `handleToggleFullscreen` callback definition prior to the keyboard event listener `useEffect` hook, resolving TypeScript TS2448 block-scoped variable declaration errors.
- **Version Bump**: Bumped release version to `v2.1.553` across all application layouts, headers, footers, settings, and documentation.

# 2.1.552
- **Studio Unified Multi-Tile Brush Highlight Structure**:
  - **Single Cohesive Footprint Perimeter**: Replaced the fragmented per-tile cluster preview (which previously rendered individual corner brackets and center dots on every single tile in large brush radii) with a single, unified highlight structure.
  - **Continuous Contour & Ambient Glass**: Circular and square brush footprints of any radius (1x1, 3x3, 5x5, 7x7+) now render a continuous outer neon boundary perimeter with a smooth ambient radial glass gradient fill.
  - **Subtle Interior Cell Grid & Center Focal Target**: Clean, semi-transparent internal grid dividers and a single precision focal target crosshair on the center tile provide clear spatial awareness without visual clutter.
  - **Zero Frame Drops**: Unified procedural dynamic texture caching by shape, radius, and brush mode eliminates per-tile mesh allocation overhead and GC stutter.
- **Version Bump**: Bumped release version to `v2.1.552` across all application layouts, headers, footers, settings, and documentation.

# 2.1.551
- **Studio Full-Bleed Viewport & Bottom Toolbar Fix**:
  - **Eliminated Containing Block & Bottom Offset in Studio**: Resolved the issue where the Studio bottom toolbar was floating ~1 inch above the bottom of the screen. Created `MainLayoutShell` client wrapper to prevent `app/(main)/layout.tsx` from applying `pb-10`, `pt-14/pb-12` padding, and `.sg-page-enter` CSS animation transforms (which created an artificial containing block trapping fixed viewport elements) when on `/studio` and `/lobby`.
  - **Full-Bleed Viewport Alignment**: Studio toolbar and canvas viewport now sit completely flush at absolute pixel `0` of the bottom viewport edge.
  - **Viewport Sizing Accuracy**: Updated `StudioCanvasViewport` maximized constraints to 40px top bar and 36px bottom toolbar for seamless docking.
- **Version Bump**: Bumped release version to `v2.1.551` across all application layouts, headers, footers, settings, and documentation.

# 2.1.550
- **In-Game UI Redesign & Studio Interface Designer**:
  - **HUD Theme Engine (`hud-themes.ts`)**: Built a modular, theme-driven in-game HUD engine with 6 premade styles adhering strictly to Saints Gaming styling rules (dark glass, warm gold/amber accents, clean gradients, zero cyberpunk/synthwave neon clutter, zero polygon clip-paths):
    1. *Saints Gold* (Default / Canonical Saints Gaming dark glass with amber highlights)
    2. *Obsidian Slate* (Classic Fantasy RPG with cool platinum steel borders)
    3. *Midnight Minimal* (Ultra-clean borderless viewport with subtle glass backdrops)
    4. *Emerald Grove* (Nature & Celtic gold with woodland vitality accents)
    5. *Royal Arcane* (Celestial violet & amethyst with warm gold trim)
    6. *Crimson Vanguard* (Molten battle fury & gladiator steel)
  - **In-Game HUD Redesign**: Upgraded `HudPanelShell`, `PlayerVitalsHud`, `ClassicPanel`, `Hotbar`, `MiniMapRadar`, `target-frame`, `PeerPresenceHud`, and `FloatingWindow` to use the theme engine, rounded dark glass tokens, and responsive vital bars with no polygon clip-path distortion.
  - **Studio Interface Designer Dock (`InterfaceEditorPanel.tsx`)**: Created a dedicated Studio dock window for deep client HUD customization:
    - Live 6-theme picker with color palette swatches and descriptions.
    - Viewport scaling (75% to 125%) and glass opacity (40% to 100%) sliders.
    - Corner styling (Rounded, Compact, Capsule), Minimap shape (Rounded, Circle, Square), and Vitality gauge format selectors.
    - Quick menu utility dock button configuration.
    - JSON Export/Import for sharing interface configs across characters and realms.
    - Live interactive mini preview bar.
  - **Game Options Menu Interface Tab**: Integrated theme selection cards and customizer sliders directly into the in-game Escape options menu.
  - **Studio Registry Integration**: Fully registered the `interface` dock across `studioModes.ts`, `studioPermissions.ts`, `StudioEditorShell.tsx`, and `StudioMenuBar.tsx`.
- **Version Bump**: Bumped release version to `v2.1.550` across all application layouts, headers, footers, settings, and documentation.


# 2.1.549
- **Website Copywriting & Flavor Text Polish**:
  - **Comprehensive Web Audit**: Audited all non-game, non-studio website pages (Landing, Home, The Nexus, Forums, Streams, Support, Leaderboards, Wiki, User Profiles, Auth, and Status) for relaxed, authentic gamer tone (*"Saints Gaming: Time To Play"*).
  - **Terminology Harmonization**: Updated leaderboards, profiles, and status pages to use canonical community labels (*Saints Characters, Buddies Captured, FiveM Roleplay telemetry, Player Rankings*), removing pseudo-military/sci-fi terminology.
- **Version Bump**: Bumped release version to `v2.1.549` across all application layouts, headers, footers, settings, and documentation.

# 2.1.548
- **The Nexus Mobile-Friendly Upgrade**:
  - **Sticky Mobile Segmented Controller**: Implemented an ultra-responsive, touch-optimized glassmorphic segmented tab bar for mobile screens (< lg) with active gold pill highlights and live count badges.
  - **Live Search & Game Filters**: Added real-time client-side search across Community News, Modpacks, and Dedicated Game Servers, complete with game category filter pills.
  - **Mobile-Optimized News List**: Redesigned the news list view with compact side-by-side thumbnails (`w-20 h-20 sm:w-36 sm:h-24`), preventing endless vertical scrolling on smartphones.
  - **Touch-Friendly Server Controls**: Added one-tap server IP copy with instant checkmark visual feedback, active player percentage bars, and live refresh polling.
  - **Direct Nexus Redirect**: Added `/nexus` route alias redirecting cleanly to `/hub`.
- **Version Bump**: Bumped release version to `v2.1.548` across all application layouts, headers, footers, settings, and documentation.

# 2.1.547
- **Full-Bleed Studio Viewport & Gap Elimination**:
  - **Eliminated Viewport Window Frame**: Replaced the floating `StudioCanvasViewport` wrapper with direct full-bleed `GameCanvasBabylon` mounting across `/studio`, removing the artificial window header, 36px/72px window offsets, and eliminating the bottom browser gap completely.
  - **Seamless Canvas Experience**: Game world in Studio now extends from absolute pixel `0` to the bottom of the screen (`100% / 100vh / fixed inset-0`) with the top menu bar, bottom toolbar, and tool docks floating cleanly on top.
- **Version Bump**: Bumped release version to `v2.1.547` across all application layouts, headers, footers, settings, and documentation.

# 2.1.546
- **Title Screen & Character Select Performance Optimization**:
  - **Deferred Babylon Engine Mounting**: Gated `GameCanvasBabylon` to mount only when the player enters the live world (`EXPLORING`, `BATTLE`, or Studio mode), preventing background WebGL chunk meshing (24,000+ tiles) and full-frame render loops while on the Title and Character Select screens.
  - **Grouped Starfield Rendering**: Optimized `MidnightStars` from 75 individual animating DOM divs to lightweight hardware-accelerated SVG star layers, eliminating continuous composite layer updates and style recalculations (from 43+ recalcs/sec down to 0).
  - **Atmospheric Particle Loop Throttling**: Capped `PixelEnvironmentalEffects` canvas animation loop to 30 FPS, reducing particle rasterization overhead by over 60%.
  - **Grouped Water Glint SVGs**: Consolidated 36 independent specular water glint DOM elements into grouped SVG layers with hardware-accelerated opacity pulse.
- **Version Bump**: Bumped release version to `v2.1.546` across all application layouts, headers, footers, settings, and documentation.

# 2.1.545
- **Studio Layout & Viewport Gap Fix**:
  - **Gapless Studio Viewport**: Initialized `StudioCanvasViewport` to maximized by default on load, seamlessly filling the entire viewport between the top menu bar (`36px`) and bottom toolbar (`36px`) with zero gaps.
  - **Responsive Window Sync**: Added automatic window resize synchronization to `StudioCanvasViewport` so the canvas dynamically resizes and prevents bottom/side gaps across window resize events.
  - **Asset & Hero Studio Layouts**: Added bottom clearance padding (`pb-9`) to `AssetStudioSuite` and `HeroStudioSuite` to prevent content overlap with `StudioBottomToolbar`.
- **Version Bump**: Bumped release version to `v2.1.545` across all application layouts, headers, footers, settings, and documentation.

# 2.1.544
- **Guidelines & Project Rules (Tone of Voice & Community Language)**:
  - **Rule 11 Enacted**: Formally codified the project's casual gaming and FiveM/SA-MP community voice across `AGENTS.md` and `.agents/AGENTS.md`. Mandated authentic, laid-back gaming language ("Time To Play", hanging out, chatting, gaming together) and strictly banned pseudo-tactical sci-fi jargon ("Tactical Uplink", "Operative Matrix", "Cyber Grid") and corporate speak.
- **Version Bump**: Bumped release version to `v2.1.544` across all application layouts, headers, footers, settings, and documentation.

# 2.1.543
- **In-Game Camera Zoom Limit**:
  - Limited the in-game maximum zoom-out (`maxZoom: 11.0`) to keep player perspective focused, immersive, and clear while preserving full 120x zoom in Studio World Builder mode.
- **Large-Scale MMO Client Architecture & Culling**:
  - **Viewport Entity Culling**: Implemented screen-space bounding box culling in `BabylonEngine` render loop. Off-screen players and monsters skip expensive vertex UV cycle recalculations and draw calls, saving massive CPU/GPU cycles on crowded maps.
  - **MiniMap Radar Loop Throttling**: Throttled `MiniMapRadar` canvas draw loop to ~30 FPS, reducing secondary canvas rasterization overhead by over 70%.
  - **Floating Health Bars Gating & Throttling**: Gated `FloatingHealthBars` to only run position projection when damaged entities are active on screen, throttled updates to avoid continuous React re-renders.
  - **Audio Voice Limiting & Cooldowns**: Added voice concurrency rate-limiting in `SoundSynthEngine` (`sound-synth.ts`) to avoid WebAudio buffer congestion during mass combat or gathering.
- **Navigation Bar Streamlining**:
  - **Wiki Button Clean-up**: Removed the redundant Wiki link from the top navigation bar and mobile drawer (preserving it exclusively in the dedicated bottom utility bar).
- **Version Bump**: Bumped release version to `v2.1.543` across all application layouts, headers, footers, settings, and documentation.

# 2.1.542
- **Forum Hub & Cross-Platform Integration**:
  - **Streamlined Forum Header**: Replaced the oversized hero box with a sleek, compact title and integrated search/actions bar.
  - **Nexus & Feed Community Spotlight**: Integrated live Nexus news dispatches and trending video feed clips directly into the initial forum index page to make the community boards feel active, engaging, and rich.
- **Version Bump**: Bumped release version to `v2.1.542` across all application layouts, headers, footers, settings, and documentation.

# 2.1.541
- **The Nexus Layout & News Enhancements**:
  - **Community News Tile Layouts**: Added instant view options (Row of 3 Columns, Row of 6 Compact Columns, and Horizontal List View) for community news dispatches with persisted view state.
  - **Streamlined Nexus Header**: Removed the redundant large promotional top banner. Embedded "The Nexus" clean title directly above the left sidebar navigation tabs.
- **Brand & Navigation Refinements**:
  - **Saints Global Bottom Bar**: Replaced "Saints Network" branding with clean "Saints" brand naming. Added usage-grouped left/right navigation shortcuts (Play, Feed, Streams, Forums, Nexus, Wiki, Support) with rich tooltips.
- **Hardcoded Design System Rules**:
  - Strictly banned cyber/synthwave aesthetics and clip-paths across all agent rule files (`AGENTS.md` & `.agents/AGENTS.md`) in favor of authoritative Saints Gaming design tokens (`sg-glass`, dark gold palette, clean typography).
- **Version Bump**: Bumped release version to `v2.1.541` across all application layouts, headers, footers, settings, and documentation.

# 2.1.540
- **Client & Engine Performance Optimization (High Framerate Elevation)**:
  - **Hardware-Accelerated Backgrounds**: Replaced 111+ continuous Framer-Motion JavaScript animation loops in `MidnightStars` and `S3Water` with pure GPU-composited CSS keyframes (`transform: translateZ(0)`), completely freeing main-thread JS timers.
  - **Pixel Environmental Canvas Optimization**: Replaced expensive per-particle canvas `ctx.shadowBlur` and `ctx.save()`/`ctx.restore()` in `PixelEnvironmentalEffects` with batched alpha halo and integer-aligned pixel rendering.
  - **3D Voxel Logo Instanced Batching**: Converted ~100 distinct `<Box>` meshes in `SGVoxelLogo` to 3 GPU `InstancedMesh` draw calls, and replaced heavy WebGL container drop-shadow filters with a performant ambient radial glow backdrop.
  - **Character Selector & Sprite Cache**: Added an in-memory sprite dimension cache (`SPRITE_SIZE_CACHE`) to `CharacterSpritePreview` to eliminate initial layout shifts and state thrashing, memoized parsed character card data, and added GPU composite hints (`willChange`).
  - **Babylon 2.5D Engine Tuning**: Set `preserveDrawingBuffer: false` for zero-copy GPU swap buffers, capped high-DPI scaling to 1.5x on Retina/4K screens, and throttled dynamic water texture updates to a smooth 10 Hz cadence.
  - **FPS Counter Throttling**: Optimized FPS state updates in `GlobalBottomBar` to prevent redundant UI component re-renders.
- **Version Bump**: Bumped release version to `v2.1.540` across all application layouts, headers, footers, settings, and documentation.

# 2.1.537
- **Base UI ActionTooltip Build Compatibility**:
  - Removed unsupported `asChild` prop from `TooltipTrigger` in `ActionTooltip` (`src/shared/ui/action-tooltip.tsx`), resolving TypeScript build failures in Next.js production builds.
- **Version Bump**: Bumped release version to `v2.1.537` across all application layouts, headers, footers, settings, and documentation.

# 2.1.536
- **Navigation Enhancements**:
  - **Centered Main Links**: Moved the primary links (Home, The Nexus, Play Now, Forum, Wiki, Support) into a clean, centered cluster in the top navigation bar.
  - **Embedded Auth Buttons**: Restyled the "Log In" and "Sign Up" buttons into a segmented, inset pill container for an integrated look.
  - **Bottom Bar Voxel Logo**: Added the micro 3D Voxel Logo to the center of the Global Bottom Bar, sitting between the 4 primary icons.
  - **Tagline**: Added "Time To Play" branding tagline to the top left logo area.
- **Dynamic Tooltip System**:
  - Implemented a global, robust, animated tooltip system leveraging `@base-ui/react/tooltip`.
  - Created a reusable `ActionTooltip` component for fast wrap-around implementation.
  - Integrated rich tooltips across all utility actions (Mod Drawer, Dev Console, Social Messenger, Audio, Fullscreen) and user stats (Level, Coins, AP) in the Global Bottom Bar.
- **Version Bump**: Bumped release version to `v2.1.536` across all application layouts, headers, footers, settings, and documentation.

# 2.1.535
- **Streamlined Sticky Header & Thinned Cyber Bottom Bar**:
  - **Sticky Following Navbar**: Made the top navigation bar follow the user on scroll with a sleek, thinner profile (`h-11 sm:h-12`) and cyber glassmorphism.
  - **Streamlined Nav Layout**: Positioned **Play Now** and **The Nexus** on the left; the 3D spinning micro logo and active page indicator in the center; and **Wiki**, **Support**, Search, and User profile controls on the right.
  - **Thinned Global Bottom Bar**: Redesigned the bottom bar into a high-density, compact HUD (`h-8 sm:h-9`) showing the connected user's operative name, account level, coins/gold, and achievement score alongside 4 core navigation destinations (**Play Now**, **The Nexus**, **Wiki**, and **Support**).
  - **Footer Cleanup**: Removed the bulky static footer in favor of persistent, streamlined top & bottom bars.
- **Version Bump**: Bumped release version to `v2.1.535` across all application layouts, headers, footers, settings, and documentation.

# 2.1.534
- **Visual Fixes & UI Enhancements**:
  - General visual fixes, UI responsiveness adjustments, layout polish, and asset formatting updates.
- **Version Bump**: Bumped release version to `v2.1.534` across all application layouts, headers, footers, settings, and documentation.

# 2.1.533
- **Comprehensive External Game Reference Audit & Native System Terminology**:
  - **Full Code & Wiki Reference Audit**: Audited and cleaned all external trademarked game and franchise references across client overlays, setup flows, HUD docks, audio synthesizer engine, rendering code, schemas, and wiki documentation.
  - **Standardized Native Saints Terminology**:
    - Replaced all third-party game references with native descriptive system terminology across setup presets, combat formulas, dock layouts, and skill tables.
    - Updated schema defaults and XP curve algorithms to `saints-standard` and `standard_table`.
    - Standardized HUD dock presets to `preset-command`, `preset-sidebar`, `preset-action`, and `preset-minimal`.
- **Version Bump**: Bumped release version to `v2.1.533` across all application layouts, headers, footers, settings, and documentation.

# 2.1.532
- **Asset Prepackage Installer Removal**:
  - **Complete Removal of Legacy Asset Pack Installer**: Fully removed `AssetPackInstaller` component, `assetPackInstaller.ts` server modules, installation API endpoints (`/api/assets/install-pack`, `/api/setup/assets`), and `assets:install` script.
  - **Asset Studio UI Streamlining**: Cleaned up `FullScreenAssetBrowser.tsx` and `AssetStudioSuite.tsx` to remove the obsolete "Packs & Bundles" tabs and focus purely on direct asset cataloging, sprite picking, custom sprite uploading, and grid slicing.
- **Version Bump**: Bumped release version to `v2.1.532` across all application layouts, headers, footers, settings, and documentation.

# 2.1.531
- **Asset Attribution Cleanup & Protective Open-Source Licensing**:
  - **Attribution & Legacy Reference Purge**: Completely purged all legacy external asset references, attributions, and schema artifacts (Tuxemon and LPC / Liberated Pixel Cup) across API routes, game actions, asset definitions, and wiki documentation. Standardized on the native **Saints Modular 2.5D Sprite System**.
  - **Business Source License 1.1 (BSL-1.1)**: Established the official repository `LICENSE` under BSL-1.1 with GioGimic / Saints Gaming Network as Licensor. Grants free usage for personal, non-commercial, educational, and community self-hosting while retaining exclusive protection over commercial distribution, hosted SaaS gaming networks, and proprietary assets.
- **Version Bump**: Bumped release version to `v2.1.531` across all application layouts, headers, footers, settings, and documentation.

# 2.1.530
- **AI-Crawler & LLM Discovery Architecture**:
  - **Plain-Text Descriptive README Optimization**: Re-authored `README.md` with plain-sentence opening statements explicitly defining project category (full-stack community management system combined with a 2.5D MMO engine), the problem solved (unifying fragmented gaming community tools into one platform), and the exact tech stack in plain text (Next.js 15, React 19, TypeScript, Prisma, Socket.io, Babylon.js).
  - **Dedicated Repository `llms.txt`**: Added a machine-readable, factual context index at `/llms.txt` summarizing frontend pipelines, Go realtime networking, database schemas, and Studio tooling in high-density paragraphs for language models and AI crawlers.
- **Version Bump**: Bumped release version to `v2.1.530` across all application layouts, headers, footers, settings, and documentation.

# 2.1.529
- **Repository SEO & Search Discovery Optimization**:
  - **Comprehensive Technical README**: Restructured and enriched the primary `README.md` with natural technical keywords, canonical repository references (`giogimic/SaintsGamingWeb`), framework badges (Next.js 15, React 19, TypeScript, Babylon.js WebGL, Go realtime engine, Prisma ORM), architecture matrix, and local quick start.
  - **Public Documentation Index Enhancement**: Enhanced `docs/README.md` with semantic category headings, deep wiki directory links, and cross-references to improve organic indexing on GitHub and external search engines.
- **Version Bump**: Bumped release version to `v2.1.529` across all application layouts, headers, footers, settings, and documentation.

# 2.1.528
- **The Nexus (Unified Operations Hub)**:
  - Combined News, Modpacks, and Dedicated Game Servers into a single unified operations hub (`/hub` - The Nexus) with responsive side-tab switching (`?tab=news|modpacks|servers`).
  - Added seamless backwards compatibility across `/news`, `/modpacks`, and `/servers` routes.
  - Consolidated top navigation bar to feature "The Nexus" (`/hub`).
- **Persistent Global Bottom Bar (`GlobalBottomBar`)**:
  - Implemented a persistent, frosted-glass (`sg-glass`) bottom bar across all platform layouts (`MainLayout` and `UcpLayout`).
  - **Website Mode Dynamics**: Displays live Saints Network status, online player counts, contextual route pill (`Reading Nexus`, `Browsing Forum`, `Command Center`), and social messenger trigger.
  - **Game Mode Dynamics (`/lobby`, `/studio`)**: Displays Game Name & Shard, real-time render FPS counter, ping latency, selected Saint status (Level, HP bar, credits pouch), and quick audio/fullscreen toggles.
  - **Developer Pop-Out Console (`permissionLevel >= 400`)**: Interactive slide-up console with client error stream interceptor, React & session state inspector, performance metrics (FPS, resolution, DPR), and quick dev actions.
  - **Moderator Drawer (`permissionLevel >= 200`)**: Fast moderation drawer with live presence and direct links to user directory and audit logs.
- **Lobby UI Modernization**:
  - Replaced noisy initial lobby header and duplicate footer with the website's unified Game-Mode Navbar and GlobalBottomBar.
  - Positioned Social Messenger drawer above the bottom bar across both web and in-game exploration.
- **Version Bump**: Bumped release version to `v2.1.528` across all application layouts, headers, footers, settings, and documentation.

# 2.1.527
- **Navbar Layout Refinement**:
  - Removed Wiki link from top Navbar and mobile navigation drawer (`NAV_ITEMS`) for a cleaner header layout, while keeping it accessible in the Footer Resources menu.
- **Version Bump**: Bumped release version to `v2.1.527` across all application layouts, headers, footers, settings, and documentation.

# 2.1.526
- **Fluid & Responsive Walking Movement Pipeline**:
  - **Tile-Chaining & Elimination of Dead Stops**: Upgraded the movement game loop in `GameCanvasBabylon.tsx` to seamlessly chain consecutive grid steps as long as movement keys are held, eliminating the 16–33ms dead stop hitches at tile boundaries.
  - **V-Sync Synchronized Auto-Walk (Click-to-Move)**: Replaced jittery `setInterval(..., 250)` path execution with frame-synchronized waypoint popping in the render loop.
  - **Camera Follow Smoothing**: Upgraded camera tracking (`lerpFactor: 0.35`) in `BabylonEngine.ts` to follow the player mesh tightly without elastic rubber-banding or parallax jitter.
  - **Walking Animation Continuity**: Fixed walk cycle `animTime` resetting so sprite walk cycles remain fluid and continuous between tiles.
  - **React Store Selector Isolation**: Isolated HUDs (`PlayerVitalsHud`, `inventory-overlay`, `equipment-overlay`, `GameChat`) with granular selectors to eliminate CPU/GC re-render spikes during walking.
- **In-Game Zoom Limiting**:
  - Limited in-game zoom range to ~60% of previous span (`ortho` range 5.5 to 13.5) to keep pixel art crisp and prevent excessive zoom-in / distant unrendered tile zoom-outs, while preserving full canvas fit/zoom range in Studio Editor mode.
- **Version Bump**: Bumped release version to `v2.1.526` across all platform layouts, navigation components, settings, and documentation.

# 2.1.525
- **Unified 3D Voxel Brand Logo in Footer**: Synchronized the Footer brand logo to use `<SGMicro3DLogo size={36} />` with hover transitions, ensuring complete aesthetic and visual identity consistency between the top Navbar, mobile navigation drawer, and Footer across the platform.
- **Version Bump**: Updated release version to `v2.1.525`.

# 2.1.524
- **Next.js Server Action Build Fix (`invalid-use-server-value`)**: Fixed Next.js build compilation error on Docker / production builds for `/admin/seo` by ensuring only async functions are exported from `"use server"` action modules (`actions.ts`), keeping internal constants encapsulated.
- **Admin Floating Window Underlay**: Enhanced `AdminOverlayShell` to render the user's active underlying page (`/`, `/forum`, `/news`, `/lobby`, etc.) directly behind the floating OS window in real time, supporting drag/resize transparency and minimize-to-dock capsule mode.
- **Version Bump**: Bumped project release version to `v2.1.524` across all application layouts, headers, footers, settings, and documentation.

# 2.1.523
- **Admin SEO Studio & Visual SERP Simulator**: Implemented a comprehensive, interactive Visual SEO Management Suite in the Admin Control Center (`/admin/seo`):
  - **Live Google SERP Simulator**: Pixel-accurate desktop and mobile Google search snippet preview with dynamic blue link titles, sitelinks bar, review star ratings, date stamps, and breadcrumb trails.
  - **Social Cards Preview**: Real-time interactive cards for Twitter / X (Large Image Summary) and OpenGraph Discord/Facebook embed previews with live domain badges and banner images.
  - **Dynamic Route Presets & Length Gauges**: Fast-switch archetypes (Home, Forums, News, Modpacks, Streams, The Lobby MMO, User Profile) with character & estimated pixel meters (~580px desktop title, ~960px mobile description) and focus keyword analyzer.
  - **Robots.txt Studio & AI Crawler Blocker**: Visual rule builder, AI scraping blocker matrix (GPTBot, ClaudeBot, PerplexityBot, CCBot, Google-Extended), live route path tester, copy/download, and dynamic Next.js `/robots.txt` generation.
  - **Sitemap.xml Explorer**: Real-time database inventory of indexed content (core static pages, published news, active modpacks, forum boards, threads, member profiles) with XML inspector and Search Console submission guides.
  - **Webmaster Verification Hub**: Google Search Console and Bing Webmaster Tools (`BingSiteAuth.xml`) token management, HTML/XML verification file generators, and dynamic Next.js `/BingSiteAuth.xml` route handler.
  - **Schema.org JSON-LD Visual Studio**: Structured data generator for `WebSite` (with Sitelinks SearchBox), `Organization`, `VideoGame`, and `FAQPage` rich snippet accordions with direct links to Google Rich Results Test.
  - **AI Discovery (`llms.txt`)**: Standardized machine-readable markdown context index for LLM search engines (Perplexity, ChatGPT Search, Gemini) with dynamic `/llms.txt` serving.
  - **Version Bump**: Consolidated release version bump to `v2.1.523` across the platform.

# 2.1.522
- **Repository Optimization & Dead Weight Purge**: Conducted a deep codebase audit to remove stale scripts, temporary debug files, and obsolete scratch files across the repository:
  - **Dead Script Removal**: Pruned 5 non-existent `saints-trail` scripts (`seed:saints-trail`, `smoke:saints-trail`, `smoke:saints-trail:play`, `visual:saints-trail`, `clone:saints-trail`) from `package.json`.
  - **New Discoverable Script Aliases**: Added official npm script aliases in `package.json` for existing verified test suites (`smoke:lobby`, `smoke:studio`, `seed:dialogue`).
  - **Root Throwaway File Purge**: Removed orphaned temporary test/migration files from workspace root (`check-npcs.js`, `debug-regex.js`, `test.js`, `tmp_diff.patch`, `refactor.js`, misplaced root `implementation_plan.md`).
  - **Scratch Directory Cleanup**: Cleaned out 68 historical one-off helper scripts from `scratch/` to maintain a pristine, lightweight repository baseline.
  - **Full Documentation & Version Synchronization**: Bumped release version to `v2.1.522` across `package.json`, `app/actions/settings.ts`, `app/(main)/admin/settings/page.tsx`, `app/(main)/layout.tsx`, `app/(ucp)/layout.tsx`, `src/shared/components/navbar.tsx`, `README.md`, and `docs/README.md`.

# 2.1.521
- **Immersive Mobile Messages Tab & Directory View**: Delivered a full-screen, mobile-optimized Messages Hub (`/profile/inbox`) for direct encrypted messaging and group chats on mobile devices:
  - **Mobile Stream / Messages Tab Switcher**: Added responsive pill tabs (`The Feed` vs `Messages` with live count) in the mobile stream header, fullscreen reel HUD, and reel top-bar.
  - **Full-Screen Mobile Conversations Hub**: Full-width contact directory with avatar preview, E2EE status, and group chat lists with real-time name & handle filtering.
  - **Edge-to-Edge Chat Screen on Mobile**: Dedicated conversation stage with mobile safe back navigation (`ArrowLeft` returning to conversation directory), E2EE session lock indicator, message timestamps, read receipts, and mobile-friendly message composition bar.
  - **Direct Reels-to-Messages Transition**: Embedded one-tap direct messaging triggers directly inside the mobile Reels swiper so users can jump straight to their conversations without losing context.

# 2.1.520
- **Mobile Auto-Open Full Reel Experience**: Automatically opens the immersive full-bleed vertical swiper on mobile devices (`window.innerWidth < 768px`) upon feed load, delivering an instant TikTok/Reels-style entry while remembering manual dismissals.
- **Dedicated Mobile HUD Bottom Bar & Real-time Scrubber**: Implemented a sleek glassmorphic HUD bottom dock (`bg-gradient-to-t from-black via-black/90 pb-safe`) inspired by TikTok, YouTube Shorts, and Reels:
  - **Interactive Playback Scrubber**: Real-time progress bar across the top of the HUD supporting tap and drag seeking with live time synchronization.
  - **In-Reel Feed Stream Switcher**: Direct tab pills (`For You`, `Following`, `Clips`) right in the HUD to switch streams without exiting full-screen mode.
  - **Quick Comment Pill Trigger**: One-tap `"Add comment..."` pill with emoji icon opening the comments drawer instantly.
  - **Stream/Grid View Switcher**: Instant exit button returning to standard card stream browsing.
- **Mobile Viewport Optimization**: Adjusted caption, audio stem tickers, and floating right action rail coordinates (`bottom-20`) to eliminate overlap with the bottom navigation bar and mobile home indicators.

# 2.1.519
- **Desktop Theater / Split-Screen Layout**: Eliminated the vertical constraint on desktop screens for widescreen (16:9) media, landscape attachments, and text posts. On screens $\ge$ `md`, the viewport expands into a responsive `max-w-6xl` theater layout where media/content plays on the left and a dedicated social & comments panel is docked seamlessly on the right.
- **True Monitor Fullscreen Mode**: Added a full-display toggle button and `F` / `f` keyboard shortcut utilizing the native browser Fullscreen API (`requestFullscreen` / `exitFullscreen`), allowing players to expand beyond the browser tab into an unobstructed, edge-to-edge monitor experience.
- **Seamless Video Auto-Advance**: Integrated automatic transition to the next clip or post upon video completion (`onEnded`), configurable via a persistent top-bar toggle button (saved in `localStorage`, default ON).
- **Configurable Story-Style Text Post Timer**: Introduced an automatic countdown timer for text posts and static image attachments defaulting to 20 seconds (user customizable: 5s, 10s, 15s, 20s, 30s, 45s, 60s), complete with an animated linear story progress bar and intelligent pause on hover or during comment writing.
- **Dedicated Desktop Live Comments Dock**: Docked author information, post text, live metrics (Like, Bookmark, Share), and a real-time scrollable replies feed directly beside the widescreen player with direct reply input.
- **Mobile Swiper & Portrait Mode Preservation**: Retained the full-bleed 100dvh vertical TikTok-style swipe experience on mobile devices and for 9:16 vertical clips on desktop.

# 2.1.518
- **HLS Adaptive Bitrate (ABR) Video Streaming Pipeline**: Re-engineered `videoPipeline.ts` (`LocalFfmpegProvider`) to transcode uploaded videos into true multi-rendition HLS packages (`master.m3u8`, `360p`, `720p`, `1080p`) alongside fast-start preview MP4 fallbacks and WebP poster snapshots.
- **Sub-100ms Time-to-First-Frame (`hls.js`)**: Integrated `hls.js` adaptive player engine across `FeedVideoPlayer.tsx` and full-screen `ShortsViewerModal.tsx` configured with `startLevel: 0` (instant lowest-bitrate chunk-0 startup), `capLevelToPlayerSize` (prevents oversized fetches on mobile), and Safari iOS native HLS streaming fallback (`application/vnd.apple.mpegurl`).
- **Deterministic Feed Segment Pre-warming (`hls-prewarm.ts`)**: Implemented adjacent media pre-warming utility that fetches the manifest and first `.ts` chunk (or initial 512KB MP4 byte-range) for adjacent feed cards directly into browser HTTP cache, eliminating buffering pauses during scrolling and Shorts navigation.
- **Server HLS Streaming & Differential Cache Control**: Configured custom `server.ts` static server with standard HLS/DASH MIME types (`.m3u8`, `.ts`, `.m4s`, `.mpd`), CORS support, fast playlist revalidation (`max-age=10`), and immutable long-term segment caching (`max-age=31536000, immutable`).
- **Universal Media Detection**: Updated video regex detectors across `the-feed.tsx`, `shorts-viewer-modal.tsx`, `mini-social-feed.tsx`, `ucp/social/page.tsx`, and `upload-client.ts` to seamlessly support `.m3u8` playlists alongside standard video extensions.

# 2.1.517
- **Studio Cursor Highlight & Selection Box Flicker Fix**: Resolved in-world reticle and selection box flickering during tile painting and mouse movement across the Studio canvas (`BabylonEngine.ts`).
- **Persistent Preview Mesh Recycling**: Replaced high-frequency `dispose()` and per-frame `MeshBuilder.CreatePlane` allocations in `renderBrushPreview`, `setSelectionPreview`, and `setActionPreview` with persistent, reusable meshes (`hoverReticleMesh`, `footprintSqMesh`, `patternPreviewMesh`, `selectionBoxMesh`, `actionPreviewBoundsMesh`), updating coordinates and visibility in-place without GPU buffer churn.
- **Analytical Ground Ray Projection Authority**: Added `pickTileFromGroundPlane` utilizing direct horizontal plane ray intersection ($Y=0$) as a bulletproof fallback in `pickTileAtScreenCoord`, `enableTilePicking`, and `emitFromScenePick`, eliminating raycast drops over polygon seams, entity billboards, and translucent overlays.
- **Stable Tile Picking Effect Lifecycle**: Decoupled Studio brush and view property synchronization (`setBrushRadius`, `setBrushShape`, `setActiveBrushTileId`, `setActiveBrushPattern`, `setActiveLayerIdx`, `setBrushMode`, `refreshBrushPreview`) into a dedicated lightweight effect in `GameCanvasBabylon.tsx`, preventing React effect teardown/re-mount and picking listener wipes during active paint strokes.
- **Cursor State Flapping Elimination**: Streamlined canvas style toggling in `updateBrushPreview` to prevent cursor style oscillation between `'none'` and `'default'` when hovering across map cells.

# 2.1.516
- **Pluggable Hybrid Video Processing Pipeline**: Implemented a modular video processing architecture (`src/server/media/videoPipeline.ts`) featuring `LocalFfmpegProvider` (powered by `ffmpeg-static`), concurrency control queue (limiting to 2 parallel encodes to protect CPU), `RedisWorkerProvider`, and optional `CloudflareStreamProvider` for cloud scalability.
- **FastStart MP4 & WebP Poster Generation**: Automatically optimizes uploaded clips by moving the MP4 `moov` atom to the beginning of the file (`+faststart`), generating lightweight 480p preview MP4s, 720p/1080p HD streamable files, and WebP poster snapshots (`thumb-*.webp`).
- **HTTP 206 Byte-Range Video Streaming**: Upgraded `server.ts` static `/uploads/` file handler to support full byte-range requests (`Accept-Ranges: bytes`, `206 Partial Content`, `Content-Range`), correct video MIME types (`.mp4`, `.webm`, `.mov`, `.m4v`, `.ogv`, `.mkv`), and long-term caching (`Cache-Control: public, max-age=31536000, immutable`), eliminating buffer stalls and enabling instant video seeking.
- **Base64 Database Bloat Elimination**: Replaced inline base64 data URLs in `SocialPost.thumbnailUrl` with compressed WebP poster uploads (`uploadVideoPosterFile`), reducing feed API payload sizes from 20-30MB down to clean lightweight JSON.
- **Reels & Shorts Viewer Redesign**: Re-engineered the fullscreen Shorts overlay (`the-feed.tsx`) to deliver an edge-to-edge 100dvh mobile canvas, centered 9:16 stage on desktop with dynamic color-reactive ambient blur, docked slide-out comments panel, multi-particle blooming heart burst animations, and live audio equalizer visualizers.
- **Clean Borderless Feed Media Styling**: Removed clunky outer borders and nested letterbox frames across feed video cards and media attachments for a sleek modern social feed appearance.

# 2.1.515
- **Brand Glyph Palette Synchronization**: Updated all SVG logo components and vector favicons (`app/icon.svg`, `public/favicon.svg`, `public/images/sg-logo.svg`, `sg-logo.tsx`, `sg-logo-voxel-svg.tsx`, `sg-logo-3d.tsx`) to render the 'S' letter in Hot Pink (`#E6007E`) and 'G' in Pure White (`#FFFFFF`) with crisp 3.5px black outlines.
- **Scratch & Test Asset Purge**: Removed temporary scripts and preview files generated during the SVG calibration process.
- **Landing Page Integrity**: Verified landing page (`app/page.tsx`) remains 100% untouched.

# 2.1.514
- **SVG Favicon Integration**: Generated site-wide vector SVG favicon assets (`app/icon.svg`, `public/favicon.svg`) with the 120° pixel hexagon and crisp white monogram glyphs.
- **Root Metadata Icons Support**: Configured standard `icons` metadata in `app/layout.tsx` (`favicon.svg`, `favicon.ico`, apple-touch-icon, and shortcuts) for high-DPI display tabs and mobile bookmarks.

# 2.1.513
- **Navbar Interactive Micro 3D Voxel Logo**: Integrated `SGMicro3DLogo` into the navigation bar and mobile drawer. Renders the exact 3D metallic voxel hexagon frame and 'SG' glyphs with real-time ambient lighting, point-light glow, continuous auto-rotation, and accelerated spin on hover.
- **Landing Page Protection**: Preserved the original landing page (`app/page.tsx`) untouched, isolating the micro-3D instance in a dedicated high-performance client component.

# 2.1.512
- **Studio Freeform Crop Stamping Fix**: Re-architected Slicer Mode in `TilesetPicker.tsx` to ensure unconstrained, pixel-accurate freeform dragging across custom tilesheets without premature grid-snapping.
- **Dynamic Footprint & Multi-Tile Pattern Generation**: Crops dynamically calculate the multi-tile bounding matrix (`spanW`, `spanH`), set the active GID pattern, activate `'footprint'` stamp mode, and enable 1-click painting onto active visual layers.
- **Extracted Library Tile Painting Pipeline Fix**: Solved tile activation when clicking extracted or preset tiles from the Tile Library. Automatically registers missing tilesets in map metadata, computes correct footprint matrices, switches to active visual paint layer (`activeLayerIdx`), and passes live map state to `BabylonEngine.ts` and `GameCanvasBabylon.tsx`.
- **Tilesheet Grid Calibration & Extraction Wizard**: Implemented the complete, interactive Grid Calibration modal featuring intelligent grid size suggestions (`suggestGridForImage` based on image dimensions and standard RPG power-of-two multiples), one-click preset buttons (`16×16`, `24×24`, `32×32`, `48×48`, `64×64`, `128×128`), fine-tuning inputs for width/height/spacing/offset, interactive canvas origin picking, real-time visual grid overlay with zoom controls, and instant "Extract All Tiles to Library" button.
- **Dynamic Batched Quad Mesh Creation**: Removed premature quad count guard in `BabylonEngine.ts` `patchBatchedTile`, ensuring batched meshes and textures are lazily created and updated smoothly even on newly created or sparsely populated maps.

# 2.1.511
- **Pixel Art SVG Logo Redesign**: Rebuilt the Saints Gaming SVG logo to faithfully match the brand's pixel-art hexagon and SG monogram design.
- **Hexagon Pixel Frame & Symmetry**: Implemented precise pixel-stepped hexagon borders featuring a pure white left half (`#FFFFFF`), hot pink right half (`#E6007E`), solid black divider apex squares (`#000000`), and crisp miter-joined black outlines.
- **Inverted Contrast SG Monogram**: Added centered blocky pixel-font 'S' (Hot Pink) and 'G' (Pure White) glyphs with sharp 90-degree orthogonal edges, 3.2px black strokes, and soft elevation drop shadow filters.
- **Universal Component & Asset Sync**: Updated `SGVoxelSvgLogo`, `SGLogo`, `SGLogo3D`, and generated `public/images/sg-logo.svg` for crisp rendering across all screen sizes (navbar 32px to 512px displays).

# 2.1.509
- **Studio Drag Selection & Stamp Restoration**: Completely restored click-and-drag multi-tile selection in both Grid Mode and Slicer Mode within `TilesetPicker.tsx`.
- **Zustand State Thrashing Elimination**: Moved live drag bounds tracking to lightweight local state and refs (`dragBoundsRef`), committing `selectTileRegion` atomically on pointer release to eliminate 60fps React re-renders and audio synth spam.
- **Slicer Mode React Batching Race Condition Fix**: Integrated `slicerSelectionRef` to capture exact pixel bounding rects synchronously on pointer move and pointer up, eliminating blank or zero-dimension slices caused by asynchronous React 19 state batching.
- **Babylon Multi-Tile Stamp Placement Fix**: Fixed `isFullFootprintPattern` check in `GameCanvasBabylon.tsx` to ensure multi-tile patterns paint their full W×H footprint seamlessly in standard Studio stamp mode.

# 2.1.508
- **Live Terminal Spinner & Real-Time Build Monitor**: Added interactive animated spinners (`run_with_spinner`), live elapsed timers, and real-time build step telemetry to `scripts/update.sh` and `scripts/cleanup-disk.sh`.
- **Zero Freeze Feedback**: Docker pruning operations (`docker builder prune`, `docker image prune`, `docker container prune`, `journalctl vacuum`) now run asynchronously with active spinner animations and explicit success confirmations upon completion.
- **Docker Compose Live Progress Ticker**: `docker compose build web` now displays a live status spinner and current build log snippet in the terminal instead of staying on a blank screen, plus outputs the last 25 lines of logs if any error occurs.

# 2.1.507
- **Ultra-Responsive Video Playback Engine**: Upgraded `FeedVideoPlayer.tsx` and `shorts-viewer-modal.tsx` with high-performance responsive playback controls matching top-tier video platforms (YouTube / TikTok).
- **Interactive Hover Scrubber & Timestamp Tooltip**: Hovering across the bottom scrub bar dynamically calculates mouse fractional position and renders a real-time timestamp preview pill (`0:24`) directly above the cursor.
- **Buffered Stream Indicator**: Added live video buffer monitoring (`video.buffered`) that displays a semi-transparent stream cache bar behind the played progress bar for immediate streaming feedback.
- **Picture-in-Picture (PiP) Integration**: Added one-click Picture-in-Picture mode (`P` shortcut or toolbar button) to both feed video players and Saints Reel modal, enabling uninterrupted video viewing while navigating forums, games, and UCP.
- **Playback Speed Selector & 2x Hold Acceleration**: Added selectable speed rates (`1x`, `1.25x`, `1.5x`, `2x`) plus YouTube/TikTok style press-and-hold anywhere on the video for instant `2x Speed` fast-forward with animated feedback.
- **Keyboard Shortcuts & 5s Skip Ripples**: Added complete keyboard support (`Space`/`K` play/pause, `M` mute, `J`/`←` rewind 5s, `L`/`→` forward 5s, `F` fullscreen reel) with animated `<< 5s` and `5s >>` ripple feedback chips on double-tapping the left/right edges.
- **Smooth Volume Slider**: Added expanding horizontal volume slider on desktop hover with persistent `localStorage` volume levels.
- **Scroll Hysteresis & Debounce**: Implemented a 120ms scroll debounce on the `IntersectionObserver` viewport coordinator, ensuring silky 60fps feed scrolling without audio/decoder contention during fast scrolling.

# 2.1.506
- **Admin Dashboard Zero-Blur Floating Window Overhaul**: Configured the Admin OS shell to load directly as a crystal-clear floating window over the user's active page with zero background blur (`backdrop-blur-none` / subtle transparent backdrop), ensuring the underlying website remains fully visible and interactive.
- **Top-Level Category Tabs Navigation**: Removed the fixed left sidebar and mobile drawer to give 100% of the window width to the workspace. Added top-level horizontal category tabs (**Overview**, **World & MMO**, **Community**, **Identity & Roles**, **Infrastructure**, **Developer**, plus **Favorites**) with active route syncing and category indicators.
- **Interactive Module Sub-Navigation Bar**: Added a horizontal module sub-bar directly beneath the category tabs featuring instant module chips, live route active styling, badges, and quick-pin favorite toggles.
- **Repositioned Header Search with Live Dropdown Palette**: Relocated the search bar to the center of the top window header featuring a `/` and `Ctrl+K` global keyboard shortcut, clear button, and an instant floating dropdown search palette with categorized search results and arrow/click navigation.

# 2.1.505
- **Automatic Video Frame Poster Generation & Custom Cover System**: Implemented instant client-side video frame capture (`captureVideoFrame`) and memory poster cache (`video-thumbnail.ts`) that extracts a crisp screenshot at 0.5s into videos, eliminating blank/black loading states across all feeds, reels, and video embeds (YouTube / TikTok style).
- **Post Composer Video Cover Studio**: Added an interactive video thumbnail manager in the social feed post composer. Uploaded clips automatically generate and display a default frame snapshot preview with options to capture frames at the current playback position or upload a custom cover image (`thumbnailUrl`).
- **Feed Video Player Screenshot Overlay & Floating Badge**: Enhanced `FeedVideoPlayer.tsx` with instant poster rendering, smooth crossfade to active playback, and a sleek floating center play button pill and duration timestamp badges when paused.
- **Database & Model Alignment**: Added `thumbnailUrl` to the `SocialPost` Prisma schema, database migrations, server action pipelines (`createSocialPost`), and feed querying APIs (`getTheFeed`, `getMiniFeed`, `searchFeed`).

# 2.1.504
- **Automated Docker & Server Disk Cleanup Script**: Created `scripts/cleanup-disk.sh` (and `npm run clean:disk`) to prune Docker BuildKit build cache (`docker builder prune -a -f`), dangling images (`docker image prune -f`), stopped containers, unused networks, vacuum systemd journal logs to 100MB, truncate build logs, and prune database backups older than 7 days.
- **Proactive Update Disk Space Guard**: Enhanced `scripts/update.sh` to automatically check free space before `git fetch` (< 5GB free triggers automated pruning) and automatically prune dangling layers and excessive build cache before and after Docker container rebuilds, preventing "No space left on device" crashes.

# 2.1.503
- **Seamless Video Playback & Zero-Black-Screen Overhaul**: Eliminated black video preview screens across the social feed and video player by implementing automatic `#t=0.001` media fragment decoding, smooth skeleton shimmer state, and opacity crossfade upon video data availability.
- **Dedicated High-Performance FeedVideoPlayer**: Created `FeedVideoPlayer.tsx` featuring dynamic aspect ratio adaptation (9:16 portrait, 16:9 widescreen, 4:5 social), ambient blurred glow backdrop matching video content, strict viewport-centered auto-play/auto-pause (`IntersectionObserver`), interactive scrub bar, timestamp badges, tap-to-pause with central pop icon animation, and double-tap heart animations with floating particle bursts.
- **Feed-Wide Sound Coordinator**: Unmuting any video in the feed persists across the browsing session (`localStorage`), allowing seamless audio playback while scrolling without needing to unmute each individual video.
- **Adjacent Shorts Preloading**: Added background video prefetching (`preload="auto"`) in the Saints Reel / Shorts viewer for adjacent items (`currentIndex - 1` and `currentIndex + 1`), providing instant zero-lag scrolling between reels with zero buffer delay or black flashing.
- **Integrated Social Timeline Redesign**: Transformed the social feed from disconnected chunky boxed cards into a fluid, cohesive social timeline stream (Twitter/X and Threads style) featuring unified hairline dividers, avatar gutter with vertical thread connector rails for nested replies, and streamlined interactive action bars.
- **Stream Selector Navigation Tabs**: Added top stream tabs (**For You**, **Clips & Reels**, **Hot & Trending**) to quickly switch between algorithmic discovery, media-only clips, and trending posts.

# 2.1.502
- **Grid Mode & Freeform Crop Selection Engine Overhaul**: Fully restored seamless click and drag selection in both Grid Mode and Freeform Crop (Slicer) mode within `TilesetPicker.tsx`.
- **Image Dimension Fallbacks & Cached Sync**: Added automatic natural dimension detection and image ref caching fallback (`imgRef.current?.naturalWidth` / `ts.imagewidth`) so pointer down, move, and drag calculations never block on zero dimensions.
- **Live Drag Updates & Stamp Commitment**: Re-enabled live multi-tile pattern updates during dragging in Grid Mode, ensuring HUD preview, Babylon brush reticle, and committed selection state update in real-time.
- **Freeform Crop Auto-Snapping & Stamp Activation**: Freeform Crop single-clicks now cleanly snap to the clicked tile, while dragged regions automatically compute and activate covered tile patterns for immediate stamping onto the canvas.
- **Pattern Preservation**: Updated `TileSelectorPanel.tsx`'s `handleBrushSelect` to preserve multi-tile patterns when selecting brush GIDs (`keepPattern = true`).

# 2.1.501
- **Admin Dashboard Studio-Style Window Shell**: Transformed the website's Admin Dashboard from a static, full-screen lock into an authentic, floating, draggable, resizable, minimizable, and maximizable Studio Window OS.
- **Window Controls & Multitasking**: Added GPU-accelerated dragging, bottom/corner resizing, double-click collapse/expand, full-screen maximize/restore, and background backdrop modes (Cinematic Dim, Frosted Glass, and Transparent Passthrough).
- **Floating Minimized Admin Dock Capsule**: Added a floating bottom dock pill that collapses the admin console so administrators can freely browse and interact with the website while keeping admin tools one click away.
- **Collapsible Sidebar & Tactile Audio**: Added compact icon rail sidebar toggle, live geometry and socket telemetries in the status footer, and tactile audio feedback with `soundSynth.playUiClick()`.

# 2.1.500
- **Studio Tileset Drag-Selection Restoration & Pointer Engine Overhaul**: Fixed a regression where `TileSelectorPanel.tsx`'s `handleBrushSelect` was clearing multi-tile patterns via `setActiveBrushPattern(null)`. Added dedicated element-level `handlePointerMove` on `TilesetPicker.tsx` and separated live dragging bounding box rendering from single-event release commitment, restoring seamless multi-tile click-and-drag selection in the Studio Tileset Picker.

# 2.1.499
- **Home Page Hero Button Cleanup**: Removed the redundant "Play " prefix from the main hero game CTA in `app/(main)/home/page.tsx`, displaying the clean realm name directly (`{realmName}`).
- **Eliminated Black-on-Black Muddy Text on Buttons**: Updated button exclusion rules in `app/globals.css` so buttons, badges, and dark-text elements (`text-black`, `text-slate-950`, `text-zinc-950`) never inherit text-shadows, ensuring ultra-crisp contrast on bright gradients.
- **Navbar Lobby Button Hover Contrast**: Refined navbar lobby hover style in `src/shared/components/navbar.tsx` with clean `hover:text-slate-950` contrast.

# 2.1.498
- **High-Contrast Text Readability & Crisp Black Outline**: Added global crisp black text outline and readability shadows in `app/globals.css` across all headings (`h1`–`h6`), body paragraphs (`p`), spans, links, labels, and lists. Text now renders with maximum clarity and contrast across all lighter regions of the ambient tropical sunset background, glowing sun orb, and dynamic atmospheric overlays.
- **Gradient Text Drop-Shadow & Exclusion Filters**: Enhanced `.sg-text-gradient` with multi-stop dark drop-shadow filters preserving background-clip shine while ensuring clean legibility against bright backgrounds. Excluded form inputs, textareas, and code blocks from text shadowing.
- **Text Outline Utilities**: Introduced reusable `.sg-text-outline` (thin crisp 4-directional outline), `.sg-text-outline-thick`, and `.sg-text-shadow` utility classes.

# 2.1.497
- **Tile Selection Model & Drag Commitment Fix**: Added `dragBoundsRef` and window-level pointer capture in `TilesetPicker.tsx`. Dragging across tiles now reliably commits the full multi-tile rectangular selection region (`w × h`) upon mouse release without falling victim to stale React closures or missed pointer up events.
- **Decoupled Selection from Placement (Operation A vs Operation B)**: Unified multi-tile pattern placement in `GameCanvasBabylon.tsx` and `editor-store.ts`. Selection represents neutral source dimensions (`{ w, h, gids }`), while placement cleanly distinguishes between Operation A (Stamp as 1 Tile, scaled) and Operation B (Paste as Region at native multi-tile footprint).
- **Authoritative WorldAtlas Persistence**: Removed unintended fallback conditions in `app/api/world/atlas/route.ts` so saved WorldAtlas data in Prisma is authoritative and never overwritten by default `SiteSetting` fallbacks.
- **Direct Map List & Atlas Navigation**: Connected the Map Browser button directly to `MapListPanel` (`openPanel('maps')`) in both `StudioMenuBar.tsx` and `StudioBottomToolbar.tsx`, while keeping the 20x20 spatial grid accessible under World Atlas (`openPanel('atlas')`).
- **Studio Map Canvas Viewport Controls**: Enhanced `StudioCanvasViewport.tsx` with centered initial dimensions, maximize/restore toggle button, and header double-click maximize/restore support.
- **Studio Startup Loading Polish**: Cleaned up initialization overlays in `StudioEditorShell.tsx` with smooth backdrop blur and progress indicators.

# 2.1.496
- **Unified Main Website Background with Studio & Landing Page Theme**: Updated `AmbientBackground` (`src/shared/components/ambient-background.tsx`) to render `MidnightTropicalBackground` across all main website pages (`/home`, `/news`, `/forum`, `/servers`, `/modpacks`, `/streams`, `/wiki`, `/user/*`, `/profile/*`, `/ucp/*`, etc.). Replaced the legacy 3-orb floater animation with the high-fidelity tropical sunset and midnight sky atmosphere, twinkling stars, water reflections, silhouetted palm framing, pixel atmospheric particles, and dynamic theme color grading (Light Sunset, Vice Dusk, and Midnight Dark), while keeping the standalone Landing Page (`app/page.tsx`), Studio (`/studio`), and In-Game Lobby (`/lobby`) backgrounds intact.

# 2.1.495
- **Comprehensive 7-System Studio Audit & Full Frontend Unification**: Mounted all 10 unmounted/headless studio panels into `StudioEditorShell.tsx` (`DungeonEditorPanel`, `GameplayStudioPanels`, `MountEditorPanel`, `PublishManagerPanel`, `RecipeEditorPanel`, `ShopEditorPanel`, `SimulationPresetPanel`, `StreamingInspectorPanel`, `WorldEventPanel`, `AnimationStudioPanel`).
- **Studio Menu Bar Categorization**: Expanded the `Windows` dropdown in `StudioMenuBar.tsx` into clean organized categories (World & Art, Entities & Encounters, Quests & Story, Economy & Crafting, Dungeons & Raids, Live Ops & Diagnostics) ensuring every studio tool has a direct front-end trigger.
- **Studio Favorites Strip Wiring**: Connected bookmark clicks in `StudioFavoritesStrip.tsx` to instantly open corresponding docks or load maps.
- **Animation Studio Dock & Permissions Integration**: Added `animations` dock definition to `studioModes.ts`, `studioPermissions.ts`, and `editor-store.ts`.

# 2.1.494
- **Fixed Tile Library Persistence & Extraction Display**: Fixed an issue where `loadTileLibrary` re-executed on state change and overwrote extracted custom tiles with default presets. Moved `tileDefinitions` into the global `useEditorStore` and updated all extraction handlers (`handleExtractTilesFromActiveSheet`, `handleSlicerQuickExtract`, `handleSaveAsTileDefinition`, `handleLoadStarterPresets`) to append to store and clear search/tag filters so new custom tiles show up immediately in the Library view.

# 2.1.493
- **Fixed React Error #310 (Hook Order Violation in DraggablePanel)**: Fixed an unconditional hook declaration order in `DraggablePanel.tsx` where `useCallback` was placed after an early return, ensuring uniform hook execution across renders when opening/closing Studio panels.

# 2.1.492
- **Pixel-Precise Freeform Slicer Selection & Full Sheet Extraction**: Removed initial grid-snapping on freeform slicer drag to enable sub-pixel selection accuracy. Upgraded sheet extraction from fixed 4×4 bounds to full-sheet tile extraction (up to 128 tiles) with exact offset and spacing preservation into the Tile Library.
- **2D-to-3D Item Rendering Subsystem (`ItemBillboardRenderer`)**: Created an optimized 3D billboard item rendering engine supporting upright Y-axis billboard alignment, Minecraft-style floating/bobbing animations, 3D spin rotation, and ground glow rings.
- **DraggablePanel Cleanup & Performance Upgrade**: Compacted panel title bars from 40px to 24px with tooltip summaries, added double-click header collapse, and replaced state-driven drag with GPU-composited CSS transforms eliminating up to 60 React re-renders per second.
- **3D Camera Control Upgrade**: Implemented smooth momentum and inertia damping on orbit and pan, multiplicative smooth zoom easing, keyboard orbit shortcuts (Q/E orbit, R/F pitch, Numpad 1/3/7 views), and double-click ground focus.
- **Studio UI Micro-Animations**: Added active tool glow pulses and tactile button scaling across the bottom editor toolbar.

# 2.1.491
- **Exact Map Traversal & Gate Spawn Transitions**: Fixed player spawn positioning when traversing map boundaries and stepping into gates. Border traversal (North, South, East, West) now preserves the player's exact entering coordinate, and physical gates compute relative offsets correctly without defaulting to fixed coordinates.
- **Eliminated Studio Canvas & Selection Flickering during Painting**: Removed `loadTilemap` geometry teardown from pattern paint and prefab stamping loops. Tile changes now update exclusively via in-place GPU vertex buffer patching (`engine.updateSingleTile`), delivering 60 FPS smooth, flicker-free painting.
- **Enhanced Slicer Extraction & Direct Library Integration**: Added an instant **Extract to Library** action in the Freeform Slicer toolbar and updated sheet extraction to automatically switch to the Library tab and select newly extracted custom tiles ready for painting. Added **Extract to Stamp** in the canvas right-click context menu.

# 2.1.490
- **Fixed Tileset GID Overflow & Cross-Sheet Stamp Bleed**: Replaced legacy tight firstgid gaps (256..1000) with a safe 100,000 GID stride (`TILESET_GID_STRIDE = 100000`). Large multi-tile selections and crops extending deep into large tileset sheets no longer overflow into adjacent tilesets or render incorrect textures on the map canvas.
- **Automated Map Tileset GID Normalization**: Added `normalizeTilesetGids` in `studioTilesetBootstrap.ts` to automatically re-space map tilesets and cleanly remap existing layer grid cells without losing visual artwork or corrupting tileset mappings.
- **Updated Tileset Calculations & Seed Presets**: Updated `calculateNextFirstGid` in `tilesetCalculations.ts`, `DEFAULT_STUDIO_TILESETS` in `demoMapSeed.ts`, and `TilesetPicker.tsx` to uniformly enforce 100k stride.

# 2.1.489
- **Fixed Unexpected Tileset Tab Switching on Large Selections**: Added internal selection tracking (`isInternalSelectionRef`) and bounded tileset range verification in `TilesetPicker.tsx`. Selecting or dragging large multi-tile regions, crops, or high-index tiles no longer triggers unwanted tab switching to other tilesets.
- **Multi-Scale Multi-Tile Stamping (`stampScale`)**: Added full multi-scale stamping capabilities (`0.25x`, `0.5x`, `1x`, `2x`, etc.) across `editor-store.ts`, `GameCanvasBabylon.tsx`, and `BabylonEngine.ts`. Enables pasting large areas (e.g. 800×800 px) directly onto smaller scenes (e.g. 400×400 px) with sub-sampled pixel accuracy.
- **Stamp Scale Selectors in Toolbar & Slicer Action Bar**: Added instant Stamp Scale buttons in both `StudioBottomToolbar.tsx` and the `TilesetPicker.tsx` Freeform Slicer crop bar with live hover reticle and footprint dimension synchronization.

# 2.1.488
- **Tileset Offset & Spacing Synchronization in Babylon Engine**: Updated `tilesetUvForGid` and `estimateTilesetRows` in `tileBatchHelpers.ts` to fully incorporate `ts.offsetX`, `ts.offsetY`, `ts.spacing`, and natural image dimensions. Eliminates all coordinate drift between the Tile Selector / Freeform Slicer preview and the in-game canvas stamp.
- **Tileset Offsets Persistence & Dedicated Save Offsets Button**: Added a prominent **Save Offsets** button in `TilesetPicker.tsx` that commits grid alignments directly to `WorldMap.tilesetsData` and marks the map dirty. Added direct number inputs for Offset X and Offset Y for pixel-exact calibration.
- **Dynamic Dimension Registry & Live Babylon Mesh Refresh**: Enhanced `TilesetPicker` image loader to register natural texture dimensions into `TILESET_SIZES` upon sheet load and reload active Babylon tilemap meshes immediately whenever grid calibrations change.

# 2.1.487
- **Expanded LongText Mapping for SiteSetting & All System JSON**: Added `@db.LongText` mapping for `SiteSetting.value` and 40+ serialized JSON and content columns in `prepare-prisma.js` and `schema.prisma`. Resolves Prisma `P2000: The provided value for the column is too long for the column's type. Column: value` on MariaDB/MySQL.

# 2.1.486
- **Expanded LongText Support for GameCharacter & JSON Data**: Added `@db.LongText` mapping for `GameCharacter.stateData`, `visualData`, and all game engine JSON fields in `prepare-prisma.js` and `schema.prisma`. Resolves Prisma `P2000: The provided value for the column is too long for the column's type. Column: stateData` migration error on MariaDB/MySQL.

# 2.1.485
- **Zero-Dependency Dynamic Prisma Adapter**: Replaced `dotenv` dependency in `scripts/prepare-prisma.js` with pure native Node.js environment resolution, ensuring Docker/production web containers seamlessly adapt schema datasource providers to MariaDB/MySQL without runtime module missing crashes.

# 2.1.484
- **Fixed Slicer Multi-Tile Stamping & Bounding Box Calculation**: Resolved issue where "Stamp Multi-Tile" and "Stamp 1-Tile" both evaluated to 1 single tile. Updated `TilesetPicker.tsx` to accurately calculate normalized coordinate bounds (`minX`, `minY`, `maxX`, `maxY`) across any drag direction, properly slice the full 2D grid matrix of GIDs (`spanW × spanH`), and seamlessly switch `prefabStampMode` to `'footprint'` in `editor-store.ts`.
- **In-World Multi-Tile Reticle & Live Preview Synchronization**: Enhanced `GameCanvasBabylon.tsx` and `BabylonEngine.ts` to immediately refresh hover reticles upon brush pattern changes, and added `createMultiTileReticleMaterial` rendering crisp multi-cell grid lines with neon cyber brackets for multi-tile stamps.
- **Fixed Prisma LongText Column Length Error in Auto-Prefab**: Updated `MapPrefab.visualData` and `MapPrefab.logicData` in `prisma/schema.prisma` to `@db.LongText` and added columns to `scripts/prepare-prisma.js`, resolving MySQL/SQLite `Value too long for column: visualData` errors when creating custom stamps and prefabs of any size.

# 2.1.483
- **Synchronized Active Layer Switching with Studio Mode & Tool Panels**: Changing the active painting layer in World Builder (or across editor panels) now acts identically to the mode buttons:
  - Selecting a **Visual Layer** (`Layer 0`, `Layer 1`, etc.) automatically switches to **Paint Mode** (`develop`), opens and brings to front the **Tile Selector** dock, and closes the Logic Painter.
  - Selecting the **Logic Layer** (`Logic (−1)`) automatically switches to **Logic Mode** (`logic`), opens and brings to front the **Logic Painter** dock, and closes the Tile Selector.
- **Enhanced World Builder & Tileset Layer Quick Toggles**: Updated `WorldBuilderPanel.tsx` layer buttons and `TilesetPicker.tsx` with dedicated, high-contrast layer switchers and instant tool switching feedback. Added visual paint mode toggle to `LogicPainterPanel.tsx`.

# 2.1.482
- **Tile Selector Multi-Tile Click & Drag Selection Fix**: Resolved issue where multi-tile brush patterns were wiped immediately upon drag completion. Corrected store pattern synchronization in `editor-store.ts` (`setActiveBrushTileId` and `setActiveBrushPattern`) and added HTML5 `setPointerCapture` with persistent window-level pointer tracking in `TilesetPicker.tsx` to ensure drag selections smoothly commit multi-tile brush stamps (`2×2`, `3×3`, `W×H`) to the Babylon painting engine.
- **Redesigned Tile Library with Visual Pixel Thumbnails & Inspector**: Overhauled the Tile Library dock with `TileVisualThumbnail` components rendering crisp, pixelated previews for every saved tile card. Resolved single-card highlight tracking (`selectedTileDefId`) so selecting a tile highlights only that item rather than all tiles sharing GID 1.
- **Live Tile Preview Inspector & Quick Actions**: Added a prominent Live Preview Inspector banner at the top of the Tile Library displaying a 4x magnified preview of the selected tile, collision badges (`SOLID`, `WATER`, `LEDGE`, `PASSABLE`), material chips, dimensions, tags, and one-click quick actions (`Use as Brush`, `Fill Active Layer`, `Set Ground`, `Delete`).
- **Starter Presets & Automatic Sheet Tile Extraction**: Added curated starter terrain presets (Lush Grass, Dirt Path, Cobblestone, Fortress Wall, Cabin Wood, Water Pool, Rocky Ledge) and a 1-click **Extract Sheet** tool to automatically extract and register tiles from the active tileset sheet directly into the library.
- **Save Tile Modal Live Preview**: Added real-time cropped visual preview thumbnails to the "Save Tile to Library" modal so creators can verify the exact sprite area being saved.

# 2.1.481
- **Tile Selector Smooth Drag & Scale Changing**: Upgraded `TilesetPicker` with window-level pointer event listeners (`pointermove` & `pointerup`), ensuring multi-tile drag selections never lose focus or drop when moving outside bounds. Added dedicated Brush Scale buttons (`1×1`, `2×2`, `3×3`, `4×4`) and quick scale modifiers directly to the Tile Selector panel.
- **Precision Grid Alignment & Offset Adjustments**: Added inline Grid Offset X and Offset Y adjustments (pixel steppers `[-]`/`[+]`, arrow nudges `←`, `→`, `↑`, `↓`, and Spacing/Margin controls) directly above the preview sheet. Added one-click **Align Grid** origin calibration and Reset alignment to instantly align custom or non-standard sheets with the visible grid overlay.
- **Dynamic Database Preparation & Prisma Slicing Fix**: Reintroduced `scripts/prepare-prisma.js` in `package.json` setup to dynamically configure `prisma/schema.prisma` for SQLite when local `file:` paths are used and MySQL in production. Resolved foreign-key lookup and permission errors in `/api/assets/slice` and `savePrefab` so saving slices, stamps, and tile definitions never crashes.
- **Mundane & User-Friendly Language**: Replaced hyperbolic jargon across `TilesetPicker`, `TileSelectorPanel`, and `StudioBottomToolbar` with clear, plain terminology (e.g. *Crop Box*, *Selection Box*, *Selected Tile*, *Align Grid*, *Save Tile*, *Save as Stamp*, *1-Tile Brush*, *Multi-Tile Stamp*, *Collision Layer*).
# 2.1.480
- **The Feed Upload Engine & Real-Time Progress Bar**: Built `uploadSocialFileWithProgress` utility (`src/web/lib/upload-client.ts`) utilizing `XMLHttpRequest` upload event streams. Displays real-time upload progress, percentage, transfer speed (`MB/s` / `KB/s`), uploaded/total size (`MB / MB`), and estimated time remaining (ETA) with stage transitions (`Uploading` → `Processing Media on Server` → `Attached`).
- **Cyberpunk Neon Upload Progress Card (`UploadProgressBar`)**: Integrated rich visual upload progress cards into both the main Feed post composer and inline reply composer with glowing neon progress bars, file type badges, and instantaneous one-click `[ ✕ Cancel Upload ]` buttons.
- **Resilient MIME & Extension Detection**: Added `inferMimeType` in `src/web/lib/upload.ts` to automatically infer MIME types for files with missing browser types or generic `application/octet-stream` headers on Windows and various browsers (`.mp4`, `.webm`, `.mov`, `.mkv`, `.ogg`, `.png`, `.jpg`, `.zip`, `.rar`, etc.).
- **Enhanced Magic Byte Validation & Extended Upload Timeouts**: Expanded `validateMagicBytes` to support modern container atom variants (`ftyp`, `moov`, `mdat`, `wide`, `skip`, `EBML`) and configured `maxDuration = 300` on `/api/upload/social` to eliminate timeout errors on large high-resolution video uploads.
- **Robust Video Playback & Error Fallback**: Upgraded `FeedInlineVideo` and `VideoPlayer` with smooth bottom timeline progress bars, time displays (`0:15 / 1:20`), explicit `muted` initialization for reliable browser autoplay, safe `play()` promise handling to prevent unhandled `NotAllowedError`/`AbortError` exceptions, and interactive fallback cards for unplayable codecs.
- **Query Parameter-Safe URL Matchers**: Fixed `isVideo` and `isArchive` regex matchers to properly detect video and archive extensions when query strings, S3 presigned signatures, or URL hashes are present.
# 2.1.479
- **Gate & Map Connection Interaction Redesign**: Removed legacy gate logic tile painting. The connection point itself is now the gate entity, defined with physical entrance bounds (`width × height`).
- **Contextual Gate Connection Options**: Replaced legacy directional options (North, South, East, West) with contextually meaningful connection categories: `🗺️ To World Map`, `🏰 Dungeon Entrance`, `⚔️ Raid Entrance`, `🏠 Interior / Building`, `🌌 Instance Realm`, `🎉 Event Gate`, `🌀 Mystic Portal`, and `✨ Custom Warp`.
- **Two-Ended Paired Gate Creation Wizard**: Added `GateConnectModal` and `DestinationPlacementHUD`. Selecting a destination map automatically switches the editor to the target map in a guided placement state. Clicking any tile commits the arrival entrance, automatically pairs both maps bidirectionally with matching dimensions, and seamlessly returns the creator to the origin map with automatic saving.
- **Physical Entrance Footprint & Bounding Box Step Collision**: Upgraded `StudioWarpGate` and `NormalizedGate` data structures with `width` and `height`. Updated `WorldSimulation` so stepping anywhere within the gate's physical multi-cell footprint triggers the warp transition.
- **Babylon Gate Overlay Footprints**: Updated `BabylonEngine` and `authorOverlays` to render viewport gate markers matching their exact physical width and height dimensions in world space.
- **Removed Gate Logic Painting**: Filtered out `gate_*` from `LogicTagPalette` and `PropertiesPanel` components, ensuring gates are treated strictly as physical world connections.
# 2.1.478
- **Dual Selection Architecture (Grid Snap vs Freeform Visual Slicer)**: Added a dedicated mode toggle (`[ ⊞ Grid Snap ]` ↔ `[ ✂ Visual Slicer ]`) in TilesetPicker. Creators can now slice reference sheets and concept art seamlessly.
- **One-Click Origin Calibration Tool**: Added the `🎯 Calibrate Origin` tool. Clicking any swatch or tile on a sheet instantly aligns `offsetX` and `offsetY` to that coordinate, snapping grid lines to art regardless of headers, banners, or padding.
- **Visual Slicer HUD & Instant Prefab Creation**: Dragging in Slicer Mode renders an elastic Cyber Neon marquee (`W×H px`) and a floating HUD with 1-click actions: `Stamp 1-Tile` (fits slice to 1 single tile cell), `Stamp Multi-Tile` (stamps natural N×M footprint), `Auto-Prefab` (creates a stampable prefab), and `Save Def` (registers in Tile Library).
- **Prefab Stamping Fit Options (1-Tile Fit vs Multi-Tile Footprint)**: Added `prefabStampMode` (`1-Tile Fit` vs `Full Footprint`) in `editor-store.ts`, `StudioBottomToolbar`, and `GameCanvasBabylon`, allowing multi-tile patterns and prefabs to be stamped into a single 1×1 cell or across their full multi-cell footprint.
- **Non-Zero Origin WebGL Batching**: Extended `tileBatchHelpers.ts` with `margin`, `spacing`, `offsetX`, and `offsetY` so non-standard sheets render properly in WebGL tile batching.
# 2.1.477
- **Pointer-Captured Tileset Drag Selection**: Stabilized tile selection callbacks with useCallback in TileSelectorPanel and upgraded TilesetPicker to HTML5 pointer events with setPointerCapture, eliminating event teardown during multi-tile dragging.
- **Three-Layer Interaction Model (WHAT/HOW/WHERE)**: Integrated canvas selection masking in GameCanvasBabylon, ensuring all brush, erase, and pattern strokes are clipped to active selectedCells without destroying selections on tool change.
- **Unified Clean Highlighting**: Removed overlapping single-tile hover reticles during pattern stamps, rendered unified multi-cell footprint borders, and added Escape/Ctrl+D deselect shortcuts.
# 2.1.476
- **Live Tile Selector Dragging**: Added dragStartRef and live synchronous selectTileRegion updates during dragging in TilesetPicker so multi-tile pattern selections update continuously and never get dropped.
- **Studio FreeCam 3D Orbit & Zoom**: Wired isStudioFreeCam to BabylonEngine, enabling 3D camera rotation and pitch on Middle-click/Right-click drag, Space+drag/Shift+drag for panning, and scroll wheel zoom.
- **Modern Cyber Glass HUD Reticles**: Redesigned in-world brush hover and footprint highlights with a sleek DynamicTexture featuring glowing corner L-brackets, subtle ambient glass fill, and high-contrast precision borders.
# 2.1.475
- **High-Contrast Dual-Outline Hover Reticles**: Added a crisp dark outer outline border enclosing a vibrant glowing sky-cyan core for single tiles, multi-tile pattern footprints, and multi-cell brush footprints in BabylonEngine and TilesetPicker, making reticles clearly visible on all terrain types and zoom levels.
- **Brush Shape Selection (Circle vs. Square)**: Added rushShape toggle to useEditorStore, StudioBottomToolbar, and BabylonEngine so creators can switch between round (euclidean) and square (box) brush painting.
# 2.1.474
- **Tile Selector Drag-Selection Fix**: Added e.preventDefault() and e.stopPropagation() to TilesetPicker on handleMouseDown to eliminate HTML5 native browser ghost image dragging, removed premature pattern resets from handleBrushSelect, and added live dynamic amber bounding box previews while dragging multi-tile patterns.
# 2.1.473
- **Studio Paint Mode vs. Logic Mode Switcher**: Added dedicated Paint and Logic segmented mode buttons to the Studio top bar, opening the Tile Selector (Tileset Picker) in Paint Mode and the Logic Painter dock in Logic Mode.
- **Logic Mode Brush Scaling**: Fixed brush footprint and hover indicator altitudes (y = 0.51 /  .52) in BabylonEngine so multi-tile brush radius scaling (1, 3, 5, 7) is visible above logic overlay planes and paints multi-cell logic tags.
# 2.1.472
- **Seamless Atlas Transitions**: Fixed north/south edge transitions by syncing 
odeConnections in WorldState, resetting worldOriginOffset on map change, and snapping the camera directly to destination coordinates.
- **Neighbor Chunk Rendering**: Fixed map hydration effect in GameCanvasBabylon to supply loaded neighbor chunks and connections to BabylonEngine loadTilemap.
# 2.1.471
- **Tile Selector Drag-Selection**: Fixed premature cancellation of multi-tile selection on mouse leave.
- **Canvas Rendering Performance**: Memoized brush preview pick checks and 3D mesh updates in BabylonEngine, eliminating stutter and redundant state dispatches during cursor movement.
- **Brush Sizing**: Fixed 1x1 pattern override in TilesetPicker so that brush radius scaling (sizes 1, 3, 5, 7) applies cleanly. Defaulted initial editor brush radius to 1.
# 2.1.470
- Permanently removed SQLite fallback support. Saints Gaming is now exclusively a MySQL/MariaDB project to prevent schema discrepancies and column length limits on large data stores (like World Atlas).
- Removed DatabaseMigration settings page since SQLite is deprecated.
# 2.1.469
- Fixed tileset canvas container height in TileSelectorPanel to use the full window instead of a hardcoded short height.
# 2.1.468
- Separated TilesetPicker entirely from WorldBuilderPanel into its own dockable window (TileSelectorPanel)
- Added custom W x H input to the Tileset settings modal for custom grid slicing
- Added quick presets (16px, 32px, etc) inside the Tileset settings modal
- Hidden logic paint context menu options when not in the logic paint layer
- Investigated Atlas 500 error and determined it requires a database column alteration in production MariaDB
## [2.1.464] - 2026-08-27
- Refactored `AtlasStudioSuite` full-screen workspace into windowed MDI `MapListPanel` and `WorldAtlasPanel`.
- Resolved Atlas save issues by removing conflicting save logic and confirming `WorldAtlas` database sync.
- Made `StudioCanvasViewport` container transparent and disabled obscuring background overlay in Studio.
- Re-applied dynamic `MidnightTropicalBackground` for Studio to match the character select screen.

## [2.1.463] - 2026-08-27
### Studio Atlas Spatial Inspector Relocation
- **Moved Atlas Inspector to Bottom Toolbar**: Removed the obstructive fixed floating overlay from the bottom-right of the viewport and relocated the Atlas Spatial Inspector into a streamlined toggle button on the bottom toolbar.
- **Modernized Diagnostics Popover**: Transformed the inspector into an anchored glass popover (sg-glass styling with gold borders and backdrop blur) that opens on-demand right above the bottom bar without blocking map editing.

## [2.1.462] - 2026-08-27
### Studio Multi-Document Interface (MDI) Restoration
- **Restored Floating Windowed Workspace**: Stripped away the lexlayout-react engine and restored the DraggablePanel system. Editor tools (World Builder, Tile Selector, etc.) now open as independent, draggable, resizable, and overlapping windows over the map canvas.
- **Tile Selector Usability Fix**: Addressed pointer-event deadzones caused by previous tab groups. Tool windows now properly intercept clicks while allowing click-through to the Babylon canvas when clicking outside panels.
- **Unified Inner Tool Tabs**: Reviewed 23 nested studio tools and stripped legacy hardcoded dark backgrounds (g-[#05080e]) and rainbow/generic tailwind tabs, updating them to inherit the unified sg-glass aesthetics (g-[#cbb26a]/20, 	ext-[#e2d5b3]).
- **Permissions Synced**: Re-registered newly added studio tools to the canUseStudioDock permissions matrix so they successfully launch from the dock.

## [2.1.460-07] - 2026-08-27
### Studio UI Shell, Style Integration & Windowed World Editing Architecture
- **Global Studio Backdrop Layering**:
  - Integrated `MidnightTropicalBackground` as the canonical Layer 1 environment behind `/studio` across all three theme styles (`dark`, `light` sunset, and `vice` neon).
  - Unbundled the 3D map canvas from acting as the full-screen app backdrop, framing it as a first-class windowed viewport document inside FlexLayout.
- **Studio Theme System & Visual Identity Integration**:
  - Implemented comprehensive theme-aware styling for FlexLayout window chrome, glassmorphism containers (`var(--card)` with backdrop blur), theme-aware borders (`var(--border)`), tab headers, splitters, toolbars, and popups.
  - Studio surfaces now visibly and cohesively adapt to `dark`, `light` (sunset twilight), and `vice` (Miami neon) palettes.
- **Redesigned Command Top Bar (`StudioMenuBar`)**:
  - Structured into 3 clear zones: Identity & Project Context (World Profile switcher + Save state + Quick Save + Undo/Redo), Command & Modes (Omnisearch Ctrl+K + Segmented Mode Switcher), and Status & Controls (Validation/Problems badge + Playtest PIE toggle + Theme cycle + Windows launcher menu).
- **Redesigned Contextual Bottom Bar (`StudioBottomToolbar`)**:
  - Replaced overcrowded 15+ launcher button strip with a quiet contextual surface: Tool Mode buttons, Brush Size, Stamp Transforms (X, Y, Z), Live Selection bounds, Hover Coordinates, Active Layer chip, Brush GID/Logic tag preview, Viewport zoom & overlay toggles, and latency/FPS telemetry.
- **First-Class Dockable Tool Panels**:
  - Created `TileSelectorPanel` and `LogicPainterPanel` as persistent, dockable windows that creators can keep open alongside active map documents.
  - Enabled multi-window co-existence for World Atlas, Tile Selector, Logic Painter, Inspectors, and Map Editor.
- **Smart Contextual Right-Click Actions (`StudioContextMenu`)**:
  - Upgraded right-click context menu with direct links to NPC Studio, Dialogue Trees, Quest Attachments, Creature Studio, Loot Tables, Monster Spawners, Logic Painter, and Warp Gate editors.

## [2.1.460-06] - 2026-08-27
### Studio Master Plan: 27-Skill Profession Matrix & Studio Skill Guide Editor
- **27-Skill Combat & Life Profession Architecture**:
  - Unified all 27 in-game skills (`attack`, `strength`, `defence`, `hitpoints`, `ranged`, `agility`, `perception`, `wisdom`, `intelligence`, `mining`, `woodcutting`, `fishing`, `farming`, `hunter`, `smithing`, `cooking`, `crafting`, `herblore`, `fletching`, `firemaking`, `runecrafting`, `construction`, `thieving`, `magic`, `prayer`, `summoning`, `necromancy`) into formal Combat & Life professions in `professionRegistry.ts`.
  - Upgraded `ProfessionTemplate` in `prisma/schema.prisma` with `category`, `themeColor`, `tagline`, `stationTags`, `trainingMethodsJson`, `perksJson`, `milestonesJson`, `battlepassTiersJson`.
  - Redesigned `ProfessionEditorPanel.tsx` in the Studio to view, create, and edit the complete rich Skill Guide data (including station tags, level-by-level milestone unlocks, and 10-tier battlepass cosmetic reward tracks).
  - Seeded all 27 Combat and Life professions in `starterContentBootstrap.ts`.

## [2.1.460-05] - 2026-08-27
### Studio Master Plan: Phase 54 Master World Bounty Board, Daily Wanted Contracts & Bandit Slaying Ledger Engine
- **Master Bounty Board & PvP Escrow Engine**:
  - Implemented `bountyContractEngine.ts` handling daily wanted contracts across 5 threat tiers, combat boss modifiers, custom player-posted PvP bounties with gold escrow, kill validations, and reward claims.
  - Added automated unit test suite in `bountyContractEngine.test.ts`.

## [2.1.460-04] - 2026-08-27
### Studio Master Plan: Phase 53 Master Player Crafting, Recipe Discovery, Alchemy Transmutation & Item Enchanting Engine
- **Master Crafting & Rune Enchanting Engine**:
  - Implemented `masterCraftingEngine.ts` handling crafting disciplines (`SMITHING`, `ALCHEMY_TRANSMUTATION`, `ENCHANTING_RUNECRAFT`, `LEATHERWORKING_TAILORING`, `COOKING_BREWING`), station requirements, blind experimental recipe discovery, item quality rolls (`NORMAL`, `SUPERIOR`, `MASTERWORK`, `LEGENDARY`), and rune enchantment sockets.
  - Added automated unit test suite in `masterCraftingEngine.test.ts`.

## [2.1.460-03] - 2026-08-27
### Studio Master Plan: Phase 52 Master Gathering Node Respawn, Dynamic Yield Depletion & Resource Vein Quality Engine
- **Master Resource Gathering & Vein Quality Engine**:
  - Implemented `resourceGatheringEngine.ts` handling profession gathering nodes (`MINING`, `WOODCUTTING`, `HERBLORE_FORAGING`, `FISHING`), quality tiers (`NORMAL`, `RICH_VEIN`, `PRISTINE_CORE`), dynamic charge depletion counters, player density-adjusted respawn decay timers, and double-strike critical harvests.
  - Added automated unit test suite in `resourceGatheringEngine.test.ts`.

## [2.1.460-02] - 2026-08-27
### Studio Master Plan: Phase 51 Master Player Pet Breeding, Genetic Traits & Cross-Species Incubation Engine
- **Master Pet Breeding & Genetics Engine**:
  - Implemented `petBreedingEngine.ts` handling Mendelian allele inheritance ($AA, Aa, aa$) across primary traits (Elemental Affinity, Temperament, Stat IVs), species compatibility groups, thermal incubation duration timers, and rare shiny mutation rolls (1%).
  - Added automated unit test suite in `petBreedingEngine.test.ts`.

## [2.1.460-01] - 2026-08-27
### Studio Master Plan: Phase 50 Master Studio Suite Orchestration, Grand Engine Unification & Comprehensive System Verification Matrix
- **Master Studio Suite Orchestration & Grand Engine Unification**:
  - Implemented `masterStudioUnificationEngine.ts` unifying all 50 studio & gameplay engine subsystems into a centralized runtime state machine with cross-engine event dispatching, health status telemetry, and global diagnostic verification matrix sweeps (100% operational score).
  - Added comprehensive automated unit test suite in `masterStudioUnificationEngine.test.ts`.

## [2.1.460-00] - 2026-08-27
### Studio Master Plan: Phase 49 Master Realm Economy Auction House & Escrow Orderbook Matching Engine
- **Master Auction House & Double-Auction Orderbook Engine**:
  - Implemented `auctionHouseEngine.ts` handling asynchronous sell listings (12h, 24h, 48h), instant buyouts, continuous limit orderbook matching ($P_{bid} \ge P_{ask}$), partial stack fills, 2% realm sales tax gold sink, and mailbox escrow delivery.
  - Added automated unit test suite in `auctionHouseEngine.test.ts`.

## [2.1.459-99] - 2026-08-27
### Studio Master Plan: Phase 48 Master World Lore Codex, Ancient Relics, Archaeology Excavation & Artifact Inscription Engine
- **Master World Lore Codex & Archaeology Relic Engine**:
  - Implemented `loreCodexEngine.ts` handling historical epoch taxonomy (`AGE_OF_CREATION`, `THE_FIRST_TAMERS`, `THE_SHADOW_CATACLYSM`, `ERA_OF_GUILDS`, `CONTEMPORARY_SAINTS`), multi-piece archaeological relic fragment assembly, and chapter completion passive mastery buffs (+2% Holy Magic, +5% Crypt Damage, +10% Archaeology Dig Speed).
  - Added automated unit test suite in `loreCodexEngine.test.ts`.

## [2.1.459-98] - 2026-08-27
### Studio Master Plan: Phase 47 Master Player Mentorship, Apprentice Contracts & Realm Guide Rewards Engine
- **Master Player Mentorship & Apprentice Rewards Engine**:
  - Implemented `mentorshipEngine.ts` handling mentor eligibility validation (Level 50+), apprentice pairing (Level 1–25), co-op party XP/drop synergy multipliers (+15% XP, +10% drops), milestone progression tracking, and graduation reward payouts (Mentor Commendation Badges, *"The Venerable Sage"* cosmetic title).
  - Added automated unit test suite in `mentorshipEngine.test.ts`.

## [2.1.459-97] - 2026-08-27
### Studio Master Plan: Phase 46 Master World Dungeon Generator & Procedural Crypt Labyrinth Layout Engine
- **Master Procedural Dungeon & Crypt Labyrinth Engine**:
  - Implemented `proceduralDungeonEngine.ts` handling deterministic seed-based BSP room layouts, corridor tunnel carving, lock-and-key puzzle dependency chains (`BRONZE_KEY`, `SILVER_KEY`, `GOLD_KEY`), and BFS path reachability validation.
  - Added automated unit test suite in `proceduralDungeonEngine.test.ts`.

## [2.1.459-96] - 2026-08-27
### Studio Master Plan: Phase 45 Master Raid Mechanics, Mythic Encounter Phases & Dynamic Wipe Recovery Engine
- **Master Raid Mechanics & Threat Aggro Engine**:
  - Implemented `raidEncounterEngine.ts` handling multi-phase boss state machines (`PHASE_1_GROUND`, `PHASE_2_AIRBORNE_ADDS`, `PHASE_3_ENRAGED_CORE`, `ENRAGED_BERSERK`), threat table aggro calculation with role multipliers (Tank 4.0x, DPS 1.0x, Healer 0.5x), over-aggro buffer thresholds (110% melee, 130% ranged), and full encounter wipe reset orchestration.
  - Added automated unit test suite in `raidEncounterEngine.test.ts`.

## [2.1.459-95] - 2026-08-27
### Studio Master Plan: Phase 44 Master Player Housing & Real Estate Land Auction Bidding Engine
- **Master Player Housing & Real Estate Land Auction Engine**:
  - Implemented `playerHousingEngine.ts` handling overworld land plot zoning (`RESIDENTIAL_SANCTUARY`, `GUILD_ESTATE`, `COMMERCIAL_SHOPFRONT`, `WILDERNESS_OUTPOST`), timed land auction bidding with escrow locking and anti-snipe extensions, and interior furniture decor placement grid validation.
  - Added automated unit test suite in `playerHousingEngine.test.ts`.

## [2.1.459-94] - 2026-08-27
### Studio Master Plan: Phase 43 Master Anti-Fraud Item Duplication & Inventory Reconciliation Ledger Engine
- **Master Anti-Fraud Item Duplication & Inventory Reconciliation Engine**:
  - Implemented `inventoryReconciliationEngine.ts` handling global cryptographic item UUID provenance generation, atomic double-entry transfer ledgers (inventories, banks, trade escrows), realtime duplication collision detection with instant quarantine, and inventory state reconciliation audits.
  - Added automated unit test suite in `inventoryReconciliationEngine.test.ts`.

## [2.1.459-93] - 2026-08-27
### Studio Master Plan: Phase 42 Master Tournament Brackets, Ranked Arena Ladders & ELO Matchmaking Engine
- **Master Tournament Brackets & ELO Rating Engine**:
  - Implemented `tournamentBracketEngine.ts` handling ranked ELO rating calculations ($K=32$) across 6 competitive tiers (`BRONZE`, `SILVER`, `GOLD`, `PLATINUM`, `DIAMOND`, `GRANDMASTER`), seeded tournament bracket generation (4, 8, 16, 32, 64 seeds), match victory progression routing, and prize pool distribution.
  - Added automated unit test suite in `tournamentBracketEngine.test.ts`.

## [2.1.459-92] - 2026-08-27
### Studio Master Plan: Phase 41 Master Achievement Ledger, Secret Titles, Realm Feats & Badges Engine
- **Master Achievement Ledger & Cosmetic Titles Engine**:
  - Implemented `achievementEngine.ts` handling multi-category achievements (`EXPLORATION`, `COMBAT`, `CREATURE_TAMING`, `CRAFTING_ECONOMY`, `QUESTING`, `GUILD_WARFARE`, `FEATS_OF_STRENGTH`), incremental criteria progress tracking, secret hidden feats, and cosmetic title/badge rewards with Achievement Points (AP).
  - Added automated unit test suite in `achievementEngine.test.ts`.

## [2.1.459-91] - 2026-08-27
### Studio Master Plan: Phase 40 Master Accessibility, Adaptive Keybinding Matrix & Screen Reader ARIA Engine
- **Master Accessibility & Keybinding Matrix Engine**:
  - Implemented `accessibilityEngine.ts` handling adaptive keybinding remapping (keyboard, mouse, gamepad) with collision conflict resolution, colorblind visual filter matrices (`PROTANOPIA`, `DEUTERANOPIA`, `TRITANOPIA`, `ACHROMATOPSIA`, `HIGH_CONTRAST`), UI font scaling (up to 2.0x), and screen reader ARIA live region announcement queues.
  - Added automated unit test suite in `accessibilityEngine.test.ts`.

## [2.1.459-90] - 2026-08-27
### Studio Master Plan: Phase 39 Master Cinematic Cutscene Sequences, Scripted Camera Paths & Dialogue Theater Engine
- **Master Cinematic Cutscene & Camera Sequencer Engine**:
  - Implemented `cinematicCameraEngine.ts` handling camera keyframe spline interpolation (position, FOV, look-at targets, easing curves), multi-track timeline event dispatching (`CAMERA_MOVE`, `PLAY_SOUND`, `FADE_SCREEN`, `DIALOGUE_LINE`, `ACTOR_ANIMATION`), and letterbox dialogue theater presentation with input suppression.
  - Added automated unit test suite in `cinematicCameraEngine.test.ts`.

## [2.1.459-89] - 2026-08-27
### Studio Master Plan: Phase 38 Master World Audio Ambiance, Spatial Sound Triggers & Dynamic Audio Bus Mixing Engine
- **Master Audio Ambiance & Spatial Bus Mixer Engine**:
  - Implemented `audioAmbianceEngine.ts` handling multi-channel bus mixing (`MASTER`, `BGM`, `SFX`, `VOICE`, `AMBIANCE`, `UI`), spatial 2.5D distance attenuation with stereo panning, and dynamic biome/weather soundscape crossfading.
  - Added automated unit test suite in `audioAmbianceEngine.test.ts`.

## [2.1.459-88] - 2026-08-27
### Studio Master Plan: Phase 37 Master Player Session Handshake, Anti-Cheat Input Throttle & Realtime Heartbeat Telemetry Engine
- **Player Session Telemetry & Anti-Cheat Throttle Engine**:
  - Implemented `playerSessionTelemetryEngine.ts` handling session connection state transitions (`CONNECTING`, `AUTHENTICATED`, `IN_GAME`, `DESYNC_RECOVERY`, `DISCONNECTED`), sliding window input packet throttling (movement max 10/s, abilities max 4/s), and moving average RTT/jitter telemetry with auto-reconciliation triggers.
  - Added automated unit test suite in `playerSessionTelemetryEngine.test.ts`.

## [2.1.459-87] - 2026-08-27
### Studio Master Plan: Phase 36 Comprehensive Multi-Language Localization, Dynamic Translation Keys & Fallback Engine
- **Multi-Language Localization & Translation Engine**:
  - Implemented `localizationRegistryEngine.ts` handling multi-locale dictionaries (`EN_US`, `ES_ES`, `FR_FR`, `DE_DE`, `PT_BR`, `JA_JP`, `KO_KR`, `ZH_CN`), variable string interpolation, pluralization rules, and missing translation coverage audits with graceful English fallback resolution.
  - Added automated unit test suite in `localizationRegistryEngine.test.ts`.

## [2.1.459-86] - 2026-08-27
### Studio Master Plan: Phase 35 Master World Time, Astronomical Celestial Events & Seasonal Weather Engine
- **Master World Time, Celestial Events & Weather Engine**:
  - Implemented `celestialWeatherEngine.ts` handling synchronized master realm clock with configurable time dilation, astronomical lunar phases (`NEW_MOON`, `CRESCENT`, `HALF_MOON`, `FULL_MOON`, `BLOOD_ECLIPSE`, `SOLAR_SOLSTICE`), and dynamic regional weather hazards (`CLEAR`, `RAIN`, `THUNDERSTORM`, `BLIZZARD`, `SANDSTORM`, `ACID_FOG`) with elemental gameplay modifiers.
  - Added automated unit test suite in `celestialWeatherEngine.test.ts`.

## [2.1.459-85] - 2026-08-27
### Studio Master Plan: Phase 34 Master AI NPC Behavior Trees, Dynamic Social Gossip & Ambient Realm Simulation Engine
- **Master AI NPC Behavior Trees & Ambient Simulation Engine**:
  - Implemented `npcBehaviorTreeEngine.ts` handling hierarchical behavior tree evaluation (`SELECTOR`, `SEQUENCE`, `PARALLEL`, action leaves), dynamic social gossip/rumor network propagation, and day/night schedule routine shifts (`DAWN`, `DAY`, `DUSK`, `NIGHT`).
  - Added automated unit test suite in `npcBehaviorTreeEngine.test.ts`.

## [2.1.459-84] - 2026-08-27
### Studio Master Plan: Phase 33 Universal Multi-Region Shard Orchestration, Cross-Shard Teleportation & State Migration Engine
- **Multi-Region Shard Orchestration & Cross-Shard Migration Engine**:
  - Implemented `shardOrchestratorEngine.ts` handling multi-region shard topology (`US_EAST`, `US_WEST`, `EU_CENTRAL`, `AP_EAST`), cryptographically signed 2-phase cross-shard migration handshakes, dynamic channel spawning/consolidation, and load balancing.
  - Added automated unit test suite in `shardOrchestratorEngine.test.ts`.

## [2.1.459-83] - 2026-08-27
### Studio Master Plan: Phase 32 Comprehensive Master Studio Orchestration, System Health & Diagnostic Hub Engine
- **Master Studio Orchestration & Diagnostic Hub Engine**:
  - Implemented `studioDiagnosticEngine.ts` providing pre-flight multi-system audits across all 31 core subsystems (Dependency Graph, Atlas Chunks, Economy, Creator Royalties, Disaster Recovery, Realtime MMO Sockets), 0–100% composite health scoring, and actionable remediation guidance.
  - Added automated unit test suite in `studioDiagnosticEngine.test.ts`.

## [2.1.459-82] - 2026-08-27
### Studio Master Plan: Phase 31 Comprehensive Live Ops Disaster Recovery, Rollback Snapshot & Realm State Freeze Engine
- **Live Ops Disaster Recovery & Realm State Freeze Engine**:
  - Implemented `realmDisasterRecoveryEngine.ts` handling emergency server-wide gameplay freezes, immutable point-in-time realm state snapshots, delta rollback restorations, and automated player compensation package calculations.
  - Added automated unit test suite in `realmDisasterRecoveryEngine.test.ts`.

## [2.1.459-81] - 2026-08-27
### Studio Master Plan: Phase 30 Creator Attribution, Royalty Distributions & Asset Monetization Engine
- **Creator Attribution & Royalty Monetization Engine**:
  - Implemented `creatorRoyaltyEngine.ts` handling creator attribution trees (original root author vs derivative remixers), automated multi-tier sales splits (Platform 5%, Original Author 70%, Remixer 25%), creator escrow balance ledgers, and minimum payout withdrawal claims.
  - Added automated unit test suite in `creatorRoyaltyEngine.test.ts`.

## [2.1.459-80] - 2026-08-27
### Studio Master Plan: Phase 29 Master Realm Leaderboards, Season Archive & Hall of Fame Engine
- **Master Realm Leaderboards & Hall of Fame Engine**:
  - Implemented `realmHallOfFameEngine.ts` handling multi-category highscores (Total XP, Boss Kill Counts, PvP Elo, Raids, Speedruns), seasonal archive snapshots, podium cosmetic title awards, and anti-anomaly score validation.
  - Added automated unit test suite in `realmHallOfFameEngine.test.ts`.

## [2.1.459-79] - 2026-08-27
### Studio Master Plan: Phase 28 World Atlas Chunks, Biome Transitions & Seamless Streaming Engine
- **World Atlas Streaming & Biome Transition Engine**:
  - Implemented `worldAtlasStreamingEngine.ts` handling world spatial chunk grid partitioning ($32 \times 32$ tile chunks), viewport streaming load/evict deltas, and seamless biome edge transition blend factor evaluation (lighting tint, audio crossfade, particle density).
  - Added automated unit test suite in `worldAtlasStreamingEngine.test.ts`.

## [2.1.459-78] - 2026-08-27
### Studio Master Plan: Phase 27 Economy Inflation Control, Sinks, Gold Velocity & Dynamic Market Stabilization Engine
- **Economy Inflation Control & Market Stabilizer Engine**:
  - Implemented `economyStabilizerEngine.ts` handling realm macro-economy metrics (faucets vs sinks, Inflation Pressure Index), automated Grand Exchange tax buyback item sinks, death gravestone reclamation surcharges, and degradation repair fee scaling.
  - Added automated unit test suite in `economyStabilizerEngine.test.ts`.

## [2.1.459-77] - 2026-08-27
### Studio Master Plan: Phase 26 Unified Asset Representation Profiles & Dynamic Visual Pipeline Engine
- **Asset Representation Profiles & Dynamic Visual Pipeline Engine**:
  - Implemented `assetRepresentationEngine.ts` decoupling conceptual RPG entities from visual animation profiles, supporting 2D sprite sheets, composited layered avatars, directional animation lookups (`IDLE`, `WALK`, `ATTACK`, `CAST`, `DIE`, `EMOTE`), and multi-tier fallback chains (HD Skin -> Base 2D Sheet -> Silhouette Placeholder).
  - Added automated unit test suite in `assetRepresentationEngine.test.ts`.

## [2.1.459-76] - 2026-08-27
### Studio Master Plan: Phase 25 Guild Alliances, War Declarations, Tax Rates & Clan Vault Escrow Engine
- **Guild Diplomacy & Clan Vault Escrow Engine**:
  - Implemented `guildDiplomacyEngine.ts` handling diplomatic treaties (`ALLIED`, `NEUTRAL`, `RIVAL`, `AT_WAR`), mutual alliance pacts, formal war declarations with escrowed war chest stakes, clan taxation rates, and rank-based daily vault withdrawal allowances with audit logging.
  - Added automated unit test suite in `guildDiplomacyEngine.test.ts`.

## [2.1.459-75] - 2026-08-27
### Studio Master Plan: Phase 24 Pet Gene Mutations, Evolutionary Branching & Elemental Affinity Matrix Engine
- **Pet Gene Mutations & Branching Evolution Engine**:
  - Implemented `creatureMutationEngine.ts` handling branching evolution requirements (evolution stones, daytime/nighttime, high loyalty, trade items), rare genetic mutations (`MUTATION_ALBINO`, `MUTATION_SHADOW_TOUCHED`, `MUTATION_TITAN_SIZE`, `MUTATION_CELESTIAL_AURA`), and 8-element weather/biome resonance calculations.
  - Added automated unit test suite in `creatureMutationEngine.test.ts`.

## [2.1.459-74] - 2026-08-27
### Studio Master Plan: Phase 23 World Boss Dynamic Scaling, Enrage Timers & Shared Loot Ledger Engine
- **World Boss Dynamic Scaling & Hero Battles Engine**:
  - Implemented `worldBossEngine.ts` handling participant-based dynamic HP/damage scaling, phase shifts (Adds & Cataclysm AoE), soft/hard enrage timers, and contribution-based shared loot ledger (damage, healing, damage absorbed).
  - Added automated unit test suite in `worldBossEngine.test.ts`.

## [2.1.459-73] - 2026-08-27
### Studio Master Plan: Phase 22 Companion AI, Pet Commands & Buddy Tactics Engine
- **Companion AI & Buddy Tactics Engine**:
  - Implemented `companionAiEngine.ts` handling combat stances (`AGGRESSIVE`, `DEFENSIVE`, `PASSIVE`, `ASSIST`), real-time player commands (`ATTACK_TARGET`, `RETURN_TO_ME`, `USE_SPECIAL_ABILITY`, `STAY_POSITION`), range tethering, and loyalty bond synergy perks.
  - Added automated unit test suite in `companionAiEngine.test.ts`.

## [2.1.459-72] - 2026-08-27
### Studio Master Plan: Phase 21 Creator Marketplace, Community Studio Blueprints & Mod Sharing Engine
- **Creator Blueprints & Marketplace Engine**:
  - Implemented `blueprintMarketplaceEngine.ts` handling community Studio blueprints (`DUNGEON_LAYOUT`, `QUESTLINE`, `CREATURE_PACK`, `TERRAIN_PRESET`, `MINIGAME_ARENA`, `FULL_CAMPAIGN`), star rating aggregation, multi-tag search, and pre-flight import conflict resolution (`OVERWRITE`, `RENAME_WITH_PREFIX`, `SKIP`).
  - Added automated unit test suite in `blueprintMarketplaceEngine.test.ts`.

## [2.1.459-71] - 2026-08-27
### Studio Master Plan: Phase 20 Minigame Matchmaking Lobby, Team Balancing & Objective Engine
- **Minigame Matchmaking & Objective Engine**:
  - Implemented `minigameMatchmakingEngine.ts` handling multiplayer minigame queues (`CASTLE_WARS`, `PEST_CONTROL`, `SOUL_WARS`, `BARBARIAN_ASSAULT`), team balancing algorithms, lobby countdowns, in-match objective state tracking, and zeal reward distribution.
  - Added automated unit test suite in `minigameMatchmakingEngine.test.ts`.

## [2.1.459-70] - 2026-08-27
### Studio Master Plan: Phase 19 Seasonal Battle Pass, Seasonal Challenges & Progression Engine
- **Seasonal Battle Pass & Progression Engine**:
  - Implemented `seasonPassEngine.ts` handling 50-tier dual tracks (Free & Premium), seasonal challenges (`DAILY_KILL_MONSTERS`, `WEEKLY_COMPLETE_DUNGEON`), Battle Pass XP progression, tier-up reward claims, and prestige overflow caches.
  - Added automated unit test suite in `seasonPassEngine.test.ts`.

## [2.1.459-69] - 2026-08-27
### Studio Master Plan: Phase 18 World Exploration, Fog of War & Discovery POI Engine
- **World Exploration & Fog of War Engine**:
  - Implemented `explorationEngine.ts` handling player-specific Fog of War circular tile reveals, landmark POI proximity checks, exploration XP awards, waypoint unlocks, and total map completion percentage calculations.
  - Added automated unit test suite in `explorationEngine.test.ts`.

## [2.1.459-68] - 2026-08-27
### Studio Master Plan: Phase 17 Sanctuary House Privacy, Guest Tip Jar & Dungeon Defense Engine
- **Sanctuary Guest Controls & Dungeon Defense Engine**:
  - Implemented `sanctuaryDefenseEngine.ts` handling house privacy modes (`PRIVATE`, `FRIENDS_ONLY`, `OPEN_HOUSE`), guest tip jar coin donation accounting, subterranean dungeon trap placement (`SPIKE_TRAP`, `POISON_DART`, `FLAME_JET`, `TENTACLE_PIT`), and guard creature assignment.
  - Added automated unit test suite in `sanctuaryDefenseEngine.test.ts`.

## [2.1.459-67] - 2026-08-27
### Studio Master Plan: Phase 16 Guild Clan Citadel & Territory War Engine
- **Guild Clan Territory & Siege War Engine**:
  - Implemented `guildTerritoryEngine.ts` handling territory control nodes, contested capture progress ticking, passive guild yield/XP buff accrual, and scheduled clan war sieges.
  - Added automated unit test suite in `guildTerritoryEngine.test.ts`.

## [2.1.459-66] - 2026-08-27
### Studio Master Plan: Phase 15 Player Battles (PvP) Duels & Wilderness Skulling Engine
- **Player Battles (PvP) & Wilderness Combat Engine**:
  - Implemented `playerBattleEngine.ts` handling friendly staked/non-staked duel lifecycles, mutual rule toggles, countdown states, and stake escrow resolution.
  - Implemented wilderness danger level brackets, skulling timers (20 minutes), and death penalty calculations (protect 3 items vs lose all on death).
  - Added automated unit test suite in `playerBattleEngine.test.ts`.

## [2.1.459-65] - 2026-08-27
### Studio Master Plan: Phase 14 Direct Player-to-Player Trading Engine & Escrow System
- **Direct Player-to-Player (P2P) Trading Engine**:
  - Implemented `directTradeEngine.ts` with 2-stage trade verification (`OFFERING` -> `ACCEPTED` -> `CONFIRMED` -> `COMPLETED`) and anti-scam offer alteration resets.
  - Added realtime direct trade protocol events (`TRADE_REQUEST`, `TRADE_UPDATE`, `TRADE_ACCEPT`, `TRADE_CONFIRM`, `TRADE_COMPLETE`, `TRADE_CANCEL`) to `protocol.ts`.
  - Added automated unit test suite in `directTradeEngine.test.ts`.

## [2.1.459-64] - 2026-08-27
### Studio Master Plan: Phase 13 Live Operations Admin Dispatcher & Simulation Actions
- **Live Operations Server Actions**:
  - Implemented `triggerLiveWorldEvent` and `stopLiveWorldEvent` in `world-events.ts` for dynamic live event dispatching and realm modifier activation.
  - Implemented `setActiveSimulationPreset` in `simulation-presets.ts` for exclusive baseline rule switching (e.g. Standard vs Hardcore).
  - Added automated unit test suite in `liveOpsActions.test.ts`.

## [2.1.459-63] - 2026-08-27
### Studio Master Plan: Phase 12 World Events & Realm Mutation Engine
- **World Event Engine & Dynamic Realm Mutations**:
  - Implemented `worldEventEngine.ts` handling event state lifecycles (`SCHEDULED`, `ACTIVE`, `DRAINING`, `EXPIRED`), timestamp management, and deterministic multiplier compounding (XP, gold, gathering, spawn rates).
  - Wired atmospheric preset and weather mutations (`BLOOD_RAIN`, `AURORA_BOREALIS`) directly to `AtmospherePresets`.
  - Added realtime protocol events `WORLD_EVENT_STARTED` and `WORLD_EVENT_ENDED` to `protocol.ts`.
  - Added automated unit test suite in `worldEventEngine.test.ts`.

## [2.1.459-62] - 2026-08-27
### Studio Master Plan: Phase 11 Realtime Party Dungeon Instancing & Socket Sync Pipeline
- **Real-Time Dungeon Protocol & Socket Pipeline**:
  - Added realtime dungeon events (`DUNGEON_CREATE`, `DUNGEON_WARP`, `DUNGEON_OBJECTIVE_UPDATE`, `DUNGEON_COMPLETED`) to `protocol.ts`.
  - Wired `DungeonInstanceManager` to `LobbySocketHandler` with party member auto-routing, live objective progress broadcasts, and completion events.
  - Added automated unit test suite in `DungeonSocketHandler.test.ts`.

## [2.1.459-61] - 2026-08-27
### Studio Master Plan: Phase 10 Shadow Crypt Dungeon Map & Instancing
- **Shadow Crypt Dungeon Map**:
  - Implemented `shadowCryptMapSeed.ts` defining `DUNGEON_SHADOW_CRYPT` (24×24 subterranean layout) with `DUNGEON` atmospheric lighting presets, `FOG` weather, and ambient dungeon audio.
  - Placed enemy spawns for `monster_skeleton_warrior` and the `monster_crypt_lord` boss.
  - Linked map to `dungeon_shadow_crypt` in `starterContentBootstrap.ts` and `DungeonInstanceManager`.
  - Added automated unit test suite in `shadowCryptMap.test.ts`.

## [2.1.459-60] - 2026-08-27
### Studio Master Plan: Phase 9 Dynamic Quests & Creature Catalog Authoring
- **Dynamic Quests & Objective Pipelines**:
  - Authored multi-stage initiation, beast training, and dungeon delve quests (`quest_the_saints_awakening`, `quest_beast_whisperer`, `quest_shadow_crypt_purification`) in `starterContentBootstrap.ts`.
- **Creature Taxonomy Definitions**:
  - Authored and seeded dedicated Beasts (`beast_ember_fox`, `beast_aqua_otter`, `beast_verdant_sprout`), Monsters (`monster_abyssal_fiend`, `monster_skeleton_warrior`, `monster_crypt_lord`), and Mercenaries (`merc_veteran_guard`, `merc_shadow_scout`, `merc_mystic_healer`).
  - Added automated unit test suite in `starterContentCatalog.test.ts`.

## [2.1.459-59] - 2026-08-26
### Studio Master Plan: Phase 8 Impact Analysis & Live Publishing Gate
- **Cross-System Impact Analysis**:
  - Implemented `impactAnalysis.ts` to compute cascading dependency blast radiuses (`analyzeDeletionImpact`), classifying blocking published dependents vs draft warnings before deletion.
- **Live Publishing Gate Engine**:
  - Implemented `livePublishingGate.ts` enforcing zero-defect release validation (graph integrity, valid spawns, and complete entity asset bindings) and issuing immutable release manifests.
  - Added automated unit test suites in `impactAnalysis.test.ts` and `livePublishingGate.test.ts`.

## [2.1.459-58] - 2026-08-26
### Studio Master Plan: Phase 7 Comprehensive E2E Testing & Integration Suite
- **End-to-End Creator Journey Test Suite**:
  - Implemented `studioUserJourney.test.ts` covering 5 core authoring pipelines:
    1. Map authoring, tile layering, logic tagging, and validation.
    2. Multi-author collaborative concurrency and 3-way conflict resolution.
    3. Playtest sandbox non-destructive state snapshotting and restoration.
    4. Party-dungeon instance allocation, objective tracking, and clear condition checks.
    5. Creature taxonomy categorization (Beast vs Monster vs Mercenary) and catalog validation.

## [2.1.459-57] - 2026-08-26
### Studio Master Plan: Phase 6 Audio & Visual Polish
- **Atmospheric Lighting & Weather Visual Profiles**:
  - Implemented `atmospherePresets.ts` with standardized rendering tokens (`ambientColor`, `sunColor`, `fogDensity`, `fogColor`, `bloomIntensity`) for all lighting environments (`DAY`, `NIGHT`, `DUSK`, `DAWN`, `DUNGEON`, `BLOOD_MOON`, `CYBER_NEON`).
  - Added weather particle overlay configurations (`CLEAR`, `RAIN`, `THUNDERSTORM`, `SNOW`, `BLIZZARD`, `ASH_FALL`).
  - Added automated unit tests in `atmospherePresets.test.ts`.

## [2.1.459-56] - 2026-08-26
### Studio Master Plan: Phase 5 Collaborative Workflow & Optimistic Locking
- **Optimistic Concurrency Control**:
  - Implemented `optimisticLockEngine.ts` providing deterministic content hashing (`computeContentHash`), revision tracking, commit validation, and conflict interception.
  - Added 3-way merge resolution (`resolveMergeConflict`) with `take_local`, `take_remote`, and `smart_merge` strategies.
  - Added automated unit test suite in `optimisticLockEngine.test.ts`.

## [2.1.459-55] - 2026-08-26
### Studio Master Plan: Phase 4 Playtest Sandbox & Instancing
- **Playtest Sandbox (PIE) Snapshot & Restore Engine**:
  - Implemented `playtestSnapshot.ts` capturing player coordinates, inventory, vitals, and active map state upon entering Playtest mode.
  - Implemented `restorePlaytestSnapshot` to safely restore original persistent player state upon exiting Playtest mode.
- **Dungeon Instance Manager**:
  - Implemented `dungeonInstanceManager.ts` supporting dynamic party instance allocation, objective progress tracking, completion validation, and TTL cleanup.
  - Updated `mapIds.ts` with dungeon instance ID parsing and base map resolution.

## [2.1.459-54] - 2026-08-26
### Studio Master Plan: Phase 3 Core Studios & Rule Engine
- **Creature Taxonomy & Subsystem Differentiation**:
  - Added `category` field (`beast` | `monster` | `mercenary`) to `CreatureDefData` in `creatureCatalog.ts`.
  - Added monster-specific attributes (`aggroRadius`, `respawnSec`) and mercenary-specific attributes (`hireCost`, `factionId`).
  - Added category filter tabs and specialized property editors in `CreatureDefEditorPanel.tsx`.
- **Unified Rule & Condition AST Engine**:
  - Expanded `ruleEngine.ts` condition evaluators and action dispatchers.
  - Added automated unit test coverage in `creatureCategoryEngine.test.ts`.

## [2.1.459-53] - 2026-08-26
### Studio Master Plan: Phase 2 Modular Workspace & Tabbed Multi-Map Management
- **Modular FlexLayout Workspace**:
  - Reconfigured `center-viewport` tabset to enable full drag-and-drop tab docking and splitting.
  - Implemented `MapTabPanel.tsx` component providing rich map metadata, live layer inspection, and 1-click active viewport switching.
  - Added support for `studio_open_map_tab` custom event across Studio Omnisearch and World Builder.
- **Shared Data & Validation Foundation**:
  - Added `BaseEntityDefinition` schema and `DependencyGraph` with `ProjectValidator` checking missing references.
  - Added unit and integration tests covering the dependency validator and workspace events.

## [2.1.459-52] - 2026-08-26
### Studio Master Plan: Vertical Slices & Shared Platform Layer
- **Content Studio Vertical Slices (A–H)**:
  - Upgraded models and panels for Asset, Atlas, Hero, Profession, Recipe, Dungeon, Shop, Mount, World Event, and Simulation systems to canonical `slug/gameId/profileId` and `CatalogEditorShell`.
- **Phase 2: Cross-Reference & Dependency Graph**:
  - Added `definitionRegistry.ts`, `cross-references.ts` server graph builder, `DefinitionRefBadge.tsx` for reverse reference inspection ("Used by N"), and broken reference diagnostics in `StudioProblemsPanel.tsx`.
- **Phase 3: Shared Rules & Conditions Engine**:
  - Implemented `RuleConditionBuilder.tsx` and `RuleActionBuilder.tsx` visual editors; integrated into `DungeonEditorPanel` (Clear Conditions) and `MountEditorPanel` (Requirements).
- **Phase 4: Asset Ingestion & Reference Pickers**:
  - Added `assets.ts` querying UsableAssets; built `AssetRefPicker.tsx` with modal browser and integrated into Mount Studio.
- **Phase 5: Publishing Pipeline & Validation Gates**:
  - Added `WorldPublishSnapshot` model, `publishing.ts` pre-flight gate actions, `PublishManagerPanel.tsx`, release history timeline, and 1-click snapshot rollback.
- **Phase 6: Simulation & Balance Scaling**:
  - Created `simulationModifiers.ts`, integrated multiplier scaling into `ruleEngine.ts` action execution, and verified via Vitest unit test suite.

## [2.1.459-50] - 2026-08-26
### Tileset Picker Bug Fixes
- **Tileset Picker UI**:
  - Fixed an issue where click-and-drag multi-tile selection was ignoring the dragged region size when releasing the mouse button without a configured brush preset.
  - Fixed keyboard navigation (arrow keys) to correctly step by 1 tile at a time rather than skipping tiles when using a larger brush pattern.

## [2.1.459-49] - 2026-08-26
### Studio Validation Framework Expansion
- **Project Validation Registry**:
  - Integrated `lintDialogueTree` validator into the centralized `ProjectValidationRegistry` allowing continuous automated diagnosis of broken conversation nodes, duplicate IDs, and dead-end dialogues.
  - Added unit test suite coverage in `projectValidationRegistry.test.ts`.

## [2.1.459-48] - 2026-08-26
### Tooling & Script Optimization
- **Package Scripts**:
  - Fixed `validate:maps` CLI script in `package.json` to correctly execute `scripts/validate-maps.ts` for database-wide WorldMap inspection.
  - Cleaned up obsolete references to ensure clean and deterministic developer workflows.

## [2.1.459-47] - 2026-08-26
### Master Roadmap Phase 5: Playtest, Diagnostics & Operations
- **Phase 5A (Playtest Simulation & Shard Isolation)**:
  - Validated PIE session lifecycle (`pieOptions.ts` & `studioSession.ts`) ensuring automatic dock suppression, playtest snapshot restoration, and private room isolation.
- **Phase 5B (Multi-User Collaboration & Soft Locking)**:
  - Verified collaborative soft-lock manager (`softLockEngine.ts`) with resource lease expirations, heartbeat presence pings, and author conflict resolution.
- **Phase 5C (Publishing, Export & Versioning)**:
  - Confirmed immutable content revision snapshots (`revisionStore.ts`) with checksum generation, draft-to-live promotion, and rollback safety.
- **Phase 5D (Project Health, Tasks & Production Polish)**:
  - Verified studio development task dependency engine (`taskEngine.ts`), localization audit suite (`localizationAuditEngine.ts`), and global shortcut dispatchers.

## [2.1.459-46] - 2026-08-26
### Master Roadmap Phase 4: World Composition & Environments
- **Phase 4A (Layer & Depth Management)**:
  - Enforced structured layer contract (`MAP_LAYER_CONTRACT` in `mapLayers.ts`) separating visual terrain, physics collision, interactive objects, runtime entities, invisible spawners, and editor-only overlays.
- **Phase 4B (Prefab & Stamp System)**:
  - Verified 2D matrix transformation pipeline (`stampTransform.ts` & `subgridStamp.ts`) supporting 90°/180°/270° clockwise rotations, horizontal/vertical mirroring, and stamp paste placement modes.
- **Phase 4C (Streaming & Chunk System)**:
  - Validated priority-based chunk streaming queue (`chunkStreaming.ts`) with velocity/heading vector bias and map boundary transition prefetching.
- **Phase 4D (Environment & Weather System)**:
  - Confirmed dynamic environmental illumination (`weatherEngine.ts`) and acoustic soundscape layering (`soundscapeEngine.ts`) modulating daylight levels, rain/storm particles, and spatial audio channels.

## [2.1.459-45] - 2026-08-26
### Master Roadmap Phase 3: Content Studios Suite
- **Phase 3A (Character & Creature Studio)**:
  - Validated unified entity definition pipeline linking creature definition forms, element affinities, base stat curves, and multi-tier loot table references (`lootTableRefs`).
- **Phase 3B (Item & Economy Studio)**:
  - Connected Item Templates and Loot Tables (`LootManagerPanel`) with probability Monte Carlo drop simulation (`simulateLootPool`) and tier/durability/stackable definitions.
- **Phase 3C (Quest & Dialogue Studio)**:
  - Linked `QuestEditorPanel` multi-stage objectives and `DialogueEditorPanel` branching conversation graphs to the Phase 1B Rules Engine for deterministic condition evaluation and action execution.
- **Phase 3D (Ability & Combat Studio)**:
  - Verified `GameplayStudioPanels` ability registry, status effect inspector, and real-time combat balance scenario simulator (`simulateCombatScenario`).

## [2.1.459-44] - 2026-08-26
### Master Roadmap Phase 2: Core Editor & Workspace
- **Phase 2A & 2B (Multi-Map Workspace & Camera Decoupling)**:
  - Added multi-map tabbed authoring (`openMapTabs`, `activeMapTab`, `openMapInTab`, `closeMapTab`) in `useEditorStore` and rendered interactive tabs with unsaved indicators in `StudioMenuBar`.
  - Added Studio Free-Cam mode toggle (`isStudioFreeCam`, `setStudioFreeCam`) allowing creators to pan cameras across expansive maps independently of player avatar physics.
- **Phase 2C (Atlas View & Contextual Navigation)**:
  - Integrated `lintWorldAtlasConnectivity` into the centralized `ProjectValidationRegistry` for continuous automated gate checks, out-of-bounds spawn detection, and reciprocal path validation.
- **Phase 2D (Logic Painter & Tile Selector)**:
  - Added `rule_trigger` typed preset and fields in `logicComponents.ts` linking logic tile trigger volumes directly to the Phase 1B Rules Engine.

## [2.1.459-43] - 2026-08-26
### Master Roadmap Phase 1: Foundation & Shared Infrastructure
- **Phase 1A (Asset Architecture & Catalog Filtering)**:
  - Added dedicated `role` and `profile` query parameter filtering to `/api/assets`.
  - Extended `AssetManager.ts`, `SpriteBrowser`, and `RoleAwareAssetPicker` for granular role-based asset filtering across all entity studios.
- **Phase 1B (Shared Rules, Conditions & Actions Engine)**:
  - Created composable condition evaluation and action execution engine in `src/shared/game/rules/ruleEngine.ts` supporting items, levels, gold, quest states, reputation, and compound AND/OR/NOT logic.
- **Phase 1C (Global Relationship & Dependency Graph)**:
  - Built directed project dependency graph in `src/shared/game/graph/dependencyGraph.ts` with incoming/outgoing edge traversal, broken reference detection, unused asset scanning, and deletion cascade impact analysis.
- **Phase 1D (Global Validation Framework)**:
  - Implemented extensible `ProjectValidationRegistry` in `src/shared/game/validation/projectValidationRegistry.ts` compiling multi-domain health reports with severity levels and suggested remediation actions.

## [2.1.459-42] - 2026-08-25
### Tileset UV Map Precision Fix
- **BabylonEngine / Tile Rendering**: 
  - Fixed a critical texture mapping bug where the 3D engine assumed uploaded tilesets perfectly fit a grid width multiple (e.g. exactly 16x16 with no remainder). If a tileset had custom margins or un-padded edges on the right side, the UV coordinates would drift.
  - The engine now saves and uses the exact pixel dimensions (`imagewidth`, `imageheight`) of the uploaded image to generate precise UV coordinates, fixing the "ugly mess" glitch where half of one tile and half of another were painted together.

## [2.1.459-41] - 2026-08-25
### Tileset Picker Alignment & Navigation Fix
- **Tileset Picker UI**: 
  - Fixed a math bug where the visual cyan/yellow selection bounding boxes were calculated based on grid columns instead of the actual pixels. This caused the selection box to misalign when large tiles (e.g. 32x32) were uploaded over the default 16x16 grid.
  - Arrow key navigation in the tileset picker now steps by the dimensions of the selected brush pattern (e.g., jumping 2 tiles over if a 2x2 brush is selected) rather than always moving by a single 16px tile, ensuring large selections remain snapped to their visual grid.

## [2.1.459-40] - 2026-08-25
### Prisma Schema Prep Regex Fix
- **Fix**: The regex in `prepare-prisma.js` that dynamically adds `@db.Text` to text columns for MySQL was accidentally capturing the newline character (`\s*` matched `\r\n`), causing the `@db.Text` modifier to be incorrectly applied to adjacent fields on the next line (like `createdAt` or `levelReq`). This corrupted the Prisma schema internally on boot and caused the server to fail to start. The regex now explicitly checks for spaces and tabs `[ \\t]*` instead of any whitespace to keep the modifications strictly on the same line.

## [2.1.459-39] - 2026-08-25
### MariaDB LongText Schema Preparation Fix
- **Database Schema Validation**:
  - Added `body`, `excerpt`, and `description` to the `prepare-prisma.js` script so that they are correctly mapped to MySQL `@db.Text` or `@db.LongText` rather than Prisma's default `VARCHAR(191)`. This fixes the `Invalid 'prisma.newsArticle.upsert()' invocation: The provided value for the column is too long` error when pushing dummy data containing full markdown bodies.

## [2.1.459-38] - 2026-08-25
### Docker Compose Network Subnet Fix (Round 2)
- **Docker Compose Network IPAM**:
  - Re-added explicit IPAM subnet but configured it to use `10.254.254.0/24`. Removing IPAM entirely in `-37` still resulted in a pool exhaustion error, which implies the Docker host has entirely exhausted its default `172.17.x-31.x` and `192.168.x` pools. Using a high `10.x.x.x` range virtually guarantees a conflict-free subnet on a Debian VPS.

## [2.1.459-37] - 2026-08-25
### Docker Compose Network Subnet Fix
- **Docker Compose Network IPAM**:
  - Removed the hardcoded custom bridge subnet (`172.28.0.0/16`) in `setup.sh` and `update.sh` to prevent `Pool overlaps with other one on this address space` daemon errors when that subnet is already in use by another docker network (like the lobby server). Docker will now auto-allocate a safe subnet while still retaining the deterministic network name.

## [2.1.459-36] - 2026-08-25
### Docker Compose Network IPAM Subnet Specification & Compose v2 Modernization
- **Docker Compose Network IPAM**:
  - Configured explicit custom bridge subnet (`172.28.0.0/16`) via `setup.sh` and `update.sh` to prevent `failed to create network: could not find an available, non-overlapping IPv4 address pool` daemon errors during deployment.
  - Removed deprecated `version: '3.8'` key from `docker-compose.base.yml` for full Compose v2 specification compliance.
  - Fixed `networks.db: container_name is not allowed` validation error caused by the `networks:` block being in `docker-compose.base.yml` — `setup.sh` appends the `db:` service after it, placing `db` under `networks` instead of `services`. The IPAM block is now appended last by `setup.sh` and `update.sh`.
  - Added automatic `docker network prune -f` before build in `update.sh` to clear orphaned bridge networks.

## [2.1.459-35] - 2026-08-25
### MariaDB/MySQL Column Length Constraints Hardening for Dummy Content
- **Column Length Hardening**:
  - Defensively sanitized and trimmed `excerpt` (max 140 chars), `title` (max 140 chars), and `slug` (max 100 chars) in `app/actions/game-dev.ts` and `prisma/seed.ts` to strictly adhere to MariaDB/MySQL `VARCHAR(191)` column limits.
  - Resolved `The provided value for the column is too long for the column's type. Column: excerpt` Prisma exception on production MySQL/MariaDB database instances.

## [2.1.459-34] - 2026-08-25
### Server Action Seed Dummy Content & Admin Dual-Execution Engine
- **Server Action Seeding (`seedDummyContentAction`)**:
  - Implemented direct server action in `app/actions/game-dev.ts` with guaranteed author fallback and auto-creation of system author if none exists.
  - Rewired `app/api/dev/seed-dummy/route.ts` to execute `seedDummyContentAction` with proper JSON payload responses.
  - Updated both `DummyContentButton` and `DevActions` to trigger `seedDummyContentAction` directly with transparent API fallback and actionable error alerts.

## [2.1.459-33] - 2026-08-25
### Dev Seed Dummy Content Hardening & Author Resolution
- **Dev Seed Route Hardening (`/api/dev/seed-dummy`)**:
  - Re-engineered author user resolution in `app/api/dev/seed-dummy/route.ts` to cleanly prioritize the active session user, fallback to staff users, or general users with explicit error messaging.
  - Eliminated undefined relational payload (`promoLinks: undefined`) that caused Prisma Client validation exceptions.
  - Added robust category and subcategory upsert handling to prevent relational collisions.
  - Updated permission checks to accept standard admin permissions alongside developer permissions.
- **Hero Studio Class Presets Typing**:
  - Corrected stat archetype delta preset typing in `ClassEditorWorkspace.tsx`.

## [2.1.459-32] - 2026-08-25
### Hero Studio Mode Navigation, Top Bar Tabs & Feature Wiring
- **Studio Navigation & Mode Switching**:
  - Added primary **Hero** mode switcher button (`UserCircle` icon with active purple/pink gradient styling) alongside `Edit`, `Atlas`, and `Assets` in `StudioMenuBar.tsx`.
  - Added **Hero Studio (Full Workspace)** shortcut entry (`Ctrl+Shift+H`) to the `View` and `Mode` top-level menus.
  - Added `Ctrl+Shift+H` global hotkey to `StudioEditorShell.tsx` and registered `action:hero` in `StudioOmnisearch.tsx`.
  - Synced active mode highlighting in bottom toolbar launcher buttons (`StudioBottomToolbar.tsx`) when entering Hero Studio.
- **Hero Studio Suite & Workspace Upgrades**:
  - Re-architected `HeroStudioSuite.tsx` with a persistent top navigation bar, active profile indicator, fast tab switcher (`Archetypes` / `Classes`), and a quick "Back to Map Editor" exit button.
  - Added **Archetype Cloning / Duplication** (`handleDuplicate`) and Spec Copying in `ArchetypeEditorWorkspace.tsx`.
  - Added **Class Cloning** and **Quick Stat Archetype Presets** (`🛡️ Tank`, `⚔️ DPS`, `🔮 Mage`, `🏹 Scout`, `⚖️ Balanced`) in `ClassEditorWorkspace.tsx`.

## [2.1.459-31] - 2026-08-25
### Documentation, Wiki Synchronisation & Master Plan Completion
- **Documentation & Wiki Architecture**:
  - Synchronized public wiki metadata and technical documentation under `docs/` reflecting engine systems, studio tools, and runtime asset management.
  - Updated release badges and version identifiers across all core application layers and public READMEs.
- **Master Plan Verification**:
  - All 8 progressive sprints fully audited, implemented, and verified with 100% test pass rate (189/189 test files, 870/870 unit tests).

## [2.1.459-30] - 2026-08-25
### Hero Roll, Spawner Diagnostics & Preload Groups (Sprint 4: Tasks A4, C3, D3)
- **Hero Roll & Candidate Randomization**:
  - Implemented `handleRollHero` in `character-creator.tsx` enabling valid randomized hero archetype, class, name, perk, and complementary modular layer generation with real-time UI notification.
- **Studio Diagnostics & Character Integrity**:
  - Added character class validation diagnostics to `StudioProblemsPanel.tsx` verifying map entities declare verified playable combat classes (`PLAYABLE_CLASS_IDS`).
- **Preload Groups & Container Aliases**:
  - Defined `DEFAULT_PRELOAD_GROUPS` (`Core`, `Player`, `Combat_Common`, `World_Common`) and exported `preloadContainer` alias in `assetRuntimeManager.ts`.

## [2.1.459-29] - 2026-08-25
### Lobby Identity, World Entry Pipeline & Social System (Sprint 3: Tasks B1, B2, B3)
- **Account vs Character Identity Separation**:
  - Enforced account usernames (`session.user.name`) across lobby chat and peer presence displays while keeping in-game character names strictly for avatar panels, inspection cards, and in-world nameplates.
  - Rewired the Gateway character showcase in `GameTitleScreen.tsx` to utilize canonical `CharacterSpritePreview` with proper LPC scaling.
- **World Entry Pipeline & Safety Validation**:
  - Implemented `validateWorldEntry` gate in `src/shared/game/validation/worldEntryValidation.ts` checking character selection, name constraints, class assignment, and destination map geometry integrity.
  - Documented full world entry trace and spawn location priority in `.docs/audit/world-entry-pipeline.md`.
- **Lobby Socket Stability**:
  - Verified socket effects depend on stable user IDs to maintain connection persistence across character switches.

## [2.1.459-28] - 2026-08-25
### Runtime Asset Manager Verification & Unit Tests (Sprint 2: Task D2)
- **Runtime Asset Lifecycle Testing**:
  - Expanded `assetRuntimeManager.test.ts` test suite to verify warm → active transitions, active → cached demotions, and cached → ready/active re-requests.
  - Verified container lifecycle management and diagnostics output for missing dependencies and broken graph references.

## [2.1.459-27] - 2026-08-25
### Character Presentation & Dynamic Sprite Resolution (Sprint 2: Task A3)
- **Character Creator Presentation Awareness**:
  - Implemented `detectPresentationMode(spriteKey, availableAssets)` to dynamically identify `modular` vs `complete` vs `portrait_only` sprite modes.
  - Replaced hardcoded pack directories with pattern-matched dynamic resolution (`good-*`, `evil-*`, `item-*`) across all modular LPC packs in `CharacterSpritePreview.tsx`.
  - Wired smooth creator navigation: automatically routes modular character selections to the multi-layer Avatar Customizer, while routing complete sprite selections directly to the Blessing step.

## [2.1.459-26] - 2026-08-25
### Asset Registry CRUD Hardening & Dependency Architecture (Sprint 1: Task D1)
- **Asset REST API Full CRUD**:
  - Exported `PUT` handler on `/api/assets/[id]` for full canonical asset updates alongside existing `GET`, `POST`, `PATCH`, and `DELETE`.
- **Asset Dependency Architecture**:
  - Documented canonical dependency chains (Character, Creature, Map) and auto-discovery rules in `.docs/audit/asset-dependency-patterns.md`.
  - Defined preload group matrix (`Core`, `Player`, `Combat_Common`, `World_Common`, `Zone_Specific`, `Lazy`) with priority weights and caching semantics.

## [2.1.459-25] - 2026-08-25
### Studio Bottom Toolbar & Dock Navigation Polish (Sprint 1: Task C1)
- **Bottom Toolbar Navigation**:
  - Audited all 17 studio dock panel launchers in `StudioBottomToolbar.tsx` (`World`, `Atlas`, `Inspector`, `Prefabs`, `Assets`, `NPCs`, `Quests`, `Dialogue`, `Heroes`, `Creatures`, `Spawners`, `Loot`, `Items`, `Classes`, `Gameplay`, `Diagnostics`, `Dev`).
  - Added live active tab state indicators (`active={Boolean(model?.getNodeById(id))}`) with highlight border and text glow to immediately reflect open docks.
  - Verified right-dock targeting for Inspector (`properties`) and Diagnostics (`problems`) vs left-dock targeting for asset and entity editors.

## [2.1.459-24] - 2026-08-25
### Character Model Validation & Canonical Glossary (Sprint 1: Tasks A1, A2)
- **Canonical Terminology Glossary**:
  - Published `.docs/glossary.md` standardizing canonical definitions for *Saint*, *Starter Hero*, *Entity Archetype*, *Player Archetype*, *Class*, *Game Character*, *CreatureDef*, and *Presentation*.
  - Enforced formal boundary separating engine behavioral entity archetypes from player-facing hero starter presets.
- **Character Creation & Model Hardening**:
  - Audited `GameCharacter` and `StarterHero` fields in `.docs/audit/character-model-audit.md`.
  - Added robust validation in `createGameCharacter` server action: enforced 3-32 character name limits, regex character whitelisting, duplicate character name detection per account, database/whitelist class validation, sprite path traversal sanitization, and state attribute boundary clamping.
  - Added cache revalidation for `/lobby` route upon character creation.

## [2.1.459-22] - 2026-08-25
### Studio Tileset Picker & Asset Catalog Fixes
- **Multi-Tile Stamping & Drag Selection**:
  - Connected `onBrushSelectPattern` in `WorldBuilderPanel.tsx` to `useEditorStore.setActiveBrushPattern` so multi-tile regions (2×2, 3×3, etc.) and click-and-drag selections immediately stamp full multi-tile patterns in Babylon.js.
  - Added global window-level mouse move and mouse up handlers so dragging across tiles is reliable and never gets interrupted when leaving the image.
  - Updated selection highlight box in `TilesetPicker.tsx` to render the full bounding box of the active pattern.
- **Granular 1-Block Navigation & Grid Size Switching**:
  - Changed default tileset import resolution to 16×16px (standard RPG tile unit) so tiles with odd 16px offsets (e.g. following a 3×3 structure) can be properly selected.
  - Added quick `[16px]` and `[32px]` grid resolution toggles in the tileset palette toolbar for 1-click grid switching.
  - Added keyboard arrow key navigation (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`) to step 1 block in any direction.
- **Asset Registration HTTP 405 Fix**:
  - Implemented `POST /api/assets` endpoint in `app/api/assets/route.ts` with developer/admin authentication to support saving canonical tile definitions into the game asset library.

## [2.1.459-21] - 2026-08-25
### Bug Fixes
- Removed SQLite-incompatible `@db.Text` annotation from the `stateData` field on the `GameCharacter` model in `prisma/schema.prisma` to fix `prisma generate` failures.

## [2.1.459-17] - 2026-08-25
### Character Creator Fix
- Disabled the modular avatar customization step (APPEARANCE) for base sprites and archetypes that are not modular. Choosing a non-modular hero now skips directly to the Blessing screen, avoiding the empty / mismatched layer screen.

## [2.1.459-16] - 2026-08-25
### Hero Studio Button Fix
- Properly routed "Heroes" and "Classes" dock buttons to the new full-screen `HeroStudioSuite` instead of attempting to spawn them as standard FlexLayout dock nodes.

## [2.1.459-15] - 2026-08-25
### Saints Gaming Hero Studio Unification
- **Hero Studio Suite**:
  - Migrated legacy `StarterHeroEditorPanel` and `ClassEditorPanel` into a unified `HeroStudioSuite`.
  - Replaced hardcoded preset data with live database lookups for classes and world maps.
  - Replaced the legacy Sprite Browser with the unified `AssetManager` integration for Archetype avatars.
- **Cleanup & Optimization**:
  - Removed deprecated flexlayout docks and floating modal mappings for characters and classes.
  - Eliminated mock `GAME_SPRITES` arrays, tags, and predefined `ARCHETYPE_PRESETS`.

## [2.1.459-14] - 2026-08-25
### Saints Gaming Lobby Redesign & Character Creator Refactor
- **Lobby Redesign**:
  - Streamlined `GameTitleScreen.tsx` to solely focus on Game Start, Character Creation, and Options, removing the legacy Chat and Realm Gateway UI columns.
- **Character Creator Improvements**:
  - Decoupled `character-creator.tsx` from internal setup logic.
  - Replaced hard-coded arrays for modular assets with dynamic sprite discovery powered by `useMemo` to pull from all available items.
  - Ensured that `CharacterSpritePreview` inherits proper layer data from dynamic selections.
- **System Standardization**:
  - Validated that `CharacterClass` logic matches canonical definitions.
  - Enforced strict separation of `StarterHero` templates (Archetypes) vs `GameCharacter` (Saints) across all creator endpoints and the backend `createGameCharacter` pipeline.

## [2.1.459-13] - 2026-08-25
### Tile Sheet Selector & Reusable Tile Library Integration
- **Eliminated Browser Native Image Dragging (`TilesetPicker.tsx`)**:
  - Replaced HTML5 native `draggable` ghost dragging on tilesheets with `draggable={false}` and `onDragStart={(e) => e.preventDefault()}` for seamless click-and-drag box selection.
- **Continuous Incremental Source-Region Selection**:
  - Decoupled selection size $(W, H)$ from movement increments $(\Delta c, \Delta r)$, allowing continuous 1-tile grid stepping across arbitrary source regions and presets.
  - Added live coordinate and source region status strip (`Region: X={col*tw}, Y={row*th} ({w}×{h} tiles)`).
- **Canonical Tile Definition System & Tile Library**:
  - Integrated "Save as Tile Definition" modal and context menu action to store selected regions directly in the Tile Library (`UsableAsset` with `type: 'TILE'`, `sourceRegion: { x, y, w, h }`, collision flags, materials, and tags).
  - Added `[ Tileset Palette ]` vs `[ Tile Library ]` tab switcher in `TilesetPicker` with search and tag filtering for immediate painting with saved canonical definitions.

## [2.1.459-12] - 2026-08-25
### Dedicated Animation Studio Suite
- **Interactive Animation Studio (`AnimationStudioPanel.tsx` & `AssetStudioSuite.tsx`)**:
  - Added full Animation Studio workspace featuring frame-strip timeline editor, customizable frame sizes ($W\times H$), FPS adjustment (1-30 FPS), ping-pong and loop playback controls, onion skinning, background backdrops, and live pixel-rendered preview canvas.

## [2.1.459-11] - 2026-08-25
### Asset Studio Workspace Catalog & Sub-Tab Unification
- **Direct Catalog Browsing Across All Asset Categories (`AssetStudioSuite.tsx`)**:
  - Unified `AssetStudioSuite` sub-tabs so selecting Characters or Creatures directly displays the full search, preview, and inspector catalog with an optional "Slot Builder" sub-tab for composite roles.
  - Initial view opens the Master Catalog by default, ensuring immediate access to global search, tagging, dependency inspector, and preload configuration cards.

## [2.1.459-10] - 2026-08-25
### Map Container Preloading & Runtime Asset Manager Transition Integration
- **Map Container Lifecycle Hooking (`maps.ts`)**:
  - Connected `loadMap` and `preloadAdjacentMaps` directly with `RuntimeAssetManager`.
  - Automatically packages map tilesets, background visuals, and presentation layers into a dedicated `map` container (`Map_${mapId}`).
  - Automatically warms destination and neighbor map containers before player transitions.
- **Singleton Accessor on RuntimeAssetManager (`assetRuntimeManager.ts`)**:
  - Added static `RuntimeAssetManager.getInstance()` singleton accessor for uniform global access across all client modules and dock systems.

## [2.1.459-9] - 2026-08-25
### Studio Multi-Tile Region Presets & Tile Collision Inspector
- **Tileset Region Presets Toolbar (`TilesetPicker.tsx`)**:
  - Added dedicated rectangular region selection presets toolbar (`1×1`, `2×2`, `3×3`, `4×4`, `2×3`, `3×2`) above the tilesheet preview.
  - Selecting a preset allows single-click pattern extraction of arbitrary NxM rectangular tile stamps.
  - Hover preview box dynamically expands to render the exact pixel footprint of the active multi-tile pattern.
- **Per-Tile Collision & Swimmable Controls (`TilesetPicker.tsx`)**:
  - Added direct gameplay flag action triggers to the right-click tile context menu:
    - **Mark as Solid Collision**: Dispatches collision tag for immediate walk-blockage.
    - **Mark as Swimmable Water**: Dispatches water mechanic flag for interactive water zones.

## [2.1.459-8] - 2026-08-25
### Asset Studio & Runtime Asset Lifecycle Architecture (Phase 1-4)
- **Runtime Asset Lifecycle & Manager Layer (`assetRuntimeManager.ts`)**:
  - Implemented `RuntimeAssetManager` with observable lifecycle states: `UNREGISTERED`, `DISCOVERED`, `QUEUED`, `LOADING`, `READY`, `ACTIVE`, `CACHED`, `RELEASED`, `ERROR`.
  - Added support for "Warm" (cached/standby) vs "Cold" (unloaded) assets for smooth map and zone transitions.
  - Implemented `AssetContainer` grouping (`Character`, `Creature`, `Environment`, `Map`) to bundle related dependencies together.
  - Added decoupled preloading support with named `PreloadGroup`s (`Core`, `Town`, `Dungeon`, `Combat_Common`, etc.).
  - Built comprehensive `getDiagnostics()` reporting missing dependencies, failed loads, and estimated memory footprint.
- **Canonical Schema Enhancements (`canonicalAsset.ts`)**:
  - Extended `CanonicalAssetInput` and `GameAsset` formatting with `dependencies`, `dependents`, `preloadGroup`, `preloadPriority`, and generic `presentation` (2D/2.5D/3D).
- **Asset Studio & Inspector Upgrade (`AssetEditor.tsx` & `AssetManager.ts`)**:
  - Added **Dependencies & Graph** inspector card with live dependency linking, removal, and orphan dependent visualization.
  - Added **Runtime Lifecycle & Preload** configuration card allowing creators to tune preload groups and loading priority per asset.
  - Added client-side `updateAssetDependencies` and `updateAssetPreload` API handlers to `AssetManager`.
- **Runtime Asset Health Diagnostics (`StudioProblemsPanel.tsx`)**:
  - Added dedicated **Runtime Asset Health** tab into the diagnostics suite to detect missing presentations, broken tileset source URLs, and entity dependency issues.

## [2.1.459-7] - 2026-08-25
### Studio Tileset Context Menu, Layer Deletion & 16x16 Scaling Fix
- **16x16 / Arbitrary Tileset Scaling Fix (`tileBatchHelpers.ts`)**:
  - Fixed `groundQuadPositions` where maps without explicit `baseTileSizePx` caused 16x16 tilesets to shrink into half-size quads (0.5×0.5), leaving black gaps between cells. Square tiles now seamlessly span the 1.0×1.0 grid footprint without gaps.
- **Tile Palette Right-Click Context Menu (`TilesetPicker.tsx`)**:
  - Added rich interactive context menu on right-clicking any tile in the tilesheet palette:
    - **Tile Inspector**: GID #, local ID, row, col, and pixel dimensions.
    - **Select as Active Brush**: Instantly primes the brush with the selected tile GID.
    - **Fill Active Layer (L{activeLayerIdx})**: Flood-fills the active layer with this tile GID.
    - **Fill Entire Map Ground (L0)**: Fills the entire base ground layer.
    - **Save as Individual Tile (PNG)**: Slices the single 16×16 or 32×32 tile from the tilesheet and triggers a clean pixel-perfect PNG download.
    - **Set as Realm Default Ground**: Persists the tile as the default ground fill.
    - **Copy Tile GID**: Copies the GID number to the clipboard with toast feedback.
- **Tile Layer Deletion & Clearing Controls (`TilesetPicker.tsx` & `WorldBuilderPanel.tsx`)**:
  - Added delete buttons (Trash icon) to remove non-base tile layers (`> 0`) with live map reload.
  - Added clear buttons (Eraser icon) to reset all tiles on a layer without deleting the layer structure.
  - Added flood fill handler for instant layer filling.

## [2.1.459-6] - 2026-08-25
### Critical Fix: Studio Map Paint Saving & White Map Rendering
- **Preserve User Paint on Save (`studioTilesetBootstrap.ts` & `studioMapCreate.ts`)**:
  - Removed destructive `LEGACY_BAD_GROUND_GIDS` heuristic that automatically erased valid tile GID 1 (the first tile of a tileset) across the map upon saving.
  - Updated `normalizeStudioMapVisuals` to never overwrite user-painted visual layers with blank default ground.
- **Tileset Texture URL Resolution (`tileBatchHelpers.ts` & `BabylonEngine.ts`)**:
  - Added unified `resolveTilesetTextureUrl` to cleanly resolve remote URLs (`https://...`), uploads (`/uploads/...` and `uploads/...`), and game assets without 404 URL encoding bugs.
- **Unlit Material Shading Fix (`BabylonEngine.ts`)**:
  - Fixed `applyTileMaterial` and `configureTilesetMaterial` where unlit materials (`disableLighting = true`) with missing or fallback textures defaulted to pure white `(1, 1, 1)` emissive color. Emissive color now correctly mirrors the target ground color.

## [2.1.459-5] - 2026-08-25
### Architectural Cleanup: Single Source of Truth for Map State & Hydration Protection
- **Single Source of Truth (`GameCanvasBabylon.tsx`)**:
  - Eliminated redundant local `useState(mapData)` in `GameCanvasBabylon.tsx` in favor of directly consuming the authoritative `activeMapData` from `useGameStore`.
  - Removed all two-way state synchronization effects, preventing any nested setState cascades between Canvas rendering and the global store.
- **Session Init Guard (`TheLobby`)**:
  - Added `hasAuthInitializedRef` guard to prevent character/author session initialization from re-executing upon state transitions.
- **Hydration Mismatch Mitigation**:
  - Added `suppressHydrationWarning` to the root `body` tag in `app/layout.tsx` to handle browser extension and theme attributes cleanly.

## [2.1.459-4] - 2026-08-25
### Critical Fix: React Error #185 (Maximum Update Depth Exceeded) in Studio & Lobby
- **Reference Equality Stabilization**:
  - Fixed `ensureMapHasStudioTilesets` in `studioTilesetBootstrap.ts` to preserve reference equality (`map === next`) when no modifications to `tileLayers` or `tilesets` are required.
  - Resolved circular state synchronization loop between `useState(mapData)` in `GameCanvasBabylon.tsx` and `useGameStore.setActiveMapData` in the parent lobby/studio container that repeatedly triggered setState updates.
  - Evaluated stabilized map instance before calling `setMapData` to eliminate infinite React reconciliation cycles on `/studio` and `/lobby`.

## [2.1.459-3] - 2026-08-25
### Comprehensive Architecture Fix: Structural Terminology Purge & Setup Wizard Tileset Workflow
- **LPC / Tuxemon Terminology Purge**:
  - Replaced legacy naming across asset managers, sprite definitions, ability registries, upload routes, admin pages, and wiki guides with structural terminology (`modular`, `creature`, `classic_3x4`).
  - Migrated `/admin/game-dev/tuxemon` to canonical `/admin/game-dev/creatures`.
  - Renamed `tuxemon_capture` to `creature_capture` in the ability registry.
- **Setup Wizard Steps 4 & 5 Ground Tileset Workflow**:
  - Removed hardcoded default tile options referencing non-existent GIDs in `EnvironmentSetupStep.tsx`.
  - Added integrated tileset selector with catalog browsing (`SpriteBrowser`) and direct upload (`AssetUploadView`), with an interactive tile grid to click and select custom ground fill tiles.
  - Step 5 (`StartingMapStep.tsx`) seamlessly inherits the selected tilesheet and default ground fill tile from Step 4.
- **Production Errors & Warnings**:
  - Confirmed blank map fallback on `/api/maps/[slug]` to prevent client 404s from triggering React #185 crashes.
  - Suppressed noisy console warnings for missing adventurer fallback sprite in `BabylonEngine.ts`.
- **Quality & Test Integrity**:
  - All 187 test suites (859 unit/integration tests) pass cleanly.
  - TypeScript zero-error compilation validated across entire project.

## [2.1.459-2] - 2026-08-24
### Bug Fix: MySQL Asset Uploads
- **Pre-Push Schema Generation**: Addressed a critical crash on production MySQL deployments where uploading LPC spritesheets triggered a Prisma `VARCHAR(191)` limit.
- **Dynamic Adapter**: Replaced post-push schema patching with `scripts/prepare-prisma.js` which dynamically generates the correct Prisma provider and `@db.Text` mappings *before* Prisma generates its client or pushes to the database, cleanly preventing schema drift while fully preserving the baseline SQLite compatibility of the repository.
## [2.1.459] - 2026-08-24
### Game Setup 2.0 - Canonical Asset Integration
- **Deep Codebase Audit**: Completed system audit mapping the Setup UI to the Asset Manager and Babylon Runtime.
- **Requirement Engine**: Setup wizard dynamically calculates required asset types and quantities based on the selected game style (MMO vs Turn-Based Hybrid).
- **Setup Asset Picker Integration**: Replaced legacy, disconnected upload UI with a new tabbed SetupAssetPicker that bridges SpriteBrowser, AssetUploadView, and SpritesheetSlicer directly into the setup wizard.
- **Canonical Asset Persistence**: Guided upload enforces resolving assets to valid GameAssetItem (canonical IDs) before persistence, entirely bypassing legacy string-path fragmentation.
- **Setup Babylon Preview**: Added a live WebGL visual preview component (SetupBabylonPreview.tsx) in the setup wizard that faithfully renders selected sprite sheets using the actual Babylon engine logic, cell UV calculations, and animation profile configurations.

## [2.1.456] - 2026-08-23
### Game Initialization Flow & Safe Update Architecture
- **Refactored Game Setup & Onboarding**:
  - Replaced legacy realm/platform setup with a game-specific, content-driven onboarding wizard (GameInitializationWizard.tsx).
  - Implemented 2-option entrypoint: **Fresh Game** (active) and **Import Data** (coming soon placeholder).
  - Added general game questions (Name, Description, Genre, Gameplay Style, Camera View) that dynamically calculate game content requirements.
  - Implemented asset-type aware entity setup supporting **Sprite Sheets**, **Modular Characters (LPC)**, and **Single Images**, with multiple hero/creature collection support.
  - Added environment tile configuration and visual default fill tile selection.
  - Created interactive HTML5 canvas starting map editor with brush painting and player spawn point pin placement.
- **Durable Game Initialization State & Update Protection**:
  - Defined explicit game initialization keys (GAME_INITIALIZED, GAME_NAME, GAME_GENRE, DEFAULT_MAP_ID, DEFAULT_GROUND_GID).
  - Enhanced evaluateSetupStatus to recognize existing games (maps > 0, active configs, users > 1) and guarantee updates never force developers back to setup or wipe data.
  - Created transaction-safe atomic initialization API endpoint (/api/setup/initialize-game).
## [2.1.455] - 2026-08-23
### Cleanup
- Delete leftover untracked scripts and finalize legacy term renaming.

## [2.1.454] - 2026-08-23
### Architectural Gut & Canonical Saints Pipeline Audit
- **Full Legacy / Tuxemon Gut & Canonical Alignment**:
  - Migrated database schema (`prisma/schema.prisma`) defaults for `WorldMap`, `GameAsset`, `QuestTemplate`, `StarterHero`, `CreatureDef`, `WorldAtlas`, and `UsableAsset` to canonical `gameId: "saints"`.
  - Promoted `saints` as `DEFAULT_WORLD_PROFILE_ID` across world profiles, Atlas API (`app/api/world/atlas/route.ts`), and Go MMO server (`the-lobby/internal/httpapi/maps.go`, `the-lobby/internal/db/sqlite.go`, `the-lobby/internal/bootstrap/demo.go`).
  - Updated Asset Manager ingest and canonical resolution to default `gameId` to `"saints"` and added canonical `saints-3x4` sprite animation profile (`src/shared/game/spriteDefinitions.ts`).
  - Tagged all Starter Heroes and Quests with `gameId: "saints"` (`scripts/ensure-starter-heroes.ts`, `scripts/ensure-world-profiles.ts`).
  - Added new automated validation and audit toolchain:
    - `scripts/audit-legacy-references.ts` (`npm run audit:legacy`): Scans codebase for forbidden paths or legacy bundle imports.
    - `scripts/validate-canonical-data.ts` (`npm run validate:data`): Validates database integrity across maps, atlas nodes, heroes, and creature definitions.
  - Implemented `src/server/cloneSaintsTrail.ts` for safe profile cloning and map templating.

## [2.1.453] - 2026-08-23
### Realm Architecture & Map Engine
- **Purged Premade Demo Maps & Generator Scripts**:
  - Removed all hardcoded procedural demo map builders (`buildDemoSandboxGrid`, `buildLobbyGrid`, `buildSaintsHavenGrid`, etc.) from `src/server/demoMapSeed.ts`.
  - Deleted legacy demo map seed JSON files (`demo_map.json`, `demo_map2.json`) and obsolete demo generator scripts.
  - Simplified server startup in `DemoBootstrap.ts` to only seed baseline Studio logic tile tools (SOLID, WATER, SPAWN, BANK, GATE) and essential species catalogs without forcing fake or demo maps into `WorldMap`.
  - Converted Setup Wizard to purely initialize a Clean World Canvas, ready for custom level design directly inside Saints Studio.

## [2.1.452] - 2026-08-23
### Community Platform & Documentation
- **README & Storyline Refresh (`README.md`)**:
  - Grounded project identity around Saints Gaming's 2007 community history and brand new website rebuild.
  - Focused documentation on core integrated features: community forums/news, feed & video shorts, unified in-game Gold economy with physical banks, embedded 2.5D game, and in-browser Saints Studio creator suite.

## [2.1.451] - 2026-08-23
### Documentation & Asset Cleanup
- **Complete Third-Party Prototype Asset & Attribution Removal**:
  - Confirmed all legacy game sprites, LPC, and Tuxemon asset bundles are archived offline into `.old-assets/` and excluded from repository tracking.
  - Removed `docs/TUXEMON_ATTRIBUTION.md` and pruned third-party asset license dependencies.
  - Refreshed `README.md` and documentation wiki (`docs/`) with clean descriptions in GioGimic's indie developer style.

## [2.1.450] - 2026-08-23
### Onboarding & Setup Architecture
- **2-Option Setup Architecture (`FirstTimeSetupWizard.tsx`)**:
  - Implemented the 2-mode setup selection: **Fresh Setup** (active, configuring realm identity, blank canvas or starter pack) and **Import Realm** (`(coming soon)`).
- **Non-Blocking Updated Server Protection (`setupDetection.ts`, `FirstTimeSetupWizard.tsx`)**:
  - Hardened setup evaluation: servers with existing maps or user records are recognized as active updated servers where `isSetupCompleted` is true and `isFreshInstall` is false.
  - Setup wizard never blocks regular gameplay, studio editing, or redirects, and will never overwrite existing world maps or character data on server upgrades.
  - Added an informational banner on the `/setup` route for updated servers with instant links to enter Studio or play in the Lobby.

## [2.1.449] - 2026-08-23
### Asset Pipeline & Optimization
- **Offline Asset Archival & Removal (`.old-assets`, `.gitignore`)**:
  - Removed all legacy baked-in game sprites, creature sheets, tilesets, and tuxemon database assets from git tracking.
  - Relocated local assets to `.old-assets/` (`game-assets`, `assets`, `tuxemon-data`, `tuxemon-db`).
  - Added `/.old-assets/`, `/public/game-assets/`, `/public/assets/`, `/tuxemon-data/`, `/tuxemon-db/` to `.gitignore`.

## [2.1.448] - 2026-08-23
### Architecture & World Systems
- **World Atlas Canonical Source-of-Truth Migration (`app/api/world/atlas/route.ts`)**:
  - Established `WorldAtlas` as the sole canonical database authority for World Atlas layouts.
  - Eliminated the `updatedAt` reconciliation guessing between `WorldAtlas` and `SiteSetting` records.
  - Removed destructive `connectionsByMap` map-overwriting loops that previously overwrote `gatesData`/`gates` on `WorldMap` and `GameMap` database records on every save.
- **Placement-Aware Map Caching & Deduplication (`src/web/components/the-lobby/data/maps.ts`)**:
  - Replaced the single `mapId` cache bucket with placement-aware composite keys (`mapId@atlasNodeId`), enabling multiple instances of the same map definition (e.g. `FOREST` at (5,4) and `FOREST` at (10,9)) to coexist concurrently without chunk or neighbor corruption.
  - Hardened `loadMap` against ambiguous fallbacks: if multiple nodes use the same `mapId` and no `atlasNodeId` is specified, `loadMap` logs an explicit warning rather than arbitrarily selecting the first placement.
- **Node-Aware Spatial Adjacency & Boundary Warps (`spatialAtlas.ts`, `WorldSimulation.ts`, `GameCanvasBabylon.tsx`)**:
  - Boundary transitions now emit `targetNodeId` in gate metadata, passing exact node identity across map loads and keeping `activeAtlasNodeId` synchronized in `useGameStore`.
  - Resolved UI inspection collision in `WorldAtlasPanel.tsx` and `AtlasStudioSuite.tsx` by using `getAdjacentAtlasNeighbors(atlasData, selectedNode)` instead of dictionary lookups by `selectedNode.mapId`.
  - Replaced React keys with persistent node IDs (`key={node.id}`) across Studio Atlas grids.
- **Atlas Diagnostics Payload Inspector (`AtlasDiagnosticOverlay.tsx`, `StudioEditorShell.tsx`)**:
  - Implemented real-time developer diagnostic overlay displaying active map ID, active node ID, placement cache key, loaded seamless chunk count, and full cardinal neighbor readouts for all placed Atlas nodes.

## [2.1.446] - 2026-08-23
### Features & Systems
- **Global Gold Bank Conversion (`SocialTip`, `Analytics`, `logicComponents`)**:
  - Replaced the USD `$0.00` based tipping and revenue system across the social feed and analytics hub to natively use in-game `Gold` (`user.coins`).
  - Analytics "Revenue" has been rebranded to "Gold Earned", updating visual displays with correct Gold metrics.
  - Earning 5 Gold per 100 views is now automatically deposited to the author's Global Bank (User `coins`).
- **Global Bank Studio Logic Tile (`bank-overlay.tsx`, `GameCanvasBabylon.tsx`)**:
  - Added a new map logic component (`BANK`, ID 24) for World Builders to place functional banks inside 2.5D game maps.
  - Implemented the `<BankOverlay />` game UI, allowing players to securely Deposit and Withdraw gold between their character's inventory and their account-wide Global Bank.

## [2.1.445] - 2026-08-23
### Features & UX
- **Chatbox Reel / TikTok-Style Feed Viewer Integration (`MiniSocialFeed`, `ShortsViewerModal`)**:
  - Extracted and created the reusable `<ShortsViewerModal />` supporting immersive full-screen video playback, audio stems, double-tap heart animations, vertical swipe/scroll navigation, and interactive comments.
  - Linked post body, video thumbnails, and "Watch" actions in the bottom-right chatbox Messenger popup to launch the full-screen TikTok-style Shorts viewer seamlessly.

## [2.1.444] - 2026-08-23
### Security & Authentication
- **Enforced Login on The Feed (`/profile/inbox`, `/feed`, `getTheFeed`)**:
  - Protected the main feed route (`/profile/inbox`) and alias (`/feed`), automatically redirecting unauthenticated visitors to `/login?callbackUrl=/profile/inbox`.
  - Enforced strict session authentication checks in `getTheFeed` server action to secure social post feeds from anonymous access.

## [2.1.443] - 2026-08-23
### Fix
- **Forum & News AI Text Enhancement (`/api/ai/enhance`, `/admin/forum/settings`)**:
  - Upgraded Google GenAI model to `gemini-2.0-flash` with automatic fallback to `gemini-1.5-flash` to eliminate model endpoint not found errors.
  - Added in-panel Gemini API Key configuration so administrators can save their Gemini API key directly to the database via Admin Settings without requiring server environment restarts.
  - Replaced editor alert popups with fluid Sonner toast notifications in `MarkdownEditor`.

## [2.1.442] - 2026-08-23
### Fix
- **Pixel Art Asset Studio UI & Data Projection (`/admin/game-dev/assets`)**: Fixed asset mapping and rendering for 1600+ database assets.
  - Normalized `GameAsset` columns (extracting `name`, `type`, and smart category mapping into `Terrain`, `Monsters/Beasts`, `NPCs`, `Items`, `Environment`).
  - Added fast client-side search, category filter counts, and responsive pagination (48 items per page) to eliminate rendering bottlenecks.
  - Added robust image fallback placeholders when source files are unavailable.

## [2.1.441] - 2026-08-23
### Fix
- **Realtime Platform Route Resiliency (`/api/admin/realtime`)**: Hardened route handler against module bundling failures by attaching `RealtimeService` to `globalThis`, safely catching unhandled exceptions, and gracefully returning standby telemetry metrics instead of HTTP 500 errors.

## [2.1.440] - 2026-08-23
### Fix
- **TypeScript Type Safety in Layout & Profile**: Selected `isWriter` in user Prisma query in `app/(main)/profile/page.tsx` and updated `app/(main)/layout.tsx` to resolve Next.js production typecheck validation.

## [2.1.439] - 2026-08-23
### Fix
- **Profile Layout JSX Tagging**: Restored missing `<CardContent>` container tag in `app/(main)/profile/page.tsx` resolving Next.js build compilation failure.

## [2.1.438] - 2026-08-23
### Phase 10: Operational Intelligence & Master Control Center Sign-Off
- **Full 10-Phase Transformation Complete**: Completed comprehensive overhaul and modernization of the entire Saints Gaming Administration & Developer suite.
- **Unified Operational Mesh**: Harmonized 27 canonical administrative modules, real-time health checks, database diagnostics, multi-game server fleet telemetry, and 2.5D World Studio shortcuts into an enterprise-grade command console.
- **Universal Observability & Navigation**: Integrated `Ctrl+K` Global Command Palette, `DevSubNav` developer suite bar, persistent Favorites & Recents history, and context-preserving smart exit mechanics.
- **Zero-Defect Verification**: Executed 187 test suites with 838 unit tests passing across all game systems, netcode, and UI components.

## [2.1.437] - 2026-08-23
### Phase 9: Global Command Palette
- **Universal Command Palette (`GlobalCommandPalette`)**: Built site-wide `Ctrl+K` / `Cmd+K` keyboard shortcut popup enabling rapid fuzzy-search navigation across modules, quick actions, and public destinations.
- **Categorized Command Dispatcher**: Dynamically organizes visible actions by operational pillars (Quick Actions, Overview, Operations, Community, Identity, Infrastructure, Developer Tools, and Community Navigation).
- **Role-Aware Security**: Command list automatically respects viewer permission level (e.g. Studio, Realtime Bus, Support Tickets, and News Creator only appear when authorized).
- **Global Layout Integration**: Mounted in `app/(main)/layout.tsx` for instant accessibility anywhere on the platform.

## [2.1.436] - 2026-08-23
### Phase 8: Account Center Cleanup
- **Profile & Account Center Separation (`/profile`)**: Clearly demarcated personal community features (Feed, Bookmarks, History, Analytics, FiveM UCP, MMO heroes) from administrative operations.
- **Operator Fast-Switch Banner**: Provided staff/moderators/writers with an elegant, compact **Operator Tools** widget linking directly to Admin Command Center and 2.5D World Studio without polluting regular user account views.
- **Support & Ticketing Boundary (`/support`)**: Confirmed support page operates solely on authenticated user ticket history, keeping staff administrative triage strictly inside `/admin/tickets`.

## [2.1.435] - 2026-08-23
### Phase 7: Site-Wide Navigation Audit
- **Navbar & User Dropdown Alignment (`navbar.tsx`)**: Updated user navigation dropdown and mobile slide-out sheets with strict, role-aware permission gates:
  - Added dedicated **2.5D World Studio** shortcut for Admin / Dev operators (`permissionLevel >= 300`).
  - Added **Admin Command Center** entry for all operators (`permissionLevel >= 200` or `isWriter`).
- **Mobile Navigation Parity**: Synchronized mobile drawer options with desktop navigation, eliminating broken and unauthenticated admin links.

## [2.1.434] - 2026-08-23
### Phase 6: Integrate Developer Tools
- **Developer Tools Sub-Navigation (`DevSubNav`)**: Created a persistent top navigation bar connecting Console Home, Database Diagnostics, Realtime Bus, System State, Metrics Telemetry, Background Tasks, and API Sandbox.
- **Developer Console Rebuild (`/admin/dev`)**: Rebuilt the console landing page with a complete architectural sitemap of all 27 registered admin modules, public routes, and REST endpoints.
- **Unified Diagnostic Navigation**: Embedded `DevSubNav` across `/admin/dev/database`, `/admin/dev/system`, `/admin/dev/metrics`, `/admin/dev/tasks`, `/admin/dev/sandbox`, and `/admin/realtime`.

## [2.1.433] - 2026-08-23
### Phase 5: Integrate World / MMO / Asset Operations
- **Unified MMO & World Operations (`/admin/game`)**: Rebuilt game management surface with dual sub-tabs for Active Heroes & Inventory Control and World Maps & Atlas Registry.
- **Hero & Inventory Admin Tools**: Added quick currency adjustments (+500 / +5k / -500), Item ID injector with custom quantities, emergency unstuck position reset to DEMO_SANDBOX (8, 8), and character deletion.
- **World Maps & Atlas Browser**: Integrated live map database browser showing versioning, gate connections, NPC spawns, encounter weights, and direct deep-links to edit maps in the 2.5D Studio.
- **Server Actions**: Added `adminResetPlayerPosition`, `adminAdjustPlayerGold`, `adminDeleteGameCharacter`, and `fetchWorldMapsDetailed`.

## [2.1.432] - 2026-08-23
### Phase 4: Rebuild Admin Overview (Command Center)
- **Live Operational Landing (`/admin`)**: Rebuilt the overview dashboard to answer *"What is happening right now?"* across all gaming, community, and system operations.
- **System Health Strip**: Integrated status indicators for Database (dynamic SQLite vs MariaDB), Socket.IO Realtime Bus, MMO Engine, and Multi-Game Dedicated Server fleet.
- **Action Required Alerts**: Surfaced high-priority actionable items (pending stream approvals, open support tickets in queue, unpublished news drafts, and restricted accounts).
- **MMO & World Telemetry**: Added live stats for registered Saints characters, creature species catalog, active quests, pixel sprites, custom world maps, and direct World Studio launcher.
- **Recent Administrative Activity**: Embedded timeline for latest published announcements, support tickets, and newest registered community members.

## [2.1.431] - 2026-08-23
### Phase 3: Rebuild Admin Shell
- **Operating Shell Header**: Integrated live system status indicator, operator avatar identity badge with dynamic role color/label, and contextual exit button.
- **Context-Aware Smart Exit**: Updated shell close button to inspect `searchParams` (`?from=`), `sessionStorage` (`sg_last_non_admin_route`), and history stack to return operators to where they were (`/studio`, `/lobby`, etc.) instead of hardcoded `/home`.
- **Breadcrumb Navigation**: Added contextual breadcrumb hierarchy (`Admin > Category > Module`) with quick favorite/pin toggle for the active module.
- **Favorites & Recent Views**: Implemented persistent localStorage-backed pinned favorites and 5 most recent admin module history in sidebar.
- **In-Shell Module Filter**: Added live search and filter input within the admin navigation drawer.

## [2.1.430] - 2026-08-23
### Phase 2: Canonical Admin Module Registry
- **Unified Admin Registry (`admin-modules.ts`)**: Created the single canonical `AdminModule` data structure and registry defining categories, labels, icons, permissions, exact match flags, keywords, and metadata.
- **Categorized Taxonomy**: Established 6 canonical operational pillars (`overview`, `operations`, `community`, `identity`, `infrastructure`, `developer`).
- **Dynamic Shell Integration**: Updated `AdminOverlayShell` to dynamically consume the module registry with automatic permission filtering and category ordering, eliminating duplicated navigation arrays.
- **Registry Helpers & Search**: Added `getVisibleAdminModules`, `getCategorizedAdminModules`, `getActiveAdminModule`, and `searchAdminModules` with full Vitest unit test coverage (6 passing unit tests).

## [2.1.429] - 2026-08-23
### MariaDB / MySQL Provider Health & Dynamic Dev Dashboard
- **Dynamic Database Health Status**: Updated `/admin/dev/database` and `/admin/dev/system` to dynamically detect and reflect whether the app is running on MariaDB/MySQL vs SQLite based on active environment variables (`DB_PROVIDER` / `DATABASE_URL`).
- **Database Migration Clarity**: Clarified migration panel descriptions in dev settings to avoid misleading hardcoded SQLite references when connected to MariaDB.

## [2.1.428] - 2026-08-23
### Community Forums Modernization & Modular Reordering
- **Modern Modular Forum Index**: Redesigned `/forum` with a high-impact glassmorphic hero banner, search bar, active board counters, recent discussions ticker, and category cards.
- **Removed Outdated Roleplay References**: Updated forum descriptions and seed categories to focus on Game News, Hero Battles, MMO World Studio, and Community.
- **Admin Category & Subcategory Reordering**: Added `/api/admin/forum/reorder` endpoint and implemented reorder handlers in `CategoryManager` for organizing categories and boards.
- **Dynamic Loading Skeleton**: Updated `/forum/loading.tsx` to match the new modular structure.

## [2.1.427] - 2026-08-23
### Phase 6: Runtime Connection Unification
- **Runtime Border & Seam Traversal**: Unified boundary step evaluations in `WorldSimulation.ts` and `borderWarp.ts` against authoritative Atlas adjacency.
- **Visual Neighbor Bleed**: Supported edge look-ahead rendering (`neighborEdgeStrips`) in `BabylonEngine.ts` to preview adjacent connected maps seamlessly.

## [2.1.425] - 2026-08-23
### Phase 5: Unified Painting & Stroke Engine
- **Unified Paint Operations**: Consolidated cell painting (`paintCell`, `paintCellWithHistory`, and `eraseTilesInRegion`) with single-transaction undo/redo across both visual layers and logic layer `-1`.
- **Stroke Engine Validation**: Verified Bresenham line rasterization (`rasterizeLine`) for Shift straight-line painting and deduplicated cell stroke undo stacks with 40 unit tests passing.

## [2.1.424] - 2026-08-23
### Phase 4: Unified Logic Authoring & Gate Normalization
- **Canonical Logic & Gate Handling**: Verified canonical gate normalization (`normalizeGatesToArray` and `normalizeGates`) and logic presets interoperability across `logicComponents.ts` and `mapGates.ts`.
- **Validation**: Added unit test suite coverage for gate normalization and backward compatibility across array and key-value formats.

## [2.1.423] - 2026-08-23
### Phase 3: Atlas Editor UX & State Integration
- **Selected Atlas Node State**: Added `selectedAtlasNodeId` and `setSelectedAtlasNodeId` to `useEditorStore` for shared selection sync between World Atlas dock, Atlas Studio Suite, and the Inspector.
- **Atlas-to-Editor Navigation**: Linked selection context seamlessly across Atlas Studio, World Builder, and Viewport warp actions.

## [2.1.422] - 2026-08-23
### Phase 2: Atlas Topology Unification & Active Node State
- **Active Node Identity Tracking**: Added explicit `activeAtlasNodeId` state and `setActiveAtlasNodeId` action to `useGameStore`, ensuring accurate placement identification during multi-instance map placements.
- **Topology Linter Normalization**: Updated `lintWorldAtlasConnectivity` to check slot overlaps on canonical `x`/`y` coordinates seamlessly.
- **Atlas Spatial Validation**: Verified full 4-way spatial adjacency, border warp calculations, and unit tests across the unified Atlas engine.

## [2.1.421] - 2026-08-22
### Sunset / Dawn-Dusk Atmospheric Light Theme Overhaul
- **Sunset Palette Harmonization**: Replaced the stark white light theme with a rich, luminous Dawn & Dusk twilight aesthetic (`#240046` background depth with sunrise amber `#f9c74f`, sunset orange `#f8961e`, dusk magenta `#f72585`, and twilight blues `#4361ee` / `#4cc9f0`).
- **Global Theme & Switcher Polish**: Updated `.light` design tokens across cards, popovers, borders, and sidebar states, aligning with the landing page Style #3 and pregame screen art directions.

## [2.1.420] - 2026-08-22
### Body Portal Attachment for Shorts Reel Swiper Modal
- **Direct Body Portal Attachment (`createPortal`)**: Mounted the full-screen reel/shorts modal directly to `document.body` via React's `createPortal`, breaking out of ancestor page animations, transforms, and overflow constraints.
- **True Viewport Centering**: Fixed modal coordinates (`top: 0, left: 0, right: 0, bottom: 0, w-screen h-screen z-[999999]`) ensuring the viewer opens squarely centered on-screen over the navbar and regardless of how far down the feed was scrolled.

## [2.1.419] - 2026-08-22
### Edge-to-Edge Feed Layout & Fixed Viewport Shorts Reel Viewer
- **Expansive Feed Layout**: Expanded the inbox page container from constrained `max-w-7xl` to `max-w-[1720px]` and widened the feed stream column from `max-w-2xl` to `max-w-4xl 2xl:max-w-5xl` for an edge-to-edge desktop experience.
- **Fixed & Wide Desktop Reel Viewer**:
  - **Fixed Viewport & Scroll Locking**: Fixed the reel modal directly in the screen center (`fixed inset-0 z-[9999]`) and locked document body scroll upon opening, eliminating awkward jumps or offscreen scrolling.
  - **Wide PC Aspect Support**: Expanded modal container width up to `md:max-w-3xl lg:max-w-4xl xl:max-w-5xl` with high-resolution centered media rendering (`max-h-[88vh] md:max-h-[84vh] object-contain`).
  - **Wheel & Keyboard Navigation**: Enabled seamless mouse wheel scroll up/down (debounced with comments drawer protection) and Arrow/Page keys to transition instantly between previous and next posts.

## [2.1.418] - 2026-08-22
### Harmonize Service & Setup Script Naming (`saints-lobby.service` & `setup-the-lobby.sh`)
- **Service Name Standardization**: Renamed `saints-go-mmo.service` to `saints-lobby.service` with description `Saints Gaming The Lobby Realtime MMO Server (:3001)` and syslog identifier `saints-lobby`.
- **Setup Script Standardization**: Renamed `setup-go-mmo.sh` to `setup-the-lobby.sh` and created backward-compatible forwarding wrappers across all setup orchestration routines (`scripts/setup.sh`, `scripts/audit-systemd.sh`, and documentation).

## [2.1.417] - 2026-08-22
### Rename `go-mmo` Directory to `the-lobby`
- **Go MMO Directory Renaming**: Renamed the standalone Go MMO realtime server directory from `go-mmo/` to `the-lobby/` across the repository:
  - **Go Module & Imports**: Updated `go.mod` to `github.com/giogimic/SaintsGamingWeb/the-lobby` and replaced all internal Go package imports across `the-lobby/internal/...` and `the-lobby/cmd/...`.
  - **Deployment & Service Configurations**: Updated `scripts/setup.sh`, `scripts/audit-systemd.sh`, `scripts/systemd/saints-go-mmo.service`, `the-lobby/scripts/setup-go-mmo.sh`, `the-lobby/README.md`, `README.md`, and `AGENTS.md` to reference `the-lobby/`.
  - **Test Suite Verification**: Verified that `go test ./...` in `the-lobby/` and `npm test` across all 186 test suites pass with zero regressions.

## [2.1.416] - 2026-08-22
### Pre-Game Screens & Character Creation Dynamic Theme Integration
- **Universal Pre-Game Theme Synchronization**: Updated all pre-game game entry interfaces to dynamically inherit the active theme (`Light / Style #3 Dreamy Sunset`, `Vice`, and `Dark / Midnight Tropical`):
  - **Character Creation & Archetype / Class Pick** (`character-creator.tsx`): Dynamic background, Archetype cards, identity forms, and review steps reflect theme styling.
  - **Character Selector & Vault** (`character-selector.tsx`): Operative hero cards, roster lists, and gateway headers reflect theme styling.
  - **Server / Realm Selection** (`ServerSelect.tsx`): Realm list cards, ping indicators, and command actions reflect theme styling.
  - **Game Title Screen** (`GameTitleScreen.tsx`): Full palette synchronization across top bar, action panels, and quick launch buttons.
  - **Game Login & Offline Gateways** (`GameLogin.tsx` & `GameOfflineScreen.tsx`): Background layers and glassmorphic modal cards reflect theme styling.
  - **Shared Tropical Horizon Engine** (`MidnightTropicalBackground.tsx`): Dynamically renders Style #3 radiant golden sun, sunset water reflections, and sunset particle embers in Light mode, vibrant neon sunset in Vice mode, and midnight starfield in Dark mode.

## [2.1.415] - 2026-08-22
### Style #3 "Dreamy Sunset" Integration for Light Theme
- **Landing Page Style #3 Integration**: Configured the landing page (`app/page.tsx`) so that when "Light" theme is active, it displays **Style #3 (Dreamy Tropical Sunset)** featuring the glowing golden sun disc, reflective ocean water wavelets (`S3Water`), silhouetted framing palms (`S3Palms`), ambient sunset embers, and glowing gold & fuchsia action buttons.
- **Global Light Theme Horizon Synchronization**: Refactored the global `.light` CSS theme variables in `app/globals.css` to adopt a warm golden-hour / dreamy sunset palette (warm pearl/cream surfaces, amber/gold borders, fuchsia accents, and plum typography) across all community menus, HUD overlays, dialogs, and panels.
- **Landing Page Theme Switcher**: Embedded the floating `ThemeSwitcher` onto the landing page top-right corner for instant real-time style preview and toggling.

## [2.1.414] - 2026-08-22
### "Vice" Tropical Sunset Theme & Palm Horizon Aesthetic
- **Vice Theme Transformation**: Replaced the legacy Hacker style with a tropical "Vice" theme modeled after the palm sunset skyline:
  - **Sunset Horizon Palette**: Deep twilight dusk background (`oklch(0.13 0.045 310)`), warm sunset cream foreground typography (`oklch(0.96 0.03 75)`), vibrant sunset hot magenta primary buttons/highlights (`oklch(0.70 0.28 345)`), glowing sunset coral-orange secondaries (`oklch(0.88 0.16 65)`), and radiant Caribbean ocean turquoise accents (`oklch(0.78 0.16 195)`).
  - **Theme Switcher Upgrade**: Updated `theme-switcher.tsx` with a `<Palmtree />` icon and hot-pink active indicator for Vice Theme.
  - **Ambient Particle & Orb Synchronization**: Updated `particle-background.tsx` and `ambient-background.tsx` to animate glowing sunset fuchsia, coral orange, and turquoise particles and background orbs when in Vice theme.

## [2.1.413] - 2026-08-22
### Full-Screen Vertical Shorts Swiper Modal & 1000-Character Text Posts
- **TikTok-Style Vertical Shorts Swiper**: Built a full-screen vertical Reels/Shorts swiper overlay (`the-feed.tsx`) accessible by clicking any media, video, text post, or the "Shorts" action button:
  - **Fluid Gestures & Navigation**: Supports touch vertical swipe gestures (`Swipe Up` for next, `Swipe Down` for previous), debounced mouse wheel scrolling, keyboard navigation (`ArrowUp`/`ArrowDown`, `ArrowLeft`/`ArrowRight`, `Escape` to close), and on-screen navigation chevrons.
  - **Interactive Double-Tap & Actions Rail**: Double-tap on media triggers an instant animated heart like effect; right-side action rail provides Creator Subscribe, Like counter, Comments drawer toggle, Bookmark, Share toast, and Mute/Unmute toggle.
  - **Dynamic Ambient Glow**: Renders ambient blurred glow behind vertical 9:16 video/image frames.
  - **Expandable Bottom Caption & Audio Ticker**: Displays creator badges, expandable caption text with interactive hashtags, and a dynamic audio track marquee.
  - **Slide-Over Comments Drawer**: Side panel on desktop and bottom sheet on mobile for exploring comments and submitting instant replies.
- **Strict Viewport Autoplay Coordination**: `FeedInlineVideo` strictly coordinates active playing video IDs and only autoplays when at least 50% in the viewport, immediately pausing when scrolled off-screen.
- **1000-Character Text Posts & Decoupled Reply Composer**:
  - Expanded post and reply character limits to 1000 characters in both frontend counters and backend schema validation (`app/actions/social/posts.ts`).
  - Decoupled reply form state (`replyBody`, `replyMediaUrl`) from main post composer state, eliminating composer lockouts and guaranteeing text-only and media posts publish cleanly.

## [2.1.412] - 2026-08-22
### Unboxed Feed Architecture & Frictionless Infinite Scrolling
- **Unboxed Modern Layout**: Freed "The Feed" from fixed nested container boxes and double scrollbars (`h-[calc(100vh-8rem)] overflow-hidden`). Transformed it into an expansive, modern social timeline layout adhering to native window scrolling.
- **IntersectionObserver Infinite Scrolling**: Implemented seamless `IntersectionObserver` sentinel pagination at the bottom of the feed timeline that streams in the next batches of posts with zero clicks and zero page lag.
- **Sticky Sidebars & Messenger Integration**: Refactored `InboxClient` so the Messenger quick access rail and the Trending tags rail float as sticky sidebars alongside the infinite timeline on desktop, preserving instant access to E2EE direct messages and group chats.
- **Smooth Viewport & UX Polish**: Added streaming status animations, preloading offsets, and a clean "You're all caught up" completion state.

## [2.1.411] - 2026-08-22
### Google Sitelinks & Schema.org Rich Search Navigation Structured Data
- **Schema.org Structured Data (`JsonLd`)**: Created `json-ld.tsx` injecting structured JSON-LD (`WebSite` with `SearchAction` for sitelinks searchbox, `ItemList` with `SiteNavigationElement` declaring **Forums**, **News**, **Live Streams**, **Modpacks**, and **The Lobby**, and `Organization` metadata).
- **Expanded Sitemap Priorities**: Updated `sitemap.ts` with prioritized crawler ratings and change frequencies for `/forum`, `/news`, `/streams`, `/modpacks`, and `/lobby`.
- **Root Metadata Optimization**: Enhanced canonical URLs, targeted keywords, and OpenGraph descriptions in `app/layout.tsx`.

## [2.1.410] - 2026-08-22
### User Orb Dropdown Streamlining & Admin Dashboard Cleanup
- **User Orb Dropdown Cleanup**: Removed the redundant Setup Wizard link from the user avatar dropdown in `navbar.tsx`, leaving a clean path directly to Profile, The Feed, UCP, and the Admin Dashboard.
- **Admin Dashboard Alignment**: Removed unused legacy Game Servers section from the Admin Command Center sidebar and updated Modpack quick action copy to focus on client files and installations.

## [2.1.409] - 2026-08-22
### Profile Navigation Integration for The Feed
- **Navbar Profile Dropdown**: Added a dedicated **The Feed** shortcut directly beneath the Profile link in the authenticated desktop navigation dropdown (`navbar.tsx`).
- **Mobile Menu Integration**: Added **The Feed** link under Account in the mobile navigation drawer.
- **Profile Dashboard Quick Action**: Enhanced the user profile sidebar (`/profile`) with a prominent, themed button for **The Feed** (`/profile/inbox`).

## [2.1.408] - 2026-08-22
### Frictionless Feed Media Integration & Video Streaming
- **Feed Image & Video Attachments**: Added native support for attaching images (`.jpg`, `.png`, `.gif`, `.webp`) and videos (`.mp4`, `.webm`, `.mov`, `.ogg`, `.mkv`) directly to posts and replies in "The Feed" (`the-feed.tsx`).
- **Frictionless Composer UX**: Integrated direct clipboard pasting (`Ctrl+V`) for image files and fluid drag-and-drop file zones with animated feedback indicators across both the main post composer and inline reply forms.
- **Asynchronous Pre-uploading & Previews**: Media uploads begin immediately upon selection or drop, presenting animated shimmer previews with one-click removal before submission.
- **Inline Video Playback**: Integrated `FeedInlineVideo` for timeline feeds featuring automatic viewport-based autoplay (muted), fast inline mute/unmute toggling, play/pause controls, and one-click expand to the cinematic fullscreen video viewer.
- **HTTP 206 Partial Content Video Streaming**: Implemented standard HTTP Range requests in `/uploads/[...path]/route.ts` to allow instant seek/scrubbing and low-latency video streaming.
- **Secure File Storage & Magic Bytes**: Enhanced `upload.ts` with strict magic byte inspections for WebP, MP4 (`ftyp`/`moov`/`mdat`), QuickTime, WebM/MKV (EBML), and OGG alongside strict size limits (15MB for images, 250MB for video/archive content).

## [2.1.407] - 2026-08-22
### Saint & Soul Link Terminology Overhaul & Studio Server Settings Menu
- **Saint Canonical Player Identity**: Replaced legacy cyber-themed "Operative" terminology across the entire MMO client with the canonical default name **"Saint"** (plural: **"Saints"**). Updated character creator (`character-creator.tsx`), character selector (`character-selector.tsx`), authentication screen (`GameLogin.tsx`), title screen (`GameTitleScreen.tsx`), vitals HUD, presence radar, party overlay, and leaderboard modals.
- **Soul Link Comms Channel**: Updated the in-game lobby HUD chat channel to default to **"Soul Link"** (replacing "COMM LINK"), with support for dynamic custom channel titles and cleansed transmissions copy.
- **Souls, Spirits & Camera Capture Mechanics**: Formalized the default capture tooling conventions in `realmSettings.ts`: capture device = **"Camera"**, capture ammo = **"Film"**, target beings = **"Souls"** / spirits.
- **Studio Server & Game Settings Panel**: Created a dedicated **Server Settings** dock panel (`RealmSettingsPanel.tsx`) and modal in Studio (`StudioDockId: 'settings'`), allowing server owners to configure Hero Class Name (default: `"Saint"`), Chat Title (default: `"Soul Link"`), Creature/Being Name (default: `"Soul"`), Capture Device (default: `"Camera"`), Ammo (default: `"Film"`), and Realm Title & Tagline with live in-game previews.
- **Realm Settings API**: Created `/api/realm/settings` (GET & POST) to persist realm identity and terminology configurations to the database (`siteSetting`).
- **Omnisearch & Menu Integration**: Registered `Server Settings` in Studio Omnisearch (`Ctrl+K`), View menu, and dock layout.

## [2.1.406] - 2026-08-22
### Customizable Game Title & Description Across Setup & Home Showcase
- **Home Page Dynamic Showcase**: Updated `app/(main)/home/page.tsx` to dynamically query and display the user-configured realm/game name (`REALM_NAME`) and game description (`REALM_DESCRIPTION`), defaulting the description to `"The Lobby ~ Socialize, Battle, Capture, Explore! ~ Coming Soon ~"`.
- **First-Time Setup Wizard**: Enhanced Step 1 (Identity) in `FirstTimeSetupWizard.tsx` to prompt the user for both **Realm / Game Name** and **Game Description / Tagline** (defaulting to `"The Lobby ~ Socialize, Battle, Capture, Explore! ~ Coming Soon ~"`), saving them upon completion via `/api/setup/complete`.
- **Admin Configuration**: Added **Game & Realm Identity** fields to `app/(main)/admin/settings/page.tsx` so administrators can easily update the game title and description at any time.

## [2.1.405] - 2026-08-22
### World Atlas Topology Identity & Texture Cache Loop Fix
- **Atlas Topology Instance Identity**: Refactored `AtlasNode` across `spatialAtlas.ts`, `AtlasStudioSuite.tsx`, and `WorldAtlasPanel.tsx` to require stable persistent `id`s (`id: string`). Adjacency is now computed mathematically from node grid coordinates `(x, y)` rather than collapsing into mapId-keyed dictionaries (`connectionsByMap`), perfectly isolating duplicate placements of the same map definition in different world zones.
- **Client Atlas Cache Invalidation**: Added `invalidateClientAtlas()` and force-refresh capability to `getClientAtlas()`, called automatically on Atlas save and reload to prevent stale layout reuse.
- **Instance-Aware Map Loading**: Updated `loadMap(mapId, depth, atlasNodeId?)` in `maps.ts` to derive 4-way connections strictly from the active node instance coordinates, eliminating ambiguous `currentMapId` adjacency heuristics.
- **NPC Sprite 404 & Infinite Texture Loop Fix**: Resolved `alchemist.png` 404 by adding canonical alias mapping to `professor.png` and registering `alchemist` in `MISSING_NPC_PLACEHOLDERS`. Updated Prof. Oakwood starter sprite in `DemoBootstrap.ts` and `prepackagedPacks.ts`.
- **BabylonEngine Texture Load Protection**: Added `failedSpriteUrls` failure cache in `BabylonEngine.ts` to prevent repeated failed `new Texture()` requests on every frame render loop.

## [2.1.404] - 2026-08-22
### Midnight Tropical Lobby & Menu Theme Unification
- **Lobby Game Screens**: Upgraded all pre-game and lobby gateway screens (`GameTitleScreen`, `GameLogin`, `ServerSelect`, `character-selector`, `character-creator`, and `GameOfflineScreen`) to the unified **Midnight Tropical** aesthetic.
- **Shared Background**: Created `MidnightTropicalBackground` component featuring the midnight gradient, ambient starfield, shooting star, specular dash water reflections, silhouetted palm framing, and ambient pixel particle effects.
- **Color Palettes**: Realigned theme tokens, headers, footers, and modal containers across the gateway screens to the deep midnight/cyan/violet palette.

## [2.1.403] - 2026-08-22
### Midnight Tropical Landing Page Theme
- **Landing Page**: Implemented the Midnight Tropical aesthetic on the main landing page with interactive 3D voxel logo orbit controls and clean CTA buttons.
- **Pointer Events**: Ensured all background layers (sun, water, stars, palm silhouettes, atmospheric pixel particles, and color gradient overlays) pass pointer events through seamlessly so that 3D logo spinning and button interactions are completely unobstructed.
- **Landing Prototype**: Added the "Original" landing style option to the desktop landing page style switcher catalog.

## [2.1.402] - 2026-08-22
### Map Streaming Atlas Fix
- **Atlas Streaming**: Maps placed multiple times in the World Atlas now correctly stream their respective visual neighbors. `loadMap` dynamically computes connections using the client Atlas layout instead of relying on static database connections.

## [2.1.401] - 2026-08-22
### Build Fixes
- **Build**: Fixed duplicate block in `settings.ts`.
- **Studio**: Made `currentMapId` public in `BabylonEngine.ts`.
- **Studio**: Added missing `streaming` panel to `StudioDockId` and `STUDIO_DOCK_META`.

## [2.1.400] - 2026-08-21
### Map Vignette Syntax Fix
- **ImageProcessingConfiguration**: Fixed a compilation error where `VIGNETTEMODE_MULTIPLY` was incorrectly referenced on `ImageProcessingPostProcess` instead of `ImageProcessingConfiguration`.

## [2.1.399] - 2026-08-21
### Seamless Map Streaming (Phases 1-4 Complete)
- **Streaming Architecture**: Implemented async `ChunkStreamingQueue`, isolated `contentCache`, `RenderedChunk` batching, and exponential retry backoff.
- **Streaming Inspector HUD**: Added Studio panel to monitor chunk lifecycle, network fetches, and cache hits.
- **Atomic Activation & Mesh Pooling**: Deployed `StreamingManager` to ensure zero pop-in by asynchronously building meshes before making them visible. Implemented `chunkMeshPool` in `BabylonEngine.ts` to dramatically reduce GC stutters during chunk unloads.
- **Studio Invalidation**: Map saves in Studio now instantly bump map version and clear stale client chunk caches.
- **Camera Decoupling & Vignette**: Added `CameraProfile` with spring-damper interpolation for smooth 2.5D tracking, and applied an aesthetic vignette edge masking pass.

## [2.1.398] - 2026-08-20
### Map Connection Object Unpacking Fix
- **Black Map Return Fix (`WorldSimulation.ts`)**: Fixed a bug where edge boundary transitions into maps with JSON `MapConnection` object configurations (instead of raw strings) would incorrectly pass the entire connection object as the `targetMapId`. This caused `loadMap` to fail the string validation check and return an empty `INVALID` map, resulting in a black screen. `targetMapId` is now properly extracted.

## [2.1.397] - 2026-08-20
### Monolithic Map Chunk Rendering Fix
- **Blank Map Fix (`maps.ts`)**: Resolved an issue where loading seamless neighbors on a monolithic map (like `DEMO_SANDBOX` with no legacy chunks) would cause the client to only render the neighbor chunks and completely skip rendering the main map. Monolithic maps are now safely pushed into the chunk array before fetching neighbor connections.

## [2.1.396] - 2026-08-20
### Map Coordinate Alignment Fix
- **Map Origin Desync Fix (`BabylonEngine.ts`)**: Resolved a coordinate de-sync where legacy maps composed of sub-chunks (like `DEMO_SANDBOX`) were rendering off-screen (e.g. +48 tile offset relative to the player). `processTile` now properly centers seamless neighbor chunks relative to their own width, while legacy sub-chunks remain offset relative to the global origin of the primary map (`mapData.width/height`).

## [2.1.395] - 2026-08-20
### Seamless Client-Side Map Transitions
- **Seamless Engine Rendering (`BabylonEngine.ts`, `GameCanvasBabylon.tsx`):**
  - Updated `GameCanvasBabylon` to parse edge connection warp objects and emit a global `worldOriginOffset` before handing the player over to the server for map transfers.
  - Implemented continuous camera offsetting during edge warps; the player coordinate mathematically maps to the neighbor chunk smoothly so the visuals never hitch.
  - Updated player loop and entity renderers (multiplayer peers, static NPCs, dynamic entities) to offset against `worldOriginOffset`.
- **Edge Transition Logic (`WorldSimulation.ts`):**
  - Configured `tryMove` to emit `isEdgeConnection` with boundary metadata when the player walks into a loaded adjacent chunk.
  
## [2.1.390] - 2026-08-20
### Modern Drafting Artboard Frame & Precise Viewport Centering
- **Precision Studio Artboard Frame (`BabylonEngine.ts`, `spatialLayers.ts`):**
  - Replaced wireframe box & 3D corner cubes with a modern drafting artboard frame.
  - Raised `SPATIAL_LAYER_ALTITUDES.EDITOR_GUIDES` to `0.085` so boundary frames cleanly overlay multi-layer terrain and painted heights without clipping.
  - Added primary cyber amber `#f59e0b` outer border and soft cyan `#38bdf8` blueprint inset line.
  - Added precision drafting L-bracket crop marks on all 4 corners and cardinal midpoint orientation ticks (North arrow notch, South/East/West markers).
  - Added subtle obsidian/blueprint canvas artboard underlay plane distinguishing the map area from the void.
- **Accurate Viewport Centering & Tile Coordinate Pan (`BabylonEngine.ts`):**
  - Updated `fitMapInView()` to snap camera to the true mathematical center `(-0.5 * s, 0.5 * s)` instead of unaligned `(0, 0)`.
  - Corrected `panEditorCameraToTile` to map 1:1 with tile quad centers.

## [2.1.389] - 2026-08-20
### Studio Camera Lifecycle & Immediate Skirt Rebuilding
- **Studio Skirt Rebuilding & Editor Mode Synchronisation (`BabylonEngine.ts`, `GameCanvasBabylon.tsx`):**
  - Resolved initial mount lifecycle bug where `loadTilemap` ran before `editorCameraMode` was set, leaving the 64-tile grass skirt rendered from default state.
  - Initialized `babylonEngine.setEditorCameraMode(isDevEditorOpen)` before initial `loadTilemap` execution.
  - Automatically rebuilds and remeshes the tilemap on `setEditorCameraMode` transitions, instantly clearing the outer grass skirt when entering editor mode.
- **Unclamped Programmatic Zoom & Presets (`BabylonEngine.ts`, `StudioBottomToolbar.tsx`):**
  - Removed remaining hardcoded `40` max zoom clamps in `zoomCamera` and `setZoomPercent`.
  - Updated `handleZoomOut` and preset dropdown in the bottom toolbar to support zooming down to `15%`.
  - Prevented `loadTilemap` from forcefully resetting camera ortho to 6.0 when in editor mode.

## [2.1.388] - 2026-08-20
### Studio Map Boundaries, 64x64+ Zoom Expansion & Runtime Edge Bleed
- **Map Boundary Clarity & Frame (`BabylonEngine.ts`):**
  - Disabled outer 64-tile generic grass skirt in Studio Editor mode, eliminating visual perimeter clutter.
  - Added dynamic glowing `map_boundary_frame` mesh outline along the exact map perimeter across all map dimensions.
- **64×64+ Full Zoom Range (`zoomMath.ts`, `BabylonEngine.ts`):**
  - Expanded `STUDIO_MAX_ORTHO` from 40 to 120, removing the 63% zoom clamp and allowing 64×64, 96×96, and 128×128 maps to fit 100% in view down to 15%–25% zoom.
  - Updated `fitMapInView` to dynamically compute exact ortho requirements without clamping large realms.
- **Runtime Edge Bleed Pipeline (`edgeStrip.ts`, `BabylonEngine.ts`):**
  - Created `getEdgeStrip` utility to read thin outer tile strips from adjacent atlas neighbor maps.
  - Fed real neighbor edge tiles into border skirt quads with live multi-tileset UV mapping.
  - Added "Preview Neighbor Bleed" toggle in `WorldBuilderPanel.tsx` for live boundary alignment checks while authoring.
- **Atlas Multi-Map Fast Switch & 1-Click Editing (`WorldBuilderPanel.tsx`, `AtlasStudioSuite.tsx`):**
  - Added connected directional neighbor badges (North, South, East, West) to the World Builder header for 1-click loading and editing.
  - Added "Edit Realm" fast transition from Macro Atlas grid node inspection.

## [2.1.387] - 2026-08-20
### Studio Mode Overhaul (Atlas Studio Suite & WorldBuilder Edit Panel Decluttering)
- **Dedicated Atlas Studio Mode (`AtlasStudioSuite.tsx`):**
  - Elevated Atlas Mode (`studioMode === 'atlas'`) to a full workspace suite mirroring the Asset Studio architecture.
  - Implemented multi-workspace views: Macro World Atlas (20×20 placement canvas with 4-way seam syncing and directional adjacency indicators), Map Library & Explorer (categorized map catalog, stats, and safe deletion), Realm Creator (custom slug, display name, dimension autorun), and Seams & Bounds (map dimension resizer and primary spawn hub selector).
- **WorldBuilder Edit Panel Decluttering (`WorldBuilderPanel.tsx`):**
  - Removed heavy map explorer lists, creation modals, deletion confirmation dialogs, and resize forms from the World Builder dock.
  - Restructured into a clean, focused tile painting workspace featuring a compact active realm status bar, direct "Atlas Studio ↗" jump button, visual vs logic layer controls, and tileset/logic brush palettes.
- **Unified Studio Integration (`StudioEditorShell.tsx`, `StudioMenuBar.tsx`, `StudioBottomToolbar.tsx`, `WorldAtlasPanel.tsx`, `StudioOmnisearch.tsx`):**
  - Integrated Atlas Studio seamlessly across top menu bar mode transition switchers, bottom dock launchers, omnisearch actions, and shortcuts (`Ctrl+Shift+M`).

## [2.1.386] - 2026-08-20
### MMO Lifecycle Overhaul (Defeat Transition Synchronization & Phase 6 Audit)
- **Defeat Respawn Peer Flushing (`index.tsx`):**
  - Updated `player_defeated` socket handler to flush `otherPlayers` if the safe-zone respawn destination differs from the current map, eliminating lingering player ghosts at safe-zone arrival.
- **Phase 6 Audit:**
  - Audited all map transition vectors (gate warps, options menu unstuck teleports, defeat respawns, studio warps) to ensure 100% routing through transition state guards, peer flushing, and atomic server join sequencing.

## [2.1.385] - 2026-08-20
### MMO Lifecycle Overhaul (Build Hardening & Strict Type Checking)
- **TypeScript Control Flow & Type Safety (`GameCanvasBabylon.tsx`, `editorOps.test.ts`, `selectionOperations.test.ts`):**
  - Resolved TypeScript control-flow narrowing issue where prior boolean checks in the same scope narrowed store state and caused false negative type conflicts on subsequent checks.
  - Hardened strict null checks in unit tests for editor compound operations and selection batch paint results.
  - Verified 100% clean `tsc --noEmit` and production build pipeline.

## [2.1.384] - 2026-08-20
### MMO Lifecycle Overhaul (Phase 6: Atomic Map Transition Sequencing)
- **Map Transition Sequencing (`lobbyWorldJoin.ts`):**
  - Added `startMapTransition(opts)` orchestrator: transitions `worldSessionState` to `'transitioning'`, activates `isMapTransitioning`, immediately flushes departed peers (`setOtherPlayers({})`), and executes destination `joinWorld`.
  - Added transition timeout fallback so the client never becomes stuck in transition if server response is delayed.
- **Client Input & Warp Hardening (`GameCanvasBabylon.tsx`, `index.tsx`, `GameOptionsMenu.tsx`):**
  - Hardened `tryMovePlayerTo`: movement inputs and client-predicted steps are strictly dormant during `isMapTransitioning` or `worldSessionState === 'transitioning'`, preventing movement command leakage across map boundaries.
  - Refactored Babylon gate warps and GameOptionsMenu "Unstuck" teleports to execute through `startMapTransition`.
  - Updated `map_joined` listener to automatically clear `isMapTransitioning` upon arrival confirmation.
- **Unit Testing:**
  - Added test case in `lobbyWorldJoin.test.ts` verifying transition state activation, peer flushing, and forced world join.

## [2.1.383] - 2026-08-20
### MMO Lifecycle Overhaul (Phases 1–5: State Machine, Join Centralization, Idempotent Joins & Reconnect Hardening)
- **Authoritative World-Session State Machine (`store.ts`, `lobbyWorldJoin.ts`):**
  - Added explicit `worldSessionState` (`not_joined`, `joining`, `joined`, `transitioning`, `disconnected`) and `worldJoinSeq` monotonic counter to `useGameStore`.
  - Created `lobbyWorldJoin.ts` as the single authoritative client function for executing world joins with redundancy and concurrent join guards.
- **Client `join_map` Centralization (`index.tsx`, `GameCanvasBabylon.tsx`):**
  - Refactored all 6 previous raw `join_map` emission sites (`selectAndLoadCharacter`, `enterStudioAuthorSession`, socket `connect`, `activeCharacterId` effect, PIE toggle, and Babylon gate warps) to route through `joinWorld()`.
  - Updated `map_joined` handler to reject stale out-of-order join acknowledgements (`data.joinSeq < state.worldJoinSeq`) and advance session state to `joined`.
- **Server Idempotent Joins & Character Ownership (`handler.go`, `player.go`, `protocol.go`):**
  - Made `handleJoinMap` fully idempotent: requests from same account + same character + same map + same policy preserve world seat and peers without emitting `player_left`/`player_joined` storms.
  - Added character ownership enforcement: joins with a character actively controlled by another account are authoritatively rejected.
  - Switching characters on the same account cleanly removes the previous character seat and establishes the new character seat.
  - Echoed `joinSeq` in Go `map_joined` payload so correlation is validated on the client.
- **Reconnect & Session Migration (`handler.go`, `player.go`):**
  - Wired `UpdateSocket` into `onConnect` session replacement: new sockets from the same account seamlessly take over world seat ownership without triggering teardown.
  - Hardened `onDisconnect` to only remove players if the disconnecting socket is the currently active socket for the player.
- **Unit Testing:**
  - Added test suite `lobbyWorldJoin.test.ts` (6/6 passing).
  - Added Go test suites in `player_test.go` and `handler_test.go` verifying character ownership lookup, socket migration, policy matching, and idempotent join lifecycle.

## [2.1.382] - 2026-08-20
### Generalized Reversible EditorOps Architecture (Phase 2)
- **Generalized Command Hierarchy (`editorOps.ts`):**
  - Extended `EditorOp` from cell-only writes into a complete command architecture supporting `LayerOp` (`create_layer`, `delete_layer`, `reorder_layer`, `rename_layer`), `EntityOp` (`create_entity`, `delete_entity`, `move_entity`, `modify_entity`), `GateOp` (`create_gate`, `delete_gate`, `modify_gate`), `MapPropsOp` (`modify_map_props`), and `CompoundOp` (`compound`).
  - Implemented bidirectional `applyEditorOp(map, op, direction: 'do' | 'undo')` for atomic state execution and reversal.
- **Structural Paste Reversal (`subgridStamp.ts`, `editor-store.ts`):**
  - Updated `stampClipboardOntoMap` to return the `createdLayer` structure in `new_layer` mode.
  - Recorded a `compound` op (`create_layer` + `paint_cells`) on `new_layer` paste so undoing cleanly deletes the created layer rather than leaving an orphaned empty layer.
- **Multi-System Event Synchronization (`editor-store.ts`):**
  - Implemented `dispatchOpEvents` to broadcast `studio_layers_changed`, `studio_entities_changed`, and `studio_gates_changed` alongside tile cell updates upon undo/redo.
- **Comprehensive Unit Testing (`editorOps.test.ts`):**
  - Added unit tests verifying bidirectional execution and reversal for Layer CRUD, Entity CRUD/Move, Gate CRUD, Map properties, and compound multi-system operations.

## [2.1.381] - 2026-08-20

### Master Development Plan: Phase 0 Inventory & Phase 1 Studio Selection Matrix
- **Selection Operations Matrix & Composability (`tilePaint.ts`, `subgridStamp.ts`, `stampTransform.ts`):**
  - Implemented `paintTilesInRegion` and `paintSparseCells` in `tilePaint.ts` for atomic batch painting across rectangular and arbitrary sparse cell selections.
  - Implemented `transformSelectionInPlace` in `stampTransform.ts` supporting 90°/180°/270° CW/CCW in-place rotations and horizontal/vertical flips with automatic selection bounds recalculation.
  - Implemented `duplicateSelectionOnMap` and `moveSelectionOnMap` in `subgridStamp.ts` for atomic cloning and translating selected cells with relative layer integrity.
- **Unified Studio Selection Actions (`editor-store.ts`):**
  - Added `paintSelection`, `fillSelection`, `eraseSelection`, `rotateSelection`, `flipSelection`, `duplicateSelection`, and `moveSelection` store actions.
  - Consolidated all batch selection mutations into **one atomic undoable `EditorOp` (`paint_cells`)** with complete visual mesh and logic grid sync.
- **Canvas & Context Menu Integration (`GameCanvasBabylon.tsx`, `StudioContextMenu.tsx`):**
  - Added Select → Paint and Select → Erase canvas click detection: clicking inside an active rectangular or sparse selection in Paint or Erase mode applies the operation across all selected cells atomically.
  - Integrated Rotate 90° CW, Flip H, Flip V, and Duplicate Selection directly into `StudioContextMenu.tsx` with Lucide icons.
  - Updated `handleFillLayerWithBrush` in context menu to route through single-op undoable editor history.
- **Selection Operations Matrix Test Suite (`selectionOperations.test.ts`):**
  - 15 comprehensive unit tests verifying Paint, Erase, Copy, Cut, Paste, Rotate, Flip, Duplicate, Move, Edge/Corner boundary clamping, and Single-Op Undo/Redo across Visual layers and Logic grid (-1).

## [2.1.380] - 2026-08-20

### Map Boundary Precision Alignment & Cursor Highlight Hide
- **Exact Map Boundary Grid Calibration (`src/engine/BabylonEngine.ts`):**
  - Calibrated outer perimeter coordinates `minX = (-w/2 - 0.5)*s`, `maxX = (w/2 - 0.5)*s`, `minZ = (-h/2 + 0.5)*s`, `maxZ = (h/2 + 0.5)*s` to align with the tilemap quad vertices.
  - Aligned corner bracket posts and glowing amber perimeter lines directly to the outer edges of the map's border cells.
- **In-Viewport Cursor Hide (`BabylonEngine.ts`):**
  - Set `canvas.style.cursor = 'none'` when hovering over active map grid in paint and edit modes so the 3D ground highlight serves as the primary cursor reticle.
  - Automatically restores `cursor = 'default'` / `'grab'` / `'grabbing'` when moving outside the map or during camera pan.
- **Tile Center Position Normalization (`BabylonEngine.ts`):**
  - Aligned all preview meshes (hover reticle, brush footprint, selection plane, action preview, destination indicator, ability AoE) to `(c - w/2) * s` and `(h/2 - r) * s`.

## [2.1.379] - 2026-08-20
### Spatial Layer Priorities, Unified Highlights & Dual Shop Triggers
- **Unified Spatial & Interface Layer Hierarchy (`src/shared/game/spatialLayers.ts`):**
  - Standardized explicit 3D viewport depth altitudes (`SPATIAL_LAYER_ALTITUDES`) from base terrain (`0.00`) through editor guides (`0.02`), destination (`0.025`), target rings (`0.03`), selection overlay (`0.04`), brush footprint (`0.05`), hover outline (`0.06`), temp tools (`0.07`), and entities (`0.10`).
  - Standardized explicit 2D DOM React z-index priorities (`INTERFACE_Z_INDEX`) across Canvas (`0`), World HUD (`10`), Docks (`30`), Floating Windows (`40`/`45`), Modals (`50`), Context Menus (`100`), and System Curtains (`200`).
- **One Clean Highlight System (`src/engine/BabylonEngine.ts`):**
  - **Hover**: Crisp, thin sky-blue outline (`#38bdf8`) on hovered center cell at layer altitude `0.06`.
  - **Paint Preview**: Dedicated multi-cell tinted footprint grid matching `brushRadius` at layer altitude `0.05` without overlapping selection or hover.
  - **Selection**: Distinct filled translucent overlay with boundary frame at layer altitude `0.04`.
  - **Immediate Brush Size Refresh**: Brush preview mesh immediately resizes upon brush radius changes via slider or keyboard shortcuts without waiting for cursor motion.
- **Editor Map Boundaries vs. Gameplay (`BabylonEngine.ts`):**
  - Implemented high-contrast glowing neon amber boundary box and corner markers around map perimeter, active exclusively in Editor mode and hidden completely in gameplay.
- **Bulletproof Context Menu Dismissal (`StudioContextMenu.tsx`):**
  - Added full-viewport event-capturing backdrop that dismisses context menu immediately on any outside click or right-click without triggering accidental canvas paint or camera pans.
- **Dual Entity-Bound & Region-Bound Shop Triggers (`interactionResolver.ts`, `worldTarget.ts`):**
  - Unified both NPC merchants (entity-bound) and store counters/tiles (region-bound) under the single `WorldTarget` and `queryInteractions` pipeline.
- **Test Suite (`src/shared/game/shopInteraction.test.ts`):**
  - Added unit test suite validating spatial layer altitude sorting, DOM interface z-index hierarchy, NPC merchant evaluation, and region shop counter evaluation.

## [2.1.378] - 2026-08-20
### Unified WorldTarget Spatial Interaction & Targeting Architecture
- **Unified `WorldTarget` Pipeline (`src/shared/game/worldTarget.ts`):**
  - Created shared spatial targeting vocabulary and evaluation pipeline bridging Studio, Exploration, and Combat.
  - Supports typed targets: `tile`, `entity`, `object`, `creature`, `player`, `gate`, and `resource`.
  - Computes reachability, dynamic footprint radius (1x1, 2x2, 3x3), primary action mapping (`TALK`, `ATTACK`, `HARVEST`, `WARP`, `OPEN`), and status (`valid`, `blocked`, `targetable`).
- **Smart Ground Target Rings (`src/engine/BabylonEngine.ts`):**
  - Implemented 2.5D ground-projected circular reticle sized dynamically to target footprints (`radius = width * 0.55`).
  - Added 3 distinct visual states: **Hover** (subtle cyan/glow), **Focus / Target Lock** (vibrant amber/gold), and **Hostile Combat** (crimson/ruby).
- **Destination Cue Indicator (`BabylonEngine.ts`):**
  - Integrated soft mouse exploration indicator on target tile: soft emerald marker for reachable tiles and subtle red cue for solid/blocked tiles.
- **Combat & Ability AoE Footprint Preview (`BabylonEngine.ts`):**
  - Added `setAbilityAoEPreview` and `clearAbilityAoEPreview` for circular and box spell/ability reach previews prior to execution.
- **Context Interaction Badge & Target Frame (`src/web/components/the-lobby/hud/`):**
  - `ContextInteractionBadge`: Floating contextual prompt (`[E] TALK - Professor Oakwood`, `[E] ENTER - Paper Town`, `[SPACE] ATTACK`) that animates in only when targetable and within range.
  - `TargetUnitFrame`: Top-anchored unit frame for focused target with health bar, level badge, distance readout, and deselect controls.
  - Added global `KeyE` / `Space` keyboard trigger for primary interactions.
- **Test Coverage (`src/shared/game/worldTarget.test.ts`):**
  - 9 automated unit tests covering footprint radius, reachability, primary actions, NPC/monster/player evaluation, and tile/gate targets.

## [2.1.377] - 2026-08-20
### Studio Viewport Spatial Interaction System Redesign
- **Unified Interaction Model (Hover, Selection, Action Preview):**
  - **High-Performance Hover Overlay (`BabylonEngine.ts`):** Lightweight, Babylon-side visual hover highlight updating at 60 FPS with reusable meshes/materials, eliminating per-frame memory allocation and React/Zustand render churn.
  - **Arbitrary & Rectangular Selection (`editor-store.ts`, `GameCanvasBabylon.tsx`):** Unclamped rectangular drag selection of any size (e.g. 8x6, 48 cells) with live bounding box preview, dimension feedback, and single canonical `selectedCells` state.
  - **Additive & Subtractive Selection:** Shift+click and Shift+drag add to active selection; Ctrl/Cmd+click and Ctrl/Cmd+drag subtract from selection; normal click creates clean single/box selection.
  - **Action & Paste Preview (`BabylonEngine.ts`):** Translucent Babylon preview displaying actual clipboard tiles and footprint following the cursor or anchored at active selection bounds before committing.
  - **Atomic Multi-Cell Operations (`tilePaint.ts`, `editorOps.ts`, `subgridStamp.ts`):**
    - Added `eraseSparseCells` and `getCellsBoundingBox` in `tilePaint.ts`.
    - Delete, Cut, Copy, and Paste now operate across all selected cells (sparse or rectangular) in a single atomic undo/redo op.
    - Pasting with an active selection automatically anchors to the selection's top-left bounding box without requiring extra clicks.
  - **Selection-Aware Context Menu (`StudioContextMenu.tsx`, `StudioEditorShell.tsx`):**
    - Right-clicking inside an active selection preserves multi-cell selection and displays scope-aware labels (`Delete N Tiles`, `Cut N Tiles`, `Copy N Tiles`, `Paste at Selection`, `Fill Selection`).
    - Right-clicking outside selection cleanly targets the clicked tile.
  - **Camera & Pointer Separation:** Middle-mouse and Space+drag pan camera cleanly without triggering paint or selection drags; right-click context menu opens cleanly without drag-paint side effects.
  - **Comprehensive Test Suite (`src/shared/game/spatialInteraction.test.ts`):** 11 new automated unit tests covering 1-tile, 2x2, 8x6, sparse selections, additive/subtractive modes, multi-cell delete/cut/paste, atomic undo/redo, logic/visual layers, and boundary clipping.

## [2.1.376] - 2026-08-20
### Quick Menu & Floating Window Interface Architecture Refactor
- **Decoupled Window Manager (`src/web/components/the-lobby/store.ts`):**
  - Added `openWindows: string[]`, `toggleWindow()`, `closeWindow()`, `closeAllWindows()`, and `getTopmostWindow()` to Zustand game store.
  - Interface windows now open and close independently while keeping `gameMode = 'EXPLORING'`, allowing players to open multiple interfaces simultaneously (e.g. Inventory and Skills side-by-side) without breaking real-time game world interaction.
- **Quick Menu Dock (`src/web/components/the-lobby/ClassicPanel.tsx`):**
  - Refactored `ClassicPanel` into a dedicated compact icon-only quick access dock.
  - Eliminated cramped 390px scaled tab container and CSS scale-wrapper hacks.
  - Added real-time quick glance badges: item stack totals for Inventory, total level for Skills, and active quest count for Quest Log.
  - Mapped responsive hotkey toggles (`I` for Inventory, `K` for Skills, `C` for Equipment, `L` for Quests).
- **Floating Window Wrappers (`src/web/components/the-lobby/windows/`):**
  - Created standalone floating window shells for all core interfaces: `InventoryWindow`, `SkillsWindow`, `EquipmentWindow`, `QuestLogWindow`, and `GtcWindow`.
  - Interfaces now support full dragging, z-index elevation on click, minimization, and proper default dimensions (e.g. 860px wide Skills grid, 500px wide 3-column Equipment paperdoll, 420px Inventory grid).
  - Integrated 3-level skill progression drilldown: Skills Grid (Level 1) -> Skill Inspect modal (Level 2) -> Full Skill Guide & Battlepass (Level 3).
- **Overlay Shell Decoupling (`skills-overlay.tsx`, `quest-log-overlay.tsx`):**
  - Stripped duplicate `HudPanelShell` containers and fixed pointer-events overlays from child components so they render cleanly inside `FloatingWindow`.
- **Topmost Escape Handling (`src/web/components/the-lobby/index.tsx`):**
  - Pressing `Escape` now hierarchically closes the topmost open floating window before falling back to target deselection or game options menu.

## [2.1.375] - 2026-08-20
### Smooth Movement & Animation Polish
- **Movement Interpolation (`src/engine/BabylonEngine.ts`):**
  - Replaced 4.5 tiles/sec linear speed with 4.0 tiles/sec matching the 250ms input cadence, eliminating the 28ms dead-stop freeze between tile steps during continuous WASD walking.
  - Reduced movement snap threshold from 0.005 to 0.001 for sub-pixel smooth arrival.
  - Added dynamic acceleration curve for catch-up movement (>1.25 tiles gap) using `Math.min(14.0, dist * 5.5)` instead of a hard 12.0 speed jump, preventing jerky teleport corrections.
  - Walk animation cycling threshold lowered from 0.05 to 0.01 so sprite walk frames continue playing smoothly across tile boundaries without premature idle resets.
  - Added `walkSpeed` fallback for configs missing speed metadata, using cycle-length-aware defaults (10 for 9-frame LPC, 6 for 4-frame Tuxemon).
- **Camera Tracking (`BabylonEngine.ts` + `GameCanvasBabylon.tsx`):**
  - Increased camera lerp factor from 0.08 to 0.15 for tighter player tracking, reducing the laggy "camera chasing" feel during rapid directional changes.

## [2.1.374] - 2026-08-20
### Hardened & Converged
- **Multi-Resolution LPC Slicing Presets (`src/shared/game/lpcPackage.ts`):**
  - Updated `getLpcStandardSlices()` to derive cell dimensions dynamically from input options or sheet width (e.g. 1664px/1152px -> 128px cells; 832px/576px -> 64px cells), eliminating split-brain preset coordinates in the Studio Slicer.
  - Updated `detectLpcFormat()` to detect 128x128 high-resolution LPC sheets (`1664x...` and `1152x512`) with correct frame dimensions and row counts.
- **Pack Installer Canonical Convergence (`src/server/assetPackInstaller.ts`):**
  - Re-routed `installAssetPacks()` through `buildCanonicalAssetData()`, ensuring that pre-packaged catalog assets follow the exact same schema, tags, and metadata normalization as uploads and slices.
- **Conservative Type Fallback & Character Creation Safety (`src/shared/game/canonicalAsset.ts`):**
  - Tightened unknown asset fallback from `CHARACTER` to conservative `OBJECT` / `SPRITE` to prevent arbitrary images from cluttering character creator catalogs.
  - Made `isPlayable` and `showInCharacterCreation` strictly opt-in (requiring explicit metadata, pack membership like `heroes`, or role tags).
- **Test Coverage:**
  - Added unit tests for multi-resolution slice coordinate calculation, unknown asset type fallback safety, and asset pack installer canonical ingestion.

## [2.1.373] - 2026-08-20
### Fixed & Unified
- **Asset Pipeline Convergence & Canonical Lifecycle (`src/shared/game/canonicalAsset.ts`):**
  - Resolved major pipeline divergence where Spritesheet Slicer created `UsableAsset` records without corresponding `GameAsset` records, leaving sliced assets invisible to the Asset Browser, Studio, and Character Creator.
  - Implemented `buildCanonicalAssetData` and `projectUsableAssetToGameAssetData` as a single shared projection layer across single uploads, spritesheet slices, LPC package ingestion, and pre-packaged installer flows.
  - Updated `/api/assets/slice` to atomically create both `UsableAsset` and `GameAsset` records with `atlasSource`, `atlasFrame`, enriched tags, and normalized metadata in a single transaction.
  - Updated `AssetManager.hydrate` and `GET /api/assets` to deterministically query and filter sliced and modular components (`isModularComponent`, `componentCategory`, `componentLayer`, `variantFamily`, `zOrderHint`, `baseBodyType`, `hidesComponents`).
- **Multi-Resolution LPC & BabylonEngine Sprite Slicing (`spriteDefinitions.ts` & `BabylonEngine.ts`):**
  - Fixed row calculation for high-resolution 128x128 LPC sheets (`1664x4992`, `1152x512`) to prevent halving frames and row count inflation.
  - Fixed BabylonEngine render loop bug where `updateEntity()` re-computed `spriteConfig` on every tick without measured dimensions, overwriting loaded texture configurations with unmeasured fallbacks.
  - Enhanced `SpriteThumbnail.tsx` and `AssetEditor.tsx` with `atlasFrame` support to render cropped preview thumbnails for sliced sub-regions on catalog cards.
- **Cache Invalidation & Real-Time Sync:**
  - Verified `AssetManager.getInstance().broadcastRefresh()` cache invalidation and `assets:refreshed` event dispatching so sliced assets instantly appear in the Asset Browser without requiring a page reload.

## [2.1.372] - 2026-08-19
### Unified & Streamlined
- **Canonical Elemental System B Matrix (Bible 25 §3.7 & Bible 11 §3):**
  - Standardized on the canonical 10-element matrix (`normal`, `fire`, `water`, `grass`, `electric`, `ice`, `earth`, `wind`, `shadow`, `holy`) across **BOTH** Real-Time MMO Hero Battles and Turn-Based Saints Buddy Battles.
  - Bridged and deprecated the duplicate 8-element cyberpunk matrix in `elementMatchups.ts`.
  - Updated `typeChartEngine.ts` to provide universal case-insensitive and backward-compatible alias resolution.
- **Combat Engine Anti-Cheat & Single Source of Truth (Bible 02 & 07):**
  - Unified damage calculations into `src/shared/game/combat/combatBalanceEngine.ts`.
  - Routed client-side visual hit calculations in `combat.ts` to the authoritative shared formula.
- **Dynamic Database Registries:**
  - Added dynamic memory caching and hot-registration for items (`registerDynamicItem`) and quests (`registerDynamicQuest`) in lobby data registries, enabling instant hot-reloading when creating items/quests in Saints Studio without code modifications.
- **Cleanup:**
  - Removed orphaned root scratch files.

## [2.1.371] - 2026-08-19
### Added & Automated
- **Systemd Service Audit & Orphan Remediation Tooling (`scripts/audit-systemd.sh`):**
  - Added dedicated CLI audit tool for detecting duplicate units (`saints.service`, `saints-web.service`, `saintsgaming.service`, `saints-next.service`), orphaned unit files with invalid working directories, and host vs. Docker container port collisions.
  - Implemented automated modes: `--audit`, `--clean`, `--dry-run`, and `--canonical`.
  - Added canonical systemd service templates (`scripts/systemd/saints-web.service` and `scripts/systemd/saints-go-mmo.service`).
  - Integrated systemd service detection and clean decommissioning into `scripts/setup.sh` and `scripts/update.sh`.

## [2.1.370] - 2026-08-19
### Added & Redesigned
- **Modular LPC Character Architecture & Ingestion (Bible 35):**
  - **Layered Sprite Compositing (`CharacterSpritePreview.tsx`):** Added multi-layer stack rendering (`layers: string[]`), compositing base bodies, capes, headgear, and armor layers using precise sprite frame offset calculation.
  - **Archetype vs. Appearance Decoupling:** Decoupled class archetypes from visual character models in `CharacterCreator.tsx` by utilizing SVG class icons (`Swords`, `Wand2`, `Crosshair`, `Heart`, `Zap`, `Shield`).
  - **Modular LPC Customization Deck:** Re-architected Step 3 in `CharacterCreator.tsx` into a tabbed modular designer with Base Body selection, Capes, Headgear/Hoods/Helms, Armor/Gear, and All Catalog sprites.
  - **Persistent Layer State:** Encoded composite layer configuration (`appearance` and `customization.layers`) into `PlayerState` on character creation, automatically rendering multi-layer characters in `CharacterSelector`.
- **Strict Web Setup Lockout Flow:**
  - Game interface strictly locks out public players and displays "Currently Offline" when setup has not run (`isSetupCompleted === false`).
  - World developer accounts are greeted with a dedicated "Proceed to Realm Setup" portal linking directly to the Studio setup workflow.

## [2.1.369] - 2026-08-19
### Added & Redesigned
- **In-Game MMO HUD Ergonomic & Cyber Aesthetic Overhaul:**
  - **Player Vitals HUD (`PlayerVitalsHud.tsx`):** Overhauled with dark neo-cyber glass styling, character sprite avatar, dynamic HP bar with critical low-health heartbeat pulse (<25%), MP energy bar, XP progress bar, active Saint Blessing/perk badges, and gold coin counter.
  - **Target Unit Frame (`target-frame.tsx`):** Modernized with entity classification badges (`PLAYER`, `WILD`, `NPC`), animated health bar with damage decay, cast progress bar with spell names, and quick action buttons (Party Invite, Duel Challenge, Whisper Comms, Clear Target).
  - **Tactical Action Hotbar (`Hotbar.tsx`):** Overhauled with numeric/keybind tags (`1`–`5`), radial and vertical cooldown sweeps with fractional timers (`1.4s`), inventory stack counter on consumable items, ability type glows, and audio synthesis cues (`soundSynth`).
  - **MiniMap Radar (`MiniMapRadar.tsx`):** Upgraded with glowing compass cardinal ticks (N, S, E, W), dynamic entity radar blips (Party = Cyan, Players = Gold, NPCs = Cyan, Wilds = Rose), real-time map name, channel, and Pos X/Y coordinates readout.
  - **Classic Utility Ribbon (`ClassicPanel.tsx`):** Upgraded with dark neo-cyber docked tray for Inventory (`I`), Skills (`K`), Equipment (`C`), Quests (`L`), and GTC (`G`), featuring glowing active tabs and global keyboard shortcuts.

## [2.1.368] - 2026-08-19
### Added & Redesigned
- **Character Creator & Character Selector Full UI Redesign:**
  - Redesigned `CharacterSelector` (`/lobby`) with dark neo-cyber synthwave glass aesthetic matching Saints Landing Page and Saints Studio (`#0d0221`, glowing neon cyan/magenta/gold accents, polygon clip paths, animated horizon grid, and digital snow particles).
  - Integrated a dedicated dual-panel command deck in Character Selector with real-time **Hall of Champions Leaderboard** (Top Operatives) and **Global Comms / Live Lobby Chat**, allowing players to chat and view rankings prior to entering the world.
  - Added illuminated character sprite pedestals, HP meters, coin pouch metrics, active perk badges, and a custom cyber-styled Operative Deletion confirmation modal.
  - Re-architected `CharacterCreator` into a 5-step Operative Forge (Archetype Selection, Callsign Identity with generator, Appearance/Sprite Picker with pagination and custom uploaded asset support, Saint Blessing/Perk selection, and Dossier Review & Deploy).
  - Integrated comprehensive sound effects via `soundSynth` across creation, selection, navigation, and modal actions.
- **Dedicated Game Offline Gating & Admin Setup Flow:**
  - Added `GameOfflineScreen.tsx` for clean status communication and lockout when fresh installs or maintenance modes are active (`isSetupCompleted === false`).
  - Restricted the Realm Setup Wizard strictly to authenticated Server Administrators / Developers (`permissionLevel >= 200` or first user).
  - Removed intrusive public "Realm Setup Required" banners and buttons from player title screens.
  - Directed admins to Studio (`/studio`) upon completing setup.

## [2.1.367] - 2026-08-19
### Added & Changed
- **Starter Heroes LPC Overhaul & Dev-Controlled Active Realm:**
  - Overhauled Starter Hero presets in Character Creator (`/lobby`) to use official LPC humanoid hero sprites (`evil-berserker-bloodaxe-male`, `good-paladin-templar-female`, `good-wizard-archmage-male`, `evil-assassin-nightstalker-female`, `good-ranger-grovekeeper-female`, `good-cleric-highpriestess-female`) for the core classes while preserving legacy Tuxemon archetypes (`monk`, `spyder_tamer`).
  - Removed user-facing world/realm switcher dropdown in Character Creator, enforcing server-authoritative active realm settings.
  - Decoupled `upsertStarterHero` from hardcoded `'tuxemon'` fallback strings, dynamically deriving active game profiles from `prisma.gameConfig`.
  - Upgraded Asset Manager search and asset pack installer to enforce dev-defined flags (`showInCharacterCreation`, `isPlayable`, `playable`, `character_creator`) during import and filtering.

## [2.1.366] - 2026-08-19
### Fixed
- **Universal LPC Sprite Resolution & Dynamic Row Calculation:**
  - Fixed an issue where LPC character and modular equipment spritesheets (e.g., 832x3456, 832x1344, 576x256) were incorrectly sliced with Tuxemon 3x4 layout due to unresolved texture dimensions prior to image load.
  - Upgraded `resolveSpriteDefinition` in `src/shared/game/spriteDefinitions.ts` to dynamically calculate row counts (`Math.floor(height / 64)`) for extended LPC sprite sheets and recognize modular item patterns (`item-`, `/npc/item-`, `character_layer_`).
  - Added texture `onLoad` dimension listeners in `src/engine/BabylonEngine.ts` to inspect natural image dimensions on load and re-resolve sprite configs and mesh UVs in real time.
  - Enhanced `getAssetAnimationProfile` in `src/shared/game/creatureCatalog.ts` with synchronous heuristic fallback matching for fast profile detection.
  - Added unit test cases in `src/shared/game/spriteDefinitions.test.ts` for extended LPC heights and modular item URLs.

## [2.1.365] - 2026-08-19
### Added & Fixed
- **Curated Asset Bundle Registry Overhaul:**
  - Removed obsolete `"saints"` and `"studio"` asset pack definitions from the application (`ASSET_PACKS`), restricting the curated bundles strictly to `"tuxemon"` and `"lpc"`.
  - Refactored `inferAssetPack` and `packSourceMatchers` in `src/shared/game/assetPacks.ts` to cleanly classify LPC walk cycle animations (including hero walk cycles) as `"lpc"`, and all other game assets (tilesets, creatures, face portraits, items, objects, UI elements, audio) as `"tuxemon"`.
  - Updated the frontend `AssetEditor` component to remove theme mappings for Saints and Studio, falling back cleanly to the Tuxemon theme.
  - Updated all unit tests in `src/shared/game/assetPacks.test.ts` to align with the new binary classification structure.
- **Babylon Engine Real-time Studio Tile Brush Integration:**
  - Added `setActiveBrushTileId`, `setActiveLayerIdx`, and `setBrushMode` to `BabylonEngine.ts` to sync live brush properties and tile textures on the viewport hover reticle.
  - Fixed TypeScript compiler errors where `setActiveBrushTileId` was missing on `BabylonEngine`.
- **Canvas Context Menu Smart Actions:**
  - Added context-sensitive smart action overlays to `StudioContextMenu.tsx` allowing direct editing, dialogue config, and live despawn of NPCs, as well as configuration and deletion of Warp Gates and logic tiles directly from the right-click menu.
  - Integrated `EntityEditorPanel.tsx` with global custom events (`studio_select_npc`, `studio_delete_npc_context`) for seamless live interaction between canvas context menu and sidebar editors.
- **Module Resolution & Animation Profile Performance:**
  - Corrected relative import path for `AssetManager` in `src/shared/game/creatureCatalog.ts`.
  - Optimized animation profile lookup caching in `GameCanvasBabylon.tsx` to prevent redundant network requests inside the 60FPS render loop.

## [2.1.364] - 2026-08-19
### Added & Fixed
- **Asset Browser Context Menu Integration:**
  - Connected `AssetContextMenu` to `AssetEditor.tsx` grid cards and list rows. Right-clicking an asset triggers a custom context menu at the mouse position with quick actions (Inspect, Use in Canvas, Copy Path, Open Slicer, Make Starter Hero, Use as Map Tileset, direct Gameplay Flag Collision toggles, Quick Tag, Reclassify, and Delete/Archive).
- **Live Cursor & Dynamic Brush Size Viewport Updates:**
  - Upgraded `BabylonEngine.ts` and `GameCanvasBabylon.tsx` to track the last hovered tile coordinate (`lastHoveredR` / `lastHoveredC`). Changing the brush size (via `[`/`]`, numbers, or the bottom toolbar) immediately updates and re-renders the brush preview mesh on the canvas in real time without needing mouse movement.
- **Smart Menu Dismissal & UI Integrity**:
  - Ensured outside clicks, Escape keys, and action clicks cleanly dismiss the context menus.

## [2.1.363] - 2026-08-19
### Added & Fixed
- **Asset Studio & Asset Browser Overhaul:**
  - **Asset Pack & Bundle Query Matching (`app/api/assets/route.ts`)**: Fixed `/api/assets` route to support all bundle identifiers (`tuxemon`, `lpc`, `saints`, `studio`) across both source path patterns (`/monster/`, `/creatures/`, `/tilesets/`, `/npc/`, `/packs/`, `george`), metadata tags, and categories. Filtered out 1,515 empty stub records so pagination and sorting are clean.
  - **Type Normalization in API (`app/api/assets/route.ts`)**: Added multi-alias matching for normalized types (`CHARACTER`, `SPRITE`, `CREATURE`, `MONSTER`, `TILE`, `TILESET`, `ITEM`, `ITEM_ICON`, `AUDIO`, `UI`), ensuring workspace tabs accurately return their designated assets.
  - **Unified & Integrated Asset Browser UI (`AssetEditor.tsx`, `AssetStudioSuite.tsx`)**:
    - Eliminated redundant inner left sidebar ("tabs beside tabs"), replacing it with a streamlined, responsive top filter toolbar.
    - Added quick Asset Bundle filter pills (`All Bundles`, `Tuxemon`, `LPC`, `Saints Official`, `Studio Registry`) with live visual cues and count badges.
    - Added context-aware refinement options per workspace (Characters: modular vs full sprite filters, component and layer dropdowns; Creatures: form subcategory pills; Tilesets: terrain category filters; Catalog: full type dropdown).
    - Removed nested floating rounded card styling (`rounded-2xl border-amber-500/30`) in favor of seamless, full-bleed integration matching the outer Studio theme and frame.
    - Polished right-hand Asset Inspector panel, batch selection tools, and grid/list thumbnail rendering.

## [2.1.362] - 2026-08-19
### Added & Fixed
- **Studio Prefabs, Dynamic Map Loading, LPC Rendering & Character Creation Curation:**
  - **Dynamic Map Persistence (DEMO_SANDBOX Override Fix)**: Stopped hardcoded `DEMO_SANDBOX` defaults from overwriting the player's saved character map or chosen world map. Updated `resolveSafePlayerSpawn` in `worldSpawns.ts` to preserve `savedMapId` and updated `store.ts` initial map to `LOBBY`.
  - **Odd-Shaped & Multi-Tile Selection Tool (`editor-store.ts`, `subgridStamp.ts`, `GameCanvasBabylon.tsx`, `BabylonEngine.ts`)**: Upgraded Studio Selection mode from simple single-box rectangle to arbitrary tile cell selection. Supported **Shift + Click/Drag** (add tiles to selection) and **Alt + Click/Drag** (remove tiles from selection) for irregular shapes (trees, curved fences, non-rectangular buildings). Added `extractSparseCellsFromMap` with 100% unit test coverage.
  - **Prefab Column Limit & Parsing Fix (`app/actions/prefabs.ts`, `prisma/schema.prisma`)**: Updated `MapPrefab.visualData` and `MapPrefab.logicData` to properly serialize and parse JSON arrays on `listPrefabs` and `savePrefab`, eliminating column length serialization errors and empty array iterations during stamping.
  - **LPC Spritesheet Resolution & Rendering (`CharacterSpritePreview.tsx`)**: Upgraded `resolveSrc` in `CharacterSpritePreview.tsx` to handle standard `/game-assets/npc/` paths, multi-frame LPC sheets (832x1344), and custom uploads without incorrect prefixing.
  - **Curated Character Creation Sprites (`sprites.ts`, `character-creator.tsx`)**: Purged non-character monster/NPC/grunt clutter from `CHARACTER_SPRITES`, retaining strictly canonical Tuxemon humanoid trainers + LPC hero models. Added allowlist filter in `character-creator.tsx` ensuring only explicitly tagged playable assets appear in character creation.

## [2.1.361] - 2026-08-19
### Added & Fixed
- **Studio Phase 8 Track F (Infrastructure & Reliability):**
  - **Periodic 5-Minute Autosave (`StudioEditorShell.tsx`)**: Added background autosave timer that automatically triggers map saves when `isCreationMode` is active and unsaved edits (`mapDirty` or definition stack changes) are present.
  - **Studio Activity & Notification History Log Modal (`NotificationHistoryModal.tsx`, `StudioMenuBar.tsx`, `store.ts`)**: Built a notification and activity history log modal retaining the last 50 studio toasts and system notices with timestamps and clear actions, accessible via a bell button in the top menu and under `Help → Activity & Notice Log`.
  - **Collaboration & Soft-Locks State**: Fully integrated and verified real-time locks and peer presence in the bottom toolbar.
  - **Phase 8 Milestone Complete**: All Tracks (A: Architecture & Wiring, B: Cross-Mode Linking, C: Usability, D: Performance, E: Per-Mode Polish, F: Infrastructure) are 100% complete and verified.

## [2.1.360] - 2026-08-19
### Added & Fixed
- **Studio Phase 8 Track E (Per-Mode Polish) & Search Performance (Track C5):**
  - **Atlas Biome Icons & Quick Teleport (`WorldAtlasPanel.tsx`)**: Replaced generic icons with smart biome-specific placeholder icons (`Castle` for towns/hubs, `Trees` for forests/plains, `Waves` for oceans/ports, `Mountain` for caves/dungeons, `Flame` for raids/volcanoes) and added direct hover teleport navigation to any atlas node.
  - **Quest Objective Flow Chain & Test Quest Button (`QuestEditorPanel.tsx`)**: Built visual stage chain flow badge showing numbered sequence badges, target entity/item identifiers, quantity multipliers, and transition arrows. Added a "Test Quest" button to instantly launch playtest mode for the active quest.
  - **Creature Stat Distribution Visualizer & BST Breakdown (`CreatureDefEditorPanel.tsx`)**: Added stat progress bars (`HP`, `Atk`, `Def`, `SpA`, `SpD`, `Spe`) with color-coded fills and auto-calculated Base Stat Total (BST).
  - **NPC List Avatars & Badges (`EntityEditorPanel.tsx`)**: Enhanced the entity catalog list with avatar icon chips and formatted coordinates.
  - **Search Debouncing (`WorldBuilderPanel.tsx`, `StudioOmnisearch.tsx`)**: Added 150ms–200ms debouncing across map explorer and studio omnisearch to prevent unneeded heavy iteration on every keystroke.

## [2.1.359] - 2026-08-19
### Added & Fixed
- **Studio Phase 8 Track C (Usability Polish) & Track D (Performance Optimizations):**
  - **Keyboard Shortcut Cheat Sheet Modal (`StudioShortcutsModal.tsx`, `StudioMenuBar.tsx`, `StudioEditorShell.tsx`)**: Created a dedicated cheat sheet modal categorizing ~25 shortcuts across 5 functional groups (Tools & Brushes, Clipboard & Edit, Stamp Transforms, Modes & Workspaces, Navigation & View) accessible via `?`, `F1`, or `Help → Keyboard Shortcuts`.
  - **Studio Mode Switching Feedback (`StudioMenuBar.tsx`)**: Added clear, contextual toast feedback upon switching between modes (`Switched to Paint Mode`, `Switched to Populate Mode`, etc.).
  - **Item Editor Undo / Redo (`ItemEditorPanel.tsx`)**: Wired `useDefinitionFormHistory` into the Item Editor form state, connecting `CatalogEditorShell` undo/redo buttons with snapshot history stacks.
  - **FPS Counter Isolation & Performance (`StudioBottomToolbar.tsx`)**: Extracted the FPS animation loop into a memoized `<FpsBadge />` sub-component, preventing the 1-second interval update from re-rendering the entire 600+ line bottom toolbar.
  - **Removed Unused `hoveredTile` Subscription (`StudioBottomToolbar.tsx`)**: Removed the high-frequency `hoveredTile` store subscription from the bottom toolbar, eliminating unneeded toolbar re-renders on every canvas mouse move.
  - **Lazy-Loaded Dock Panels (`StudioEditorShell.tsx`)**: Converted all 17 dock panels in the FlexLayout factory to `React.lazy()` with `<Suspense>` loading fallbacks, maximizing code-splitting and reducing the initial bundle size.

## [2.1.358] - 2026-08-19
### Added & Fixed
- **Studio Phase 8 Track B (Cross-Mode Integration) & Track C4 (Visual Loot Builder):**
  - **NPC ↔ Dialogue Connection (`EntityEditorPanel.tsx`, `DialogueEditorPanel.tsx`)**: Added "Edit Dialogue Tree →" button that switches to the Dialogue dock and dispatches `studio_focus_dialogue` to pre-load or scaffold the NPC's branch conversation tree.
  - **NPC ↔ Quest Connection (`EntityEditorPanel.tsx`, `QuestEditorPanel.tsx`)**: Upgraded NPC quest hook with a searchable quest dropdown, a "Jump to Quest →" link, and a "Create Quest for NPC →" button that switches to the Quest Editor and auto-generates TALK objectives for the NPC via `studio_focus_quest`.
  - **Creature ↔ Spawner Connection (`MonsterSpawnerPanel.tsx`)**: Added creature catalog picker with species dropdown and "Edit Creature →" quick-jump link in the spawner configuration.
  - **Creature ↔ Loot Connection (`CreatureDefEditorPanel.tsx`, `creatureCatalog.ts`)**: Added `lootTableRefs` array of labeled table references (`normal`, `rare`, `boss`, `gather`) with "Add Loot Table" selector and "View Loot →" jump button to open the referenced loot table.
  - **Item ↔ Loot Reverse Link & Visual Table Builder (`LootManagerPanel.tsx`, `ItemEditorPanel.tsx`)**: Rebuilt the Loot Manager panel into a visual table builder with live drop rate calculations, autocomplete item templates, min/max quantity inputs, and quick-jump item icons wired to `studio_focus_item` in `ItemEditorPanel`. Completely eliminated raw JSON textareas.

## [2.1.357] - 2026-08-19
### Added & Fixed
- **Studio Phase 8 Track A — Critical Wiring Fixes & Architecture Consolidation:**
  - **Wired Gameplay Hub (`StudioEditorShell.tsx`, `StudioBottomToolbar.tsx`)**: Connected `GameplayStudioPanels` (Abilities, Status Effects, Skills, Professions, Combat Balance Simulator) into the FlexLayout dock factory and added quick dock launcher in the toolbar with Activity indicator.
  - **Unified `CatalogEditorShell` (`editor/components/CatalogEditorShell.tsx`)**: Consolidated three divergent `CatalogEditorShell` implementations into a single canonical component supporting both slot layouts and typed master-detail catalogs (with integrated search, list column, definition undo/redo, and action footers).
  - **Orphaned File & Component Cleanup**: Removed dead `StudioEditorShell_old.tsx` and harvested unique features (stamp transforms X/Y/Z, soft-locks indicator, peer count, latency ms) into `StudioBottomToolbar.tsx` before safely deleting `StudioStatusBar.tsx` and `StudioPaintHud.tsx`.
  - **Cleaned Panel Imports (`ItemEditorPanel.tsx`, `LootManagerPanel.tsx`)**: Migrated item and loot manager panels to the unified `CatalogEditorShell`.

## [2.1.356] - 2026-08-19
### Added & Fixed
- **Clean Separation of Paint Mode & Asset Studio:**
  - **De-cluttered Paint Mode Docks (`AssetBrowserPanel.tsx`)**: Removed redundant Catalog, Upload, and Slicer tabs from the docked panel in Paint/Populate modes. Replaced with a streamlined, lightweight Sprite Picker and a clean "Asset Studio" link.
  - **Direct Workspace Switching (`StudioMenuBar.tsx`, `StudioEditorShell.tsx`)**: Wired menu items, bottom toolbar shortcuts, and `Ctrl+Shift+A` to smoothly toggle directly into the full-screen Asset Management Suite rather than opening modal overlays.
  - **Deprecated Modal Overlay (`StudioEditorShell.tsx`)**: Removed the duplicate `FullScreenAssetBrowser` overlay in favor of the dedicated `AssetStudioSuite` workspace.

## [2.1.355] - 2026-08-19
### Added & Fixed
- **Sub-Studio Context Handshake & Starter Hero Ingestion:**
  - **1-Click "Make Starter Hero" Ingestion (`AssetEditor.tsx`, `StarterHeroEditorPanel.tsx`)**: Added action button in the Asset Inspector pane for Character/LPC assets. Clicking instantly transitions to the Starter Hero Editor with name, slug, and sprite asset auto-populated.
  - **Context-Aware Sub-Studio Handshake (`AssetStudioSuite.tsx`)**: Wired dedicated workspace parameters (e.g. 32px Grid for Items & Tilesets, 64px LPC for Characters & Creatures) directly into `AssetEditor`, `AssetUploadView`, and `SpritesheetSlicer`.
  - **Default Import Profile Binding (`AssetUploadView.tsx`, `SpritesheetSlicer.tsx`)**: Initialized default asset types (`CHARACTER`, `CREATURE`, `TILE`, `ITEM`, `AUDIO`) and import profile slots tailored per active workspace tab.

## [2.1.354] - 2026-08-19
### Added & Fixed
- **Asset Management Studio Final Polish:**
  - **Top Bar Explicit Button (`StudioMenuBar.tsx`)**: Pulled the `Assets` mode out of the generic dropdown and placed it as a prominent, explicit button right next to the Edit and Play Test modes.
  - **Catalog Search Normalization (`SpriteBrowser.tsx`)**: Hardened `SpriteBrowser.tsx` so that when the filter is set to `CHARACTER`, the list accurately filters out map tiles, environment props, and autotiles even if their database type overlaps as `SPRITE`.

## [2.1.353] - 2026-08-19
### Added & Fixed
- **Clean Fresh Installs & Character Appearance Curation:**
  - **Zero Demo Map Forcing on Clean Boot (`DemoBootstrap.ts`)**: Prevented `ensureStudioMapFoundation()` from automatically seeding `DEMO_SANDBOX`, `LOBBY`, and expansion maps on clean installs. Demo maps are only seeded if explicitly requested via `FORCE_DEMO_MAP=1` or explicit setup action.
  - **Strict Character Appearance Curation (`sprites.ts`, `character-creator.tsx`)**: Created `CHARACTER_SPRITES` list containing only humanoid and LPC character models, filtering out non-humanoid beasts, monsters, and props (`bee`, `conileaf`, `ghost`, `rockitten`, `snugglepot`, etc.) from the Character Creator appearance picker.
  - **LPC Character Models Ingestion**: Registered approved full LPC character models (`good-paladin-templar-female`, `good-ranger-grovekeeper-female`, `good-cleric-highpriestess-female`, `good-cleric-sanctuary-male`, `good-wizard-archmage-male`, `good-wizard-celestial-female`, `evil-assassin-nightstalker-female`, `evil-berserker-bloodaxe-male`) for instant preview and selection.

## [2.1.351] - 2026-08-19
### Added & Fixed
- **LPC Character Models & Hero Selection Overhaul:**
  - **Universal Character Sprite Preview (`CharacterSpritePreview.tsx`)**: Intelligently renders South-facing front frames across LPC full sheets (Row 10), LPC walk sheets (Row 2), Tuxemon classic 3×4 sheets, direct upload URLs, and asset paths without hardcoded 96×128 dimensions.
  - **Catalog LPC Hero Picker in Studio (`StarterHeroEditorPanel.tsx`)**: Added "Pick from LPC / Catalog" button opening `SpriteBrowser` directly in the Starter Hero Editor. Selected LPC character sheets and bundle IDs populate automatically.
  - **Broadened Sprite Validation (`StarterHeroEditorPanel.tsx`)**: Accepted custom upload paths, CDN URLs, and LPC asset identifiers alongside classic preset keys.
  - **Dynamic LPC Character Discovery in Character Creator (`character-creator.tsx`)**: Ingested custom LPC character assets alongside sprite presets in the Appearance step and added a "Custom Hero" flow when no starter heroes are seeded.
  - **LPC Hero Card Rendering (`character-selector.tsx`, `character-creator.tsx`)**: Replaced hardcoded CSS background offsets with `CharacterSpritePreview` for all character cards.

## [2.1.350] - 2026-08-19
### Added & Fixed
- **Dedicated Studio Asset Management Mode & Specialized Workspaces:**
  - **First-Class Studio Assets Mode (`src/shared/game/studioModes.ts`, `StudioEditorShell.tsx`)**: Added `assets` mode with full workspace replacement (`AssetStudioSuite.tsx`), persistent top and bottom toolbars, and 7 purpose-driven sub-studios.
  - **7 Specialized Asset Workspaces**: Characters & LPC Studio, Creatures & Monsters Studio, Tilesets & World Art Studio, Items & UI Icons Studio, Audio & Soundscapes Studio, Packs & Bundles Manager, and Master Catalog with moderation.
  - **Instant Cross-Component Asset Sync (`AssetManager.ts`, `AssetEditor.tsx`, `SpriteBrowser.tsx`, `AssetUploadView.tsx`, `SpritesheetSlicer.tsx`)**: Added `broadcastRefresh()` event listener pipeline and automatic cache invalidation on upload and slice completion.
  - **Accurate LPC Front-Facing Thumbnails (`assetSheets.ts`)**: Enhanced `getThumbnailFrameRect` to crop the South-facing (Front) idle frame across LPC full sheets (Row 10), LPC walk cycles (Row 2), and Tuxemon 3×4 sheets (Row 0).
  - **Normalized Type Search (`app/api/assets/route.ts`)**: Normalized `CHARACTER` and `SPRITE` type querying with profile tag indexing.
  - **Primary Lobby World Builder Control (`WorldBuilderPanel.tsx`)**: Added 1-click "Set as Primary Lobby" action in World Builder Overview.

## [2.1.349] - 2026-08-19
### Added & Fixed
- **Universal Sprite Definitions & Animation Profile Architecture:**
  - **Shared Sprite Definition & Animation Profile Contract (`src/shared/game/spriteDefinitions.ts`)**: Replaced raw hardcoded dimensions with declarative animation profiles (`tuxemon-3x4`, `lpc-full`, `lpc-walk`, `portrait-1x1`, `custom`).
  - **Deterministic Resolver with Legacy Fallback (`resolveSpriteDefinition`)**: Resolves explicit stored profiles on assets with automatic fallback inference for legacy 3×4 Tuxemon walk sheets (96×128, 48×128), single-frame portraits/monsters (`-ow.png`), and custom grids.
  - **Babylon 2.5D Engine Integration (`src/engine/BabylonEngine.ts`)**: Engine now reads resolved sprite definitions for vertex UV cell cropping, supporting 9-frame LPC fluid walk cycles, 3-step classic Tuxemon walks, and combat action blocks seamlessly on the same map.
  - **Studio Uploader & Slicer Profile Wiring (`AssetUploadView.tsx`, `SpritesheetSlicer.tsx`, `assetUpload.ts`, `app/api/assets/upload`, `app/api/assets/slice`)**: Stores explicit `animationProfile` metadata on upload and slicing, guaranteeing consistent rendering without guessing.
  - **Unit Test Coverage (`src/shared/game/spriteDefinitions.test.ts`)**: 9 unit tests verifying profile resolution, legacy fallback inference, and Babylon config conversion.

## [2.1.348] - 2026-08-19
### Added & Fixed
- **Native Browser Universal LPC Character & Splicer Ingestion Pipeline:**
  - **Removed Hardcoded Dev-Folder Staging**: Removed local filesystem dev paths (`../.assets-gen/review/approved`), `app/api/assets/import-lpc/route.ts`, and `src/server/lpcPackImporter.ts` so asset ingestion does not depend on local dev folders absent from production.
  - **In-Browser LPC ZIP Package Unpacker (`src/shared/game/lpcPackage.ts`)**: Added client-side decompression for Universal LPC Character Generator ZIP exports using JSZip. Automatically unpacks composite spritesheet PNG, individual modular layers (body, hair, torso, pants, shoes, hat, weapon), and parses `credits.txt` attributions.
  - **LPC Format Detection & Presets in Upload View (`AssetUploadView.tsx`)**: Automatic dimension recognition for full LPC sheets (832x1344), 4-direction walk cycles (576x256), and Saints 2.5D walk grids (96x128). One-click presets and batch ingestion for all modular layers or direct handover to Slicer.
  - **Smart LPC Auto-Slicing Presets in Spritesheet Slicer (`SpritesheetSlicer.tsx`)**: Added one-click auto-slicers for "Auto-Slice LPC Full Sheet" (Walk, Slash, Thrust, Spellcast, Shoot, Hurt), "Extract Walk Cycle (4-Dir)", "Extract Saints 2.5D (3x4 Grid)", and "Extract 4-Direction Idles".
  - **Comprehensive Unit Tests (`src/shared/game/lpcPackage.test.ts`)**: Added test coverage for LPC format detection, standard animation row slice generation, credit parsing, and component layer inference.

## [2.1.347] - 2026-08-19
### Added & Fixed
- **Studio LPC Import Workflow Made Explicit:**
  - **Dedicated approved-pack API (`app/api/assets/import-lpc/route.ts`)**: Added a Studio-callable endpoint to inspect the external approved LPC review folder and import reviewed packs directly into the asset catalog without dropping to the CLI.
  - **Shared approved-pack status helpers (`src/server/lpcPackImporter.ts`)**: Added default approved-folder discovery plus pack-count/status inspection so the Studio UI can show whether reviewed LPC packs are actually ready to import.
  - **Upload tab LPC guidance and actions (`src/web/components/the-lobby/editor/AssetUploadView.tsx`)**: Added a visible "LPC Import Path" panel with one-click approved-pack import, ready-pack counts, approved-folder visibility, and an LPC sheet preset for manual sheet uploads that should continue into the slicer.

## [2.1.346] - 2026-08-19
### Added & Fixed
- **LPC / Modular Character Asset Pipeline Expansion:**
  - **Shared character layer compositing (`src/shared/game/characterLayerCompositor.ts`)**: Added a pure stacking and hide-resolution engine for modular character components, including body-type mismatch reporting for preview and future runtime reuse.
  - **Starter hero equipment layering (`src/shared/game/items/equipmentEngine.ts`, `app/actions/starter-heroes.ts`)**: Wired equipped item metadata into component hide rules and layer ordering so starter hero previews reflect modular gear composition correctly.
  - **LPC import CLI + server importer (`scripts/import-lpc-packs.ts`, `src/server/lpcPackImporter.ts`)**: Added an explicit approved-pack import path that reads staged LPC spritesheets, preserves attribution metadata, and registers them through the standard ingestion flow.
- **Asset Catalog, Preview, and Upload Workflow Improvements:**
  - **Asset browser/API contract upgrades (`app/api/assets/route.ts`, `src/engine/assets/AssetManager.ts`)**: Expanded catalog payload support for richer sheet metadata, filtering, and client consumption across Studio tools.
  - **Representative sheet thumbnails (`src/web/components/the-lobby/editor/SpriteThumbnail.tsx`, `src/shared/game/assetSheets.ts`)**: Added frame-aware thumbnail rendering so multi-row character sheets preview as a readable single frame instead of a compressed full sheet.
  - **Uploader and slicer UX expansion (`AssetUploadView.tsx`, `SpritesheetSlicer.tsx`, `AssetEditor.tsx`, `StarterHeroEditorPanel.tsx`)**: Extended Studio upload/edit flows with modular asset metadata, smarter defaults, and improved spritesheet slicing/editing controls.
- **Asset Governance, Persistence, and Schema Hardening:**
  - **Transactional ingestion (`src/web/lib/assetUpload.ts`)**: SourceAsset, UsableAsset, and GameAsset creation now commits atomically to avoid partial asset records on failure.
  - **Moderation and ownership enforcement (`app/api/assets/upload/route.ts`, `app/api/assets/slice/route.ts`, `src/shared/game/assetPermissions.ts`)**: Community uploads and slices now default to pending unless performed by moderators, and slice creation is restricted to asset owners or moderators.
  - **Asset schema/documentation updates (`prisma/schema.prisma`, `docs/README.md`, `docs/TUXEMON_ATTRIBUTION.md`)**: Added supporting schema fields and refreshed attribution/docs to cover the expanded LPC import and modular asset workflow.
- **Validation & Test Coverage:**
  - **New shared tests (`assetModeration.test.ts`, `assetSheets.test.ts`, `characterLayerCompositor.test.ts`, `equipmentEngine.test.ts`, `assetImportProfiles.test.ts`)**: Added coverage for moderation policy, sheet thumbnail math, modular compositing, equipment layering, and profile-driven import behavior.

## [2.1.345] - 2026-08-18
### Added & Fixed
- **Profile-Driven Asset Import Foundation (Phase 1 Implementation Start):**
  - **Shared import profile contract (`src/shared/game/assetImportProfiles.ts`)**: Added canonical profile metadata (`character`, `creature`, `item`, `tile`, `ui`, `effect`) with required/optional slot roles plus deterministic helper APIs for profile/role validation and type/category inference.
  - **Required-slot validation utility (`assetImportProfiles.ts`)**: Added `getMissingRequiredRoles` helper to support strict role coverage checks in import-critical flows.
- **Upload Ingestion Role Metadata Wiring:**
  - **Upload API payload expansion (`app/api/assets/upload/route.ts`)**: Added support for `importProfile`, `slotRole`, `bundleId`, `sourceMode`, optional `roleAssignments`, and strict required-role checks with actionable 400 errors.
  - **Ingestion normalization (`src/web/lib/assetUpload.ts`)**: Added profile-aware normalization for asset type/category/tags and source metadata (`profile:*`, `role:*`, `bundle:*`, `source:*`) while preserving legacy behavior when profile metadata is omitted.
- **Spritesheet Slice Pipeline Profile Wiring:**
  - **Slice API validation & inference (`app/api/assets/slice/route.ts`)**: Added per-region profile-role validation, optional strict required-role enforcement, and inferred type/category/tag enrichment for sliced usable assets.
  - **Slicer client payload updates (`SpritesheetSlicer.tsx`)**: Region payloads now include `importProfile` and `slotRole` metadata for end-to-end role-aware slicing.
- **Editor Upload/Slicer UI Profile Controls:**
  - **Asset uploader profile controls (`AssetUploadView.tsx`)**: Added import profile and slot role selectors with automatic type/category defaults from role metadata.
  - **Slicer profile defaults (`SpritesheetSlicer.tsx`)**: New slices now seed type/category/role from selected profile and allow per-region role adjustments.
- **Validation & Test Coverage:**
  - **Profile helper unit tests (`assetImportProfiles.test.ts`)**: Added coverage for profile validation, slot-role validation, deterministic inference behavior, and required-role gap detection.

## [2.1.344] - 2026-08-17
### Added & Fixed
- **Setup Completion Determinism & Fresh-Install Loop Fixes:**
  - **Deterministic default map persistence (`app/api/setup/complete/route.ts`)**: Setup completion now validates and persists explicit `defaultMapId` values instead of silently relying on nondeterministic DB-first map fallback.
  - **Wizard completion contract (`FirstTimeSetupWizard.tsx`)**: Setup finalization now submits `defaultMapId` by selected starter path (`SAINTS_HAVEN` for community starter, `STARTING_MAP` placeholder for blank-canvas flow).
  - **Post-complete verification guard (`FirstTimeSetupWizard.tsx`)**: Added immediate setup-status verification before route handoff to reduce stale-state bouncebacks.
- **Blank-Canvas Studio Start Path Hardening:**
  - **Studio author entry defaults (`src/web/components/the-lobby/index.tsx`)**: Studio author sessions now prefer `STARTING_MAP` blank-canvas behavior and avoid demo-biased fallback during fresh world creation.
  - **Setup gate correction (`GameTitleScreen.tsx`, `index.tsx`)**: Setup redirects now trigger only when setup is incomplete, preventing completed blank-canvas installs (`mapCount === 0`) from being forced back to setup.
- **Studio UI Viewport Safety:**
  - **Realm Settings modal containment (`RealmSettingsModal.tsx`)**: Added viewport-bounded modal height and internal scrolling to prevent controls from rendering off-screen.
- **Character-Select Chat Duplicate Mitigation:**
  - **Chat bridge dedupe (`src/web/components/the-lobby/index.tsx`)**: Added canonical event dispatch + short-lived dedupe key cache across chat channels (`player_chat`, `global_chat_msg`, `chat_message`) to reduce duplicate feed lines.
- **Character Creation Setup-Default Map Alignment:**
  - **Spawn map resolution (`character-creator.tsx`)**: New characters now respect setup's persisted `defaultMapId` from `/api/setup/status` (including `STARTING_MAP` blank-canvas intent) before hub fallback heuristics, preventing unintended demo-map starts on fresh installs.
- **Setup Access Authentication Lock:**
  - **Setup page gate (`app/(main)/setup/page.tsx`)**: Setup wizard now requires an authenticated session and redirects unauthenticated users to login with `callbackUrl=/setup`.
  - **Setup mutation API gates (`app/api/setup/import/route.ts`, `app/api/setup/complete/route.ts`, `app/api/setup/assets/route.ts`)**: Added explicit `401 Unauthorized` responses when no authenticated session exists, preventing pre-login setup execution.
- **Asset Browser Reliability & Performance Pass:**
  - **API/Client contract repair (`app/api/assets/route.ts`)**: Switched `/api/assets` browse endpoint to `GameAsset` payload shape expected by `AssetManager` (`items`, `total`, `page`, `hasMore`) with backward-compatible `assets/pagination` fields, restoring catalog visibility and filter behavior.
  - **Filter/query parity (`app/api/assets/route.ts`)**: Added support for `query`, `tags`, `categories`, `pack`, `page`, and `sortBy/sortOrder` parameters used by Studio asset tools.
  - **Search debounce (`AssetEditor.tsx`)**: Added debounced search dispatch to reduce per-keystroke request bursts and improve asset browser responsiveness under large catalogs.

## [2.1.343] - 2026-08-17
### Added & Fixed
- **Selection Enhancements & Shift+Click Line Painting (Phase 5C):**
  - **Select All & Deselect Shortcuts (`StudioEditorShell.tsx`)**: Added `Ctrl+A` / `Cmd+A` (Select All map tiles) and `Ctrl+D` / `Cmd+D` (Deselect / Clear selection), syncing with Babylon viewport overlay.
  - **Shift+Click Straight-Line Painting (`GameCanvasBabylon.tsx`)**: Holding `Shift` while clicking in Paint or Erase mode rasterizes and paints all tiles along a straight line from `lastPaintedTile` to current target coordinate using Bresenham's algorithm.
  - **Layer Isolation & Dimming Engine (`BabylonEngine.ts`)**: Added `highlightCurrentLayer(layerIdx)`, `restoreLayerIsolation()`, and `toggleLayerIsolation(layerIdx)` methods in Babylon engine. Toggling `H` dims non-active layers and paint overlays to 0.35 opacity.
  - **Bresenham Line Rasterizer (`lineRaster.ts`, `lineRaster.test.ts`)**: Pure line rasterization utility with unit tests for horizontal, vertical, diagonal, and arbitrary slope lines.

## [2.1.342] - 2026-08-17
### Added & Fixed
- **Tool Mode Shortcuts (Phase 5B):**
  - **Tool Mode Key Bindings (`StudioEditorShell.tsx`)**: Added single-key shortcuts for rapid tool switching in Editor runtime:
    - `B`: Paint Brush (`setBrushMode('paint')`)
    - `E`: Eraser (`setBrushMode('erase')`)
    - `I`: Eyedropper / Tile Sample (`setBrushMode('eyedropper')`)
    - `M`: Marquee Selection (`setBrushMode('select')`)
    - `G`: Prefab Stamp (`setBrushMode('prefab')`)
    - `H`: Layer Isolation Toggle (`studio_toggle_layer_dim`)
  - **Interactive Input & Dialog Guard**: Ensured single-key shortcuts only execute when not typing in inputs/textareas and no dialog modals are open.
  - **Tooltips & HUD Hints (`StudioPaintHud.tsx`)**: Updated tooltips across all toolbar buttons with their corresponding hotkey hints.
  - **Tool Shortcuts Engine & Tests (`studioShortcuts.ts`, `studioShortcuts.test.ts`)**: Created pure resolver engine with comprehensive unit tests.

## [2.1.341] - 2026-08-17
### Added & Fixed
- **Stamp & Brush Transform Shortcuts (Phase 5A):**
  - **Transform Shortcuts (`StudioEditorShell.tsx`)**: Added Tiled-standard key bindings: `X` (Flip Stamp Horizontally), `Y` (Flip Stamp Vertically), `Z` (Rotate Stamp 90° Clockwise), and `Shift+Z` (Rotate Stamp 90° Counter-Clockwise).
  - **HUD Visual Indicators (`StudioPaintHud.tsx`)**: Added persistent visual transform chips and quick-action buttons with active state highlighting and rotation angle readouts (`0°`, `90°`, `180°`, `270°`).
  - **Transform Mathematics Engine (`stampTransform.ts`, `stampTransform.test.ts`)**: Built 2D matrix transformation pipeline for horizontal/vertical flipping and 90°/180°/270° clockwise rotations.
  - **Transformed Clipboard Pasting (`editor-store.ts`)**: Integrated active `stampTransform` state into `pasteClipboard` to automatically transform multi-tile clipboard layers prior to canvas stamping.

## [2.1.340] - 2026-08-17
### Added & Fixed
- **Bundled Assets as Optional Asset Packs (Phase 3B):**
  - **CLI Asset Pack Installer (`scripts/install-asset-pack.ts`, `npm run assets:install`)**: Added command-line utility to selectively install and register asset packs (e.g. `--pack=tilesets`, `--pack=creatures`, `--pack=all`).
  - **Selective Asset Pack API (`/api/assets/install-pack`)**: Added dedicated REST endpoint with elevate/admin permission checking to install single or multiple packs on demand.
  - **In-Studio Asset Pack Installer (`AssetPackInstaller.tsx`)**: Created modular pack installer UI with pack overview cards, preview strips, asset count estimates, and instant sync actions.
  - **Full-Screen Asset Browser Integration (`FullScreenAssetBrowser.tsx`)**: Added dedicated "Asset Packs" tab for effortless asset pack discovery and installation directly from Studio.

## [2.1.339] - 2026-08-17
### Added & Fixed
- **"Sheets" Category & Spritesheet Asset Management (Phase 4A):**
  - **Dedicated "Sheets" Category (`AssetEditor.tsx`)**: Added `SHEET` as a first-class asset filter option in the sidebar and type selector dropdown, automatically querying multi-frame sheets.
  - **Asset Card Badges & Metadata**: Added pack origin badges (`Saints`, `Tuxemon`, `LPC`), frame counts (`16f`, etc.), and sheet markers across Grid and List views.
  - **Sheet Asset Ingestion (`sync-local-assets.ts`, `assetPackInstaller.ts`)**: Auto-tagged battle animation sheets, NPC walk cycles, and hero sprites with `sheet` and `spritesheet` taxonomy.
  - **Spritesheet Helper Utilities (`assetSheets.ts`)**: Added helper functions and unit tests for spritesheet classification and multi-frame grid dimension calculations.

## [2.1.338] - 2026-08-17
### Added & Fixed
- **Zoom Presets, Percentage Display & Navigation Aids (Phase 2B):**
  - **Live Zoom Percentage & Presets (`StudioBottomToolbar.tsx`)**: Added zoom percentage readout and dropdown presets (`25%`, `50%`, `100%`, `200%`, `400%`) synchronized with Babylon camera orthographic size.
  - **Keyboard Shortcuts (`StudioEditorShell.tsx`)**: Added `Ctrl+0` / `Cmd+0` shortcut to instantly reset zoom to 100% and wired `Home` to `studio_fit_map`.
  - **Camera Fit & Zoom Dispatch (`BabylonEngine.ts`)**: Added `fitMapInView()`, `setZoomPercent()`, and global event listeners for `studio_set_zoom` and `studio_fit_map` with two-way `studio_zoom_changed` event notifications.
  - **Zoom Calculations & Math (`zoomMath.ts`)**: Added utility functions and unit tests for ortho/percentage conversions and aspect-ratio-aware fit-map framing.

## [2.1.337] - 2026-08-17
### Added & Fixed
- **Unified Tileset Browser & Asset Integration (Phase 4C):**
  - **Dynamic Tileset Management (`TilesetPicker.tsx`)**: Upgraded Tileset Picker with an integrated "+ Add Tileset" modal searching `type: 'TILESET'` assets in the Asset Catalog and calculating automatic `firstgid` offsets.
  - **Map Tileset Removal & Search**: Added quick filtering across map tilesets and one-click removal with confirmation.
  - **Asset Catalog Integration (`AssetEditor.tsx`, `WorldBuilderPanel.tsx`)**: Added "Use as Map Tileset" action to Asset Inspector and linked `onUpdateTilesets` state updates to mark maps dirty.
  - **Tileset Calculations (`tilesetCalculations.ts`)**: Added unit-tested helper utilities for `firstgid` progression and bi-directional GID/coordinate translations.

## [2.1.336] - 2026-08-17
### Added & Fixed
- **Creature Asset Sub-Categories & Fine-Grained Filtering (Phase 4B):**
  - **Creature Classification Suite (`creatureCatalog.ts`)**: Defined `CreatureAssetSubcategory` types (`battle_sheet`, `front_sprite`, `back_sprite`, `face_portrait`, `overworld`) and pattern classifier `classifyCreatureAsset()`.
  - **Asset Tagging in Ingestion Pipelines (`sync-local-assets.ts`, `assetPackInstaller.ts`)**: Auto-tagging all imported game assets with specific sub-categories and `creature:<subcat>` tags.
  - **Asset Manager Filtering & Badges (`AssetEditor.tsx`, `SpriteBrowser.tsx`)**: Added subcategory dropdown selectors and colorful badges on grid/list cards for creature front/back sprites, face portraits, and battle sheets.

## [2.1.335] - 2026-08-17
### Added & Fixed
- **Setup Flow Polish & Asset Import Stage (Phase 7B):**
  - **Bundled Asset Pack Installer (`src/server/assetPackInstaller.ts`)**: Built structured asset installer for selective registration of 8 core asset libraries (Tilesets, Creature Sheets, Portraits, LPC NPCs, Hero Sprites, Items, Objects, and UI).
  - **First-Time Setup Asset Screen (`FirstTimeSetupWizard.tsx`)**: Added Step 3 for interactive multi-select asset pack installation with live progress, count metrics, and quick-skip support.
  - **Studio-First Launch Flow**: Replaced equal-weight landing buttons with a prominent primary "Launch World Studio" action.
  - **Setup Assets API (`app/api/setup/assets/route.ts`)**: Added authenticated API route to query available bundled asset packs and trigger batch installations.

## [2.1.334] - 2026-08-17
### Added & Fixed
- **Zero-Asset Setup & Resilient Tileset Loading (Phase 3A.1):**
  - **Tileset Disk Introspection (`demoMapSeed.ts`)**: Added `checkTilesetExistsOnDisk()`, `hasBundledTilesetsOnDisk()`, and `getAvailableStudioTilesets()` to protect map bootstrap from missing image crashes in zero-asset environments.
  - **Graceful Babylon Texture Fallbacks (`BabylonEngine.ts`)**: Added texture load error interception with solid fallback material coloring (`mat.diffuseColor = new Color3(0.2, 0.45, 0.2)`) and warning logs rather than throwing rendering errors.
  - **TilesetPicker Empty & Error States (`TilesetPicker.tsx`)**: Replaced broken hardcoded secondary image fallback with a clean onboarding empty state and direct button to open the Asset Browser when zero tilesets exist.

## [2.1.333] - 2026-08-17
### Added & Fixed
- **Studio Context Menu Restructure & Quick-Create Suite (Phase 1C):**
  - **Structured GIMP/Tiled Layout**: Organized right-click context menu into 4 distinct functional blocks: Clipboard, Tile & Layer Operations, Quick Create, and Selection.
  - **Clipboard Actions**: Added Copy (`Ctrl+C`), Cut (`Ctrl+X`), Paste (`Ctrl+V`), and Paste in Place (`Ctrl+Shift+V`) directly to context menu with dynamic disabled states and keyboard hints.
  - **Quick Create Menu**: Added expandable quick-creation suite with 11 Warp Gate types, Default Map Spawn configuration, Author avatar teleportation, Loot Containers (#4), Encounter Zones (#6), and NPC Triggers (#8).
  - **Selection Controls**: Added Select All (`Ctrl+A`) with visual 3D preview bounds and contextual Clear Selection (`Escape`).

## [2.1.332] - 2026-08-17
### Added & Fixed
- **Character Spawn Alignment & Hub Metadata Resolution (Phase 6E):**
  - **Dynamic Map Spawn Resolution (`character-creator.tsx`)**: Replaced generic fallback coordinates with dynamic map `spawnPoint` metadata lookups.
  - **Map Payload SpawnPoint Support (`app/api/maps/[slug]/route.ts`)**: Added automatic resolution and extraction of designated spawn points and center-grid fallbacks in map payload endpoints.
  - **Hub Prioritization**: Prioritized canonical hub worlds (`SAINTS_HAVEN` at `(20, 20)`, `LOBBY` at `(32, 32)`) over arbitrary off-grid positions when creating new Saint operatives.

## [2.1.331] - 2026-08-17
### Added & Fixed
- **Skills Floating Windows & UX Polish (Phase 6C):**
  - **Floating Inspect & Full Guide Windows (`SkillGuideModal.tsx`, `SkillGuideFull.tsx`, `skills-overlay.tsx`)**: Replaced modal blur backdrops with independent draggable `FloatingWindow` instances featuring minimize, dragging, custom z-index elevation, and viewport bounds clamping.
  - **Auto Scroll-to-Top on Skill Navigation (`SkillGuideFull.tsx`)**: Added `contentRef` and `useEffect` lifecycle hook ensuring the proficiency guide smoothly scrolls to the top whenever opened or when changing skills/tabs.
  - **Enhanced Skill Card Sizing & Typography (`skills-overlay.tsx`)**: Increased card padding, minimum height (64px), and icon sizing (`w-4 h-4 sm:w-4.5 sm:h-4.5` in dedicated themed badges), with explicit `LV {level}` displays and responsive grid spacing.

## [2.1.330] - 2026-08-17
### Added & Fixed
- **Camera & Zoom Limits Optimization (Phase 2A):**
  - **Tightened Game & Studio Zoom Bounds (`BabylonEngine.ts`)**: Reduced maximum zoom-out limit in Game/Lobby mode from `22` → `16` (maintains clear character visibility ~8 tiles radius) and in Studio Editor mode from `60` → `40` (prevents extreme bird's-eye distortion where tiles become dots).
  - **Cursor-Anchored Wheel Zooming (`BabylonEngine.ts`)**: Implemented mouse-cursor anchored zoom calculations in the canvas wheel event handler for Studio Editor mode, keeping the tile beneath the cursor statically pinned while zooming in or out.

## [2.1.329] - 2026-08-17
### Added & Fixed
- **Home Page Game Showcase & Navbar Guest Visibility (Phase 6D):**
  - **Navbar Game Link for Guests (`navbar.tsx`)**: Removed the `!user` hide restriction so unauthenticated guests can discover and access the MMO; displays "Enter Game" for guests and "Play Now" for logged-in players with high-visibility cyber-gold/emerald styling in both desktop and mobile drawer navigation.
  - **Home Page Live Game Showcase (`app/(main)/home/page.tsx`)**: Added a prominent "Play Saints MMO" primary action button to the Hero section and an enriched premier feature showcase card for "Saints MMO / The Lobby" with live game badge and cyberpunk-gradient styling.

## [2.1.328] - 2026-08-17
### Added & Fixed
- **Canonical "Saint" Player Identity & Realm Settings (Phase 6B):**
  - **Realm Settings Module (`realmSettings.ts`, `realmSettings.test.ts`)**: Established `DEFAULT_PLAYER_IDENTITY = "Saint"`, `getPlayerClassName()`, and `formatPlayerIdentity()` for configurable server identity conventions.
  - **Studio Realm Settings Modal (`RealmSettingsModal.tsx`, `StudioMenuBar.tsx`)**: Added a dedicated Realm Settings modal under the File menu in Studio to allow admins to customize the Player Class Name, Realm Display Name, and MOTD.
  - **Replaced "Tamer" Fallbacks Across Game Systems**:
    - Updated chat handler fallbacks in `the-lobby/index.tsx` (local, global, party, whisper, and battle presence).
    - Updated 3D Babylon peer name resolution in `GameCanvasBabylon.tsx` and `PeerPresenceHud.tsx`.
    - Updated character creator perk title to **Master Saint** (`character-creator.tsx`).
    - Updated leaderboard titles and descriptions (`app/(main)/leaderboards/page.tsx`).
    - Updated default NPC dialogues (`EntityEditorPanel.tsx`, `WorldSimulation.ts`, `data/quests.ts` - "The Saint Awakening").
    - Added `title_saint` to achievement dispatcher and updated `ach_first_companion` in `achievementCatalog.ts`.
    - Updated Section 9 of `.agents/AGENTS.md` and `01-gameplay-bible.md` to establish "Saint" as the canonical player identity term.

## [2.1.327] - 2026-08-17
### Added & Fixed
- **Studio In-Memory Tile Clipboard — Cut / Copy / Paste (`Ctrl+X`, `Ctrl+C`, `Ctrl+V`, `Ctrl+Shift+V`):**
  - **Shared Subgrid Extraction & Stamping Engine (`subgridStamp.ts`, `subgridStamp.test.ts`)**: Built reusable subgrid extraction and stamping algorithms supporting **Overlay** (transparent merge), **Replace** (full footprint overwrite), and **New Layer** (paste directly to an auto-created layer) modes.
  - **Prefab Builder Integration (`PrefabBuilderPanel.tsx`)**: Replaced duplicate selection extraction in Prefab Builder with the shared `extractSubgridFromMap` engine.
  - **Clipboard State & Undo Actions (`editor-store.ts`)**: Added `copySelection`, `cutSelection`, `pasteClipboard`, and `cancelPaste` actions to `useEditorStore` with full undo stack tracking (`Ctrl+Z` / `Ctrl+Y`) and Babylon mesh event syncing (`STUDIO_MAP_CELLS_CHANGED_EVENT`).
  - **Interactive Paste Floating Toolbar (`PasteOptionsToolbar.tsx`)**: Added a floating modal toolbar when paste mode is initiated, displaying clipboard tile dimensions, mode selectors (Overlay, Replace, New Layer), Apply, and Paste in Place buttons.
  - **Canvas Hover Preview & Click-to-Place (`GameCanvasBabylon.tsx`)**: Renders translucent bounding box previews at the author's cursor during paste mode and commits the paste on click.
  - **Studio Shortcuts & Menu Bar (`StudioMenuBar.tsx`, `StudioEditorShell.tsx`)**: Enabled Cut/Copy/Paste/Paste in Place/Paste to New Layer in the File Edit menu and registered global shortcuts (`Ctrl+C`, `Ctrl+X`, `Ctrl+V`, `Ctrl+Shift+V`, `Escape`).

## [2.1.326] - 2026-08-17
### Added & Fixed
- **Studio Selection Deletion (`Del` / `Backspace` keys, context menu, & batch erase):**
  - **Tile Deletion Engine (`tilePaint.ts`, `tilePaint.test.ts`)**: Implemented `eraseTilesInRegion` pure bounding box eraser with boundary protection, supporting both logic (`-1`) and visual (`0..N`) layers.
  - **Delete Action & State Management (`editor-store.ts`)**: Added `deleteSelectionTiles(map, engine, layerIdx)` action to `useEditorStore` that records undoable batch operations via `opStack`, syncs `mapDirty` / `hasUnsavedChanges`, and dispatches `STUDIO_MAP_CELLS_CHANGED_EVENT`.
  - **Keyboard Shortcuts (`StudioEditorShell.tsx`)**: Bound `Delete` and `Backspace` keys in Studio creation mode to delete selected marquee regions or the currently hovered tile with active toast feedback.
  - **Context Menu Integration (`StudioContextMenu.tsx`)**: Replaced raw cell zeroing in the right-click "Erase Tile" action with `deleteSelectionTiles`, bringing undo/redo tracking and live 3D mesh sync to context menu erasing.

## [2.1.325] - 2026-08-17
### Added & Fixed
- **Studio Exit Navigation, Save & Exit, and Global Save Architecture (`StudioMenuBar.tsx`, `StudioEditorShell.tsx`, `StudioStatusBar.tsx`, `editor-store.ts`):**
  - **Save & Exit Menu Actions**: Added **"Save & Exit to Character Select"** (`Ctrl+Shift+Q`) and **"Exit to Character Select"** options to the Studio File menu in `StudioMenuBar.tsx`, with unsaved changes verification.
  - **Global Map Save Listener (`StudioEditorShell.tsx`)**: Replaced dock-dependent save listeners with a globally mounted handler in `StudioEditorShell.tsx`, guaranteeing map saves (`Ctrl+S`, menu item, status bar) always execute regardless of which dock or panel is active.
  - **Pre-Playtest Save Prompt**: When switching to Playtest mode (`Ctrl+E` or mode switcher) with unsaved changes, authors are prompted to save before testing to prevent map reload overwrites.
  - **Global Saving Status Indicator (`StudioStatusBar.tsx`, `editor-store.ts`)**: Added `isSavingMap` and `hasUnsavedChanges` reactive state tracking to the editor store, updating the status bar Save button with an animated spinner and active feedback while map saves are in flight.

## [2.1.324] - 2026-08-17
### Fixed
- **Character Select & Lobby Chat Double Message Echo Bug (`handler.go`, `LobbySocketHandler.ts`, `the-lobby/index.tsx`, `GameTitleScreen.tsx`):**
  - **Go MMO Socket Hub (`handler.go`)**: Included client connection `socketId` and `accountId` on pre-map join chat broadcasts (`broadcastChat`).
  - **TS Fallback Socket Handler (`LobbySocketHandler.ts`)**: Included `accountId` in global and local chat broadcasts.
  - **Lobby Socket Bridge (`the-lobby/index.tsx`)**: Added account-level self-echo filtering (`data.accountId === session.user.id`) in addition to socket ID filtering on global and party chat messages.
  - **Title & Character Select Screen (`GameTitleScreen.tsx`)**: Made incoming chat deduplication sender-agnostic within the timestamp window, preventing optimistic messages from duplicating if sender display name differs from server-broadcast fallback.

## [2.1.323] - 2026-08-17
### Fixed
- **Setup Wizard Blank Canvas Infinite Redirect Loop (`app/(main)/studio/layout.tsx`, `app/(main)/lobby/page.tsx`):**
  - Removed `setupStatus.mapCount === 0` check from the route guards on `/studio` and `/lobby`.
  - Fixes the critical bug where choosing a "Blank Canvas" (0 maps) realm during onboarding redirected infinitely back to `/setup`, locking authors out of Studio and preventing them from creating their first map.

## [2.1.322] - 2026-08-17
### Added & Documented
- **Dynamic World Hub & Unstuck Teleport System (`worldSpawns.ts`, `GameOptionsMenu.tsx`, `the-lobby/index.tsx`, `character-creator.tsx`):**
  - **Dynamic New Character Spawns**: New characters now dynamically query the active world maps index and spawn on the active lobby hub instead of defaulting to `DEMO_SANDBOX`.
  - **Automatic Hub Recovery for Deleted Maps**: When a saved map is deleted or removed from the database, characters logging in from that map are automatically routed to the current world lobby hub with safe coordinates.
  - **Unstuck Teleport Feature**: Added an **Unstuck Teleport** option in the ESC / Game Options Menu (`GameOptionsMenu.tsx`) featuring a 5-second channeling timer, 5-minute cooldown between uses, and instant relocation to the world lobby spawn.
  - **Demo Auto-Seeding Guard**: Updated `DemoBootstrap.ts` to skip re-creating `DEMO_SANDBOX` on startup if custom world maps exist in the database.

## [2.1.321] - 2026-08-17
### Added & Documented
- **World Management & Gate Placement Enhancements (`StudioContextMenu.tsx`, `api/maps/[slug]/route.ts`):**
  - Removed deletion restrictions on `DEMO_SANDBOX` so authors/admins can delete the demo sandbox map once custom maps exist.
  - Added an interactive **"Add Gate..."** selector in the Studio right-click context menu, prompting authors to choose between standard warps, Atlas north/east/south/west boundary gates, dungeons, raids, seasonal events, mines, and realm portals.
  - Added **"Set Default Player Spawn Here"** to the context menu to configure default map entry coordinates with one click.

## [2.1.320] - 2026-08-17
### Added & Documented
- **Canonical Studio SoftLock & Presence Engine (`softLockEngine.ts`):**
  - Implemented the collaboration and soft-lock engine (Gameplay Bible 32 §1) supporting multi-user edit locks, automatic heartbeat renewals, administrator takeover, and project presence tracking.
  - Added automated unit test suite in `softLockEngine.test.ts`.

## [2.1.319] - 2026-08-17
### Added & Documented
- **Canonical RewardBundle Engine (`rewards.ts`):**
  - Implemented the unified RewardBundle definition, validation, and aggregation engine (Gameplay Bible 31 §1 & §2) consolidating credits, item grants, skill XP, faction reputation, and titles across quests, dialogues, and loot tables.
  - Added automated unit test suite in `rewards.test.ts`.

## [2.1.318] - 2026-08-17
### Added & Documented
- **Canonical CatalogEditorShell Standard (`CatalogEditorShell.tsx`):**
  - Implemented the unified CatalogEditorShell component (Gameplay Bible 30 §2) providing standard master-detail panels, live search/filtering, dirty-state badges, footer validation chips, and revert/save callbacks across all Studio definition registries.

## [2.1.317] - 2026-08-17
### Added & Documented
- **Canonical Studio Glossary & Resource Definitions (`studioGlossary.ts`):**
  - Implemented the normative vocabulary (Gameplay Bible 29) establishing the 6 canonical UI modes (`walk`, `paint`, `place`, `populate`, `script`, `catalog`), legacy alias adapters, and `CanonicalResourceRef` scoping keys.
  - Added automated unit test suite in `studioGlossary.test.ts`.

## [2.1.316] - 2026-08-17
### Added & Documented
- **Studio Backend Services Suite (`src/server/studio/studioServices.ts`):**
  - Implemented the unified Studio Services layer (Gameplay Bible 28 §7) providing `StudioAuditService` and `StudioPublishService` for transactional mutation logging, cache invalidation, and content reload broadcasting.
  - Added unit test suite in `studioServices.test.ts`.

## [2.1.315] - 2026-08-17
### Added & Documented
- **Server Content Cache Facade (`src/server/studio/contentCache.ts`):**
  - Implemented the master ServerContentCache facade (Gameplay Bible 28 §2 & §3) with in-memory TTL caching and real-time invalidation pipelines across single resources, entire domains, and global cache flushes.
  - Added unit test suite in `contentCache.test.ts`.

## [2.1.314] - 2026-08-17
### Added & Documented
- **Canonical Studio Localization & Audit Logging Engine (`localizationAuditEngine.ts`):**
  - Implemented the production tooling engine (Gameplay Bible 27 §3.11 & §3.12) providing dictionary translation lookups with language fallbacks and mutation audit trail schemas.
  - Added automated unit test suite in `localizationAuditEngine.test.ts`.

## [2.1.313] - 2026-08-17
### Added & Documented
- **Canonical Studio Task & Dependency Graph Engine (`taskEngine.ts`):**
  - Implemented the production tooling engine (Gameplay Bible 27 §3.5 & §3.6) managing development task pipelines, resource references, and bidirectional dependency tracking (hard/soft edges).
  - Added automated unit test suite in `taskEngine.test.ts`.

## [2.1.312] - 2026-08-17
### Added & Documented
- **Canonical Revision Store & Publishing Lifecycle Engine (`revisionStore.ts`):**
  - Implemented the master ContentRevision engine (Gameplay Bible 26 §4, §5 & §6) supporting immutable content snapshots, draft-to-live promotions, and non-destructive forward-incrementing rollbacks.
  - Added automated unit test suite in `revisionStore.test.ts`.

## [2.1.311] - 2026-08-17
### Added & Documented
- **Canonical Content Reload Bus Expansion (`contentReloadBus.ts`):**
  - Expanded `ContentReloadType` to support hot-reloads across all canonical gameplay categories: `ability`, `status`, `skill`, `class`, `profession`, `recipe`, and global cache invalidation (`flush_all_caches`) as defined in Gameplay Bible 26 §3.1.

## [2.1.310] - 2026-08-17
### Added & Documented
- **Canonical Gameplay Integrity & Validation Engine (`gameplayValidator.ts`):**
  - Implemented the automated validation suite (Gameplay Bible 25 §8) enforcing hard rules against RT capture leakage, unknown status effects, unregistered skill slugs, and missing class abilities.
  - Added automated test coverage in `gameplayValidator.test.ts`.

## [2.1.309] - 2026-08-17
### Added & Documented
- **Studio Dock Registration & Role Permissions (`studioModes.ts`, `studioPermissions.ts`, `editor-store.ts`):**
  - Fully wired the `gameplay` dock into the Studio workspace modes, floating panel geometry store, and role-permission matrices.

## [2.1.308] - 2026-08-17
### Added & Documented
- **Studio Gameplay Panels Hub (`GameplayStudioPanels.tsx`):**
  - Implemented the unified Studio Gameplay Editor panel (Gameplay Bible 25) with tabbed dock views for Abilities, Status Conditions, 27-Skill Matrix, Professions, and the 100x Monte Carlo Combat Balance Simulator.

## [2.1.307] - 2026-08-17
### Added & Documented
- **Canonical Type Chart Engine (`typeChartEngine.ts`):**
  - Implemented the 10-element type advantage matrix and multiplier calculator (Gameplay Bible 25 §3.7).
  - Added support for compound dual-typing defensive resistances, super-effective boosts (2.0x / 4.0x), and immunities (0.0x).
  - Added automated test suite in `typeChartEngine.test.ts`.

## [2.1.306] - 2026-08-17
### Added & Documented
- **Canonical ClassDef Schema Alignment (`classCatalog.ts`):**
  - Extended `ClassDefData` with `learnableAbilityIds` and `combatStyleDefault` (Gameplay Bible 25 §3.5).
  - Prepared hotbar abilities and class progression mapping for dynamic editor resolution.

## [2.1.305] - 2026-08-17
### Added & Documented
- **Canonical Combat Balancing & Simulation Engine (`combatBalanceEngine.ts`):**
  - Implemented the deterministic balance simulation engine (Gameplay Bible 25 §3.7 & §3.8) computing average damage, DPS, time-to-kill (TTK), and XP-per-hour projections.
  - Added support for player combat tuning multipliers, armor mitigation formulas, and health scaling thresholds.
  - Added automated unit test suite in `combatBalanceEngine.test.ts`.

## [2.1.304] - 2026-08-17
### Added & Documented
- **Canonical Profession Registry Engine (`professionRegistry.ts`):**
  - Implemented the master `ProfessionDef` schema and mapping engine (Gameplay Bible 25 §3.6) covering Blacksmithing, Culinary Arts, Artisan Crafting, Apothecary, Lumber Harvesting, Geology/Mining, Angling, and Agronomy.
  - Linked gathering and crafting professions to primary skills, world station tags (`anvil`, `furnace`, `range`, `workbench`, `alchemy_table`), and recipe domains.
  - Added automated unit test suite in `professionRegistry.test.ts`.

## [2.1.303] - 2026-08-17
### Added & Documented
- **Canonical SkillDef & XpCurveDef Registry Engine (`skillRegistry.ts`):**
  - Implemented the master 27-skill definition registry and XP curve formulas (`combat_curve_50` and `standard_curve_99`) as defined in Gameplay Bible 25 §3.3 & §3.4.
  - Added deterministic level-from-XP and XP-for-level helper algorithms.
  - Added automated unit test suite in `skillRegistry.test.ts`.

## [2.1.302] - 2026-08-17
### Added & Documented
- **Canonical Ability Registry & Domain Engine (`abilityRegistry.ts`):**
  - Implemented the unified `AbilityDef` specification (Gameplay Bible 25 §3.1) supporting Real-Time player combat and Turn-Based creature battles.
  - Enforced strict domain boundaries keeping creature capture actions isolated to Turn-Based encounters.
  - Added full automated test coverage in `abilityRegistry.test.ts`.

## [2.1.301] - 2026-08-17
### Added & Documented
- **Canonical Combat Status Effects Registry (`statusRegistry.ts`):**
  - Integrated full StatusDef registry as specified in Gameplay Bible 25 §3.2 (`burn`, `poison`, `frostbite`, `stun`, `regen`, `might`).
  - Added support for real-time and turn-based duration ticks, capture chance multipliers, stat delta modifiers, and tag categorization.
  - Added unit test suite in `statusRegistry.test.ts`.

## [2.1.300] - 2026-08-17
### Enhanced & Refactored
- **Quest Journal Glance → Inspect Hierarchy (`quest-log-overlay.tsx`):**
  - Refactored the Quest Log into the canonical **Glance → Inspect** UX model.
  - Active quest view now renders compact mission status cards with 1-click Inspect triggers.
  - Added dedicated full-detail Quest Inspect overlay displaying complete multi-stage objectives, objective target trackers, and rewards without vertical scroll strain.

## [2.1.299] - 2026-08-17
### Enhanced & Integrated
- **Achievements Overlay Overhaul (`achievements-overlay.tsx`):**
  - Connected the Lobby HUD Achievements overlay directly to the canonical `CANONICAL_ACHIEVEMENTS` registry.
  - Added interactive category filter tabs (`ALL`, `COMBAT`, `SKILLING`, `EXPLORATION`, `COLLECTION`, `QUESTS`) with distinct icons and theme colors.
  - Added live display of achievement point rewards, platform XP, coin payouts, and unlockable title indicators.

## [2.1.298] - 2026-08-17
### Added & Documented
- **Canonical Achievement Catalog (`achievementCatalog.ts`):**
  - Integrated structured achievement definitions across Combat, Skilling, Exploration, Collection, and Quests with reward titles and progression milestones.
  - Added full automated test coverage in `achievementCatalog.test.ts`.
- **27-Skill Progression Matrix Bible Sync (`09-progression-27-skills.md`):**
  - Aligned the gameplay bible with the 27 Saint Proficiencies, dual level curves (Lv 50 Combat vs Lv 99 Skilling/Artisan/Support), and Glance → Inspect → Learn menu architecture.

## [2.1.297] - 2026-08-16
### Enhanced
- **Subdomain Setup Prompt (`scripts/setup.sh`):**
  - Integrated optional subdomain configuration across all setup modes (First-Time Setup and Nuclear Reinstall).
  - Explicitly asks the user if they wish to add/reverse-proxy subdomains (e.g. `mmo.domain.com`, `dev.domain.com`, `panel.domain.com`, `bot.domain.com`) with automated port & target IP wiring.

## [2.1.296] - 2026-08-16
### Fixed
- **Setup Script Fixes (`scripts/setup.sh`):**
  - Fixed syntax error with extra `fi` in proxy/web server block on line 621.
  - Fixed Caddy service reload failure when inactive (`sudo systemctl unmask/enable/restart/start caddy`).
  - Silenced `fuser -k` port killer stdout/stderr to avoid dirtying terminal output.

## [2.1.295] - 2026-08-16
### Added & Enhanced
- **Setup Gateway & Nuclear Reinstall Mode (`scripts/setup.sh`):**
  - Added a clean top-level **Deployment Gateway Menu** on the very first screen of `./scripts/setup.sh` offering:
    1. `✨ FIRST-TIME SETUP` (Interactive guided clean deployment)
    2. `🔄 UPDATE DEPLOYMENT` (Pulls latest code, migrates DB & restarts stack)
    3. `🌐 UPDATE DOMAINS / PROXY` (Configure Caddy, subdomains & SSL)
    4. `☢️ NUCLEAR REINSTALL` (Wipe database, containers, .env & fresh deploy)
  - **Nuclear Reinstall Flow**: Prompts a single *"Are you sure?"* confirmation dialog. Upon confirmation, it force-stops/removes old containers, wipes `./mysql_data`, deletes SQLite `dev.db`, purges `.env`, and bypasses all redundant, repetitive warning/prompt boxes across the setup script for a clean, prompt-free fresh install.

## [2.1.294] - 2026-08-16
### Added & Fixed
- **Mandatory First-Run Setup Gate & Disconnect Invalidation Policy (Bible 17 & Bible 35):**
  - **Mandatory Setup Gate**: Hard-gated `/lobby` and `/studio` server-side (`LobbyPage` & `StudioLayout`) and client-side (`initData`). Access to the MMO world, character selector, and editor is blocked and immediately routed to `/setup` if setup has not been run or 0 maps exist.
  - **25-Second Connection Loss Expiration Policy**: Implemented `MAX_DISCONNECT_RECONNECT_WINDOW_MS` (25s) and `isSessionConnectionStale`. If a player's realm socket connection is lost for more than 25 seconds, the session is expired, active socket is disconnected, in-memory tokens are cleared, and the client is returned to the Title Screen / Gateway with an expiration notice, preventing stale link hijacking.

## [2.1.293] - 2026-08-16
### Fixed
- **Setup Script Discord OAuth Verification (`scripts/setup.sh`):**
  - Added `-H "Content-Type: application/x-www-form-urlencoded"` and `-d "scope=identify"` to the Discord API credentials test call in `scripts/setup.sh`. Discord API v10 requires an explicit scope parameter on `grant_type=client_credentials` requests; without it, valid keys were returning `invalid_request: A scope is required`.

## [2.1.292] - 2026-08-16
### Fixed & Improved
- **Lobby Setup Delivery & Admin Authorization (Bible 17 & Bible 35):**
  - Upgraded first-time user registration to automatically grant `permissionLevel: 1000` (Developer / Owner) and auto-heals single-user dev databases to Developer permissions.
  - Added glowing **Realm Setup Required** banner to the Game Title Screen when fresh install or setup is pending.
  - Added dedicated **Realm Setup Wizard** shortcut in the Title Screen Realm Gateway widget and in the Main Website Navbar Admin dropdown.
  - Added auto-redirection to `/setup` upon login or clicking Play when no maps exist or setup is pending.

## [2.1.291] - 2026-08-16
### Added
- **Studio Asset Repository Upgrades & Starter Pack Integration (Bible 16 §7 & Bible 35):**
  - Expanded approved asset pack registry with **Saints Official Bundle** (`saints`), ensuring starter bundle tilesets, sprite sheets, items, and audio soundscapes are recognized and categorized.
  - Upgraded `AssetEditor.tsx` with a modern pack navigator, classification chips (`Sprites`, `Tilesets`, `Monsters`, `Items`, `Audio`, `UI`), pixel-art rendering with checkered canvas preview background, zoom controls (`1x`, `2x`, `4x`), one-click path and key copy, and Slicer integration.
  - Linked `FullScreenAssetBrowser` and `AssetBrowserPanel` directly to `SpritesheetSlicer` for 1-click slicing from the inspector.

## [2.1.290] - 2026-08-16
### Added
- **Fresh Install Setup Wizard & Prepackaged World Asset Management System (Bible 17 & Bible 35):**
  - `setupDetection.ts`: Robust fresh install vs server update state evaluation (`evaluateSetupStatus`, `getSystemSetupStatus`), checking `SiteSetting.SETUP_COMPLETED` and `WorldMap` counts to protect existing live game worlds from accidental re-seeding.
  - `prepackagedPacks.ts`: Modular starter pack bundler and manifest importer (`getCommunityStarterPackManifest`, `importStarterPackToDb`), enabling 1-click importing of the 8-map Official Saints Starter Realm (Haven, Meadows, Quarry, Arena, Dungeons, Quests, Items, Recipes) or starting with a clean Blank Canvas.
  - `FirstTimeSetupWizard.tsx`: Multi-step creator onboarding wizard for realm identity configuration, starter bundle selection with feature cards, and 1-click Studio launch.
  - `app/(main)/setup/page.tsx`: Dedicated Setup Wizard route with access guards for fresh installations.
  - `app/api/setup/status`, `app/api/setup/import`, `app/api/setup/complete`: Dedicated backend API endpoints for checking setup permissions, importing packs, and finalizing realm startup.
  - **First-User Admin Promotion**: Automatically promotes the first registered account on a pristine database to `permissionLevel: 100` (Owner/Admin) and `isFounder: true`.
  - **Studio 0-Map Graceful Fallback**: Added interactive blank canvas state to `/studio` and `/lobby` when no world maps exist, preventing empty void crashes.

## [2.1.289] - 2026-08-16
### Added
- **Solak: The Grove Guardian & Blight Corrupted Roots Engine (Bible 24 & Bible 27):**
  - `solakPhaseEngine.ts`: 4-Phase tree progression (Phase 1 limb destruction to expose Blight Core, Phase 2 Anima Storm, Phase 3 Merethiel Elf Mind realm corruption cleansing, and Phase 4 Manifestation execute with compounding 2.5% max HP stacking bleed).
  - `solakMechanics.ts`: Root Cage entrapment rescue check and Merethiel's Nature Blessing golden dome with 100% storm damage immunity (vs 1,200/tick outside).
  - `solakLootEngine.ts`: Erebus Grimoire pocket slot item (+12% crit rate & 15k damage cap expansion), torn grimoire page recharging (45 mins/page), Tier 92 Blightbound Crossbows (50% bolt conservation chance), and Solly pet drop matrix.

## [2.1.288] - 2026-08-16
### Added
- **Telos: Warden of the Telosian Core & Font Anima Mechanics Engine (Bible 24 & Bible 27):**
  - `telosPhaseEngine.ts`: 0% to 4,000% Enrage scaling matrix for boss HP and damage, 5-phase arena transitions, Phase 5 100%+ Enrage unlock, Green/Black/Red Anima Beam mechanics with player blocking, and equilibrium balance bar.
  - `telosSpecialAttacks.ts`: "Hold still, invader!" heavy crush slam with Resonance heal / Barricade / Freedom stun mitigation, Grasping Anima Tendrils burst DPS check, and "Soaria" Anima Bomb font shield absorption.
  - `telosLootEngine.ts`: Dynamic unique drop rate scaling ($10000 / (10 + 0.25E + 3S)$ down to 1/9 at 4000% Enrage / 150 Streak), Volcanic/Pure/Corrupted Anima Orbs, Dormant Staff of Sliske, Zaros Godsword, Seren Godbow, Reprisal codex, and Tier 92 God Weapon assembly matrix.

## [2.1.287] - 2026-08-16
### Added
- **Nex: Angel of Death, Ancient Elementals & Praesul Codex Engine (Bible 24 & Bible 27):**
  - `nexPhaseEngine.ts`: 5-Phase combat progression (Smoke, Shadow, Blood, Ice, Zaros Enrage), 4-quadrant positioning matrix, Blood Siphon damage-reversal heal, Blood Sacrifice 7-tile distance escape (80% HP & 33% prayer penalty), and Ice Prison breakout mechanics.
  - `nexMinionMechanics.ts`: 4 Elemental Minions (Fumus, Umbra, Cruor, Glacies), Blood Reaver minion pathing & 250,000 HP absorption heal, and Zarosian Wrath 5-tick channeled 8-tile radius instant-wipe death explosion.
  - `nexLootEngine.ts`: Praesul Codex consumption unlocking Tier 99 Ancient Curses (Malevolence, Desolation, Affliction with +12% accuracy, +12% damage, +10% defence), Tier 92 Wand of the Praesul & Imperium Core, and Torva/Pernix/Virtus armor drop distribution.

## [2.1.286] - 2026-08-16
### Added
- **Player-Owned Ports, Naval Exploration & Voyage Management Engine (Bible 18 & Bible 31):**
  - `portFleetEngine.ts`: Player fleet vessel management (Hulls, Deck Cannons, Figureheads), Captain and Crew recruitment with Combat, Morale, Seafaring stats, traits (Tactician, Leader, Navigator, Daredevil, Sturdy), level advancement, and injury debuffs.
  - `portVoyageEngine.ts`: 7 Progressive Archipelago Regions (Arc, Skull, Hook, Scythe, Bowl, Pincers, Shield), multi-stat requirement success probability calculations, voyage departures, and high-seas random encounters (Kraken Attack, Maelstrom, Siren Song, Treasure Drift).
  - `portCraftingEngine.ts`: Port Trade Goods economy (Bamboo, Slate, Cherrywood, Gunpowder, Lacquer, Chi, Ancient Bones, Plate, Chimes), 4-fragment scroll recipe unlocking, and Ancient Tier 85 armor crafting (Superior Tetsu, Death Lotus, Seasinger) and Combat Scrimshaws.

## [2.1.285] - 2026-08-16
### Added
- **Fortis Colosseum, Wave Modifiers & Sol Heredit Engine (Bible 24 & Bible 27):**
  - `colosseumWaveEngine.ts`: 12-wave arena spawner matrix, 8 stackable handicap modifiers (Doom, Mantimayhem, Solar Flare, Relentless, Myopia, Red Flag, Bees, Dynamic Duo) with 3-tier drafting, Doom 3-stack instant fatality, and glory multiplier scaling.
  - `solHereditEngine.ts`: Sol Heredit 3-phase fight progression, Phase 2 Shield Parry frontal reflection (15 dmg) with rear/flank vulnerability, Triple Laser lane avoidance, and Sand Trap knockback eruptions.
  - `quiverUpgradeEngine.ts`: Dizana's Quiver item mechanics, Sunfire Splinter charging (10 charges/splinter), permanent blessing (150,000 splinters + sacrifice quiver), +1 Sunfire Ranged Max Hit, and Dual Ammo Slot auto-resolution (Bows vs Crossbows).

## [2.1.284] - 2026-08-16
### Added
- **Raids, Chambers of Xeric & Boss Mechanics Matrix Engine (Bible 24 & Bible 27):**
  - `raidRoomGenerator.ts`: Procedural 3-floor raid dungeon layouts (Combat, Puzzle, Scavenge, Boss rooms), party size HP multiplier $1 + (N-1) \times 0.75$, defence scaling, Challenge Mode +50% HP / +20% def boosts, and room clear contribution point distribution.
  - `olmBossEngine.ts`: The Great Olm 3-phase fight progression (Left Hand, Right Hand, Head), Phase 3 enrage & head vulnerability unlock, Crystal Burst spike avoidance, Teleport Pairs proximity resolution, and Burn status effect contagion loops.
  - `raidLootEngine.ts`: Party point scaling and unique drop probability calculations (8,675 points per 1% chance, capped at 65%), 40% personal death penalty, and unique chest drops (Twisted Bow, Ancestral Robes, Elder Maul, Kodai Insignia, Prayer Scrolls, Olmlet pet, CM Metamorphic Dust).

## [2.1.283] - 2026-08-16
### Added
- **Slayer Assignment System, Superior Monsters & Slayer Master Engine (Bible 09 & Bible 21):**
  - `slayerTaskEngine.ts`: 6 canonical Slayer Masters (Turael, Mazchna, Vannaka, Chaeldar, Nieve, Duradel), weighted assignment based on combat and slayer level prerequisites, streak milestone multipliers (10th=5x, 50th=15x, 100th=25x, 250th=35x, 1000th=50x), task kill tracking, and Turael streak reset mechanics.
  - `superiorSlayerEngine.ts`: 1/200 superior spawn rolls for 15 monster variants (Marble Gargoyle, King Kurask, Insatiable Bloodveld, Greater Abyssal Demon) with 10x Slayer XP, tiered unique relic drop table (Imbued Heart, Eternal Gem, Dust & Mist Battlestaffs), and +1 + 10% Magic boost calculation.
  - `slayerShopEngine.ts`: Slayer Reward Shop unlock matrix (Bigger and Badder, Malevolent Masquerade, Ring Bling, Broader Fletching, Task Extensions), task blocking with Quest Point scaling (up to 6 slots), task cancelling for 30 points, and on-task combat bonuses (+16.67% melee, +15% ranged/magic for imbued slayer helm).

## [2.1.282] - 2026-08-16
### Added
- **Studio UI & Full-Screen Editor Architecture Overhaul:**
  - `StudioBottomToolbar.tsx`: Unified bottom IDE toolbar consolidating brush/erase/eyedropper/pan/select/prefab/gate tools, active layer toggle chips, size steppers, overlay toggles (XY coords, warp gates, NPC spawns), categorized dock panel launchers, latency/FPS telemetry, playtest mode transition, and dirty map/definition save triggers.
  - `FullScreenMapBrowser.tsx`: Full-screen modal overlay for map discovery with search filtering by name/slug/category, world dimensions readout, NPC/gate counters, one-click teleport/warp, new map creator, and map deletion with safety confirmations.
  - `FullScreenAssetBrowser.tsx`: Full-screen asset library modal featuring Catalog management, Sprite browser, texture upload, and spritesheet slicer tabs.
  - `StudioContextMenu.tsx`: Viewport right-click context menu supporting tile sampling (eyedropper), one-click warp gate placement, player avatar teleportation, whole-layer fill, and tile erasure.
  - `DELETE /api/maps/[slug]`: Secured administrative map deletion endpoint with WorldMap and GameMap cascading cleanup and Go MMO sync notifications.
  - `WorldBuilderPanel.tsx`: Redesigned collapsible accordion layout dividing Active Realm Overview, Map Index & Quick Switch with row-level map deletion, Painting Layers, and Tileset/Logic palettes.

## [2.1.281] - 2026-08-16
### Added
- **Creature Breeding, Genetic Inheritance & Pet Growth Engine (Bible 12 & Bible 23):**
  - `breedingEngine.ts`: Parent gender and egg group validation, maternal species inheritance, 3 parent IV stat alleles + 3 random IVs, Shiny Charm rolls, and incubation step countdowns.
  - `petLoyaltyEngine.ts`: 5 mood classifications (Joyful, Content, Hungry, Lonely, Neglected), dietary preferences with favorite food boosts, progressive trick unlocks (Sit, Dance, Cheer, Sniff), and time-based needs decay.
  - `evolutionEngine.ts`: Level-up thresholds (Flame Lizard -> Inferno Dragon), elemental stone infusions (Thunder, Fire, Water stones), friendship affinity with biome catalysts (Saints Espeon), and combat stat multiplier upgrades.
- **Grand Exchange Economy & Player Marketplace Engine (Bible 15 & Bible 31):**
  - `exchangeEngine.ts`: Buy/sell limit order matching, 1% GE tax sink on seller proceeds, buyer escrow difference refunds, and order cancellation.
  - `marketPriceEngine.ts`: Traded volume aggregation, intraday high/low tracking, volume-weighted average pricing (VWAP), market trend indicators (`RISING`, `FALLING`, `STABLE`), and ±5% daily swing guardrails.
  - `bankEngine.ts`: 4-digit bank PIN security with 3-attempt lockout protection, 800-slot vault storage, 5 category tabs, unnoting on deposit, and banknote certificate withdrawal conversions.

## [2.1.280] - 2026-08-16
### Added
- **Resource Gathering Nodes & Depletion Engine (Bible 08 & Bible 14):**
  - `miningEngine.ts`: 10 rock vein tiers (Copper through Runite & Saint's Gold), pickaxe speed modifiers, prospecting text inspection, and rare uncut gem discoveries (Sapphire, Emerald, Ruby, Diamond).
  - `woodcuttingEngine.ts`: 7 tree species (Normal, Oak, Willow, Maple, Yew, Magic, Elder Redwood), hatchet speed tiers, stump respawn cooldowns, and random bird's nest loot drops.
  - `fishingEngine.ts`: 5 fishing spot methods (Small Net, Bait Rod, Fly Rod, Lobster Pot, Harpoon), bait consumption, level-scaled catch weight formulas, and sea casket discovery rolls.
- **Clue Scrolls, Treasure Trails & Puzzle Box Engine (Bible 18 & Bible 25):**
  - `clueEngine.ts`: Easy through Master clue scrolls, spade coordinate digging, tile distance calculations, NPC riddles, and tiered reward casket handoffs.
  - `puzzleEngine.ts`: 3x3 and 4x4 sliding tile puzzles, mathematical permutation inversion parity checks (`isPuzzleSolvable()`), tile slide movement, Caesar ciphers, and anagram resolution.
  - `casketRewardEngine.ts`: Easy through Master reward caskets (2–7 loot rolls), trimmed armor pieces (g/t), Ranger Boots, Robin Hood Hat, and 3rd Age mega-rare artifacts.
- **Audio Synthesis, Environmental Ambience & Soundscape Engine (Bible 28 & Bible 33):**
  - `soundscapeEngine.ts`: 6 biome acoustic soundscapes (Town, Forest, Dungeon, Coastal, Mountain, Volcanic), day/night sound variation layers, rain/storm/snow weather blending, and smooth cross-fade volume transitions.
  - `spatialAudioEngine.ts`: Positional 3D audio mechanics with Euclidean distance attenuation falloff curves, camera yaw orientation stereo panning (`-1.0` to `+1.0`), and combat impact / UI fanfare sound lookup maps.
  - `jukeboxEngine.ts`: Regional background music track unlocks (Saints Harmony, Whispering Pines, Forge of the Ancients, Depths of Despair, New Beginnings, Grand Coronation), playlist queues, loop, and shuffle modes.
- **Minigames & Arena Encounters (Bible 24 & Bible 27):**
  - `waveArenaEngine.ts`: TzTok-Jad Overlord and arena monsters with radial perimeter spawn coordinates, wave combat advancement, Tokkul rewards, and Fire Cape distribution.
  - `barrowsEngine.ts`: 6 Barrows brothers (Dharok, Ahrim, Guthan, Karil, Torag, Verac), secret labyrinth tunnel sarcophagus routing, and central chest loot calculations.
  - `agilityCourseEngine.ts`: Rooftop courses across Gnome Stronghold, Draynor, Varrock, and Seers' Village with level-scaled obstacle success checks, fail damage, lap XP bonuses, and Mark of Grace spawners.

## [2.1.279] - 2026-08-16
### Added
- **Real-Time Party System, Social Hub & Guilds (Bible 04 & Bible 05):**
  - `partyEngine.ts`: Dynamic multi-player parties, leader delegation, invite/kick lifecycles, and `ROUND_ROBIN`, `FREE_FOR_ALL`, and `LEADER_DISTRIBUTED` loot allocation.
  - `partyAuraEngine.ts`: Shared combat XP distribution with party synergy multipliers (+10% per nearby member within 20 tiles) and the "Fellowship of Saints" proximity aura (+5% speed, +5% defence).
  - `guildEngine.ts`: Guild clan roster management with strict rank hierarchy validation (`LEADER` > `OFFICER` > `VETERAN` > `MEMBER` > `RECRUIT`), treasury contributions, and level milestone perks.
- **Player Housing, Sanctuary Estate & Farming Plots (Bible 08 & Bible 13):**
  - `estateEngine.ts`: 5x5 Sanctuary estate plots, Construction level room prerequisites (Garden, Parlour, Kitchen, Workshop, Portal Chamber, Altar, Throne Room), and 2D bounding-box furniture placement collision detection.
  - `farmingEngine.ts`: Agricultural crop lifecycles (`ALLOTMENT`, `HERB`, `FLOWER`, `TREE`), weed clearing (`rakePatch`), compost tiers (`COMPOST`, `SUPERCOMPOST`, `ULTRACOMPOST`), growth timer ticking, and level-scaled harvest yields.
  - `portalNexus.ts`: Housing portal chamber frame attunement, global destination coordinates (`DEMO_SANDBOX`, `WILD_MEADOWS`, `QUARRY_MINE`, `WHISPERING_FOREST`), unlock prerequisites, and Magic level requirement enforcement.
- **Player Achievements, Titles & Mastery Milestones (Bible 25 & Bible 26):**
  - `achievementEngine.ts`: Multi-category milestone progression (`COMBAT`, `SKILLING`, `EXPLORATION`, `COLLECTION`, `QUESTS`), threshold unlock events, and achievement point aggregation.
  - `titleDispatcher.ts`: Prefix and Suffix title formatting (`Novice`, `the Monster Slayer`, `Master Angler`, `the Grandmaster`) with rarity styling colors and unlock validation.
  - `highscoreEngine.ts`: Authoritative 1–126 Combat Level formula (Attack, Strength, Defence, HP, Prayer, Ranged, Magic), Total Level, Total XP, and hierarchical highscore leaderboard ranking.
- **Artisan Crafting Matrices & Smithing Engine (Bible 14 & Bible 22):**
  - `smithingEngine.ts`: 7 metal tiers (`BRONZE`, `IRON`, `STEEL`, `MITHRIL`, `ADAMANT`, `RUNE`, `SAINTS_GOLD`), furnace ore smelting recipes, hammer validation, and anvil forging matrices.
  - `cookingEngine.ts`: Dynamic burn curves across Fires, Ranges, and Chef Ranges, stop-burn mastery thresholds (`0.0%` burn rate), and food healing values.
  - `potionBrewEngine.ts`: Unfinished potion mixing with secondary reagents, dynamic flat + percentage stat boost calculations, and 1–4 dose flask decanting with vial recovery.
- **Magic Spellbook & Prayer Aura Engine (Bible 10 & Bible 14):**
  - `spellbookEngine.ts`: Elemental combat spellbook (Wind Strike, Fire Bolt, Ice Burst, Fire Wave, Saint's Holy Blast), rune inventory validation, infinite elemental staff catalyst waivers, and magic damage scaling.
  - `prayerEngine.ts`: Multiplier blessings, overhead protection prayers (Protect from Melee, Missiles, Magic) with exclusivity rules and gear drain resistance ticks.
  - `enchantEngine.ts`: Lvl 1–6 jewelry enchantment (Sapphire Recoil, Emerald Dueling with 8 charges, Ruby Strength, Diamond Power, Dragonstone Glory with 4 charges, Onyx Fury) with cosmic rune formulas and Magic XP awards.

## [2.1.278] - 2026-08-16
### Added
- **Terrain & Environmental Mechanics (Bible 34 §5 & Bible 08):**
  - `waterMechanics.ts`: Wading speed multipliers (`0.65x` in shallow water), deep-water swim/fly capability checks, and shore fishing query resolver.
  - `elevationMechanics.ts`: Multi-level terrain transitions, climb requirements, and one-way single-tier ledge hops.
  - `weatherEngine.ts`: Dynamic weather system resolving ambient lighting, sun intensity, fog density, particle presets (`rain_drops`, `snow_flakes`, `fog_mist`, `storm_lightning`), and elemental damage/defense affinity modifiers.
- **Creature Collection & Turn-Based Buddy Battle Engine (Bible 07 & Bible 11):**
  - `buddyBattleEngine.ts`: Turn-based move damage calculation with STAB (1.25x), type chart multipliers, and capture probability formulas with master film guarantees.
  - `encounterGenerator.ts`: Wild encounter spawner with diurnal/nocturnal time-of-day weighting, weather synergy multipliers, and shiny roll determination.
  - `companionParty.ts`: 6-slot party manager (1 lead + 5 reserve), slot swapping, leveling thresholds (`getXpForLevel`), and level-up stat growth curves.
- **Seamless World Atlas & Spatial Border Links (Bible 23 & Bible 24):**
  - `spatialAtlas.ts`: 4-directional spatial adjacency lookups and cross-map coordinate alignment.
  - `borderWarp.ts`: Dynamic player step intent interceptor seamlessly warping players across map borders into adjacent zones.
  - `atlasLinter.ts`: Automated world linter diagnosing broken map gates, out-of-bounds spawn points, solid tile spawn traps, duplicate Atlas slots, and one-way gate warnings.
- **Studio Omnisearch & Command Palette (Bible 19 & Bible 29):**
  - `studioOmnisearchEngine.ts`: Headless multi-domain search index with prefix scoring and domain query filters (`@map`, `@npc`, `@creature`, `@item`, `@dock`, `@action`).
  - `omnisearchDispatcher.ts`: Dynamic jump dispatcher loading maps, centering camera over NPC coordinates, and opening relevant editor docks.
  - `studioCommands.ts`: Creator action registry supporting hotkeys (`Ctrl+1` through `Ctrl+5` mode switching, `Ctrl+E` playtest, `Ctrl+S` map save, `Ctrl+N` new map).
- **Inventory, Equipment & Action Hotbar (Bible 12 & Bible 14):**
  - `equipmentEngine.ts`: 8 equipment slots, skill level requirement validation (`canEquipItem`), and aggregate offensive/defensive stat computation.
  - `hotbarDispatcher.ts`: Action hotbar dispatcher (keys 1-8) for food/consumable healing, tool swapping, abilities, and emotes.
  - `inventoryEngine.ts`: Fixed 28-slot MMO inventory grid with smart stack merging, cross-stack removal, drag-and-drop slot swapping, and capacity overflow protection.
- **Combat Targeting, Threat Aggro & Enemy AI Engine (Bible 09 & Bible 10):**
  - `aggroEngine.ts`: Multi-player threat tables, proximity vision aggro, and leash distance boundary enforcement.
  - `monsterStateMachine.ts`: Real-time AI state machine (`IDLE`, `PATROL`, `CHASE`, `ATTACK`, `FLEE` on critical HP, `RETURN_LEASH` on leash breach, `DEAD`).
  - `targetFrameResolver.ts`: Relationship evaluation (`FRIENDLY`, `HOSTILE`, `NEUTRAL`), Euclidean distance & in-range casting validation (`isInRange`), and contextual action triggers (`PARTY_INVITE`, `WHISPER`, `DUEL`, `ATTACK`, `CAPTURE`, `TALK`).
- **Creator Bookmarks & Navigation History (Bible 19 & Bible 27):**
  - `studioBookmarksEngine.ts`: Multi-domain bookmark storage with folder organization, tag filters, search, and JSON export/import.
  - `navigationHistory.ts`: Map navigation history stack with back/forward traversal, new branch forward-stack truncation, and dynamic breadcrumbs (`getBreadcrumbs`).
  - `creatorRecents.ts`: Most-Recently-Used (MRU) tracking for recently modified maps, entities, and assets with auto-eviction.
- **Quest Progression, Scripting & Dialogue Tree Engine (Bible 15 & Bible 16):**
  - `dialogueEngine.ts`: Multi-branch NPC conversation trees, conditional prerequisite verification (`reqQuestId`, `reqItemId`, `reqSkillLevel`), and action execution triggers.
  - `questEngine.ts`: Multi-step quest objective tracking (`TALK`, `KILL`, `GATHER`, `DISCOVER`), sequential stage advancement, and completion reward disbursement.
  - `dialogueLinter.ts`: BFS graph validator diagnosing broken nextNode targets (`MISSING_TARGET_NODE`), unreachable orphan conversation nodes (`UNREACHABLE_NODE`), dead-end options, and duplicate IDs.

## [2.1.277] - 2026-08-16
### Added
- **Shared Entity Runtime Factory (Bible 20 §20 E4):** Created `buildRuntimeEntities()` extracting simulation actors, warp gates, harvestable nodes, spawners, and wild encounter zones from `EntityInstanceV1` records.
- **Context-Sensitive Interaction Engine (Bible 34 §4):** Implemented `queryInteractions()` evaluating dynamic entity capabilities, distance, and player skills; strictly enforced constitutional creature capture rules (capture disabled in overworld exploring, enabled in Turn-Based Buddy Battles).
- **Pluggable Movement Controller System (Bible 34 §7-8):** Built `GridMovementController` and `FreeMovementController` supporting traversal capabilities (`walk`, `swim`, `fly`, `climb`) and terrain movement cost scaling.
- **Shared Gameplay Domain Event Bus (Bible 34 §16):** Built typed, error-contained `gameEvents` singleton connecting creature capture, resource gathering, combat completion, crafting, and quest progress.
- **Dual-Write WorldMap Entities (Bible 20 §20 E2):** Added `entitiesData` column to `WorldMap` in `prisma/schema.prisma` and updated map persistence pipeline.

## [2.1.276] - 2026-08-16
### Added
- **Bible 35 Asset Pipeline & Ingestion System**:
  - Implemented `SourceAsset` and `UsableAsset` models in `prisma/schema.prisma` with SQLite database synchronization and Prisma client bindings.
  - Implemented `ingestAsset()` helper (`src/web/lib/assetUpload.ts`) and `POST /api/assets/upload` endpoint supporting file storage, automatic metadata extraction, and library registration.
  - Created `AssetUploadView.tsx` drag-and-drop ingestion interface in Studio with live preview, classification types, tag editing, and visibility controls.
  - Created interactive HTML5 canvas `SpritesheetSlicer.tsx` supporting auto-grid slicing, free rectangular bounding box selection, direction/facing assignment, and batch slicing endpoint `POST /api/assets/slice`.
  - Implemented Community Governance & Permissions (`src/shared/game/assetPermissions.ts`, `app/api/assets/moderate/route.ts`) supporting scoping (`PERSONAL`, `PROJECT`, `COMMUNITY`, `PUBLIC`), moderator review queues, and automatic creator attribution.
  - Added unit test suites `assetUpload.test.ts`, `assetSlice.test.ts`, and `assetModeration.test.ts`.

## [2.1.275] - 2026-08-16
### Fixed & Improved
- **Chat Socket Deduplication (`index.tsx`)**:
  - Added socket ID deduplication checks to `global_chat_msg` and `party_chat_msg` listeners to prevent the local client from duplicating optimistic chat messages.
- **Studio Coordinate Tracking & Gate Picking (`StudioStatusBar.tsx`, `PropertiesPanel.tsx`)**:
  - Switched Studio status bar coordinate display from `clickedTile` to `hoveredTile` for smooth real-time cursor tracking.
  - Added interactive "Pick on Map" mode in Properties Panel for gate target spawn point (`spawnPoint.x`, `spawnPoint.y`) configuration.
- **Architecture & Pipeline Audit (`001-world-entity-loading.md`, Bible 35)**:
  - Added Bible 35 (`35-asset-ingestion-community-management.md`) defining the full source-vs-derivative asset ingestion pipeline and community management.
  - Audited full-stack map/entity loading pipeline, verifying zero data-loss resilience, dimension resolution, and shard base ID normalization.

## [2.1.274] - 2026-08-16
### Fixed
- **Canonical Starter Map & Initial Spawn Restored (`index.tsx`)**:
  - Restored `DEMO_SANDBOX` as the canonical starter realm on character creation and load (spawning at walkable plaza `(14, 15)` in front of Professor Oakwood's Lab and starter shops).
  - Fixed an issue where new characters were being redirected to an unseeded placeholder map (`LOBBY`), which caused a 404 fallback to a small empty grid where players spawned on border wall collision and could not move.
  - Re-enabled support for character-saved maps so players who have progressed to other zones (e.g. `WILD_MEADOWS`, `QUARRY_MINE`) restore seamlessly into their saved locations.

## [2.1.273] - 2026-08-16
### Added & Improved
- **Starter Testing Realm Suite (`demoMapSeed.ts`, `DemoBootstrap.ts`, `starterMaps.test.ts`)**:
  - Implemented and seeded 5 canonical starter testing maps with full logic components, visual layers, and bidirectional World Atlas gates:
    - `SAINTS_HAVEN` (40×40): Central town plaza, Warden Vance, Professor Oakwood's Lab, General Store, Clinic, Equipment Forge, Base Hub, and 4 Cardinal Gates.
    - `WILD_MEADOWS` (36×36): 4 wildlife quadrants spanning 8 elements (`nutria`, `flowrunt`, `squidoodle`, `rockitten`), Woodcutting groves, and Fishing streams.
    - `QUARRY_MINE` (32×32): Copper and Iron ore veins, Smelting Forge, and aggressive Rock Spider monster spawners for Hero Battles.
    - `TRAINING_ARENA` (30×30): Colosseum sparring ring for Armor Class (AC) and d20 weapon strike testing.
    - `DUNGEON_CRYPTS` (32×32): Level 5 entry gate, shadow corridors, and high-tier Boss Spawner with elevated Willpower DC.
- **Floating Window System Polish (`FloatingWindow.tsx`)**:
  - Added dynamic z-index focus stacking so clicking any window immediately brings it to the top.
  - Added double-click title bar collapse/expand toggle.
  - Added window resize event listener to automatically clamp floating windows within screen viewport boundaries.
- **Inventory UX Quick Actions (`inventory-overlay.tsx`)**:
  - Added double-click fast action on inventory item slots to instantly equip armor/weapons or consume food.
- **D20 Engine Safeguards (`d20Engine.ts`, `heroCombatD20.ts`)**:
  - Added boundary clamping for `hpRatio` and non-negative defense input guards to prevent edge-case arithmetic anomalies.

## [2.1.272] - 2026-08-16
### Added & Improved
- **Pre-Game Gateway & Lobby Chat Sync (`GameTitleScreen.tsx`)**:
  - Subscribed `GameTitleScreen` to incoming global/lobby chat broadcasts (`game_chat_msg`), fixing the issue where pre-world lobby messages sent by other players were not displayed.
  - Implemented deduplication and auto-scroll retention for seamless multi-player chatter before entering world shards.
- **Tuxemon Open Source Attribution Scoping (`docs/TUXEMON_ATTRIBUTION.md`, `tuxemonElementMap.ts`)**:
  - Scoped open-source copyleft notice strictly to CC-BY-SA 4.0 visual monster sprites and LPC character assets.
  - Formally documented that 100% of game engine source code, Go MMO networking, 27-skill proficiency curves, d20 resolution math, and map architectures are proprietary Saints Gaming IP.
- **Tabletop D20 Resolution & Capture Engine (`d20Engine.ts`, `heroCombatD20.ts`)**:
  - Implemented a tabletop d20 resolution engine for creature captures (`d20 + Tamer Proficiency + Tool Tier vs Creature Willpower DC`), featuring Advantage/Disadvantage, Natural 20 Critical Resonance, and Natural 1 Fumble handling.
  - Preserved tactical turn-based combat for creature battles (`TurnBattleOverlay.tsx`), enhanced with live d20 capture dice animations and DC check summaries.
  - Built D20 combat resolution for Player vs Monster Hero Battles (`heroCombatD20.ts`) with Armor Class (AC), weapon proficiency bonuses, and elemental saving throws.
- **Layered Floating Windows & Enhanced Inventory UI (`FloatingWindow.tsx`, `inventory-overlay.tsx`)**:
  - Created a reusable, draggable `FloatingWindow` shell with chamfered styling, z-index elevation, and boundary locking.
  - Overhauled Inventory Overlay with category filter tabs (All, Equipment, Consumables, Materials, Quest), multi-attribute sort options (Name, Rarity, Quantity), and full MMO paperdoll slot support (`head`, `chest`, `legs`, `weapon`, `offhand`, `gloves`, `boots`, `ring`, `amulet`, `cape`).
- **Version & Manifest Synchronization**:
  - Bumped project version to `v2.1.272` across `package.json`, `settings.ts`, admin settings, `layout.tsx`, `navbar.tsx`, and documentation badges.

## [2.1.271] - 2026-08-16
### Added & Improved
- **Tile Highlight & Cursor Raycast Alignment (`BabylonEngine.ts`, `tileBatchHelpers.ts`)**:
  - Fixed a diagonal half-tile offset bug in `renderBrushPreview()` and `setSelectionPreview()` by aligning preview quad centers with actual ground tile quads (`posX = (c - w/2)*s`, `posZ = (h/2 - r)*s`).
  - Unified coordinate snapping between cursor pointer, hover reticle, selection boxes, author overlays, and batched mesh tiles.
- **Studio Gateways & Realm Connections Overhaul (`WorldBuilderPanel.tsx`, `LogicTagPalette.tsx`)**:
  - Upgraded Gateways and Edge Connections into an integrated Realm Connections hub with quick gate presets (Cardinal Atlas N/E/S/W, Dungeon, Raid, Event, Mine), target spawn coordinates, map selector, and in-world pin toggles.
  - Enhanced `LogicTagPalette.tsx` with instant category filter tabs (Collision, Gateways, Gathering, Services), 1-click preset brushes, and live color badges matching in-world logic overlays.
- **Skills UI & Inspection Window Decoupling (`skills-overlay.tsx`)**:
  - Overhauled Saint Skills proficiency grid into a spacious 4-5 column responsive layout, eliminating text clipping (`A...1`, `S...1`) and category label squash.
  - Decoupled the Skill Quick-Inspect panel into an independent floating modal card, preserving the full grid view when inspecting skills.
  - Decoupled the Skill Guide into an independent top-level overlay that can be opened without tearing down the underlying skills panel.
- **Equipment Menu & Speed Tier Overhaul (`equipment-overlay.tsx`, `store.ts`)**:
  - Redesigned Combat Metrics header with dedicated Speed Tier pill badge (`⚡ Fast (1.25x)`, `🛡️ Normal (1.00x)`, `🐢 Slow (0.85x)`), fixing column overflow.
  - Expanded paperdoll layout to support full MMO equipment slots (Helmet, Amulet, Chest, Main Hand, Off-Hand, Gauntlets, Greaves, Boots, Ring, Cloak) with item inspect tooltips and weight load indicators.
- **Version & Manifest Synchronization**:
  - Bumped project version to `v2.1.271` across `package.json`, `settings.ts`, `layout.tsx`, `navbar.tsx`, and documentation badges.

## [2.1.270] - 2026-08-15
### Added & Improved
- **Visual Branding & Documentation Polish (`README.md`, `docs/README.md`)**:
  - Upgraded project `README.md` with stylized ASCII banner, custom Badges (`SaintsGaming.net`, `Release v2.1.270`, `Go MMO 3001`, `Babylon 2.5D`), and clear links to the live platform.
  - Prominently positioned [**SaintsGaming.net**](https://SaintsGaming.net) across all public documentation headers and indices.
  - Formatted a clean 3-column ecosystem layout connecting Web Platform, Game Client, and Saints Studio.
  - Bumped project version to `v2.1.270` across `package.json`, `settings.ts`, and admin pages.

## [2.1.269] - 2026-08-15
### Added & Improved
- **Comprehensive Systems Wiki & Documentation Architecture (`docs/`)**:
  - Structured documentation tree into two clear subdirectories: **`docs/game-systems/`** and **`docs/studio/`** indexed via **`docs/README.md`**.
  - **Game Systems Wiki**: Authored comprehensive architectural guides covering [Client Architecture & Loop](docs/game-systems/architecture-and-loop.md), [27-Skill Progression & Grandmaster Capstones](docs/game-systems/skills-and-progression.md), [Dual Combat & Encounters](docs/game-systems/combat-and-encounters.md), [Go MMO Networking & AOI Sharding](docs/game-systems/networking-and-multiplayer.md), [Item Schemas & Loot](docs/game-systems/items-and-economy.md), and [Mobile Touch Mode & UI Docks](docs/game-systems/mobile-and-ui.md).
  - **Studio Editor Wiki**: Authored detailed creator guides covering [Studio Architecture & Modes](docs/studio/studio-architecture.md), [Dual-Grid Tile Painting & Remeshing](docs/studio/tile-painting-and-maps.md), [Entities, Spawners & NPCs](docs/studio/entities-and-npcs.md), [Catalogs & Definition Editors](docs/studio/catalogs-and-definitions.md), and [Validation, Webhook Sync & PIE Playtesting](docs/studio/validation-sync-playtest.md).
  - Synchronized project version number across all manifests (`package.json`, `settings.ts`, admin settings, `README.md`).

## [2.1.268] - 2026-08-15
### Added & Improved
- **Project Vision & Documentation Audit (`README.md`, `.docs/public-docs/vision/`, `.docs/info/vision/`)**:
  - Re-calibrated public and private documentation to accurately reflect the project scope as an indie sandbox project by **GioGimic**.
  - Toned down marketing claims across public README and vision documents to present features simply, clearly, and honestly.
  - Documented recent completion of the 27-skill proficiency matrix, 270-tier Battlepass cosmetic tracks, Grandmaster capstone capes (Max Cape, Completionist Cape, Master Totem), and 29 Skill Cape Emotes with WebAudio soundscapes and visual FX.
  - Synchronized and verified version constants across `package.json`, `app/actions/settings.ts`, and admin configurations.

## [2.1.265] - 2026-08-15
### Added & Improved
- **Global Extras 2/7: Skill Cape Emotes & Visual FX System (`skillCapeEmotes.ts`, `SkillGuideModal.tsx`)**:
  - Created centralized Skill Cape Emotes & Visual FX Registry (`skillCapeEmotes.ts`) defining 29 unique cape emotes across all 27 skill proficiencies plus the Max Cape of the Grandmaster and Grandmaster Completionist Cape.
  - Added interactive Emote FX preview player to `SkillGuideModal.tsx` for tier rewards and header quick-preview with synthesized WebAudio feedback and pulsing visual FX banners.
  - Added comprehensive Vitest suite in `src/shared/game/skillCapeEmotes.test.ts` asserting all 29 cape emote definitions, slug lookups, and visual particle configurations.

## [2.1.264] - 2026-08-15
### Added & Improved
- **Global Extras 1/7: Max Cape of the Grandmaster & Master Totem System (`skillTypings.ts`, `items.ts`, `skills-overlay.tsx`)**:
  - Implemented `ALL_SKILL_SLUGS` constant uniting all 27 skill proficiencies across Combat (9), Gathering (5), Artisan (8), and Support (5).
  - Added mathematical Total Level & Total XP calculator helpers (`calculateTotalLevel`, `calculateTotalXp`, `isMaxCapeEligible`, `getMaxProgress`).
  - Added Grandmaster Capstones to `ITEM_DB`: `Max Cape of the Grandmaster`, `Max Hood of the Grandmaster`, `Sanctum Master Totem Relic` (+10% global XP across all 27 skills), and `Grandmaster Completionist Cape` (all 270 battlepass reward tiers).
  - Enhanced Lobby Skills Overlay with a live animated Max Cape & Master Totem progression bar, percentage gauge, maxed skill counter, and dynamic `👑 MAXED GRANDMASTER` crown badge.

## [2.1.263] - 2026-08-15
### Added & Improved
- **Skill 27/27: Necromancy Support Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded complete initiate necrotic bone wands, earthen soul urns, death guard plate-shrouds, spectral spirit lanterns, deathdealer heavy scythes, abyssal lich sovereign vestments, and celestial reaper death overlord scythes progression (Initiate Necrotic Bone Wands, Earthen Soul Urns, Death Guard Plate-Shrouds, Spectral Spirit Lanterns, Deathdealer Heavy Scythes, Abyssal Lich Sovereign Vestments, and Celestial Reaper Death Overlord Scythes) with explicit Necromancy level requirements (`reqSkill: 'Necromancy'`, `reqLevel: number`), soul harvesting rituals, lifesteal siphons, undead thrall summons (Skeleton Warriors, Putrid Zombies, Vengeful Ghosts), and execute thresholds.
  - Completed the full 27-skill proficiency matrix across all 4 categories (Combat: 9, Gathering: 5, Artisan: 8, Support: 5) with full dynamic equipment aggregation and level unlock lookups.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Necromancy spanning Lv 10 to Lv 99 (Novice Necromancer, Soul Harvester, Dread Lich titles, Spectral Soul Siphon emote, Necrotic Crypt Mists, Orbiting Soul Flame Wisp Halo, Abyssal Reaper Supernova Corona auras, Obsidian Skull Crown cosmetic, and Cape of Necromancy).

## [2.1.262] - 2026-08-15
### Added & Improved
- **Skill 26/27: Prayer Support Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded complete animal bones, blessed holy symbols, giant beast bones, sanctified monk vestments, ancient dragon bones, demonic infernal ashes, sanctified templar robes, and celestial hierophant halo crowns progression (Clean Animal Bones, Blessed Silver Holy Symbols, Giant Beast Bones, Sanctified Monk Vestments, Ancient Dragon Bones, Demonic Infernal Ashes, Sanctified Templar Robes, and Celestial Hierophant Halo Crowns) with explicit Prayer level requirements (`reqSkill: 'Prayer'`, `reqLevel: number`), prayer point drain reduction, overhead 100% protection wards (Magic, Missiles, Melee), Smite faith siphon, and Piety/Rigour/Augury divine seals.
  - Dynamically aggregated bone offerings, church altar consecrations, overhead protections, and holy knight seals for the Prayer handbook.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Prayer spanning Lv 10 to Lv 99 (Novice Acolyte, Templar Crusader, High Inquisitor titles, Consecrate Altar emote, Seraphic Golden Shimmer, Orbiting Holy Light Halo, Solar Archangel Supernova Corona auras, Sanctified Monk Vestments cosmetic, and Cape of Prayer).

## [2.1.261] - 2026-08-15
### Added & Improved
- **Skill 25/27: Magic Support Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded complete apprentice wands, gale air battle staves, mystic indigo robes, pyromancer burning battle staves, ancient Zarosian grimoires, infinity prismatic silk robes, limitless 4-element catalysts, and celestial archmage singularity staves progression (Apprentice Carved Wands, Gale Air Battlestaves, Mystic Indigo Robe Tops, Pyromancer Battlestaves, Zarosian Ancient Grimoires, Infinity Prismatic Robes, Staff of Limitless Elements, and Celestial Archmage Singularity Staves) with explicit Magic level requirements (`reqSkill: 'Magic'`, `reqLevel: number`), elemental damage multipliers, magic accuracy buffs, and miniature black hole singularities.
  - Dynamically aggregated elemental strikes, high alchemy, continental teleports, and ancient barrages for the Magic handbook.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Magic spanning Lv 10 to Lv 99 (Novice Mage, Elemental Sorcerer, Archmage Primus titles, Arcane Spellcast emote, Mystic Leyline Shimmer, Orbiting Arcane Rune Shimmer Halo, Celestial Hypernova Corona auras, Archmage Wizard Hat cosmetic, and Cape of Magic).

## [2.1.260] - 2026-08-15
### Added & Improved
- **Skill 24/27: Summoning Support Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded complete spirit shard currency, elemental soul charms (Gold, Green, Crimson, Blue), beast of burden familiars (Spirit Terrorbird 12-slot, War Tortoise 18-slot, Pack Yak 30-slot), combat healing familiars (Bunyip), war machine familiars (Steel Titan), and celestial apex chimera crowns progression (Resonant Spirit Shards, Gold Summoning Charms, Spirit Wolf Summoning Pouches, Green Summoning Charms, Desert Wyrm Summoning Pouches, Crimson Summoning Charms, Spirit Terrorbird Pouches, Blue Summoning Charms, War Tortoise Summoning Pouches, Bunyip Aquatic Pouches, Pack Yak Summoning Pouches, Steel Titan Summoning Pouches, and Celestial Apex Chimera Crowns) with explicit Summoning level requirements (`reqSkill: 'Summoning'`, `reqLevel: number`), beast of burden inventory capacities, combat passive health regen, and artillery strikes.
  - Dynamically aggregated soul charm binding, obelisk infusions, and familiar beasts for the Summoning handbook.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Summoning spanning Lv 10 to Lv 99 (Novice Beastmaster, Spirit Whisperer, Titan Caller titles, Familiar Roar emote, Primal Beast Mists, Orbiting Spirit Shard Shimmer Halo, Astral Chimera Supernova Corona auras, Shaman Totem Staff cosmetic, and Cape of Summoning).

## [2.1.259] - 2026-08-15
### Added & Improved
- **Skill 23/27: Thieving Support Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded complete lockpick tension sets, black silk disguises, charcoal smoke bombs, flash powder, muffled rogue footwear, shadow vestments, master diamond vault keycards, ambient darkness cloaks, and celestial eclipse shadow stilettos progression (Tempered Steel Lockpicks, Black Silk Bandit Masks, Dense Charcoal Smoke Bombs, Nitrogen Flash Smoke Powder, Muffled Rogue Boots, Midnight Rogue Vestments, Royal Diamond Safe Keycards, Shadow Infiltration Cloaks, and Celestial Eclipse Shadow Stilettos) with explicit Thieving level requirements (`reqSkill: 'Thieving'`, `reqLevel: number`), pickpocket success rate buffs, stun recovery acceleration, and guaranteed critical backstabs.
  - Dynamically aggregated lockpicking, pocket picking, and fortress vault cracking for the Thieving handbook.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Thieving spanning Lv 10 to Lv 99 (Novice Cutpurse, Shadow Infiltrator, Phantom Burglar titles, Coin Pouch Sleight emote, Nightfall Mist Shimmer, Orbiting Shadow Smoke Orb Halo, Eclipse Shadow Corona auras, Shadow Rogue Cowl cosmetic, and Cape of Thieving).

## [2.1.258] - 2026-08-15
### Added & Improved
- **Skill 22/27: Smithing Artisan Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded complete metal bar smelting, forging hammer tools, structural nails, heavy armor plates, blades, masterwork folded alloy ingots, and celestial forgemaster anvil warhammers progression (Smelted Bronze Ingots, Tempered Ball-Peen Hammers, Smelted Iron Ingots, High-Carbon Steel Ingots, Forged Steel Structural Nails, Azure Mithril Ingots, Adamantine Ingots, Cyan Runite Ingots, Masterwork Alloy Ingots, and Celestial Forgemaster Anvil Hammers) with explicit Smithing level requirements (`reqSkill: 'Smithing'`, `reqLevel: number`), faster anvil hammering speeds, extra double-bar smelting chances, and masterwork item stat amplifiers.
  - Dynamically aggregated metal smelting, anvil hammering, and masterwork alloy folding for the Smithing handbook.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Smithing spanning Lv 10 to Lv 99 (Novice Blacksmith, Master Forgemaster, Colossus Smith titles, Anvil Heavy Strike emote, White-Hot Furnace Hearth, Orbiting Molten Ember Halo, Solar Forge Supernova Corona auras, Heavy Blacksmith Apron cosmetic, and Cape of Smithing).

## [2.1.257] - 2026-08-15
### Added & Improved
- **Skill 21/27: Runecrafting Artisan Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded complete dense pure rune essence, runic tiaras, essence storage pouches (Small, Medium, Large, Giant, Colossal), catalytic and elemental runes (Air, Mind, Water, Earth, Fire, Chaos, Nature, Law, Death, Blood, Soul), and celestial astral keystones progression (Dense Pure Rune Essence, Air Elemental Runes, Small Essence Pouches, Air Runic Tiaras, Mind Catalytic Runes, Water Elemental Runes, Earth Elemental Runes, Medium Essence Pouches, Fire Elemental Runes, Chaos Destruction Runes, Large Essence Pouches, Nature Alchemy Runes, Law Teleportation Runes, Giant Essence Pouches, Death Oblivion Runes, Blood Sanguine Runes, Soul Transcendence Runes, and Celestial Astral Keystone Crowns) with explicit Runecrafting level requirements (`reqSkill: 'Runecrafting'`, `reqLevel: number`), essence pouch capacities, and multi-rune elemental casting power.
  - Dynamically aggregated rune binding, essence extraction, and altar ruins infusion for the Runecrafting handbook.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Runecrafting spanning Lv 10 to Lv 99 (Novice Runesmith, Glyph Crafter, Arch-Runemaster titles, Runic Glyph Scribe emote, Rift Warp Shimmer, Orbiting Tri-Element Rune Halo, Radiant Astral Glyph Corona auras, Runecrafter Satchel cosmetic, and Cape of Runecrafting).

## [2.1.256] - 2026-08-15
### Added & Improved
- **Skill 20/27: Herblore Artisan Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded complete vials of spring water, herb cleaning, secondary catalysts, combat boost potions (Attack, Strength, Defence), energy elixirs, vitality restoration brews, multi-stat overloads, and celestial philosopher ambrosia progression (Vials of Pure Spring Water, Apprentice Attack Draughts, Herbal Antipoison Tonics, Warrior Strength Infusions, Stat Restoration Draughts, Stamina Energy Tonics, Sacred Ranarr Prayer Brews, Super Attack Elixirs, Super Strength Elixirs, Super Defence Fortifications, Sacred Vitality Restorative Brews, Supreme Overload Concoctions, and Celestial Philosopher Ambrosia) with explicit Herblore level requirements (`reqSkill: 'Herblore'`, `reqLevel: number`), potion duration boosts, and combat overheal buffs.
  - Dynamically aggregated herb cleaning, potion brewing, and alchemical transmutation for the Herblore handbook.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Herblore spanning Lv 10 to Lv 99 (Novice Apothecary, Master Alchemist, Grand Transmuter titles, Pestle & Mortar Grind emote, Emerald Cauldron Mists, Orbiting Potion Flask Halo, Philosopher Stone Corona auras, Apothecary Bandolier cosmetic, and Cape of Herblore).

## [2.1.255] - 2026-08-15
### Added & Improved
- **Skill 19/27: Fletching Artisan Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded complete arrow shafts, metal broadhead arrows (Bronze, Iron, Mithril, Rune), unstrung carved bows (Oak, Willow, Maple, Yew, Magic), crossbow bolts, throwing dart spikes, and celestial hyperion bows progression (Whittled Arrow Shafts, Bronze Broadhead Arrows, Unstrung Oak Shortbows, Iron Broadhead Arrows, Unstrung Willow Longbows, Steel Crossbow Bolts, Unstrung Maple Shortbows, Mithril Dart Spikes, Unstrung Yew Longbows, Rune Piercing Arrows, Unstrung Magic Shortbows, Dragonfire Tipped Bolts, and Celestial Hyperion Star Bows) with explicit Fletching level requirements (`reqSkill: 'Fletching'`, `reqLevel: number`), projectile speed bonuses, and armor-penetrating critical damage.
  - Dynamically aggregated bow carving, arrow fletching, and bolt tipping for the Fletching handbook.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Fletching spanning Lv 10 to Lv 99 (Novice Fletcher, Master Bowyer, Hyperion Fletcher titles, Whittling Knife Flip emote, Fluttering Feather Drift, Orbiting Fletched Arrow Halo, Gale Wind Vortex Corona auras, Windfeather Quiver cosmetic, and Cape of Fletching).

## [2.1.254] - 2026-08-15
### Added & Improved
- **Skill 18/27: Firemaking Artisan Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded complete torches, bullseye/oil/obsidian lanterns, tinderboxes, timber log pyres (Regular, Oak, Willow, Maple, Yew, Magic, Redwood), and celestial sunfire beacon progression (Flint & Steel Tinderboxes, Pitch-Dipped Hand Torches, Brass Bullseye Lanterns, Oak Hearth Pyres, Willow Ember Fires, Refined Steel Oil Lanterns, Maple Bonfire Gatherings, Acetylene Pressure Torches, Yew Flame Spirit Pyres, Pyrelord Obsidian Lanterns, Magic Arcane Pyre Beacons, Sunfire Beacon Catalysts, Redwood Colossal Bonfires, and Celestial Sunfire Matrices) with explicit Firemaking level requirements (`reqSkill: 'Firemaking'`, `reqLevel: number`), party bonfire HP regeneration auras, dungeon darkness illumination, and thermal flame damage buffs.
  - Dynamically aggregated timber fires, lanterns, and regional sunfire beacons for the Firemaking handbook.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Firemaking spanning Lv 10 to Lv 99 (Novice Igniter, Pyromancer, Firelord titles, Fire Juggle emote, Sizzling Ember Steps, Orbiting Will-o'-the-Wisp Halo, Radiant Sunfire Flare Corona auras, Gilded Flame Torch cosmetic, and Cape of Firemaking).

## [2.1.253] - 2026-08-15
### Added & Improved
- **Skill 17/27: Crafting Artisan Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded complete leathercraft, gemstone jewelry (Sapphire, Emerald, Ruby, Diamond, Onyx), soul capture film rolls (Standard, Fine Grain, Quantum Master), and celestial singularity prism matrices progression (Stitched Leather Gloves, Polished Sapphire Rings, Standard Film Rolls, Strung Emerald Amulets, Fine Grain Film Rolls, Ornate Ruby Necklaces, Green Dragonhide Tunics, Cut Diamond Bangles, Quantum Master Film Rolls, Onyx Amulet of Supreme Fury, and Celestial Singularity Prism Matrices) with explicit Crafting level requirements (`reqSkill: 'Crafting'`, `reqLevel: number`), catch-rate multipliers, and combat crit/defence bonuses.
  - Dynamically aggregated jewelcrafting, film manufacturing, and operative dragonhide tailoring for the Crafting handbook.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Crafting spanning Lv 10 to Lv 99 (Novice Artisan, Master Gemologist, Matrix Artificer titles, Gem Chisel Spark emote, Orbiting Diamond Facets, Gilded Gemstone Ring Halo, Prismatic Laser Matrix Corona auras, Jeweler Magnifier Monocle cosmetic, and Cape of Crafting).

## [2.1.252] - 2026-08-15
### Added & Improved
- **Skill 16/27: Cooking Artisan Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded complete culinary dishes, baked pies, seafood feasts, chef attire, and celestial ambrosia progression (Cooked Coastal Shrimp, Fresh Oven Bread Loaves, Master Chef Toques & Aprons, Pan-Seared Rainbow Trout, Deep-Dish Venison Meat Pies, Grilled Salmon Fillets, Butter-Steamed Ocean Lobsters, Charbroiled Swordfish Steaks, Glazed Summer Berry Pies, Charred Apex Shark Cutlets, Royal Grand Banquet Roasts, and Celestial Ambrosia of the Saints) with explicit Cooking level requirements (`reqSkill: 'Cooking'`, `reqLevel: number`), food burning reductions, and massive health/stat restorations.
  - Dynamically aggregated kitchen ranges, campfire recipes, and banquet roasts for the Cooking handbook.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Cooking spanning Lv 10 to Lv 99 (Novice Cook, Banquet Chef, Culinary Master titles, Flambé Frying Pan emote, Sizzling Ember Steam, Orbiting Roast Feast Halo, Saintly Golden Feast Corona auras, Golden Chef Hat & Cleaver cosmetic, and Cape of Cooking).

## [2.1.251] - 2026-08-15
### Added & Improved
- **Skill 15/27: Construction Artisan Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded complete Sanctuary estate deeds, planks, flatpacks, crystal portals, gilded prayer altars, demon thrones, and celestial citadel keystones progression (Sanctuary Estate Deeds, Sawmill Wood Planks, Cured Oak Planks, Oak Dining Table Flatpacks, Tropical Teak Planks, Teak Dining Bench Flatpacks, Crystal Portal Nexus Frames, Fine Mahogany Planks, Gilded Sanctuary Altars, Demonic Mahogany Thrones, and Celestial Palace Keystones) with explicit Construction level requirements (`reqSkill: 'Construction'`, `reqLevel: number`).
  - Dynamically aggregated estate fixtures, blueprints, and furniture flatpacks for the Construction handbook.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Construction spanning Lv 10 to Lv 99 (Novice Builder, Master Carpenter, Grand Architect titles, Golden Hammer Tap emote, Blueprint Drafting Glyphs, Golden Chandelier Glow, Floating Celestial Citadel Halo auras, Architect Drafting Compass Belt cosmetic, and Cape of Construction).

## [2.1.250] - 2026-08-15
### Added & Improved
- **Skill 14/27: Woodcutting Gathering Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded complete forestry hatchets, timber logs, and starlight boughs progression (Bronze, Iron, Steel, Mithril, Adamant, Rune, Saintly Amberwood, and Celestial World-Tree Hatchets, Regular, Oak, Willow, Teak, Maple, Yew, Magic, Redwood Titan Logs, and Celestial World-Tree Boughs) with explicit Woodcutting level requirements (`reqSkill: 'Woodcutting'`, `reqLevel: number`) and tree chopping swing speed multipliers.
  - Dynamically aggregated hatchets, timber logs, and forestry harvesting for the Woodcutting handbook.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Woodcutting spanning Lv 10 to Lv 99 (Novice Lumberjack, Master Forester, Timber Lord titles, Swirling Emerald Leaves, Forest Dryad Wisps, Sylvan Warden Canopy Halo auras, Flannel Lumberjack Beanie cosmetic, and Cape of Woodcutting).

## [2.1.249] - 2026-08-15
### Added & Improved
- **Skill 13/27: Mining Gathering Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded complete mining pickaxes, metal ore strata, coal fuel, and cosmic asteroid cores progression (Bronze, Iron, Steel, Mithril, Adamant, Rune, Saintly Lumite, and Celestial Starfall Pickaxes, Copper, Tin, Iron, Coal, Mithril, Adamantite, Runite Ores, and Celestial Asteroid Cores) with explicit Mining level requirements (`reqSkill: 'Mining'`, `reqLevel: number`) and mineral extraction speed multipliers.
  - Dynamically aggregated pickaxes, ores, and geological quarrying nodes for the Mining handbook.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Mining spanning Lv 10 to Lv 99 (Novice Miner, Veteran Prospector, Earth Shaker titles, Ore Dust Sparks, Orbiting Geode Ring, Seismic Magma Corona auras, Hardhat Mining Lamp cosmetic, and Cape of Mining).

## [2.1.248] - 2026-08-15
### Added & Improved
- **Skill 12/27: Hunter Gathering Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded complete wildlife tracking traps, critters, pelts, and camouflage suits progression (Standard Bird Snares, Crimson Finch Plumes, Oak Deadfall Rigs, Spotted Kebbit Furs, Spring-Loaded Box Traps, Red Carnivorous Chinchompas, Woodland Ghillie Tunics, Sabretooth Kyatt Pelts, Black Abyssal Chinchompas, and Celestial Solar Phoenix Plumes) with explicit Hunter level requirements (`reqSkill: 'Hunter'`, `reqLevel: number`) and stealth concealment bonuses.
  - Dynamically aggregated wild critter traps, bird snares, and animal pelts for the Hunter handbook.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Hunter spanning Lv 10 to Lv 99 (Novice Trapper, Wilderness Tracker, Apex Predator titles, Autumn Camo Leaves, Hunting Horn Call, Primal Spirit Beast Halo auras, Camo Ghillie Hood cosmetic, and Cape of Hunter).

## [2.1.247] - 2026-08-15
### Added & Improved
- **Skill 11/27: Fishing Gathering Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded complete raw seafood catches, tackle, and deep-ocean harpoon progression (Small Hand Fishing Nets, Raw Coastal Shrimp, Raw Rainbow Trout, Raw Crimson Salmon, Wicker Lobster Pots, Raw Ocean Lobsters, Raw Bladed Swordfish, Raw Great Apex Sharks, Raw Abyssal Manta Rays, and Celestial Leviathan Scales) with explicit Fishing level requirements (`reqSkill: 'Fishing'`, `reqLevel: number`) and double-catch multipliers.
  - Dynamically aggregated raw seafood, nets, and tackle for the Fishing handbook.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Fishing spanning Lv 10 to Lv 99 (Novice Angler, River Trawler, Master of the Deep titles, Aqua Splash Rings, Bioluminescent School, Oceanic Whirlpool Halo auras, Sea Captain Bicorn Hat cosmetic, and Cape of Fishing).

## [2.1.246] - 2026-08-15
### Added & Improved
- **Skill 10/27: Farming Gathering Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded complete agricultural crop seeds, supercompost, enchanted watering cans, and botanical harvest trees progression (Potato Allotment Seeds, Guam Herb Seeds, Supercompost Soil Pails, Sweetcorn Allotment Seeds, Ranarr Herb Seeds, Watermelon Seeds, Enchanted Bottomless Cans, Magic Tree Saplings, Spirit Tree Acorns, and Celestial Starflower Bulbs) with explicit Farming level requirements (`reqSkill: 'Farming'`, `reqLevel: number`) and crop yield bonuses.
  - Dynamically aggregated farming seeds, composting items, and agricultural milestones for the Farming handbook.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Farming spanning Lv 10 to Lv 99 (Novice Planter, Green Thumb, Master Botanist titles, Sprouting Seedling Steps, Enchanted Flora Swarm, Demeter Blossom Halo auras, Sunflower Straw Hat cosmetic, and Cape of Farming).

## [2.1.245] - 2026-08-15
### Added & Improved
- **Skill 9/27: Intelligence Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded complete spellcasting wands, arcane staves, and catalysts progression (Apprentice Ash Wands, Sparking Quartz Wands, Pyromancer Ash Staves, Glacial Cryo Orbs, Thunderstrike Grimoires, Voidwalker Arch-Staves, Saintly Sunfire Scepters, and Celestial Singularity Batons) with explicit Intelligence level requirements (`reqSkill: 'Intelligence'`, `reqLevel: number`) and spell attack power/haste stats.
  - Dynamically aggregated arcane wands, staves, and destructive elemental abilities for the Intelligence handbook.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Intelligence (Novice Evoker, Pyromancer Adept, Grand Archmage titles, Magenta Rune Glyphs, Lightning Arc Storm, Cosmic Plasma Corona auras, Floating Grimoire Pet, and Cape of Intelligence).

## [2.1.244] - 2026-08-15
### Added & Improved
- **Skill 8/27: Wisdom Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded complete spiritual ward shields, mana restoring elixirs, sacred incense, and divine robes progression (Apprentice Spirit Talismans, Distilled Mana Draughts, Willow Prayer Scriptures, Sacred Cleansing Incense, Spirit Ward Bucklers, Grand Mana Elixirs, Archon Spirit Aegis, Sanctified Hierophant Robes, Saintly Seraph Vestments, and Celestial Sovereign Sanctuaries) with explicit Wisdom level requirements (`reqSkill: 'Wisdom'`, `reqLevel: number`) and MP restoration/healing power stats.
  - Dynamically aggregated spirit wards, mana elixirs, and restorative support abilities for the Wisdom handbook.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Wisdom (Novice Acolyte, Enlightened Mystic, Hierophant titles, Indigo Halo, Sacred Lotus Mandala, Celestial Seraph Wings auras, and Cape of Wisdom).

## [2.1.243] - 2026-08-15
### Added & Improved
- **Skill 7/27: Perception Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded complete optical spyglasses, tactical monocles, radar lenses, and divination crowns progression (Brass Spyglasses, Hunter Tracking Charms, Scout Monocles, True-Sight Clarifying Elixirs, Hawkeye Sniper Goggles, Crystalline Prism Lenses, Shadow-Seer Night Visors, Oracle All-Seeing Oculus, Saintly Divination Circlets, and Celestial Omniscient Crowns) with explicit Perception level requirements (`reqSkill: 'Perception'`, `reqLevel: number`) and critical strike/radar vision stats.
  - Dynamically aggregated optical eyepieces, true-sight potions, and weak-point analysis skills for the Perception handbook.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Perception (Novice Tracker, Keen Eye, Shadow Hunter titles, Violet Scanlines and Mystic Third Eye auras, Astral Monocle, and Cape of Perception).

## [2.1.242] - 2026-08-15
### Added & Improved
- **Skill 6/27: Agility Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded complete agility footwear, weight-reducing clothing, and stamina elixirs progression (Leather Hiking Boots, Nimble Track Runners, Graceful Wind Cloaks, Shadow Shinobi Tabi, Zephyr Windwalkers, Cyclone Striders, Saintly Winged Sandals, Celestial Starstrider Greaves, and Grand Stamina Elixirs) with explicit Agility level requirements (`reqSkill: 'Agility'`, `reqLevel: number`) and mobility/defense stats.
  - Dynamically aggregated agility footwear, stamina restore potions, and shortcut techniques for the Agility handbook.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Agility (Novice Acrobat, Swift Shadow, Zephyr Ghost titles, Cyan Gust Streamers and Cyclone Dash Trails auras, Wind-Dancer Sash, and Cape of Agility).

## [2.1.241] - 2026-08-15
### Added & Improved
- **Skill 5/27: Ranged Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded complete bow, crossbow, and ranger armor tier progression (Starter Wood, Oak, Willow, Maple, Yew, Magic Shortbow, Darkveil Ballista, Celestial Sunstriker Greatbow, and Wyrmhide tunics) with explicit Ranged level requirements (`reqSkill: 'Ranged'`, `reqLevel: number`) and ranged attack power stats.
  - Dynamically aggregated shortbows, longbows, crossbows, and leather armors for the Ranged handbook.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Ranged (Novice Marksman, Windstrider, Deadeye Sniper titles, Gale Wind and Phantom Arrow Trails auras, Feathered Quiver, and Cape of Ranged).

## [2.1.240] - 2026-08-15
### Added & Improved
- **MMO Gateway Hub & Pre-Game Entrance Redesign (`GameTitleScreen.tsx`, `character-selector.tsx`, `ServerSelect.tsx`, `GameLogin.tsx`, `index.tsx`)**:
  - Rebuilt `/lobby` initial entry screen into an authentic Diablo II and RuneScape style 3-column MMO Gateway Hub.
  - Infused the visual atmosphere and color palette from the Saints Landing Page (synthwave horizon grid floor, sunset glow, digital snow particles, palm canopy vignette, CRT scanlines) with zero modifications to the landing page or Skill UI.
  - **Operative Stage (Left)**: Active hero animated pedestal showcase with class badges, glowing runic aura, HP & gold counters, quick character carousel cycler, and primary `ENTER REALM` CTA.
  - **Global Lobby Chat (Center)**: Live in-lobby pre-game chat channel supporting global chat, broadcast announcements, system notifications, and realtime socket dispatch.
  - **Realm Gateway & Hall of Champions (Right)**: Live server telemetry (heartbeat, latency, population bar, dev controls) and Top 5 Operatives leaderboard ranking preview with live sync.
  - Re-themed `character-selector.tsx`, `ServerSelect.tsx`, and `GameLogin.tsx` to match the synthwave MMO command deck design.

## [2.1.239] - 2026-08-15
### Added & Improved
- **Skill 4/27: Hitpoints Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded complete vitality consumables and food progression (Fresh Loaf, Grilled Trout, Crimson Salmon, Butter Lobster, Apex Shark, Saintly Ambrosia, Phoenix Rebirth Heart) with explicit Hitpoints level requirements (`reqSkill: 'Hitpoints'`, `reqLevel: number`) and HP restore stats.
  - Dynamically aggregated vitality rations, recovery potions, and talisman accessories for the Hitpoints handbook.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Hitpoints (Novice Vitalist, Resilient Soul, Living Phoenix titles, Emerald Heartbeat Pulse and Petal Swarm auras, and Cape of Hitpoints).

## [2.1.238] - 2026-08-15
### Added & Improved
- **Skill 3/27: Defence Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded complete protective armor & shield tier progression (Bronze, Iron, Steel, Mithril, Adamant, Rune full sets, Saintly Bastion Aegis, Celestial Cosmos Bulwark) with explicit Defence skill level requirements (`reqSkill: 'Defence'`, `reqLevel: number`) and defense mitigation stats.
  - Dynamically aggregated shields, full helms, platebodies, and platelegs for the Defence handbook.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Defence (Shieldbearer, Iron Wall Sentinel, Immortal Bastion titles, Sapphire Barrier and Prismatic Ward dome auras, and Cape of Defence).

## [2.1.237] - 2026-08-15
### Added & Improved
- **Skill 2/27: Strength Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded full heavy & crushing weapon tier progression (Bronze, Iron, Steel, Mithril, Adamant, Rune Battleaxes/Warhammers, Colossus Mauls, Titan Crushers) with explicit Strength skill level requirements (`reqSkill: 'Strength'`, `reqLevel: number`) and crushing damage stats.
  - Dynamically aggregated equipment unlocks and heavy combat abilities for the Strength handbook.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Strength (Novice Brawler, Colossus of Iron, Unstoppable Juggernaut titles, Earth Tremor and Molten Impact auras, and Cape of Strength).

## [2.1.236] - 2026-08-15
### Added & Improved
- **Skill 1/27: Attack Proficiency Deep-Dive (`skillGuideData.ts`, `items.ts`)**:
  - Expanded full weapon tier progression (Bronze, Iron, Steel, Mithril, Adamant, Rune, Saintly, Celestial) with explicit Attack skill level requirements (`reqSkill: 'Attack'`, `reqLevel: number`) and attack power stats.
  - Dynamically aggregated equipment unlocks and abilities for the Attack handbook.
  - Fleshed out 10-tier Battlepass cosmetic reward track for Attack (Novice Swordsman, Blademaster, Warmaster titles, Crimson particle auras, and Cape of Attack).

## [2.1.235] - 2026-08-15
### Added & Improved
- **27-Skill Progression Guide Data & Unlocks Registry (`skillGuideData.ts`)**:
  - Implemented the master 27-skill proficiency registry with per-level perk formulas, milestone level unlocks, dynamic item/recipe/ability aggregators, and battlepass-style cosmetic reward tracks.
- **Interactive Skill Guide Handbook Modal (`SkillGuideModal.tsx`)**:
  - Built a comprehensive handbook inspection modal with overview metrics, filterable level unlock tables, and multi-tier battlepass cosmetic progression tracks with audio cues.
- **Skills Matrix Overlay Integration (`skills-overlay.tsx`)**:
  - Upgraded all 27 skill cards with individual SVG vector icons, animated level progress bars, and click-to-open handbook triggers.

## [2.1.234] - 2026-08-15
### Added & Improved
- **World Atlas & Macro Region Connectivity Panel (`WorldAtlasPanel.tsx`)**:
  - Upgraded macro world atlas matrix with adjacency indicator pips, node inspector, spawn hub assigner, and WebAudio sound synthesis (`soundSynth.playSelectSound()`, `soundSynth.playActionSound()`, `soundSynth.playUiClick()`).
- **World Builder & Multi-Layer Map Creator Panel (`WorldBuilderPanel.tsx`)**:
  - Modernized map manager with slug creator, resize dimension controls, layer manager, and audio feedback.

## [2.1.233] - 2026-08-15
### Added & Improved
- **Studio Asset Pack & Resource Browser (`AssetEditor.tsx`)**:
  - Upgraded asset management suite with pack categorization filters, quick tags, gameplay flags, and WebAudio sound synthesis (`soundSynth.playSelectSound()`, `soundSynth.playActionSound()`, `soundSynth.playUiClick()`).
- **Sprite Browser & Animated Preview Modal (`SpriteBrowser.tsx`)**:
  - Modernized sprite selection grid with class filters, preview frame controls, and audio cues (`soundSynth.playSelectSound()`, `soundSynth.playActionSound()`).

## [2.1.232] - 2026-08-15
### Added & Improved
- **Studio Omnisearch Fuzzy Command Palette (`StudioOmnisearch.tsx`)**:
  - Upgraded global search modal with cyber chamfered glass card, live search categories, keyboard shortcut badges, and WebAudio sound synthesis (`soundSynth.playSelectSound()`, `soundSynth.playActionSound()`).
- **Visual Tileset Palette & Brush Picker (`TilesetPicker.tsx`)**:
  - Modernized layer manager, brush selector, and tileset switcher with chamfered geometry and audio feedback (`soundSynth.playSelectSound()`, `soundSynth.playUiClick()`).

## [2.1.231] - 2026-08-15
### Added & Improved
- **Studio Paint & Tool HUD Controller (`StudioPaintHud.tsx`)**:
  - Upgraded paint tool pill with cyber chamfered badges, glowing active indicators, and WebAudio sound synthesis (`soundSynth.playSelectSound()`, `soundSynth.playUiClick()`).
- **Studio Favorites Quick Strip (`StudioFavoritesStrip.tsx`)**:
  - Modernized bookmark strip with sound synthesis on pin opening and removal.

## [2.1.230] - 2026-08-15
### Added & Improved
- **Studio Menu Bar & Tool Controller (`StudioMenuBar.tsx`)**:
  - Upgraded top-level menus, mode switcher (Edit/Playtest), and hotkeys with cyber chamfered badges and WebAudio sound synthesis (`soundSynth.playSelectSound()`, `soundSynth.playActionSound()`).
- **Studio Status Bar & Realtime Telemetry (`StudioStatusBar.tsx`)**:
  - Modernized telemetry chips with latency metrics, FPS counter, brush size displays, and sound cues.

## [2.1.229] - 2026-08-15
### Added & Improved
- **Interactive HUD Docking Architecture & Drop Zones (`DockZone.tsx`)**:
  - Upgraded dock zones with cyber chamfered badges, glowing border animations, and audio drop feedback (`soundSynth.playActionSound()`).
- **Dockable Widget Drag Handles & Controls (`DockableWidget.tsx`)**:
  - Modernized drag header, size cycling (compact/standard/expanded), visibility toggle, and collapse buttons with sound synthesis (`soundSynth.playSelectSound()`, `soundSynth.playUiClick()`).
- **Viewfinder Calibration Overlay (`ViewfinderOverlay.tsx`)**:
  - Modernized camera calibration grid with cyber reticles and chamfered corner brackets.

## [2.1.228] - 2026-08-15
### Added & Improved
- **Game Options & Settings Matrix (`GameOptionsMenu.tsx`)**:
  - Upgraded settings tabs (Game, Graphics, Audio, Controls, Interface, Gameplay) with cyber chamfered badges and WebAudio sound synthesis (`soundSynth.playSelectSound()`, `soundSynth.playActionSound()`).
- **Operative Vitals & Stat Gauge HUD (`PlayerVitalsHud.tsx`)**:
  - Modernized operative avatar badge, segmented HP/MP/EXP gauges, and low-HP critical alert pulse state.

## [2.1.227] - 2026-08-15
### Added & Improved
- **Realm & World Select Gateway (`ServerSelect.tsx`)**:
  - Upgraded realm selector to cyber chamfered cards with real-time ping indicator, population capacity meters, and audio synthesis (`soundSynth.playSelectSound()`, `soundSynth.playActionSound()`).
- **Touch Edition Mobile Game Launcher (`MobileGameLauncher.tsx`)**:
  - Modernized mobile touch entrance with operative status badge, landscape orientation advisory, fullscreen launch button, and WebAudio feedback.

## [2.1.226] - 2026-08-15
### Added & Improved
- **In-Game Comms & Transmissions Channel (`GameChat.tsx`)**:
  - Upgraded channel tabs (Local, Global, Party, Friends) to cyber chamfered badges with WebAudio sound synthesis on whispers, broadcasts, and channel selection (`soundSynth.playActionSound()`, `soundSynth.playSelectSound()`).
- **Game Login & Authentication Gateway (`GameLogin.tsx`)**:
  - Elevate game login with cyber chamfered glass card, subtle backdrop blur, and interactive sound synthesis.
- **Cinematic Title Screen & Credits Showcase (`GameTitleScreen.tsx`)**:
  - Elevate action buttons and credits showcase with chamfered geometry, responsive hover sweeps, and sound cues.

## [2.1.225] - 2026-08-15
### Added & Improved
- **Staff & Admin Floating Controller (`StaffFloatingMenu.tsx`)**:
  - Upgraded to modern `HudPanelShell` cyber layout with gold/amber staff badge, map broadcast announcements, nearby operative controls (Teleport, Kick, Inspect), and audio feedback.
- **Virtual Touch Controller & Action Pad (`MobileControls.tsx`)**:
  - Modernized static DPad, floating joystick, and tactile action cluster with chamfered cyber geometry and audio click synthesis (`soundSynth.playUiClick()`).
- **Cyber Toast Notification Stack (`GameToastStack.tsx`)**:
  - Upgraded in-game toast notifications to chamfered cyber pills with distinct status styling (Success/Emerald, Alert/Rose, Warning/Amber, Info/Cyan) and backdrop blur.

## [2.1.224] - 2026-08-15
### Added & Improved
- **Real-time Combat Action Hotbar (`Hotbar.tsx`)**:
  - Upgraded to modern `HudPanelShell` cyber slot layout with typing color themes (Damage, Heal, Buff, Utility).
  - Added smooth SVG cooldown sweeps, numeric countdowns, and WebAudio action synthesis (`soundSynth.playActionSound()`).
- **On-Screen Campaign Objective Tracker (`quest-tracker-overlay.tsx`)**:
  - Pinned cyber HUD objective card with multi-stage progress meters, checkmarks, sound-synthesized collapse/expand toggles.
- **Multiplayer Shard & Operative Presence HUD (`PeerPresenceHud.tsx`)**:
  - Real-time shard channel telemetry with low-latency live ping indicator and interactive nearby operative target chips.

## [2.1.223] - 2026-08-15
### Added & Improved
- **Community Achievements & Platform Badges (`achievements-overlay.tsx`)**:
  - Upgraded to modern `HudPanelShell` cyber layout with reward preview chips (+Coins & Platform XP) and WebAudio fanfare synthesis on claim.
- **27-Skill Progression Matrix (`skills-overlay.tsx`)**:
  - Elevated Skills Matrix to unified cyber HUD standard categorized into Combat, Gathering, Artisan, and Support with XP gauges, hover inspect tooltips, and total level telemetry.
- **Saints Dex & Animist Codex (`SaintsDexOverlay.tsx`)**:
  - Implemented elemental affinity filtering, discovered/undiscovered species states, and full combat stat inspect drawer with Pin-to-Profile and Feed Share triggers.

## [2.1.222] - 2026-08-15
### Added & Improved
- **Party & Co-Op Management Suite (`party-overlay.tsx`)**:
  - Upgraded to modern `HudPanelShell` cyber layout with Beast Squad companion switching and active creature summoning.
  - Added Co-Op Party roster, +25% Shared XP bonus badge, nearby operative quick invites, and WebAudio sound cues.
- **Campaign Quest Journal (`quest-log-overlay.tsx`)**:
  - Elevated Quest Log to unified cyber HUD standard with multi-stage objective trackers, reward summaries (XP & Credits), and tab sound synthesis.
- **Global Operative Leaderboards (`leaderboard-overlay.tsx`)**:
  - Implemented gold, silver, and bronze podium cards with user badge verification (Founder, VIP, Trusted) and live refresh triggers.

## [2.1.221] - 2026-08-15
### Added & Improved
- **Professor Oakwood's Research Sanctuary (`ProfessorLabOverlay.tsx`)**:
  - Upgraded starter companion showcase to modern cyber chamfered cards with elemental glowing borders.
  - Added base stat comparison meters (HP, Power, Defense, Tempo) and bonding audio synthesis (`soundSynth.playLevelUpSound()`).
- **Dynamic Overworld Target Frame (`target-frame.tsx`)**:
  - Integrated `HudPanelShell` with responsive styling and distinct cyber neon color themes for Players (cyan), Wild Monsters (magenta/rose), and NPCs (amber).
  - Added interactive quick-action buttons (Party Invite, Buddy Battle Duel Challenge, Whisper) with sound synthesis.
- **MiniMap Radar & Navigation Compass (`MiniMapRadar.tsx`)**:
  - Added cardinal direction markers (N, S, E, W) overlay on radar bezel and synthesized audio feedback on navigation actions.

## [2.1.220] - 2026-08-15
### Added & Improved
- **Village Merchant & Trade Post System (`shop-overlay.tsx`)**:
  - Replaced legacy yellow shop panels with modern cyber chamfered glass containers, inventory count chips, and real-time fund tracking.
  - Added synthesized audio feedback on purchasing, selling, and crafting (`soundSynth.playActionSound()`, `soundSynth.playSelectSound()`).
- **Equipment Paperdoll Matrix (`equipment-overlay.tsx`)**:
  - Implemented glowing chamfered gear pedestals with dedicated slot iconography (Helmet, Weapon, Armor, Off-Hand, Greaves).
  - Added live total combat stat cards (Attack Power, Defense Rating, Crit Chance, Speed Tier) and unequip sound cues.
- **Cinematic NPC Dialogue Engine (`dialog-overlay.tsx`)**:
  - Elevated the bottom-third dialogue modal to unified cyber HUD specifications with glowing NPC speaker pedestal and transmission badge.
  - Added typewriter sound effect ticks (`soundSynth.playUiClick()`) and keyboard choice indicators ([1-4], [SPACE], [ESC]).

## [2.1.219] - 2026-08-15
### Added & Improved
- **Base Sanctuary Automation & Facility Assignment (`base-overlay.tsx`)**:
  - Upgraded Base Sanctuary into modern chamfered cyber aesthetic with facility cards (Lumber Mill, Sanctuary Quarry, Smelting Furnace, Medicinal Herb Farm, Sanctuary Pier).
  - Added element affinity yield bonuses (Fire, Water, Grass, Ground, Metal, Wood) and companion assignment slot controls with audio synthesis (`soundSynth.playActionSound()`, `soundSynth.playSelectSound()`).
  - Added Live Sanctuary Telemetry viewport with animated roaming companions and custom pasture rendering.
- **Crafting Station & Recipe Forging (`crafting-overlay.tsx`)**:
  - Elevated Crafting Station to `HudPanelShell` chamfered HUD with trade skill filter tabs (All, Smithing, Crafting, Fletching, Alchemy).
  - Integrated real-time forging progression with periodic synthesized anvil clinks and level-up completion tones (`soundSynth.playMiningSound()`, `soundSynth.playLevelUpSound()`).
- **Grand Trade Center (GTC Marketplace & Player Exchange) (`gtc-overlay.tsx`)**:
  - Modernized GTC Marketplace with cyber chamfered styling, category chips, and live exchange tax calculator (5% fee preview).
  - Integrated synthesized audio feedback for browsing, purchasing, and listing items.

## [2.1.218] - 2026-08-15
### Added & Improved
- **Saints Buddy Battles Encounter UI & Type Badging (`TurnBattleOverlay.tsx`)**:
  - Elevated turn-based creature battle overlay to the unified cyber chamfered HUD standard (`HudPanelShell`).
  - Added elemental typing badges (Fire, Water, Grass, Electric, Ice, Ground, Wood, Metal) with color-coded power chips and icons.
  - Implemented creature binding crystal pulse animation with audio feedback (`soundSynth.playCrystalCapture()`).
  - Added full keyboard shortcut accessibility ([1] FIGHT, [2] BIND CRYSTAL, [3] SWITCH, [4] FLEE, [ESC] BACK).
- **Hero Battles Overworld ARPG Combat Feedback (`BabylonEngine.ts`, `GameCanvasBabylon.tsx`)**:
  - Implemented dynamic sprite hit-flash emissive color feedback on damaged monster meshes.
  - Formatted floating combat text with bold critical strike tags (`! 245 !`), miss notifications (`MISS`), and floating upward alpha fades.
  - Integrated combat sound synthesis (`soundSynth.playCombatHit()`, `soundSynth.playCriticalHit()`) into real-time attack results.
- **Audio Synthesizer Expansion (`sound-synth.ts`)**:
  - Added synthesized WebAudio sound generation for standard combat hits, critical strikes, and creature crystal capture pulses.

## [2.1.217] - 2026-08-15
### Added & Improved
- **Macro World Atlas & 4-Way Adjacency Transitions (`WorldAtlasPanel.tsx`, `route.ts`, `WorldSimulation.ts`)**:
  - Implemented automatic 4-way adjacent neighbor connection computation (`north`, `south`, `east`, `west`) in the World Builder Atlas canvas.
  - Added visual directional neighbor connection indicator pips (cyan bars) and adjacency status info bar.
  - Synchronized and persisted map boundary transitions to `gatesData` on each `WorldMap` record during Atlas save.
  - Verified and tested boundary edge warping in `WorldSimulation.ts` and `GameCanvasBabylon.tsx`.
- **Multiplayer Entity Replication Normalization (`protocol.go`, `manager.go`, `index.tsx`)**:
  - Normalized Go MMO `CreatureSpawn` JSON tags to symmetrically supply `entityId`, `templateId`, `spriteKey`, and `entityType`.
  - Normalized client-side entity event listeners (`creature_spawned`, `creature_despawned`, `creature_hp_update`) in `the-lobby/index.tsx` to accept both key variants seamlessly.
  - Eliminated conflicting subsystems and ensured Go MMO authority remains primary for live multiplayer entity streaming.
- **Unified Chamfered UIX Suite & SVG Iconography (`rpg-panel.tsx`, `SaintsDexOverlay.tsx`, `quest-log-overlay.tsx`, `leaderboard-overlay.tsx`, `achievements-overlay.tsx`, `skills-overlay.tsx`)**:
  - Re-architected `RpgPanel` to wrap `HudPanelShell` with chamfered cyber polygon borders, dark backdrop blur, and SVG iconography (`lucide-react`).
  - Standardized in-game feature modals to the unified design language.
- **Cinematic Character Select & Character Forge Flow (`character-selector.tsx`, `character-creator.tsx`, `GameTitleScreen.tsx`, `ServerSelect.tsx`)**:
  - Replaced basic selector cards with high-end Hero Pedestals featuring animated auras, level crests, stats summary (HP, pouch credits, class perk), and glowing "Enter Realm" triggers.
  - Elevated Character Creator into a PC MMO Character Forge with sound synthesis integration (`soundSynth.playActionSound()`, `soundSynth.playSelectSound()`), responsive layout, and archetype statistics.
  - Added interactive audio feedback and refined transitions on Title and Server Select screens.

## [2.1.216] - 2026-08-14
### Fixed & Improved
- **Menu Overlay Mounting & Gameplay HUD State (`index.tsx`, `Hotbar.tsx`, `quest-tracker-overlay.tsx`)**:
  - Fixed a critical bug where opening the Backpack (Inventory), Skills, Equipment, Quest Log, or GTC caused `LobbyHudDockLayout` to unmount because it was strictly gating on `gameMode === 'EXPLORING'`.
  - Expanded the HUD mount gate to all playable exploration states (`EXPLORING`, `INVENTORY`, `SKILLS`, `EQUIPMENT`, `QUESTS`, `GTC`, `DIALOG`), allowing the utility dock to open and switch tabs seamlessly.
  - Kept the action hotbar and quest tracker toast active during inventory/skill management.
- **Native Saints Gaming Layout Preset Names (`default-presets.ts`)**:
  - Replaced third-party game references with custom Saints Gaming preset identities: **Command Center (Default)**, **Sidebar Focus**, **Action Combat**, and **Minimalist**.
  - Maintained backward-compatible aliases and legacy preset ID resolution.

## [2.1.215] - 2026-08-14

### Added & Improved
- **Unified Chamfered HUD Visual System & Panel Consolidation (`HudPanelShell.tsx`, `MiniMapRadar.tsx`, `Hotbar.tsx`, `ClassicPanel.tsx`, `GameChat.tsx`, `quest-tracker-overlay.tsx`, `PlayerVitalsHud.tsx`, `index.tsx`)**:
  - **Unified Visual Language**: Built `HudPanelShell` with 8px chamfered corners (cut top-left & bottom-right), near-black 95% opacity teal-tinted fill, 1px consistent bright teal border at rest, and fluid 150-200ms ease transitions. Reserved neon accents for active and alert states only.
  - **Consolidated Top-Right Command Panel**: Merged the 5 separate floating elements (Options button, Studio button, Radar canvas, Location label, and Coordinates readout) into ONE structured chamfered panel with quick action header, canvas thumbnail, and location footer.
  - **Horizontal Bottom-Center Hotbar**: Converted vertical right-edge action strip into a horizontal 1-5 action bar anchored bottom-center with clear hotkey numbers, cooldown sweep overlays, and countdown timers.
  - **Dedicated Bottom-Right Utility Dock**: Sized the bottom-right dock strictly to its utility icons (Bag, Skills, Equipment, Quests, GTC), opening into an expanded chamfered tabbed panel in place.
  - **Integrated Staff Tag & Comms Panel**: Grouped the loose `[STAFF]` badge directly inside the `GameChat` header as an attached drawer, eliminating free-floating badges.
  - **Dismissible Quest Tracker Toast**: Converted the quest tracker into a collapsible chamfered toast anchored near the top-right command panel with a 1-click dismiss button and quick re-open pill.
  - **Single-Panel Player Vitals**: Merged camera/avatar plate, player name/level, and HP/MP/EXP stat bars into ONE grouped top-left panel with strict typographic hierarchy.

## [2.1.214] - 2026-08-14

### Added
- **Modular HUD Dock Zone Architecture (RuneScape 3 & WoW Edit Mode Style) (`dock-types.ts`, `default-presets.ts`, `DockZone.tsx`, `DockableWidget.tsx`, `LobbyHudDockLayout.tsx`, `UiEditToolbar.tsx`, `store.ts`, `index.tsx`)**:
  - Replaced unconstrained pixel dragging with a fixed 8-zone screen dock matrix (`top-left`, `top-center`, `top-right`, `mid-left`, `mid-right`, `bottom-left`, `bottom-center`, `bottom-right`) for resolution-independent HUD layouts.
  - Implemented 4 standard built-in layout presets: **Modern MMO (Default)**, **Classic RuneScape (Right Dock)**, **WoW Action Combat (Centered)**, and **Minimalist Streamer**.
  - Built a compact Base64 layout encoder/decoder codec (`SG-HUD:v1:...`) enabling 1-click preset exporting, importing, and instant sharing to the social feed.
  - Upgraded Viewfinder Edit Mode with live drop-zone highlights, widget size variant tokens (`compact`, `standard`, `expanded`), visibility toggles, and custom layout saving/deleting.
  - Unified lobby overlay mounting under `LobbyHudDockLayout` with full pointer-events canvas protection.

## [2.1.213] - 2026-08-14

### Fixed
- **Multiplayer Movement Input & Walkability Boundary Desynchronization (`manager.go`, `demo.go`, `handler.go`, `LobbySocketHandler.ts`, `GameCanvasBabylon.tsx`)**:
  - Fixed map grid boundary check in Go MMO `IsWalkable` and dynamic `JoinMap` registration so maps larger than 30x30 (such as the 64x64 `LOBBY` / `DEMO_SANDBOX` at `X 31, Y 32`) do not incorrectly drop player movement inputs as out-of-bounds wall collisions.
  - Implemented `LoadAllMaps` in Go MMO startup bootstrap to register all world definitions directly from SQLite `WorldMap`.
  - Added dual event synchronization (`input` + `player_move`) across both Go MMO and Next.js Socket fallback handlers for instantaneous cross-client position and direction replication.

## [2.1.212] - 2026-08-14
### Fixed
- **Multiplayer Movement & Walking Animation Synchronization (`BabylonEngine.ts`, `engine.go`)**: Restored smooth continuous position interpolation and walking animation cycling for online players, ensuring other players do not snap or appear frozen in place. Expanded Go MMO `EvPlayerMoved` broadcast directly to map instances.
- **Continuous Map Edge Transitions & Warp Gates (`GameCanvasBabylon.tsx`)**: Removed restrictive map-locking checks on edge connections (North, South, East, West) and warp gates, enabling seamless transition across world maps with normalized and clamped destination spawn coordinates.
- **Studio Warp Gate Placement Tool & Manager (`StudioPaintHud.tsx`, `WorldBuilderPanel.tsx`, `editor-store.ts`)**: Added dedicated `Gate` tool button (`DoorOpen` icon) in Studio quick tools and a comprehensive Warp Gates & Edge Connections manager in World Builder with 1-click tile placement, coordinate jumping, and gate editing.

## [2.1.211] - 2026-08-14
### Fixed
- **MMO Turn-Based Battle Payload Normalization (`index.tsx`)**: Normalized `battle_started` and `battle_update` socket payloads to ensure `TurnBattleOverlay` always receives valid creature instances (`wildCreature`, `playerCreature`), phase transitions, combat logging, and HP synchronizations across wild encounters, trainer battles, and player PvP duels.

## [2.1.210] - 2026-08-14
### Added
- **Go MMO Real-Time Party & PvP Challenge Synchronization (`handler.go`, `party.go`, `party_test.go`)**: Implemented full lifecycle multiplayer party invitations (`party_invite_send`, `EvPartyInvite`), acceptance (`party_invite_accept`), leaving (`party_leave`), and real-time PvP duel challenges (`battle_invite_send`, `accept_battle`) in the Go MMO backend with synchronized party toasts, member updates, and comprehensive test suite coverage.

## [2.1.209] - 2026-08-14
### Added
- **MMO Target Frame Direct PvP Duel Action (`target-frame.tsx`)**: Added interactive PvP Duel Challenge trigger to TargetFrame when targeting online players, allowing instant dispatch of `battle_invite_send` challenges.

## [2.1.208] - 2026-08-14
### Fixed
- **MMO 3D Player Mesh Target Resolution (`GameCanvasBabylon.tsx`)**: Fixed targeting when clicking other online tamers in the 3D viewport by stripping the internal `multiplayer_` mesh prefix, ensuring instantaneous target frame initialization and whisper/invite readiness.

## [2.1.207] - 2026-08-14
### Fixed
- **MMO Defeat Respawn Coordinates & Map Sync (`gameplay.go`, `index.tsx`)**: Aligned Go MMO `EvPlayerDefeated` payload with client expectation by sending `mapId`, `instanceId`, and spawn coordinates `(x, y)` on combat blackout. Hardened client handler with fallback bounds and default safe maps.

## [2.1.206] - 2026-08-14
### Added
- **MMO Real-Time Multiplayer PvP & Monster Combat Calculations (`combat.ts`, `combat.test.ts`)**: Added `calculateCombatHitDamage` featuring critical strikes, diminishing mitigation curves, damage variance, and full dynamic equipment scanning.

## [2.1.205] - 2026-08-14
### Added
- **MMO Minimap Radar Co-Op Party Highlighting (`MiniMapRadar.tsx`)**: Added distinctive cyan double-ring highlights for party teammates on the radar screen and resolved active Studio map names during map editing/playtest sessions.

## [2.1.204] - 2026-08-14
### Added
- **MMO Multi-Entity Target Picking & Resolution (`GameCanvasBabylon.tsx`)**: Unified target identification across `creature_`, `mob_`, `wild_`, and online multiplayer peer sockets, providing accurate HP initialization and behavior states on mesh click.

## [2.1.203] - 2026-08-14
### Added
- **MMO Game Options Graphics, Audio & Gameplay Expansion (`GameOptionsMenu.tsx`)**: Replaced placeholder panels with interactive settings for Master/SFX/Music volume sliders, Mute toggle, Graphics Quality presets, Framerate targeting, Damage numbers, and Multiplayer shard player visibility settings.

## [2.1.202] - 2026-08-14
### Added
- **MMO Peer Presence Targeting & Quick Action Bar (`PeerPresenceHud.tsx`, `target-frame.tsx`)**: Made peer presence hud tamer name tags interactive to rapidly target nearby players, integrated ping latency metrics, and equipped `TargetFrame` with one-click party invite and whisper triggers when targeting players.

## [2.1.201] - 2026-08-14
### Added
- **MMO Game Chat Slash Commands & Teleportation (`GameChat.tsx`)**: Expanded game chat command processing to include `/invite [player]`, `/p invite`, `/help`, `/commands`, and `/tp [player]` moderator navigation directly within the chat console.

## [2.1.200] - 2026-08-14
### Added
- **MMO Staff Floating Menu Multiplayer Teleportation (`StaffFloatingMenu.tsx`)**: Added `tpToPlayer` capability and navigation icons allowing staff/moderators/developers to instantly teleport directly to visible tamers across active map instances.

## [2.1.199] - 2026-08-14
### Added
- **MMO Target Frame Classification & Party Co-Op Enhancements (`target-frame.tsx`, `party-overlay.tsx`)**: Added entity classification badges (`PLAYER`, `WILD`, `NPC`) and target dismiss button to `TargetFrame`. Enhanced `PartyOverlay` with live backend socket invitation dispatch (`party_invite_send`), quick nearby peer invite chips, and clean party leave workflows.

## [2.1.198] - 2026-08-14
### Added
- **Studio Entity & NPC Mutex Dirty State Sync (`EntityEditorPanel.tsx`)**: Synchronized `markMapDirty()` across NPC updates, level placements, and deletions, guaranteeing consistent state tracking between the UI dock and persistent world documents.

## [2.1.197] - 2026-08-14
### Added
- **Studio World Atlas Dirty State Sync (`WorldAtlasPanel.tsx`)**: Integrated `markMapDirty()` and `clearMapDirty()` across macro grid placement, spawn hub assignment, node deletion, and atlas save workflows.

## [2.1.196] - 2026-08-14
### Added
- **Studio Tile Layer Addition Dirty State Sync (`WorldBuilderPanel.tsx`)**: Wired `markMapDirty()` to `handleAddLayer`, ensuring that adding a new visual/logic tile layer marks the workspace dirty and lights up the save indicators.

## [2.1.195] - 2026-08-14
### Added
- **MMO Grand Trade Center (GTC) Reliability & Empty State Validation (`gtc-overlay.tsx`)**: Added manual market listing refresh polling via `RefreshCw`, reactive inventory item auto-selection for trade listings, empty backpack validation notices, and informative confirmation toasts on trade post.

## [2.1.194] - 2026-08-14
### Added
- **MMO Quest Journal & Objectives Presentation (`quest-log-overlay.tsx`)**: Upgraded Quest Log Overlay to support custom campaign tasks and dynamic Studio quests without omission, rendering granular objective checkpoints with target counters and flexible rewards calculation.

## [2.1.193] - 2026-08-14
### Added
- **Studio Map Diagnostics & Spawner Validator (`StudioProblemsPanel.tsx`)**: Extended map problem scanning to include encounter & monster spawner collision checks (flagging solid tile overlap and out-of-bounds placements), styled `SPAWN` badge category tags, and introduced a manual "Scan Map" button with animation state.

## [2.1.192] - 2026-08-14
### Added
- **Studio Monster Spawner Dirty State Sync (`MonsterSpawnerPanel.tsx`)**: Integrated mapDirty synchronization on spawner placement, mutation, and deletion, ensuring the editor workspace and global level persistence pipeline reflect pending encounter changes.

## [2.1.191] - 2026-08-14
### Added
- **MMO Hotbar Consumable & Potion Action Pipeline (`hotbar.tsx`)**: Wired slot action handling for item slots (slot 5), automatically scanning player inventory for usable potions/consumables, applying health modifications, consuming inventory units, and initiating item cooldowns.

## [2.1.190] - 2026-08-14
### Fixed
- **MMO Skills Overlay Tooltip Clipping (`skills-overlay.tsx`)**: Removed parent overflow clipping and attached `pointer-events-none` on hover tooltips, allowing skill XP breakdown cards to cleanly display level curves without border clipping.

## [2.1.189] - 2026-08-14
### Fixed
- **MMO Inventory Equip/Unequip Toggle Reliability (`inventory-overlay.tsx`)**: Fixed equipment action handling so inspecting an already equipped item correctly issues slot unequip rather than redundant re-equips.

## [2.1.188] - 2026-08-14
### Added
- **Studio Quick Dock Panel Complete Matrix (`StudioEditorShell.tsx`)**: Added dedicated `spawner` (Monster Spawner) and `problems` (Map Diagnostics) dock buttons to the bottom Studio launch strip, with intelligent left/right dock column target routing.

## [2.1.187] - 2026-08-14
### Added
- **Studio Status Bar Save Dispatch (`StudioStatusBar.tsx`)**: Bound the bottom status bar Save action directly to `STUDIO_TRIGGER_SAVE_MAP_EVENT`, enabling one-click map saves and Go MMO live reloading from the status bar.

## [2.1.186] - 2026-08-14
### Added
- **Dynamic Touch/Mobile Viewport Lifecycle (`MobileControls.tsx`)**: Added window resize listeners to `isTouchDevice` detection, ensuring mobile controls and floating joystick overlays reactively mount/unmount across viewport transitions without page reload.

## [2.1.185] - 2026-08-14
### Added
- **Studio Drag-and-Drop Palette Tile Painting (`TilesetPicker.tsx`, `GameCanvasBabylon.tsx`)**: Made tileset picker sheets draggable with `STUDIO_TILE_DROP` payloads, allowing creators to drag specific tiles from the palette directly onto 2.5D map coordinates to paint terrain seamlessly.

## [2.1.184] - 2026-08-14
### Added
- **Studio Drag-and-Drop Viewport Sprite Placement (`SpriteBrowser.tsx`, `GameCanvasBabylon.tsx`, `BabylonEngine.ts`)**: Made sprite browser thumbnails draggable with structured metadata payloads, projection coordinates via `pickTileAtScreenCoord`, and canvas drop listeners targeting live map coordinates.

## [2.1.183] - 2026-08-14
### Added
- **NPC Dialogue Portrait Visualizer (`dialog-overlay.tsx`)**: Replaced generic placeholder icons with dynamically resolved NPC pixelated sprite portraits extracted from active dialog metadata and live map entities.

## [2.1.182] - 2026-08-14
### Added
- **Resilient Map Diagnostics & Ground Zero Detection (`StudioProblemsPanel.tsx`)**: Replaced raw gates array assumption with `normalizeGatesToArray` for robust array/record payload validation. Added automated warnings for uninitialized Ground tile layers filled with all zero tiles.

## [2.1.181] - 2026-08-14
### Added
- **Starter Hero Configured Starting Inventory Integration (`character-creator.tsx`)**: The character creation pipeline now merges custom starting inventory payloads defined on Starter Hero records into new MMO player state profiles upon creation.

## [2.1.180] - 2026-08-14
### Added
- **Global Map Save Event Dispatch (`studioEvents.ts`, `StudioEditorShell.tsx`, `WorldBuilderPanel.tsx`, `StudioMenuBar.tsx`)**: Wired `STUDIO_TRIGGER_SAVE_MAP_EVENT` globally to `Ctrl+S` shortcuts and top menu actions, ensuring level edits are persistently synced to the Go MMO backend from any active Studio dock.

## [2.1.179] - 2026-08-14
### Added
- **Real-Time Tileset Sheet Hover Previews (`TilesetPicker.tsx`)**: Hovering tiles across the tileset palette now draws a live highlight rectangle and displays the computed tile GID before clicking, providing precise visual feedback during level design.

## [2.1.178] - 2026-08-14
### Added
- **Global Studio Sprite Picker Dispatch (`EntityEditorPanel.tsx`, `StarterHeroEditorPanel.tsx`)**: Wired `studio_sprite_picked` event listeners to Entity Editor and Starter Hero Editor panels, enabling one-click sprite assignment directly from Sprite Browser into active entity or hero forms.

## [2.1.177] - 2026-08-14
### Added
- **Macro Atlas Interactive Context Toolbar (`WorldAtlasPanel.tsx`)**: Selected atlas nodes now present an in-place action bar with `Open in Viewport`, `Set as Spawn Hub`, and safe node deletion. Added double-click to immediately warp to any placed map.

## [2.1.176] - 2026-08-14
### Fixed
- **Full-Screen Viewport Edge-to-Edge (`app/(main)/lobby/page.tsx`, `app/(main)/studio/page.tsx`)**: Upgraded Lobby and Studio viewport containers to `fixed inset-0 w-screen h-screen z-50`, eliminating empty bottom space, navbar padding offsets, and parent layout constraints for an immersive desktop MMO presentation.
- **World Atlas Bi-Directional Synchronization (`app/api/world/atlas/route.ts`)**: Enhanced World Atlas GET/POST handlers to prioritize newest saved layouts across `WorldAtlas` table and `SiteSetting` storage with dev-mode creator persistence.

## [2.1.175] - 2026-08-14
### Changed
- **WebGL Chunk Mesh Initialization (`BabylonEngine.ts`)**: Cleaned up empty array vertex buffer initialization on chunk mesh creation to eliminate Babylon.js 9+ console vertex warnings.

## [2.1.174] - 2026-08-13
### Fixed
- **World Atlas Persistence Fallback (`app/api/world/atlas/route.ts`, `WorldAtlasPanel.tsx`)**: Hardened World Atlas endpoints against un-migrated tables with automatic `SiteSetting` key-value mirror fallback, preventing 500 errors on remote production hosts.

## [2.1.173] - 2026-08-13
### Added
- **Diagnostic Navigation Jump (`GameCanvasBabylon.tsx`, `StudioProblemsPanel.tsx`)**: Wired `studio_center_camera` event handling to `panEditorCameraToTile`, allowing one-click spatial teleportation to problem coordinates directly from the Diagnostics & Problems panel.

## [2.1.172] - 2026-08-13
### Added
- **NPC & Entity Inspection in Inspector (`PropertiesPanel.tsx`)**: Clicking any tile in Studio Viewport now displays comprehensive metadata for all entities located at that coordinate, including NPC name, sprite, dialog binding, logic triggers, and warp gates.

## [2.1.171] - 2026-08-13
### Changed
- **Studio Command Center Header (`StudioMenuBar.tsx`)**: Transformed Studio top bar into a 3-zone command center with active map indicator, unsaved dirty state, prominent Mode Transition Switcher (`[ ✏️ EDIT ]` ⇄ `[ ▶ PLAY TEST ]`), and quick global actions.
- **Dock & Window Manager Resiliency (`StudioEditorShell.tsx`, `editor-store.ts`)**: Fixed closed window reopen bug by wiring dynamic `studio_open_dock` event dispatching and FlexLayout tab node selection.
- **World Atlas Flexbox Layout (`WorldAtlasPanel.tsx`)**: Expanded World Atlas panel into a full-height, responsive dock layout with zero dead space and responsive map palette.
- **Deterministic Studio Test Character (`index.tsx`)**: Hydrates a dedicated `Dev Explorer` test character (Lv 50, full stats) upon entering Playtest mode without requiring character selection.

## [2.1.170] - 2026-08-13
### Added
- **Skills Overlay Polish & Progress Bars (`skills-overlay.tsx`)**: Added Total Level and Total XP summary strip at the top of the skills panel, along with gold progress bars indicating percentage to next level under each skill tile.

## [2.1.169] - 2026-08-13
### Added
- **NPC Dialogue Full Keyboard Integration (`dialog-overlay.tsx`)**: Added keyboard controls to dialogue interaction (`Space`, `Enter`, `E` to skip typewriter or advance, `Escape` to close, and numeric keys `1-9` with visual `[N]` badges to select branch options).

## [2.1.168] - 2026-08-13
### Fixed
- **Multiplayer Socket Automatic Fallback (`index.tsx`)**: Added intelligent connection fallback when the remote Go MMO backend encounters CORS errors or 502 Bad Gateway responses, automatically connecting directly to the same-origin Next.js / Socket.io server without client freeze.
- **Studio Asset Omnisearch (`StudioOmnisearch.tsx`)**: Fixed Studio search opening website forum threads by migrating the search engine to index game maps, items, creatures, quests, logic tags, and editor actions.
- **World Atlas Persistence API (`app/api/world/atlas/route.ts`)**: Implemented the missing `/api/world/atlas` GET & POST endpoints to load and save macro connected map layouts to Prisma `WorldAtlas`.

## [2.1.167] - 2026-08-13
### Added
- **Turn-Based Battle Keyboard Controls (`TurnBattleOverlay.tsx`)**: Added keyboard shortcuts for creature battle actions (`1` for Fight / Ability 1, `2` for Expose Film / Item, `3` for Switch Creatures, `4` for Run / Flee, and `Escape` for Back).

## [2.1.166] - 2026-08-13
### Added
- **Studio Pro Hotkeys & Quick Docks (`StudioEditorShell.tsx`)**: Wired `Ctrl+Shift+P` for World Atlas, `Ctrl+Shift+O` for Map Diagnostics & Problems, and `Ctrl+Shift+D` for Dev Tools directly into the key event dispatcher.

## [2.1.165] - 2026-08-13
### Added
- **Modal Key Toggling & Escape Target Deselection (`index.tsx`)**: Upgraded global keyboard shortcuts so Inventory (`I`), Skills (`K`), Party (`P`), Dex (`X`), and Achievements (`B`) can be toggled on/off with the same key, and pressing `Escape` intuitively deselects active combat targets before opening the options menu.

## [2.1.164] - 2026-08-13
### Added
- **Studio Quick Map Switcher in Omnisearch (`StudioOmnisearch.tsx`)**: Integrated all registered world maps directly into the Ctrl+K search index with real-time tileset hydration and instant zero-reload map warping.
- **Wired Studio Top Menu Actions (`StudioMenuBar.tsx`)**: Enabled File -> New Map, Open Map / Quick Search (Ctrl+K), and Map Diagnostics & Problems actions.
- **Combat Hotbar Cooldown Countdown & Individual Timers (`Hotbar.tsx`)**: Added independent ability cooldown timers from `cooldowns` store with numeric second countdown displays and dark vertical sweep animations.

## [2.1.163] - 2026-08-13
### Added
- **Studio Problems & Validation Panel (`StudioProblemsPanel.tsx`)**: Created live map diagnostics dock (Bible 30 §8) checking gate target destinations, entity-solid tile collision intersections, map dimension bounds, and layer health, complete with 1-click camera coordinate navigation (`[Y, X]`).
- **28-Slot RuneScape-Style Inventory (`inventory-overlay.tsx`)**: Redesigned player inventory into a standard 4x7 grid with recessed empty slots, item rarity border glows (Common, Uncommon, Rare, Epic, Legendary), item abbreviations (`10k`, `1M`), and full action toolbars (Equip, Use, Drop).
- **Live Minimap Radar Active Map Fallback (`MiniMapRadar.tsx`)**: Wired `activeMapData` store fallback into the radar drawing loop so dynamically created or edited Studio maps render real-time geometry accurately.

## [2.1.162] - 2026-08-13
### Added
- **Centralized Realtime Protocol Specification (`src/shared/net/protocol.ts`)**: Established single source of truth for protocol versioning (`2.1.0`), typed command/event contracts, reliability tiers (`CRITICAL`, `STATE`, `TRANSIENT`, `CHAT`, `PRESENCE`), and payload interfaces for lobby multiplayer and Studio collaboration.
- **Modular Realtime Server Services**: Extracted business logic from network transport into dedicated services (`SessionManager.ts`, `ShardManager.ts`, `StudioCollaborationService.ts`, `ChatService.ts`) with `LobbySocketHandler.ts` acting as the authoritative dispatcher.
- **Automated Vitest Realtime Regression Suite (`src/server/net/LobbySocketHandler.test.ts`)**: Added 9 comprehensive integration and unit tests covering 1-account-1-seat eviction, dynamic shard instance routing, peer replication, position syncing, chat rate limits, Studio soft locks, revision increments, and disconnect lifecycle.
- **Realtime Connection Health & Diagnostics**: Integrated live realtime connection badges (`Online`, `Connecting`, `Reconnecting`, `Offline`), RTT latency measurement via ping/pong, active shard readouts, and connected peer counts into `StudioStatusBar.tsx` and `PeerPresenceHud.tsx`.
- **Direct Whisper & Social Chat Improvements**: Added `/w [player]` and `/whisper [player]` commands, clickable player names in chat to auto-target whispers, and distinct magenta formatting for private transmissions.

## [2.1.161] - 2026-08-13
### Fixed
- **Multiplayer Shard & Player Replication Restore**: Restored authoritative Socket.IO lobby and Studio handler (`LobbySocketHandler.ts`) in `server.ts` to manage shard assignments (`join_map`), player visibility (`map_players`, `player_joined`, `player_left`), movement synchronization (`move`, `player_moved`, `move_ack`), and Studio collaboration soft locks.
- **In-Game Chat Box & Transmission Sync**: Resolved in-game chat broadcasts for Local (`player_chat`), Global (`global_chat_msg`), Party (`party_chat_msg`), and Staff Announcements (`staff_announce`).
- **Global Enter Key Chat Focus & Escape Handling**: Added global keyboard event listening in `GameChat.tsx` so pressing `Enter` during exploration automatically expands the comms link and focuses the transmission input for instant typing, and `Escape` blurs and collapses it.

## [2.1.160] - 2026-08-13
### Added
- **Interactive Tool Modes in Studio Paint HUD**: Added quick-switch buttons for Paint (`Brush`), Erase (`Eraser`), Eyedropper / Sample (`Pipette`), Pan (`Hand`), Box Select (`SquareDashed`), and Prefab Stamp (`Box`).
- **Undo / Redo Quick Triggers & Menu Integration**: Integrated undo/redo buttons in `StudioPaintHud`, fully wired `Edit -> Undo` and `Edit -> Redo` in `StudioMenuBar`, and unified keyboard shortcuts with automatic remesh event dispatching.
- **Enhanced Camera View Controls**: Added Zoom In / Out / Fit Map (`Home`) controls in `StudioPaintHud`, `StudioMenuBar`, and mouse wheel / drag zooming.
- **3D In-World Hover Reticle**: Babylon engine now renders crisp 3D tile reticle indicators on hover for 1x1 brushes as well as multi-cell radius previews with proper height offsetting to eliminate Z-fighting.
- **Dynamic Cursor & Mouse Pan Navigation**: Added smooth MMB (middle mouse button), RMB (right mouse button), Spacebar+drag, and Pan tool dragging with dynamic cursor states (`cursor-grab`, `cursor-grabbing`, `cursor-crosshair`).
- **Tile Deduplication in Paint Strokes**: Added `deduplicatePaintedCells` to merge redundant writes during drag painting so single-click and drag undo operations cleanly restore historical state without data corruption.

## [2.1.159] - 2026-08-13
### Removed
- **TS GameEngine fully removed** — deleted `GameEngine.ts`, `SocketHandler.ts`, `PlayerManager.ts`, `WorldManager.ts`, `InventoryManager.ts`, `CombatManager.ts`, `EncounterManager.ts`, `DialogueManager.ts`, `CraftingManager.ts`, `CreatureManager.ts`, `QuestManager.ts`, `PartyManager.ts`, `GuildManager.ts`, `ShopManager.ts`, `SkillManager.ts`, `EconomyManager.ts`, `PersistenceManager.ts`, `BaseManager.ts`, `AchievementListener.ts`, `StatsListener.ts`, and associated tests. Go MMO is now the sole real-time game backend.
- Removed `SaintsHudOrbs.tsx` (replaced by `PlayerVitalsHud.tsx`).
- Removed `NpcEditorPanel.tsx` (replaced by `EntityEditorPanel.tsx`).

### Added
- **Studio Editor expansion**: `EntityEditorPanel`, `WorldAtlasPanel`, `CatalogEditorShell`, `StudioMenuBar`, `StudioStatusBar`, `StudioFavoritesStrip`, `StudioOmnisearch`, `useStudioBookmarks` hook.
- **World Atlas API** (`app/api/world/atlas/`) for world map data.
- **PlayerVitalsHud** — new split HP/MP/XP vitals display replacing the monolithic `SaintsHudOrbs`.
- **GamePanelShell** (hud variant) — shared dark-glass panel wrapper for lobby HUD elements.
- New `MapPrefab` support in `app/actions/prefabs.ts` and Prisma schema additions.
- Expanded `demoMapSeed.ts` and `DemoBootstrap.ts` for richer demo content.
- Logic tag additions in `LogicTagPalette.tsx`.

### Changed
- `server.ts` slimmed to Go-only path — Socket.io kept for forum `RealtimeProvider` only.
- `WorldBuilderPanel` significantly expanded (+237 lines) with atlas and prefab workflows.
- `ItemEditorPanel` and `LootManagerPanel` fully restyled with dark-glass/neon aesthetics.
- `DialogueEditorPanel`, `MonsterSpawnerPanel`, `PropertiesPanel`, `QuestEditorPanel`, `PrefabBuilderPanel` updated for new editor store shape.
- `StudioEditorShell` refactored for new menu bar / status bar / omnisearch architecture.
- `editor-store.ts` expanded with new Studio modes, bookmarks, and catalog state.
- `studioModes.ts`, `studioPermissions.ts`, `studioMapCreate.ts` updated for new Studio capabilities.
- Lobby HUD restyled: `Hotbar`, `ClassicPanel`, `DraggablePanel`, `PeerPresenceHud`, `FloatingHealthBar`, `GameChat`, `TurnBattleOverlay`, `GameOptionsMenu`, `inventory-overlay`, `party-overlay`, `quest-tracker-overlay`, `target-frame`, `GamePanelShell`.
- Go MMO protocol and gameplay handler updates for map sync.
- `goMmoSocket.ts` updated for new protocol shape.
- `BabylonEngine.ts` and `WorldSimulation.ts` refined rendering and simulation logic.

### Fixed
- `starter-heroes.ts` data corrections.
- Map slug route handling improvements.

## [2.1.158-5] - 2026-08-12
### Added
- Toast Queue Stack (`GameToastStack.tsx`) for queuing UI notifications instead of immediately overwriting.
- Slim Game Chat mode with translucent mask and expand/collapse logic for the primary chat interface.

### Changed
- Updated `MiniMapRadar.tsx` sizing and applied neon borders to fit the cyber/Miami aesthetic.
- Restyled `crafting-overlay`, `equipment-overlay`, `quest-tracker-overlay`, and `PeerPresenceHud` using `GamePanelShell` and dark-glass/neon aesthetics.

### Fixed
- Fixed trailing TS syntax errors in `GameChat.tsx` and `SaintsHudOrbs.tsx`.

## [2.1.158-4] - 2026-08-09
### Fixed
- Fixed Studio Viewport occlusion where the FlexLayout DOM container rendered a solid background and intercepted pointer events over the underlying WebGL canvas.

### Changed
- Development knowledge base (`info/`, developer `docs/`, agent `logs/*.md`) moved to local-only `.docs/` (gitignored). Public repo keeps README, CHANGELOG, and `docs/TUXEMON_ATTRIBUTION.md`.

## [2.1.158-3] - 2026-08-09
### Fixed
- Fixed unlit sprites and tiles rendering pitch black by explicitly setting their `emissiveColor` to white when `disableLighting` is true.
- Fixed Studio view failing to render entirely by resolving a React `ReferenceError` during hydration and ensuring empty map shells correctly accept the fetched DB document.

## [2.1.158-2] - 2026-08-09
### Fixed
- Fixed Studio hydration regression where the map document would fail to render after fetching because the engine effect did not watch the `mapData` object correctly.
- Re-established pixel-art 'Unlit' material consistency across all terrain, players, NPCs, projectiles, and damage texts to fix shading imbalances.

## [2.1.158-1] - 2026-08-09
### Fixed
- Fixed pitch black Studio viewport map tiles by changing tileset triangle index winding order to clockwise so normals correctly point upwards and receive scene lighting.
- Removed conflicting disableLighting and receiveShadows flags that caused silent shader compilation failures on WebGL2 tileset materials.

## [2.1.144] - 2026-08-08
- `.docs/` added to `.gitignore`.
- Studio Upgrades: Advanced logic painting undo batching.
- Studio Upgrades: Monster Spawner UI enhancements and visual overlays.
- Performance: Large Map mesh chunking (32x32 tiles) implemented for buttery smooth rendering and editing.

## [2.1.143] - 2026-08-08
### Fixed
- Fixed `/api/admin/system/update` endpoint to look for update scripts inside the `scripts/` directory.
- Created `scripts/update.bat` to support automated Git pulling and updating on Windows environments.

## [2.1.142] - 2026-08-08
### Fixed
- Fixed Studio tile picking precision by bypassing batched visual tile meshes and raycasting directly against a mathematical `Z=0.001` ground plane.
- Fixed inability to navigate large maps in Studio mode by properly mounting and unmounting the WASD/Arrow key `startEditorKeyboardPan` loop.

## [2.1.141] - 2026-08-08
### Added
- Added Database Setup for `MapPrefab` in `schema.prisma`.
- Created `PrefabBuilderPanel` for the Studio to manage map prefabs.
- Added `setSelectionPreview` in `BabylonEngine` to render multi-tile bounding boxes on the map.
- Implemented Prefab ghosting and preview overlay rendering based on bounding size.
- Implemented `pastePrefab` stamping algorithm to inject multi-tile visual data and logic tags seamlessly onto the map grid.
- Implemented `brushMode` system ('paint', 'select', 'prefab') to `editor-store.ts`.

## [2.1.140] - 2026-08-08
### Added
- Added `monster_spawner` to `LogicComponentKind` to support placing spawners via Studio mode.
- Created `MonsterSpawnerPanel` for managing wild spawners, wander radius, population density, and level in Real World maps.
- Implemented adjustable logic paint brush radius via the new size stepper in `StudioPaintHud`.
- Added support for enum fields in `PropertiesPanel` to configure new spawner types and attributes.
- Wired spawner extraction directly into `WorldManager.ts`, placing dynamic monsters onto the grid upon map initialization.
- Refactored `GameCanvasBabylon.ts` tile picking raycasts to paint across the entire brush radius.
- Standardized game terminology in AGENTS.md (Saints Buddy Battles, Hero Battles, Player Battles).

## [2.1.139] - 2026-08-08
### Added
- Expanded `WorldMap` model in `schema.prisma` with rich metadata fields (`musicTrack`, `weatherType`, `recommendedLevel`, `lightingPreset`, `biome`, `description`, `entryRequirements`).
- Added map grid builders for `TRAINING_GROUNDS` and `CRYSTAL_CAVERNS` in `demoMapSeed.ts` and automated DB seeding in `DemoBootstrap.ts`.

## [2.1.136] - 2026-08-07
### Added
- Created data-driven expansion quest definitions (`src/server/expansionQuests.ts`) including Q005 ("Soul Binding") and Q006 ("Market Forces").
- Registered expansion quest seeding in `DemoBootstrap.ts`.

## [2.1.135] - 2026-08-07
### Added
- Added `PlayerStats` aggregate model to `schema.prisma` with indexed O(1) leaderboard columns.
- Created `StatsListener` (`src/server/StatsListener.ts`) updating `PlayerStats` via `GameEventBus` triggers.
- Created `GET /api/leaderboards/game` endpoint supporting creatures, quests, crafts, combat, and wealth boards.

## [2.1.134] - 2026-08-07
### Added
- Added `AchievementListener` (`src/server/AchievementListener.ts`) subscribing to `GameEventBus` topics for decoupled achievement awards.
- Added 7 new game achievement definitions to `achievements-catalog.ts` and automated evaluation in `achievements.ts`.

## [2.1.133] - 2026-08-07
### Removed
- Safely deleted 5 verified orphan files: `WorldMapNavigator.tsx`, `rpg-stats-overlay.tsx`, `generated-assets.ts`, `dpad.tsx`, and `demoQuests.ts`.

## [2.1.132] - 2026-08-07
### Changed
- Replaced legacy `src/engine/map-loader.js` with modular TS map architecture: `src/shared/game/types/map.ts` (DTOs), `mapLoader.ts` (persistence), `mapCache.ts` (cache & invalidation), and `mapQueries.ts` (isWalkable & tile queries).
- Updated `WorldManager`, `InventoryManager`, and `DemoBootstrap` to consume the unified map system.

## [2.1.131] - 2026-08-07
### Added
- Created isomorphic `GameEventBus` (`src/shared/events/gameEventBus.ts`) with typed event bus schemas and unit tests.
- Wired event emitters across `EncounterManager`, `CraftingManager`, `InventoryManager`, `QuestManager`, `EconomyManager`, `PartyManager`, and `DialogueManager`.

## [2.1.130] - 2026-08-07
### Added
- Added `InventoryTransaction`, `InventoryReason`, `executeTransaction()`, `repairItemDurability()`, and `InventoryLog` model to `inventoryService.ts` and `schema.prisma`.
### Fixed
- Replaced raw `playerInventoryItem.update()` in `InventoryManager.ts` with `repairItemDurability()`.
- Removed dead `addCredits` / `removeCredits` stubs from `PlayerManager.ts`.

## [2.1.129] - 2026-08-07
### Fixed
- Updated `app/api/game/server-status/route.ts` probes to respect `GO_MMO_INTERNAL_URL` / `NEXT_PUBLIC_GO_MMO_URL` when present instead of querying legacy hardcoded 3001 ports.
- Removed unused `renderHealthBar` canvas method in `BabylonEngine.ts`.

## [2.1.128] - 2026-08-07
### Added
- Created `info/game/SUBSYSTEM_OWNERSHIP.md` establishing Phase 0 subsystem boundaries and architectural isolation rules.

## [2.1.127] - 2026-08-06
### Fixed
- Fixed Socket.io CORS origin handling (Access-Control-Allow-Origin) when withCredentials is enabled, resolving socket connection blocks when requests cross domains/subdomains (e.g. saintsgaming.net -> online.saintsgaming.net).
- Fixed /api/maps/DEMO_SANDBOX 404 error when DB foundation seed is unpopulated; ensured seedDemoMap is always executed in ensureStudioMapFoundation even if logic tile seed is skipped.

## [2.1.126] - 2026-08-06
### Fixed
- Fixed Next.js App Router aggressively caching API responses for /api/maps and /api/maps/[slug], which caused stale map data (with empty NPCs arrays) to be served to the client and broke entity rendering.

## [2.1.125] - 2026-08-06
### Fixed
- Fixed Socket.io authentication fallback to support NextAuth secure cookies in local development environments with HTTPS (NEXT_PUBLIC_SITE_URL=https://localhost). This resolves the issue where players and entities failed to load due to a rejected socket connection.
- Updated update.sh to extract the MARIADB_ROOT_PASSWORD from the Docker container environment when auto-fixing credentials, preventing setup failures when the root password differs from the database user password.

## [2.1.122] - 2026-08-06
- Implemented Phase 4 Turn-Based Engine Math (ARPG formulas, STAB, Element matches)
- Updated TurnBattleOverlay to render a 2x2 grid of creature abilities

## [2.1.121] - 2026-08-06

### Added
- **Phase 3 Item Creator Dock**: Implemented the UI and backend logic for the Item Creator panel in the Studio.
  - Features a searchable sidebar and dynamic form to edit item properties (`ItemTemplate`).
  - Added a read-only Dependency Viewer that scans `LootTable` and `CraftingRecipe` entries to show where items are used.
  - Successfully integrated the dock into the `StudioEditorShell` under "Catalog Mode".

## [2.1.120] - 2026-08-06

### Added
- **Hybrid Go MMO**: Fully wired Go MMO backend for real-time game simulation.
- **Persistence**: Player position, inventory, quests, and skill XP are now natively persisted in the SQLite DB via Go MMO.
- **Map Synchronization**: Next.js automatically notifies Go MMO (`notifyGoMapSynced`) whenever a map is saved in Studio.
- **Incremental Rendering**: Babylon game client now processes `map_reloaded` events incrementally to avoid wiping player peers and meshes on map updates.
- **Combat Formulas**: Brought turn-based combat and skill grants into alignment with the gameplay bible on the Go MMO side.

## [2.1.119] - 2026-08-02

### Fixed
- **tile_changed** updates map cache, canvas grid, and Babylon props (Q4 bramble clear walks/looks clear).
- **creature_moved** client listener so Rockitten RT positions stay in sync.
- Lobby character load forces **DEMO_SANDBOX** when saved map is not playable; awaits `loadMap` before join.
- Duplicate Professor Lab overlay removed; claim hydrates `creatureParty` and waits for `starter_claimed`.
- Vance **Report progress** is state-aware; Q1 gather order hints when mining before wood.

### Added
- Visible shop stall + bramble thicket meshes; logic-tile ground color for tile 11.

## [2.1.118] - 2026-08-02

### Added
- **DEMO_SANDBOX canonical seed** on boot (`demoMapSeed`): walkable plaza, tall grass (2), trees/ore (5/6), shop (7), craft (9), bramble (11).
- Formal **Q1–Q4** QuestTemplates (`demoQuests`) with event hooks: GATHER / CRAFT / CLAIM / CLEAR / TALK.
- **CLEAR_BRAMBLE** interact (axe + party companion); live tile clear + `tile_changed`.
- Quest tracker empty-state guide (“Talk to Warden Vance”); creature snapshot on `map_joined`.

### Fixed
- Logic-tile API/store contract (keyed `data`); map-loader DEMO fallback no longer paints solid walls as ground.
- Gather: `RESOURCE_NODE_MAP` 5/6, `getMapDataSync`, instance resolve via player shard / base mapId.
- QuestManager User.id resolution; E-key NPC → `npc_interact`; Vance/entity `mapId` base-map match.
- Bootstrap runs before map-loader init so seeded tiles/maps are cached correctly.

## [2.1.117] - 2026-08-02

### Added
- **Demo bootstrap** on server start: CreatureDefs, Warden Vance dialogue, film craft recipes.
- **Warden Vance** spawn + dialogue grants (tools, film pack, open Lab).
- **Soul Film** capture path (`film_standard` / fine / soul); TB button **EXPOSE FILM**; shop sells/crafts film.
- Demo smoke checklist: `info/game/DEMO_SMOKE.md`.

### Fixed
- Clicking NPCs starts dialogue (`npc_interact`); wild creatures targetable for RT combat.
- Gather syncs inventory + emits `itemGathered` for quest hooks.

## [2.1.116] - 2026-08-02

### Added
- **Creature Catalog** (`CreatureDef`) — Studio-editable like Starter Heroes: asset picker, type combo, full stats, default + potential passives, world skills.
- Shared seed `FALLBACK_CREATURE_DEFS` (Agnite / Budaye / Dollfin starters + Rockitten wild).
- Studio dock **Creatures** panel; Professor Lab loads catalog starters; claim/encounters resolve via catalog.

## [2.1.115] - 2026-08-02

### Added
- **NPC shop** server authority (`ShopManager`): buy/sell Binding Crystal materials; **CRAFT** tab for Binding Crystals.
- Shared shop catalog + `craft_binding_crystal` recipe (`shopCatalog.ts`); seed script updated.
- **Rockitten** as the single MPV test creature for TB encounters + RT overworld spawns (`testCreature.ts`).
- `claim_starter` → real `PlayerCreature` (Rockitten); Party/Lab UI to claim.
- Client sync for `sync_credits`, `inventory_sync`, `creature_spawned` / despawn / HP.

### Fixed
- Gathering no longer demo-grants tools — require real inventory (quest/shop/craft later).
- Encounters require a real party creature (no fake Starter).
- Crafting resolves player by accountId; Binding Crystal craft works with in-code recipe fallback.

## [2.1.114] - 2026-08-02

### Added
- Shared RT ability catalog + capture math helpers (`src/shared/game/combatAbilities.ts`) with tests.
- Server-authoritative RT combat: ability catalog, capture rejection, cooldowns, range, LoS, miss/crit (`CombatManager`).
- Loot bag auto-despawn after 60s.

### Fixed
- Binding Crystal capture requires a **real inventory stack** (no demo grant); missing item keeps the turn open.
- Hotbar is **EXPLORING-only** (hidden in turn-based battles); capture abilities forbidden on RT path.
- Encounter battles use **directMessage** (no longer force every player on the shard into BATTLE).
- Capture uses bible 11 math; persists `PlayerCreature` with resolved `userId`; consumes Binding Crystal.
- `battle_ended` client handles CAPTURE / WIN / LOSE / FLEE (not only PvP winner socket id).
- Turn-battle sprites load from `/game-assets/` (legacy `/assets/sprites/` paths removed).
- `combat_cast` / `combat_action` pass `abilityId` correctly to the combat manager.

### Changed
- ALIGNMENT slices A→B→C marked implemented for combat/capture constitution path.

## [2.1.113] - 2026-08-02

### Added
- **Ecosystem vision** doc: `info/vision/ECOSYSTEM.md` (unified website + MMO + Studio north star).
- Shared `toBaseMapId` / `isSameBaseMap` (`src/shared/net/mapIds.ts`) + tests.
- Lobby manual verify checklist: `info/game/LOBBY_VERIFY.md`.

### Fixed
- Persist **base map** ids (strip `_chN` shards) so reloads don’t reintroduce multiplayer room splits.
- Mobile enter launcher restyled to Saints gold atmosphere (single fullscreen CTA).

### Changed
- Staff/system chat lines styled distinctly in GameChat.

## [2.1.112] - 2026-08-02

### Added
- **`/studio`**: Developer-only Studio client (server-gated); `/lobby` is the player client.
- **Staff floating menu** on lobby for Moderator+ (map announce, nearby players, admin link; Admin+ map kick; Dev open Studio).
- **Mobile controls**: single surface with floating joystick (default) or static D-Pad via Options → Controls.
- Socket events `staff_announce` / `staff_kick`; chat `/announce` for staff.

### Fixed
- Multiplayer room desync: join no longer overwrites live instance id with a stale saved base map id.
- Map warps re-emit `join_map` so peers/chat stay on the same shard.
- Duplicate touch pads removed; left pad path-queue was never drained — movement now uses the canvas input pipeline.
- NPC sprite path `/assets/sprites/` → `/game-assets/npc/`.

## [2.1.111] - 2026-08-02

### Fixed
- **Social actions barrel**: removed file-level `"use server"` so Next.js accepts re-exports (domain modules remain `"use server"`).
- **Client/server split for achievements**: catalog lives in `achievements-catalog.ts`; award + realtime emit stay server-only (`server-only` + `serverExternalPackages` for redis/socket.io).

### Added
- **Staging smoke**: `scripts/smoke-staging.sh` (`npm run smoke`) + `info/ops/STAGING_SMOKE.md` for forum/lobby/realtime readiness.

## [2.1.110] - 2026-08-02

### Added
- **Vitest coverage** for permissions matrix, forum restricted-board access, shared slug helper, forum Zod validators / hashtags / mentions, and messenger E2EE crypto round-trip.
- Shared helpers: `src/web/lib/forum-access.ts`, `src/web/lib/slug.ts` (wired into forum/news/modpack create paths).

### Fixed
- Lobby store unit test now expects default `TITLE_SCREEN` game mode.

## [2.1.109] - 2026-08-01

### Changed
- **Social server actions split**: `app/actions/social.ts` is now a barrel; implementations live in `app/actions/social/{posts,feed,engagement,history,moderation,analytics}.ts`. Export names and `@/app/actions/social` import path unchanged.

## [2.1.108] - 2026-08-01

### Added
- **`info/frontend/ROUTES.md`**: App Router route map (main nav, forum, profile, admin, writer, UCP back-line).

## [2.1.107] - 2026-08-01

### Added
- **`info/social/ACTIONS.md`**: feed + messenger + folder action inventory and realtime hooks.
- **`info/game/SOCKETS.md`**: server managers, inbound socket events, coarse website-bus rules.

## [2.1.106] - 2026-08-01

### Added
- **`info/backend/API_CATALOG.md`**: route + server-actions inventory with live-emit checklist.
- **`info/admin/PERMISSIONS.md`**: nav gates by level, admin APIs, new-page checklist.

## [2.1.105] - 2026-08-01

### Added
- **`/info` system overviews**: `frontend`, `backend`, `auth`, `social`, `admin`, `game`, and `forum/OVERVIEW.md`.
- Index updated; Discord/FiveM/S3/AI marked back-line in handoff docs.
- `docs/TODO.md` now redirects readers to `/info/`.

## [2.1.104] - 2026-08-01

### Added
- **Forum Settings** (`/admin/forum/settings`): text-enhance provider menu (Gemini cloud / Ollama local / off).
- Curated Ollama model catalog with estimated RAM + download size; download/pull from admin UI.
- `GET /api/ai/config`, `GET|POST /api/ai/local`; enhance route respects SiteSetting provider.
- Markdown editor hides Grammar/Polish when enhancement is disabled.
- Docs: `info/forum/TEXT_ENHANCE.md`.

## [2.1.103] - 2026-08-01

### Added
- **AOI InterestManager vitest soak**: zone math, neighborhood keys, synthetic multi-entity fanout (far entities isolated; fanout ≪ full-map broadcast).
- **WorldMap ops docs**: `info/database/WORLDMAP.md` (migrate/verify, loaders, GameMap mirror rules).
- **Legacy uploads migrate script**: `scripts/migrate-local-uploads-to-s3.ts` (`--dry-run`, `--skip-existing`).

## [2.1.102] - 2026-08-01

### Added
- **Optional S3/CDN uploads**:
  - Env-gated PutObject/DeleteObject via `@aws-sdk/client-s3` (`s3-storage.ts`).
  - Requires `S3_BUCKET` + credentials + `CDN_BASE_URL`; otherwise local `public/uploads` unchanged.
  - MinIO/R2 via `S3_ENDPOINT` / `S3_FORCE_PATH_STYLE`.
  - `next.config.ts` adds CDN host to `images.remotePatterns` when configured.
  - Docs: `info/uploads/STORAGE.md`; env vars in `.env.example`.
  - Vitest coverage for S3 enablement + URL/key helpers.

### Fixed
- `deleteUploadedFile` no longer breaks on `/uploads/...` paths (`path.join` absolute-segment bug).

## [2.1.101] - 2026-08-01

### Added
- **FiveM character/stats bridge**:
  - `POST /api/fivem/events` with actions `player_joined`, `player_left`, `sync_character`, `bank_transaction`, `link_license`.
  - Realtime events: `fivem.player.online`, `fivem.player.offline`, `fivem.character.updated`, `fivem.bank.updated`.
  - Friend-fanout `presence.updated` (`playing` / `online`) on join/leave.
  - UCP `RealtimeProvider` + `UcpLiveRefresh` for live dashboard/banking refresh.
  - Contract docs: `info/fivem/BRIDGE.md`.
  - Vitest coverage for license normalize, bank deltas, and payload schemas.

### Changed
- `/api/fivem/characters` emits `fivem.character.updated` after drugs/inventory sync (coords remain silent).
- Auth accepts `Bearer` + legacy raw secret; prefers `FIVEM_API_KEY`.

## [2.1.100] - 2026-08-01

### Changed
- **Campaign maps → WorldMap DB (complete)**:
  - Moved the ~12MB dump out of the app bundle to `scripts/data/campaign-maps.generated.ts` (seed source only).
  - Stubbed `src/web/components/the-lobby/data/campaign-maps.ts` so accidental imports cannot pull map payloads.
  - Fixed `scripts/migrate-campaign-maps-to-db.ts` to upsert `WorldMap` + `GameMap` collision mirror (235 maps, `gameId=tuxemon`).
  - `/api/maps` and `/api/maps/[slug]` are DB-only; POST requires Developer permission.
  - Server `map-loader.js` prefers `WorldMap`, then `GameMap`.
  - `WorldMapNavigator` + `listMaps()` load the map index from `/api/maps`.
  - Regenerators (`import-full-tuxemon-campaign`, `reimport-rich-tuxemon-maps`, `import-tuxemon.mjs`) write to `scripts/data/`.

## [2.1.99] - 2026-08-01

### Added
- **Discord Bot Bridge**:
  - `POST /api/discord/events` with actions `member_joined`, `role_sync`, `community_announce`, `link_account`.
  - Role sync via `DISCORD_ROLE_MAP` (never auto-demotes staff unless `forceDemote`).
  - Realtime events: `discord.member.linked`, `discord.role.synced`, `discord.community.announce`.
  - Discord OAuth `signIn` / `linkAccount` writes `User.discordId`.
  - Bot contract documented in `info/discord/BRIDGE.md`.
- **Achievement unlock automation**:
  - New badges: `first_reply`, `social_starter`, `tipper`.
  - `checkAndAwardAchievements` now creates SYSTEM notifications + realtime push on unlock.
  - Wired after forum replies, social posts, and tips (threads/friends/login already covered).

### Changed
- `/api/internal/events` forwards envelope `source` and broadcasts globally when no `userId` target.

## [2.1.98] - 2026-08-01

### Added
- **MMO Scaling Milestone 4**:
  - **AOI interest management**: Players join `aoi:{map}:{zx}:{zy}` rooms; `player_moved` / `creature_moved` broadcast only to the 3×3 zone neighborhood (`InterestManager`, `MMO_AOI_ZONE_SIZE`).
  - **Binary movement packing**: Compact ArrayBuffer codec in `src/shared/net/movementCodec.ts` (toggle with `MMO_BINARY_MOVEMENT=0` for JSON fallback). Client `player_moved` handler decodes binary with JSON fallback.
  - **Optional Redis Socket.io adapter**: `attachRedisAdapter()` enables multi-instance fan-out when `REDIS_URL` or `REDIS_HOST` is set (`@socket.io/redis-adapter` + `redis`).
  - Vitest coverage for movement codec round-trips.

## [2.1.97] - 2026-08-01

### Added
- **Realtime Milestone 3 — coarse MMO → website bridge**:
  - `PlayerManager` emits `ecosystemBroadcast` on join/leave; `SocketHandler` bridges to `RealtimeService.emitGlobal(..., { source: "mmo" })`.
  - Registered `game.player.online` / `game.player.offline` (optional `playerCount`); never includes movement or combat ticks.
  - Client roster in `useRealtimeStore`; live player counts in `ServerSelect`, Lobby admin, and new `ServerStatusCard`.
  - Smoke-verified custom server boot + `/api/game/server-status` + event registry validation.

## [2.1.96] - 2026-08-01

### Added
- **Realtime Milestone 2 — live site ↔ game wiring**:
  - Shared emit helpers in `src/web/lib/realtime-emit.ts` for server actions and API routes.
  - Instant `notification.created` push for social likes/replies/tips, forum reply + subscriber notifications, reply likes, support ticket replies, and @mentions.
  - `presence.updated` friend fan-out on socket connect/disconnect with online indicators in Friends List.
  - `chat.message.created` delivery for DMs and group chats; Chat Window refetches immediately on signal.
  - Admin Realtime Dashboard at `/admin/realtime` with live metrics, circuit breaker controls, force-disconnect, and recent CRITICAL event list.
  - Live forum thread updates via `forum.reply.created` room broadcasts (`thread:{id}`) and `LiveThreadReplies` auto-refresh.

## [2.1.94] - 2026-08-01

### Fixed
- **Mobile Game Launcher & Fullscreen Device Mode**:
  - Added `MobileGameLauncher.tsx` overlay for mobile screens presenting a prominent **"ENTER GAME (FULLSCREEN)"** trigger button instead of rendering a cramped inline canvas under site header bars.
  - Automatically triggers device `requestFullscreen()` and landscape orientation lock when entering mobile game mode.
  - Updated `app/(main)/lobby/page.tsx` height container to `h-[100dvh]` on mobile viewports.
- **Mobile Touch Controls & Action Pad**:
  - Positioned directional D-Pad on the **bottom-left** with continuous hold support for fluid character movement.
  - Built a dedicated **Mobile Touch Action Pad** on the **bottom-right** featuring `[⚡ INTERACT]` (z-action for talking to NPCs, entering doors, harvesting), `[🎒 BAG]`, `[⚔️ SKILLS]`, `[💬 CHAT]`, `[⚙️ MENU]`, and `[⛶ FULLSCREEN]` buttons.

## [2.1.93] - 2026-08-01

### Fixed
- **Character Selection Sprite Hydration**:
  - Updated `hydratePlayer` in `store.ts` to set `name`, `spriteId`, and `accountId` when loading character data, restoring selected character sprites on the 2.5D Babylon game canvas.
- **Multiplayer Visibility & Duplicate Entities**:
  - Guarded initial socket `join_map` request to only emit once character selection is complete, preventing pre-join orphaned player entities.
  - Added cleanup logic in `PlayerManager.ts` to automatically remove stale entities for the same socket/account upon re-joining.
  - Filtered local client `socket.id` out of `otherPlayers` in `index.tsx` to eliminate local phantom mesh duplicate overlays.
- **Real-Time Local & Global Chat Broadcast**:
  - Implemented server-side handler for `"globalChat"` in `SocketHandler.ts` to broadcast `global_chat_msg` to all connected clients.
  - Enriched local `player_chat` payload with sender name and room targeting, eliminating local chat log duplication and missing sender labels.

## [2.1.92] - 2026-08-01

### Fixed
- **In-Game Character Appearance & Sprite Alignment**:
  - Corrected texture `vOffset` mapping and sprite sheet row directions in `BabylonEngine.ts` to match standard 96x128px Tuxemon/RPG Maker sprite sheet layouts (Row 0: Down, Row 1: Left, Row 2: Right, Row 3: Up).
  - Eliminates vertical inverted row sampling in the 2.5D engine so player characters always display their exact chosen appearance and face the proper direction in-game.
- **Multiplayer Player Visibility & Socket Sync**:
  - Added immediate `join_map` socket re-emit in `index.tsx` as soon as character selection loads, ensuring the server registers the player's loaded character specs (`name`, `spriteId`) and broadcasts `player_joined` to other clients.
  - Enriched movement delta packets in `PlayerManager.ts` (`player_moved` event) with `name` and `spriteId` properties.
  - Added `player_left` socket listener in `index.tsx` and mesh cleanup tracking in `GameCanvasBabylon.tsx` to automatically dispose disconnected player avatars.

## [2.1.90] - 2026-08-01

### Fixed
- **Character Sprite Appearance Connection**:
  - Corrected broken `/game-assets/characters/` image URL paths in `character-selector.tsx` and `character-creator.tsx` to point to `/game-assets/npc/${spriteId}.png`.
  - Ensures preview card appearance in Character Creator & Selector matches the actual 2.5D player sprite rendered in `GameCanvasBabylon.tsx`.
- **Lobby Realm Server Connection & Offline Enforcement**:
  - Updated `ServerSelect.tsx` to strictly disable the "Connect" button when the selected server is `offline`.
  - Added an in-lobby server status alert with a 1-click **"Start Realm (Dev)"** trigger when offline.
  - Enhanced `/api/game/server-status` to automatically detect Next.js dev server mode and handle POST requests to start/stop dev server override.
- **Active Studio Server Controls**:
  - Built `ServerControl.tsx` and added the **Server Controls** tab (`<Server />`) to Dev Tools Panel in Studio.
  - Added active, non-greyed-out **Start Server**, **Stop Server**, and **Real-Time Metrics** controls so admins can power the game server directly from Studio.

## [2.1.89] - 2026-08-01

### Added
- **Studio Starter Hero Management**: Fully integrated Character Creation management into Saints Studio via `StarterHeroEditorPanel.tsx` and the `Heroes` tab on the Studio dock toolbar.
- **Database Model & Server Actions**:
  - Added `StarterHero` model to Prisma schema (`prisma/schema.prisma`) and pushed to SQLite database.
  - Built `app/actions/starter-heroes.ts` with public fetch, admin CRUD, active toggling, JSON batch importing, and idempotent seeding.
- **Studio Hero Archetype Generator & Requirements**:
  - **Requirements & Guidelines Guide**: Interactive overlay inside Studio detailing exact field specifications (slug format, class IDs, sprite key validation, JSON inventory specs).
  - **1-Click Archetype Generator Presets**: Built-in archetype templates (Tuxemon Beast Master, Arcane Elementalist, Spyder Operative, Grand Knight Lord, Nature Druid, Cyber Savant).
  - **Random Hero Generator**: 1-click randomizer that picks from Tuxemon/GAME_SPRITES with harmonious tags, colors, and class assignments.
  - **JSON Import / Export Modal**: Allows creators to copy or paste JSON hero definitions directly.
  - **Live Validation Status**: Real-time validation checks for slug syntax, sprite registry existence, and inventory JSON format.
- **Dynamic Character Creator Sync**: Updated `character-creator.tsx` to dynamically query active `StarterHero` archetypes from the database (with robust offline fallback), reflecting Studio edits in real time.

## [2.1.88] - 2026-08-01

### Changed
- **Pre-Game Flow Restyle**: Completely rebuilt all 4 pre-game screens to match the dark Saints Gaming aesthetic (deep violet/runic palette, glass cards, glow effects) — replacing the mismatched bright white UI.
  - `GameTitleScreen.tsx`: Animated canvas background with drifting runic particles, star field, scan-line effect, SAINTS logo with drop shadow glow, functional Credits modal, and Options button wired to `GameOptionsMenu`.
  - `GameLogin.tsx`: Dark glass card with violet glow, password reveal toggle, styled focus states, and "Forgot password?" link.
  - `ServerSelect.tsx`: Dark glass panel, animated ping dots (live/pulsing), color-coded population bar, auto-refresh indicator, connecting animation.
  - `character-selector.tsx`: Per-class color palettes with glow cards, hover animations, sprite previews, and dark glass "New Hero" creation card.
- **Character Creator Restyle**: Complete dark-aesthetic rewrite of `character-creator.tsx`:
  - New **HERO_PICK** step: 6 curated starter hero archetypes (Warrior, Paladin, Mystic, Shadow, Ranger, Monk) with live sprite previews, flavor text, and difficulty tags. No new assets required — all sprites already in `GAME_SPRITES`.
  - **NAME** step: Shows selected hero preview + compact class switcher.
  - **APPEARANCE** step: Lazy-loads full sprite grid, dark-styled pagination.
  - **GIFT** step: Color-coded perk cards with per-perk glow colors.
  - **REVIEW/FINALIZE** step: Summary with large sprite, class/perk badges, and stat preview.
- **Version**: Bumped all version fallback strings to `2.1.88`.

## [2.1.87] - 2026-07-31

### Changed
- **Lobby Redesign**: Re-styled `GameLogin.tsx`, `ServerSelect.tsx`, and `character-selector.tsx` to a lighter vibrant console aesthetic.
- **Character Creator**: Redesigned `character-creator.tsx` to a multi-step "Dark Souls" style wizard where users directly select `GAME_SPRITES` models.
- **HUD Redesign**: Decoupled the dark UI box into clean, separate pill-shaped floating indicators in `SaintsHudOrbs.tsx`.
- **Options Menu**: Updated `GameOptionsMenu.tsx` to match the new lighter aesthetic.

## [2.1.86] - 2026-07-31

### Changed
- **Map Editor UI Refactor (Phase A)**: Transitioned the monolithic `IntegratedDevEditor.tsx` into a system of highly modular, draggable floating panels that align with the vision: *"Building a game should feel like playing the game."*
- **Centralized Panel State Management**: Built a robust Zustand store (`editor-store.ts`) to globally manage the `isCreationMode` toggle, active editor tools, and floating panel states (position, size, z-index, visibility).
- **Draggable UI Architecture**: Created `DraggablePanel.tsx`—a reusable floating window container with bounds clamping and z-index sorting.
- **Decomposition**: Extracted the old editor into separate components: `WorldBuilderPanel.tsx`, `PropertiesPanel.tsx`, `AssetBrowserPanel.tsx`, `NpcEditorPanel.tsx`, and `DevToolsPanel.tsx`.
- **Global Studio Shell**: Implemented `StudioEditorShell.tsx` overlay featuring a centralized bottom-dock Toolbar.
- **Engine Canvas Bridging**: Updated `GameCanvasBabylon.tsx` to read directly from `useEditorStore` to seamlessly coordinate map clicks and tile painting across detached panels.

## [2.1.77] - 2026-07-30

### Changed
- Reorganized codebase to strictly separate Engine vs Game domains following standard game engine architectures.
- Migrated all React components, utility libraries, hooks, and types out of root folders into `src/engine/`, `src/game/`, `src/editor/`, `src/shared/`, `src/server/`, and `src/web/`.
- Updated `tsconfig.json` paths and automated the refactoring of 1,500+ import statements across the Next.js `app/` router.
- Consolidated documentation into a dedicated `docs/` hierarchy (architecture, editor, gameplay, getting-started, reference) serving as a single source of truth.
- Moved root deployment scripts to `scripts/` and cleaned up the project root.

## [2.1.76] - 2026-07-30

### Added
- Completed the Saints Gaming Master Development Blueprint, fully documenting 23 major engine, MMO, and gameplay architecture systems.
- Executed Phase 2, Step 1: Built the Generic Creature Engine architecture.

### Changed
- Decoupled hard-coded Tuxemon database tables into a generic framework (CreatureTemplate, AbilityDictionary, PlayerCreature, EncounterTable).
- Migrated Zustand store.ts client state to generic creatureParty / creatureInventory structures.
- Updated all API routes and the Admin Dashboard to fetch the normalized Creature schema.
- Resolved 35+ TypeScript build errors to ensure strict type compliance with the new generic schema.

# Changelog

## [2.1.81] - 2026-07-30
- Documentation Cleanup: Removed the raw `docs/gameplay-bible` notes and various empty legacy documentation stubs from the public repository to prevent confusion. The official source of truth is now firmly established in `docs/architecture` and `docs/developer-guide`.

## [2.1.80] - 2026-07-30
- Documentation Synthesis: Extracted the complete Saints Gaming MMO Architecture and Editor Rules from the private `.tools/Gameplay Bible` into professional public markdown documentation in `docs/architecture` and `docs/developer-guide`.

## [2.1.79] - 2026-07-30
- **Demo Sandbox Environment**: Created `DEMO_SANDBOX` map for live multiplayer and world interaction testing.
- **Editor Pipeline Fix**: Corrected the `MapEditor` API POST route to accurately save structural map changes to the database.
- **Seamless Spawning**: Defaulted new character spawns to the `DEMO_SANDBOX` for rapid testing iteration.
- **Interaction Testing**: Added a Guide NPC, Interactive Trees (`HARVEST_WOOD`), and Ore Rocks (`HARVEST_ORE`) into the sandbox.
### v2.1.64
- **Drift-Compensating Game Loop**: Replaced Node's setInterval with a recursive setTimeout loop that calculates and compensates for execution drift in game-server.js for a solid 15 TPS.
- **O(1) Spatial Hash Grid Collision**: Built SpatialGrid class in spatial-grid.js and wired it into game-server.js. Map NPCs and players are dynamically loaded into the grid, making collision checks an instant dictionary lookup instead of O(N) array scans.
- **Input Buffering Optimization**: Limited the moveQueue queue depth to exactly 2 items, balancing jitter-tolerance while preventing the ice skating bug during lag spikes.
- **Rapid Rubber-Banding Interpolation**: Modified the client's updateEntity loop in BabylonEngine.ts. The client now dynamically adjusts its lerp speed based on the discrepancy distance. If the server heavily corrects a misprediction (dist > 1.5 tiles), the player mesh will smoothly zip back into place at 3x speed.


### v2.1.60 — Server-Authoritative Physics & Collision (Phase 2)
- **Server-Side Collision Detection**: Created `lib/game/map-loader.js` — a Prisma-backed utility that loads map collision grids and logic tiles from the database, caches them in memory, and provides `isWalkable()` / `isWalkableSync()` for O(1) tile lookups during physics ticks.
- **Authoritative Game Server Rewrite**: Rewrote `game-server.js` to process `move_intent` events (direction + sequence number) instead of trusting raw client coordinates. Added a 15 TPS server tick loop that validates movement against collision grids, NPC positions, and map bounds. Sends `move_ack` for valid moves and `position_correction` for rubber-banding invalid ones.
- **Client-Side Prediction & Reconciliation**: Updated `store.ts` with `moveSequence`, `pendingMoves` buffer, and `applyServerCorrection()`. The client predicts movement locally for zero-latency feel while the server validates asynchronously.
- **Move Intent Protocol**: `GameCanvasBabylon.tsx` now sends `move_intent { direction, seq }` instead of `move { x, y }`. Tracks pending moves with sequence numbers for server reconciliation.
- **Entity Interpolation**: Added 100ms smooth-step interpolation buffer for rendering other players in the Babylon render loop. Remote player movement now appears buttery smooth regardless of network jitter.
- **Socket Reconciliation Handlers**: Added `move_ack` and `position_correction` listeners in `index.tsx` for server-authoritative movement feedback.
- **Anti-Cheat**: Server rejects teleport attempts (>1 tile distance), wall-walking, and NPC clipping. Legacy `move` handler kept for backwards compatibility but now validates all coordinates.

### v2.1.57
- **Classic RPG Interface Overhaul**: Replaced the floating Game Menu Bar with a static `ClassicPanel.tsx` in the bottom right corner, bringing an immersive classic RPG layout (Inventory, Skills, Equipment, Quests, GTC).
- **Classic Inventory & Skill Trees**: Scaled down `inventory-overlay.tsx` to a 4-column item grid, and redesigned `skills-overlay.tsx` into a classic 3-column stats list with hover tooltips to fit inside the new Classic Panel.
- **Classic Chat Interface**: Redesigned `GameChat.tsx` layout to resemble classic RPG brown opaque chat boxes with channel tabs at the bottom.
- **Immersive Chat Bubbles**: Overhauled BabylonJS 3D chat bubbles into retro yellow text with black outlines rendered directly above player models in world space.
- **Action Hotbar**: Added a 6-slot quick-access Hotbar overlay at the bottom-center of the UI during exploration mode.
- **Player Animation Fix**: Fixed a bug where WASD movement directions were mapped to the wrong Sprite Sheet rows (W mapped to left, D mapped to up, etc.). Corrected WebGL UV V-Offset row bindings.
### v2.0.3
- **Site Level Progression Engine**: Linked game progression to platform account progression. Unlocking game achievements now grants XP which automatically ranks up the user's site-wide `LevelTier` across the network.
- **Discord Webhook Broadcasting**: Fully integrated Saints Tamer server actions with the platform Discord Webhooks (`discord.ts`). Top achievements, earned coins, and platform Level Ups are now broadcasted live to community channels.
- **Map Editor WebGL Synchronization**: Fixed `MapEditorPanel.tsx` to properly extract live 2D grid tilemaps from the PixiJS `MapEditorWebGL.tsx` instance into the database `gridData`, enabling genuine, persistent world building for admins.

### v2.0.2
- **In-Game Achievements & Badges Overlay**: Created `achievements-overlay.tsx` allowing players to inspect community achievements (*First Beast Capture*, *Campaign Explorer*, *Master Crafter*, *Keeper Conqueror*, *Base Tycoon*) and claim site Coins (+50 Coins) & platform XP directly into their account DB via `unlockGameAchievement` server action.

### v2.0.1
- **Campaign Map Editor Integration**: Defaulted in-game Map Editor Panel (`MapEditorPanel.tsx`) and Menu Admin Map Editor (`app/(main)/admin/map-editor/page.tsx`) to `PLAYER_HOUSE_BEDROOM` with full editing, node placement, and DB persistence for all 38 Tuxemon campaign maps.

### v2.0.0
- **Site-Wide Operative Leaderboards Page**: Created public website leaderboard page `app/(main)/leaderboards/page.tsx` ranking community operatives by Character Level, Total 27-Skill XP, Economy Credits, and Caught Tuxemon species count.
- **Server Action Integration**: Created `getTopLobbyOperatives()` in `app/actions/game.ts` querying database characters and computing real-time rankings with user profile badges.
- **In-Game Leaderboard Overlay**: Created `leaderboard-overlay.tsx` accessible via top navbar button (`LEADERS`) in The Lobby.

### v1.9.5
- **In-Game Quest Journal & Task Tracker Overlay**: Created `quest-log-overlay.tsx` allowing players to inspect active campaign tasks, active objective stages, reward payouts (XP & Credits), and completed quest history from the top navigation bar (`QUESTS`).
- **HUD Mini-Map Radar & Compass Widget**: Created `MiniMapRadar.tsx` rendering real-time map grid preview, player position pulse, nearby NPC indicators, active warp gates, and tile coordinates (`X, Y`) on the top-right corner HUD.

### v1.9.0
- **Base Automation Passive Beast Resource Farming**: Updated `base-overlay.tsx` allowing caught Tuxemon beasts to be assigned to base facilities (*Lumber Mill*, *Quarry*, *Furnace*, *Farm*, *Fishing Hut*) to generate passive yields over time.
- **Co-Op Party Shared XP & Member Management**: Upgraded `party-overlay.tsx` with a 4-player online party lobby, username invitations, and +25% Shared XP status indicator.

### v1.8.5
- **Character RPG Sheet & Stats Overlay**: Created `rpg-stats-overlay.tsx` showing player level, combat style, equipped armor/weapon slots, active perk perks, carry weight capacity, and all 27 skill XP progression bars.
- **Phase 2 Keeper ARPG Combat**: Enhanced `battle-overlay.tsx` to handle direct Player vs Keeper ARPG combat when defeating trainer beasts.
### v2.0.5
- **Dynamic Wild Beast Map Encounters Engine**: Overhauled tall grass trigger mechanics to read map-specific `encounterPool` configurations from the `WorldMap` database model instead of hardcoded random spawns.
- **Encounter Zones UI in Map Editor**: Built "ENCOUNTERS" tab in `MapEditorPanel.tsx` allowing admins to dynamically assign beast species, minimum/maximum levels, and spawn rates (weights) per map zone.

### v1.8.0
- **Interactive Professor Lab Starter Choice Event**: Created `ProfessorLabOverlay.tsx` cutscene triggering upon entering `PROFESSOR_LAB`. Players choose between Fire (Ignisaur), Water (Aquaspout), and Wood (Verdantail) starter beasts.
- **Global Trade Center (GTC) P2P Marketplace**: Created `gtc-overlay.tsx` allowing players to list, browse, search, and buyout caught Tuxemon beasts, crafted equipment with ARPG affixes, and materials.
- **Dynamic Spatial Audio Engine**: Upgraded `audio.ts` with Howler.js integration (`playTownBgm`, `playBattleBgm`, `playVictorySfx`).
- **Authoritative Socket.IO Overworld Sync**: Enhanced real-time multiplayer rendering in `game-canvas.tsx` with player name tags and live chat speech bubbles.

### v1.7.7
- **Automatic Map State Sanitizer**: Upgraded `selectAndLoadCharacter` in `components/the-lobby/index.tsx` so existing character saves with obsolete placeholder map references automatically boot into campaign map `player_house_bedroom` (`{ x: 6, y: 2 }`).
- **User Profile Operative Showcase Overhaul**: Created `ProfileCharacterDetails.tsx` with expandable tabs for character **Inventory**, **Beast Party & Bank**, and **Global Trade Center (GTC)** trading previews.

### v1.7.6
- **Tuxemon Campaign Purge**: Removed placeholder test maps, leaving official campaign maps (`player_house_bedroom`, `spyder_paper_town`, `professor_lab`, etc.) as the primary playable world.
- **Unique Perk & Trait Selection System**: Integrated passive perks in character creation (`Swift Traveler`, `Acrobat Double Jump`, `Pack Mule`, `Master Tamer`, `Stamina Surge`).
- **Spacebar Tile Hopping & Double Jump Engine**: Enabled 1-tile hopping (and 2-tile Acrobat Double Jump) in `game-canvas.tsx` for crossing obstacles.
- **Inventory Carry Weight Limits**: Added `inventoryWeight` tracking and capacity limits (100 kg base, 150 kg with Pack Mule) in `inventory-overlay.tsx`.

### v1.7.5
- **ARPG Rarity & Affix Rolling in Crafting Station**: Integrated ARPG loot rarity rolls (Common, Uncommon, Rare, Epic, Legendary) and stat affixes (`+Damage`, `+XP`, `Lifesteal`) when crafting weapons and equipment in `crafting-overlay.tsx`.
- **Dialogue & Quest Payout Flow Optimizations**: Refined NPC quest acceptance and turn-in feedback loops in `dialog-overlay.tsx`.

### v1.7.4
- **Open Source Copyleft Compliance & Attribution**: Added license documentation giving explicit open-source credit to external asset contributors.
- **Campaign Map Gate & Quest Flow Organization**: Optimized map warp connections, dialogue scripts, and quest triggers across campaign maps (`PLAYER_HOUSE_BEDROOM`, `PROFESSOR_LAB`, `SPYDER_PAPER_TOWN`).

### v1.7.3
- **World Map Navigator Component**: Built visual map browser (`WorldMapNavigator.tsx`) with search, campaign/custom category filters, and adjacent gate link indicators.
- **Linked Map Editors**: Unified the terminal in-game editor (`MapEditorPanel.tsx`) and admin page editor (`app/(main)/admin/map-editor/page.tsx`) with full campaign map loading and multi-map preview toggling.
- **Tuxemon Campaign Primary Focus**: Made all 38 Tuxemon campaign maps (`PLAYER_HOUSE_BEDROOM`, `PROFESSOR_LAB`, `SPYDER_PAPER_TOWN`, etc.) immediately selectable and editable in canvas editor.

### v1.7.2
- **Lobby Directory Refactoring**: Reorganized `components/cyber-terminal/` into `components/the-lobby/`, updating component paths and dynamic imports across all lobby routes.
- **Integration Status Documentation**: Audited and published `INTEGRATION_STATUS.md` detailing Phase 1-4 game state, tile registry, 411 Tuxemon creature database, mobile D-Pad controls, and development roadmap.
- **Battle System Party Switching & Status Effects**: Enhanced battle overlay with party member selection during combat, turn-based status condition processing (Poison, Burn, Sleep, Freeze, Paralysis), and in-battle item usage.

### v1.7.1
- **ESLint Compliance for WebGL Canvas Initializer**: Switched `require('pixi.js')` statements to standard `settings` imports in `MapEditorWebGL.tsx` and `TuxemonBattleScene.tsx`, satisfying Next.js ESLint build rules (`@typescript-eslint/no-require-imports`).
- **MariaDB Database Seed Truncation & Production Data Sync**: Resolved `P2000` MariaDB string column overflow error during seeding by safely truncating JSON string tags/types in `scripts/import-tuxemon-data.ts`, successfully populating all 411 Tuxemon beast species, movesets, techniques, and maps into the live database.
- **WebGL Shader & PixiJS Initialization Safeguards**: Resolved `checkMaxIfStatementsInShader` exception by disabling strict shader statement limit checks (`CHECK_MAX_IF_STATEMENTS_IN_SHADER = false`) and wrapping canvas Application instantiation in try-catch fallback blocks across `MapEditorWebGL.tsx` and `TuxemonBattleScene.tsx`.
- **Database Seeding & WebGL Tile Registry Fallbacks**: Added repo-relative `tuxemon-db` YAML database source, wired automatic DB seeding of all 411 Tuxemon species/techniques into `entrypoint.sh` upon production deployment, and built default tile palette fallbacks into `MapEditorWebGL.tsx`.
- **In-Site Collaborative Game Editor & Quest Interface Alignment**: Added NPC Dialogue Script Editor and Warp Portal Linker tabs to `MapEditorPanel.tsx`, exported `QUEST_DB` alias in `components/cyber-terminal/data/quests.ts` with complete type definitions (`GameQuest`), resolving all TypeScript build constraints.
- **Authentic Tuxemon Starter Story Flow**: Configured default player spawn point to `PLAYER_HOUSE_BEDROOM` (`{x: 6, y: 2}`), wiring initial stairs warp to `PLAYER_HOUSE_DOWNSTAIRS` (Mom dialogue), front door exit to `SPYDER_PAPER_TOWN` (Tamer Guide), and Lab warp to `PROFESSOR_LAB` (Prof. Oakwood starter beast selection).
- **Tuxemon Campaign Maps Integration & WebGL Engine Port**: Imported 38 primary campaign maps (`player_house_bedroom`, `player_house_downstairs`, `spyder_paper_town`, `professor_lab`, `spyder_route1`, etc.) into `components/cyber-terminal/data/campaign-maps.ts`, linking map portals, NPC spawn triggers, and wild encounter pools.
- **Lint Cleanliness Verification**: Cleaned up React hook dependencies and unused variables across `DialogueBox.tsx`, `TuxemonBattleScene.tsx`, `MapEditorWebGL.tsx`, and `TuxepediaOverlay.tsx`.
- **Permission Locked Map Editor & Tuxemon Tileset Integration**: Permission-locked the map `EDITOR` button to verified admin accounts (`checkAdminPermission`), updated `drawMap` canvas engine to query `tileRegistryCache` for official overworld Tuxemon tilesets, and fixed grey fallback rendering.
- **Strict Lint Cleanliness & Production Server Build Fix**: Removed unused imports (`Shield`, `Search`) in admin Tuxemon page and cleaned up catch error binding in `app/actions/achievements.ts`, resolving Next.js strict production docker compilation error.
- **Community Feed Integration**: Added "SHARE TO FEED" button to the Saints Dex overlay (`SaintsDexOverlay.tsx`), enabling players to broadcast rare species registrations directly to the community feed via `createSocialPost`.
- **SaintsDexOverlay Component Renaming**: Renamed component exports and overlay references from `TuxepediaOverlay` to `SaintsDexOverlay` across HUD navigation and terminal overlay imports, fully purging non-branded terms from frontend React components.
- **Server Action Pinned Beast Integration**: Connected `pinBeastToProfile` server action directly to the Saints Dex & Animist Codex overlay, persisting pinned companion beasts to the database and revalidating user profile pages.
- **Saints Gaming Lore Alignment**: Completed codebase audit of all user-facing UI text, updating remaining labels, tab titles (`Saints Dex & Animist Codex`), card headers (`PINNED SAINTS BEAST`), and empty states to strictly adhere to Saints Gaming lore and copyright guidelines.

### v1.5.6
- **Tuxemon Evolution API & Expanded Crafting Mechanics**: Implemented Tuxemon creature evolution API (`/api/tuxemon/evolve`) and expanded the crafting matrix (`data/items.ts`, `crafting-overlay.tsx`) with Tuxeballs, Grand Balls, Mega Balls, Mithril Weapons/Platebodies, and Cooking recipes.
- **Tuxemon Admin Suite**: Introduced Tuxemon Database manager (`/admin/game-dev/tuxemon`) under the Game Dev admin suite in `AdminOverlayShell`, enabling full administrative inspection of all 411 Tuxemon species, base stats, elements, and movesets.
- **5-Facility Base Automation Matrix**: Upgraded Base Overlay to render all 5 production facilities (Lumber Mill for Wood Logs, Quarry for Ores, Furnace for Metal Bars, Herb Farm for Grimy Herbs, Fishing Hut for Raw Fish), with passive resource loops and visual live sanctuary feeding canvas.
- **Pinned Tuxemon Beast Profile Showcase**: Integrated pinned beast companion display badges onto public user profile cards (`/user/[username]`), connected `pinnedBeastId` in `getPublicProfile` server actions, and enabled showcasing active Tuxemon companions on user profiles.
- **Tuxemon × Saints Tamer Complete Merger Phase**: Fully merged Tuxemon creature mechanics (411 species dataset, 274 movesets, catch rates, Tuxepedia encyclopedia overlay) with Saints Tamer OSRS-inspired 27-skill RPG matrix. Integrated in-panel WebGL `MapEditorPanel` with toolbar tabs for tile painting, collision boundaries, RPG resource node spawning (mining rocks, woodcutting trees, fishing spots), NPC placement, Tuxemon wild encounter zone definitions, and portal gates. Extended Socket.IO party management (`party-manager.ts` EventEmitter integration and multiplayer party invites via friends list).
- **Pixel Art Sprite Canvas Rendering Engine**: Replaced legacy HTML5 fallback 2D circle shapes (`#ef4444` red ball) with full pixel-art character sprites, class outfit palettes (Emerald Agent, Purple Cybermancer, Gold Wanderer, Cyan Phantom, Red Brawler), dynamic image asset rendering (`/uploads/...`), NPC quest mark indicators (`!`), and multi-player avatar rendering.

### v1.5.0
- **URL Slug Migration & /lobby Route**: Migrated primary game URL slug to `/lobby` (`app/(main)/lobby/page.tsx`), updated navbar and profile references, and added seamless redirect from legacy `/profile/terminal` to `/lobby`.

### v1.4.9
- **The Lobby Rebranding & Aesthetic Redesign**: Renamed game area from "Sub-Network Terminal" to **The Lobby**, replaced matrix green terminal styling with Saints Gaming modern glassmorphism design system, gradient titles, and automated remote server deployment.

### v1.4.8
- **Character Selection & Custom Sprite Overhaul**: Added `CharacterSelector` screen for existing character saves, custom uploaded `GameAsset` avatar support during registration, fixed profile card sprite rendering, and resolved character creation boot loop.

### v2.1.15
- **Indoor Procedural Textures**: Upgraded the `BabylonEngine` renderer! Indoor maps (Bedrooms, Houses, Labs, Dojos, etc) now dynamically generate and apply procedural wood floor and plaster wall textures to their map tiles, massively improving the visual aesthetics of the game.

### v2.1.14
- **Overlays Fixed**: The `IntegratedDevEditor` now automatically hides conflicting UI overlays (MiniMap, HUD Orbs, Chat Bar) when opened, resolving overlap issues.
- **Tuxemon NPCs Importer**: Integrated dynamic character sprite importing! The Dev Editor now maps and lists 208 available character sprites from `/tuxemon-assets/npc/` inside the `Heroes` and `NPCs` visual drop-down menus.

### v2.1.13
- **Excluded SQLite Migrations from Docker & MariaDB**: Added `prisma/migrations` to `.dockerignore` and purged legacy SQLite migration files. This ensures Docker production builds push clean Prisma schemas directly to MariaDB without migration conflicts.

### v2.1.12
- **Production MariaDB Schema Push Fix & Docker Auto-Deploy**: Resolved Docker container startup crash where legacy SQLite migration files caused `prisma db push` MariaDB table conflicts (`Table 'Account' already exists`). Added automatic clearing of `prisma/migrations` in `entrypoint.sh` for clean production deployment.

### v2.1.11
- **Critical Hotkey Conflict Resolution**: Fixed global keydown collision where pressing `D` (WASD right movement) intercepted input to trigger `setGameMode('DEX')`, locking overworld movement and opening Saints Dex. Re-mapped Dex hotkey to `X` (`DEX [X]`), restoring 100% unimpeded WASD movement.

### v2.1.10
- **Grid Shading, Smooth Camera & Sprite Spawn Fix**: Implemented alternating checkerboard tone shading across all 2.5D ground tiles (`BabylonEngine.ts`) so tile sliding during WASD movement is visually obvious. Eliminated sprite lerp teleporting on spawn by copying target vectors immediately upon mesh creation. Added live `Pos: (X, Y)` indicators in 2.5D HUD badge and canvas click-focus.

### v2.1.9
- **Tuxemon Map Data AST Extraction & 2.5D Movement Fix**: Extracted 70+ Tuxemon NPCs from desktop `.tmx` and `.yaml` source files into `campaign-maps.ts` and `IntegratedDevEditor`. Resolved 2.5D player render loop stale closures (minimap position was moving while overworld canvas was locked at spawn). Connected Spacebar interact key to launch full-screen RPG `DialogOverlay` with portrait text box, and enabled instant live-rendering of newly placed Dev Editor NPCs onto the 2.5D Babylon grid.

### v2.1.8
- **Saints MMO Standard HUD Orbs, WebAudio Sound Effects Engine & Interface Frame**: Added circular stat Orbs (HP, Spirit/Prayer, Run Energy, XP Tracker Bar), procedural WebAudio sound synthesizer (woodcutting chop, mining clink, level-up fanfare, wild encounter swoosh), and verified zero-error type safety.

### v2.1.7
- **Movement Engine Overhaul, Character Importer & Clean Overlay Layering**: Added Click-to-Move raycasting, on-screen D-Pad & Talk/Interact floating action button, added Character & Sprite Customizer Tab to Dev Editor, resolved modal overlay stacking, and verified zero-error type safety.

### v2.1.6
- **In-Engine Map Creator & JSON Exporter/Importer Suite**: Added `+ Create Map` modal to Dev Editor allowing instant in-game map generation (slug, dimensions, category), JSON map export & import utilities, and permanent database creation.

### v2.1.5
- **Senior UI/UX & Game Designer Polish Overhaul**: Added mouse wheel camera zoom (orthographic sizing 4 to 18) in `BabylonEngine.ts`, global keyboard shortcuts (`I` for Inventory, `K` for Skills, `P` for Party, `D` for Dex, `B` for Badges), enhanced 2.5D HUD profile badges, and verified zero-error type safety.

### v2.1.4
- **Dev Editor Common Sense Upgrade & Flood-Fill Utilities**: Added `Fill Entire Map` flood-fill shortcut button to terrain tab, enhanced UX brush feedback, improved active map header warp links, and verified zero-error type safety.

### v2.1.3
- **Overworld Interactive Triggers & Wild Encounter System**: Connected tall grass encounter triggers (tile 2) to launch wild Tuxemon battles, implemented warp gate map transitions (tile 3/4), overworld NPC dialogue triggers, and resource harvesting (Woodcutting & Mining) with skill XP gains.

### v2.1.2
- **Universal Map Index & All-Component Dev Editor Suite**: Added central `map-index.ts` registry indexing all campaign maps, added searchable map warp selector in `IntegratedDevEditor.tsx`, expanded 6 full editor tabs (Tiles, Spawns, Grass Encounters, NPCs/Dialogue, Battle Arenas, Quests), and added `POST /api/maps/[slug]` API for permanent MariaDB database persistence.

### v2.1.1
- **Full-Bleed 2.5D Viewport & Campaign Map Visual Overhaul**: Replaced hardcoded colored block rendering with full campaign map loading, 2.5D world props (trees, rocks, tall grass tufts, water planes), WASD/Arrow key movement, procedurally crisp player character pixel art sprites, and responsive full-screen viewport layout.

### v2.1.0
- **Multiplayer 2.5D Sync & Production MMO Release**: Integrated real-time Socket.IO overworld position tracking into the Babylon 2.5D billboard sprite engine, rendered multi-player avatar billboards, and verified zero-error production compilation.

### v2.0.9
- **RuneScape Skill Integration & Dual Combat System**: Enhanced 27-skill XP progression curve formula, added ARPG crafting item random affix rolls, implemented dual-combat mode (Tuxemon beast-vs-beast phase followed by direct player-vs-keeper combat), and integrated Spacebar action-command damage block math.

### v2.0.8
- **Tuxemon Engine Unification & Critical Mechanics**: Unified elemental types to Tuxemon 15-type chart, aligned 6-stat system (`hp`, `atk`, `def`, `spd`, `ratk`, `rdef`), implemented move PP consumption, level-up evolution trigger evaluation, and species catch rate math with Tuxeball multipliers.

### v2.0.7
- **Interactive 2.5D Dev Editor & Map Configurator**: Added live 2.5D raycast pointer tile painting, spawn/respawn drag markers, tall grass encounter brush tool, NPC trainer roster setup, and battle background/weather parameters to the Integrated Dev Editor suite.

### v2.0.6
### v2.1.24
- **Ultimate Game Engine Editors & Class System (Phase 4.3, 5 & 6)**:
  - **Integrated Asset Manager**: Mounted `AssetEditor.tsx` into Dev Editor (`Ctrl+E`), enabling tag filtering, reclassifying mislabeled assets, bulk tag operations, and asset search.
  - **Game Engine & Character Class Editors**: Created `CharacterClassSystem`, `GameConfigEditor`, and `ClassEditor` components for managing multi-game rules, max levels, stat growth formulas, and allowed sprite tag filters.
  - **Interactive Sprite Browser**: Created `SpriteBrowser.tsx` and `SpritePreview.tsx` components featuring class-filtered sprite selection, 4-direction view toggling, hover walk-cycle animation loop, and detailed metadata inspection.
  - **Dev Editor Navigation**: Added `Classes`, `Engine`, and `Sprites` tabs to the Integrated Dev Editor suite.

### v2.1.23
- **True Map Recreation & Directional Animated Entities (Phase 2 & Phase 3)**:
  - **Map Database Validation Audit**: Created `scripts/validate-maps.ts` map auditor script. Validated all 235 database maps (182 maps fully verified with multi-layer TMX tilesets).
  - **Map Chunk Loader**: Implemented `MapChunkLoader.ts` for camera viewport-driven chunk loading and distant chunk unloading.
  - **Directional Animated Billboards**: Upgraded `BabylonEngine.ts` entity rendering with 4-way direction (`down`, `up`, `left`, `right`) and 3-frame ping-pong walk cycle UV mapping for player, NPCs, and overworld entities.
  - **Character Creator Presets**: Updated `character-creator.tsx` preset choices to point to real Tuxemon NPC sprite sheet assets (`adventurer.png`, `heroine.png`, `warrior.png`, `dragonrider.png`, `alchemist.png`, `catgirl.png`, etc.).

### v2.1.22
- **Ultimate Game Engine Foundational Implementation (Phase 0 & Phase 1)**:
  - **Native Asset Slicing & Interpretation Layer**: Created `SpriteSheetSlicer`, `AssetPathResolver`, and `AssetManager` modules to natively slice 48x128 NPC sheets into 12 directional frames (4 directions x 3 walk cycle frames) and index assets into an expanded `GameAsset` database schema with tag & category management.
  - **Database Schema Expansion**: Added `GameConfig`, `CharacterClass`, `LootTable`, `MonsterSpritePool`, and `WorldMap` game extensions to Prisma schema.
  - **Campaign Map Migration & API**: Migrated 235 campaign maps into `WorldMap` database table, eliminated the 11.3 MB client bundle import, and added lazy-loading API endpoints `/api/maps/[id]` and `/api/maps` with client caching.
  - **System Unification & Cleanup**: Consolidated legacy rendering paths into Babylon.js engine and updated texture path resolution.

### v2.1.18
- **Integrated Game Chat & Site Friends Messenger**: Redesigned game chat window into a multi-channel terminal (`MAP`, `WORLD`, `PARTY`, `FRIENDS`). Integrated site-wide Friends List and E2EE private direct messaging. Connected `global_chat` and `party_chat` socket handlers in `game-server.js`. Rendered dynamic 3D speech bubbles over local and remote player characters in BabylonJS. Added quick emote popups and message history filters.

### v2.1.17
- **Dedicated Python Utilities Suite (`/tools/`)**: Created a clean `/tools/` directory containing python scripts for remote updates (`update_live.py`), restarts (`restart_live.py`), status monitoring (`check_status.py`), log checking (`check_logs.py`), and DB seeding (`seed_database.py`), along with complete usage documentation.

### v2.1.16
- **Rich Tuxemon Tileset & Layer Rendering Engine**: Imported 96 full Tuxemon tileset graphics into `public/assets/tilesets/`. Re-parsed all 235 campaign TMX maps to extract multi-layer GIDs (floors, walls, furniture, decorations) and exact collision boundaries. Upgraded `BabylonEngine.ts` to render rich multi-layered texture planes using UV coordinate mapping, restoring full visual fidelity to Tuxemon indoor rooms and outdoor locations.

### v1.4.7
- **Admin & Dev Console Immersion Overhaul**: Added Game Dev Suite quick links, real-time MMO metrics (Characters, Quests, Assets, Maps) to both main Admin Dashboard and Developer Console.

### v1.4.6
- **Custom Asset Picker in Map Editor**: Integrated `GameAsset` library into World Map Editor NPC Placement mode to allow admins to select uploaded custom pixel art sprites.

### v1.4.5
- **Dynamic Game Quest & NPC Integration**: Connected custom `GameQuest` DB records and Map Editor placed NPCs directly into the cyber terminal engine (`components/cyber-terminal/index.tsx`, `game-canvas.tsx`).

### v1.4.4
- **Game Dev Admin Suite**: Introduced dedicated Game Dev category in Admin Overlay Shell.
- **Quest Creator**: Built Quest Creator UI (`/admin/game-dev/quests`) and `GameQuest` DB model for quest dialogues, item requirements, and payouts.
- **Asset Studio & Mass Importer**: Created Asset Studio (`/admin/game-dev/assets`) and `GameAsset` DB model supporting batch uploading and categorization of 16x16 / 32x32 pixel art sprites.
- **Map Editor Quest NPC Placement**: Upgraded World Map Editor (`/admin/map-editor`) with NPC Placement mode linked directly to registered Quests.

### v1.4.3
- **Map Editor Canvas Scaling**: Fixed mouse cursor coordinate offset on the World Map Editor by taking into account scale factor between canvas internal dimensions and CSS bounding client rect.
- **Profile Server Component Crash Fix**: Fixed runtime crash when rendering user MMO characters by removing invalid `onError` handler from Server Component.

### v1.4.1
- **MMO Architecture Phase 17 (Part 1)**: Transitioned from `GameSave` to a multi-character `GameCharacter` Prisma SQLite model.
- **Authoritative Server**: Scaffolded `game-server.js` using `socket.io` for synchronized movement and 4v4 Agility/Speed turn-based combat.
- **Character Creator**: Implemented `character-creator.tsx` with dynamic classes (Brawler, Invoker, Ranger, Artisan) setting preset skill levels.
- **Profile Integration**: Displayed active MMO characters on the public profile (`app/(main)/user/[username]/page.tsx`) with a "Play Now" launcher.

---



















