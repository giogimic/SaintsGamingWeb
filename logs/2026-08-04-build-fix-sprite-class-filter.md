# Build fix — SpriteBrowser SpriteClassFilter

Date: 2026-08-04

## Failure

Docker `npm run build` typecheck:
`SpriteBrowser.tsx:204` — `Property 'name' does not exist on type 'SpriteClassFilter'`.

Left over from CharacterClassSystem strip: local `SpriteClassFilter` only had filter fields, UI still read `.name`.

## Fix

- Optional `name?: string` on `SpriteClassFilter`
- UI fallback: `classDef.name || 'Filter'`
- `studioTilesetBootstrap.test.ts`: type empty `tileLayers`/`tilesets` so `never[]` inference does not fail Next typecheck
