# 🎮 Game Systems Documentation

This folder documents all player-facing game mechanics, client runtime architecture, combat, networking, and progression systems in **Saints Gaming**.

---

## 📑 Contents

1. **[Architecture & Core Loop](architecture-and-loop.md)**
   - Babylon.js 2.5D orthographic camera and viewport.
   - Client game loop with `requestAnimationFrame`, tick interpolation, and movement predictions.
   - Separate UI layer (React HUD) vs WebGL rendering canvas.

2. **[27-Skill Progression & Master Capstones](skills-and-progression.md)**
   - Complete 27-skill proficiency matrix (Combat, Gathering, Artisan, Support).
   - Mathematical XP curves, level thresholds (Lv 1–99), and calculations.
   - Grandmaster Capstones: Max Cape of the Grandmaster, Sanctum Master Totem, Completionist Cape.
   - 270 Battlepass cosmetic tiers and 29 Skill Cape Emotes with WebAudio visual FX.

3. **[Combat & Encounter Systems](combat-and-encounters.md)**
   - Real-Time Overworld Combat: hotbar abilities, cooldowns, targeting frame, floating damage numbers.
   - Instanced Turn-Based Creature Battles: elemental matchups, move selections, capture crystal mechanics.
   - Monster spawners, aggro tables, and shiny variations.

4. **[Networking & Hybrid Go MMO Backend](networking-and-multiplayer.md)**
   - Go MMO socket server (`go-mmo/`) on `:3001` with area-of-interest (AOI) spatial sharding.
   - Realtime movement packet codecs, client interpolation, and position correction.
   - Character persistence in MariaDB/MySQL and emergency Node.js socket fallback.

5. **[Economy, Items & Loot](items-and-economy.md)**
   - Item DB schemas, equipment slots, tool tiers, and weapon statistics.
   - Harvesting nodes (ores, trees, fishing spots) and artisan crafting recipes.
   - Dynamic loot tables, drop weights, and Grand Trade Exchange.

6. **[Mobile Touch Mode & UI](mobile-and-ui.md)**
   - Mobile touch joystick, action button clusters, and fullscreen launcher.
   - Dockable UI preset system, minimap radar, overhead chat bubbles, and audio synthesis.
