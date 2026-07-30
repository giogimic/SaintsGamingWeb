# Tuxemon Engine Unification

Saints Gaming Web integrates a fully custom 2.5D game engine built on top of the open-source **Tuxemon** game data. We have merged Tuxemon's creature mechanics, movesets, catch rates, and map layouts with a custom OSRS-inspired 27-skill RPG matrix.

## 2.5D Isometric World (Babylon.js)

The overworld is rendered using a `BabylonEngine` class built on top of Babylon.js.
It parses JSON representations of Tuxemon `.tmx` map layers (Floors, Walls, Overworld objects) into a 3D orthographic environment.

### Character & NPC Rendering
Characters and NPCs are rendered as 2D pixel-art sprite billboards in the 3D world.
- 4-directional movement with 3-frame animation loops (extracted directly from standard Tuxemon spritesheets).
- Rendering uses `NEAREST_SAMPLINGMODE` (no blurring) for crisp pixel art, with an explicit `Math.PI / 4` (45-degree) backward tilt to perfectly align with the orthographic camera.

## Database & Ecosystem
We imported the Tuxemon dataset into the primary MariaDB database:
- 411 Tuxemon Species
- 274 Techniques & Movesets
- 235 Map definitions

### Data Generation Scripts
The `scripts/` directory contains tools to manage and slice the dataset:
- `import-tuxemon-data.ts`: Seeds the MariaDB database with species and moveset data from the local `tuxemon-db` YAML files.
- `generate-atlases.ts` & `copy-tuxemon-assets.ts`: Slices and organizes texture atlases from raw `.png` spritesheets.
- `validate-maps.ts`: Audits the map configurations and collision boundaries.

## Open Source Attribution

All Tuxemon assets, creature designs, and world maps are derived from the open-source [Tuxemon](https://www.tuxemon.org) project and the Liberated Pixel Cup (LPC). Full attribution is provided in `TUXEMON_ATTRIBUTION.md`.
