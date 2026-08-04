# Studio resume + Heroes CatalogEditorShell

Date: 2026-08-04  
Branch: `main`

## Health check after duplicate strip

- HEAD includes strip (`c212dac`) + author session (`24024b6`)
- Studio contracts intact: `/studio` `lobby: false`, author session, Catalog docks, `ClassEditorPanel` only
- Foundation unit tests: 11/11 pass
- Ghost files may still exist on disk (`GameConfigManager`, `CreatureDb`, `CreatureBattleScene`) but are **not imported** — do not rewire them

## This change

- `StarterHeroEditorPanel` migrated onto `CatalogEditorShell` (toolbar / list / form chrome)
- Fixed author-session `hydratePlayer` (`currentMapId` is not on `PlayerState`)

## Next

- PIE private shard
- Definition undo stack
- Debug overlays
