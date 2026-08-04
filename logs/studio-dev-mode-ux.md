# Studio Development Mode UX

Date: 2026-08-04
Branch: `giogimic/studio-dev-mode-ux-e53a`

## Goal

- Cut Build Mode branding; Studio opens in **Development** mode.
- Keep **Walk Mode** for play-testing only.
- Clearer feature descriptions, easier tools, stronger visuals while painting.
- Drag-to-paint and reliable map state updates.

## Progress

- [x] Editor store defaults + Development mode entry (`develop` replaces `build` mode id)
- [x] Studio shell mode strip / tool HUD redesign (`StudioPaintHud`, dock blurbs)
- [x] World Builder + Logic palette readability
- [x] Drag paint + sync `activeMapData` + clearer logic overlay colors
- [x] Walk Mode click-to-move does not drag-repath
- [ ] Tests / lint / commit

## Notes

- PanelId `build` remains the World Builder dock id (permissions matrix unchanged).
- Default brush is solid grass GID `17` (not stair fragment `1`).
- Paint mutates shared map object and marks `mapDirty`; Save Map clears dirty.
