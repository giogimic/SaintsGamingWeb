# Scripts folder cleanup

Date: 2026-08-05

## What changed

Cleaned up scripts/ to remove Tuxemon import/sync/copy tooling and other now-obsolete one-shots that were no longer referenced by package.json, entrypoint.sh, or the docs.

## Deleted (git-tracked)

### Tuxemon import/sync/copy family
- scripts/import-tuxemon-data.ts
- scripts/import-tuxemon.ts
- scripts/import-tuxemon.mjs
- scripts/import-tuxemon-assets.ts
- scripts/batch-import-tuxemon.ts
- scripts/export-tuxemon-db.ts
- scripts/convert-tuxemon-maps.ts
- scripts/copy-tuxemon-assets.ts
- scripts/copy-tuxemon-db.ts
- scripts/import-full-tuxemon-campaign.ts
- scripts/reimport-rich-tuxemon-maps.ts
- scripts/reimport-spyder-rich-layers.ts
- scripts/sync-tuxemon-to-creature-defs.ts
- scripts/import-map-npcs-from-tmx.ts
- scripts/restore-curated-creatures.ts

### Obsolete one-shot / generator scripts
- scripts/seed-tiles.ts
- scripts/seed-sandbox.js
- scripts/update_sandbox.js
- scripts/seed-recipes.ts
- scripts/seed-content.ts
- scripts/seed-modpacks.ts
- scripts/seed-roles.ts
- scripts/seed-levels.ts
- scripts/seed-game-assets.ts
- scripts/seed-game-assets-from-public.ts
- scripts/seed-azure-campaign-guide.ts
- scripts/create-test-map.ts
- scripts/setup-defaults.ts
- scripts/fix-imports.js
- scripts/migrate-imports.js
- scripts/clean-em-dashes.ts
- scripts/bump-version.js
- scripts/gen-sizes.js
- scripts/generate-sql.ts
- scripts/generate-assets-list.mjs
- scripts/generate-sprite-list.mjs
- scripts/generate-atlases.ts
- scripts/build-tile-registry.ts
- scripts/process-custom-assets.mjs
- scripts/setup-env.mjs
- scripts/visual-interface-editor.mjs

## Retargets / scrubs

### package.json
Removed npm scripts that pointed at deleted files:
- import:tuxemon
- sync:creatures
- eimport:spyder-layers
- import:map-npcs

### entrypoint.sh
Removed the fresh-DB call to 
px tsx scripts/import-tuxemon-data.ts || true.
The server boot path now relies on src/server/DemoBootstrap.ts via server.ts calling ootstrapDemoContent().

### Docs
Updated references to removed scripts:
- info/game/CLASS_SKILLS_SHINY.md
- info/database/WORLDMAP.md
- info/game/SPYDER_SMOKE.md

Also updated a stale header comment:
- scripts/seed-campaign-npcs.ts

## Verification
- Ran 
pm test (vitest): all tests passed.

## Git
Commit produced for the cleanup scrub.
