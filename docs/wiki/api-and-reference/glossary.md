# Canonical Terminology & Systems Glossary

This glossary defines standard terminology, engine acronyms, and gameplay classifications across the Saints Gaming codebase and documentation.

---

## 1. Core Platform & Player Identities

| Term | Category | Definition |
| :--- | :--- | :--- |
| **Saint** | Player Identity | The canonical operative identity and title given to player characters within the 2.5D sandbox world. |
| **World Studio** | Developer Tool | The comprehensive in-engine world builder, catalog editor, and script creation suite accessible via `/studio`. |
| **Saints Gaming Hub** | Web Platform | The unified social web interface (`/home`, `/forum`, `/news`) connecting community members. |
| **Shard Channel** | Networking | A discrete real-time socket channel (e.g. `DEMO_SANDBOX_ch1`) hosting synchronized peer instances on a given map. |

---

## 2. Combat & Encounter Terminology

- **Hero Battles:** Real-time overworld MMO combat against wild beasts and hostile monsters, utilizing hotbar abilities, target frames, and auto-attacks.
- **Saints Buddy Battles:** Instanced turn-based companion creature duels triggered by wild encounter grass tiles (Logic Tag `4`) or trainer challenges.
- **Player Battles:** Direct competitive PvP duels between Saints taking place in designated wilderness zones or duel arenas.
- **Binding Crystal:** Magical consumable items used in Saints Buddy Battles to weaken and capture wild companion creatures.
- **Shiny Variant:** An ultra-rare palette alteration of a companion beast featuring distinct hue shifts and sparkling particle crowns (base chance $1/512$ or $1/4096$).

---

## 3. World Authoring & Studio Terms

- **GID (Global Tile ID):** A unique numerical integer indexing specific $16 \times 16\text{ px}$ or $32 \times 32\text{ px}$ tiles across imported texture atlases.
- **Dual-Grid Map:** An architectural system pairing multi-layered visual tile arrays (`tileLayers`) with a flat integer logic collision array (`Layer -1`).
- **Logic Tag:** An integer ($0\text{--}6$) assigned to a map cell designating runtime collision, water, warps, encounter zones, or hazard damage.
- **PIE (Play-In-Editor):** The instantaneous runtime testing mode toggled with **Ctrl+E** inside Studio, executing live physics and gameplay simulation.
- **Chunk Remeshing:** Subdividing map meshes into $16 \times 16$ tile batches to allow real-time partial re-rendering during painting passes.

---

## 4. Technical & Architectural Acronyms

| Acronym | Full Form | Meaning in Saints Gaming Engine |
| :--- | :--- | :--- |
| **AOI** | Area of Interest | The $16 \times 16$ spatial grid system that shards socket traffic to nearby players within a $3 \times 3$ chunk window. |
| **LPC** | Liberated Pixel Cup | The open sprite compositing standard used for character bodies, hairstyles, apparel, and weapon layers. |
| **FCT** | Floating Combat Text | Animated 3D billboard text rendering damage numbers, healing, and critical hits above targets in Babylon.js. |
| **Lerp** | Linear Interpolation | The smoothing formula used by the client loop to reconcile remote entity positions against server authoritative ticks. |
