# Studio — Definition undo on Creature + Dialogue (P11)

**Date:** 2026-08-05  
**Branch:** `giogimic/studio-catalog-def-undo-2d3d`

## Goal

Reuse the Quest blur-stack definition undo (bible 30) on Creature and Dialogue catalogs. Class/Loot stay unwired.

## Changes

| Piece | What |
| :--- | :--- |
| `useDefinitionFormHistory.ts` | Shared blur-snapshot helper over `editor-store` definition op stack |
| `CreatureDefEditorPanel.tsx` | Focus/blur field recording; structural commits for passives/sprites/checkboxes; CatalogEditorShell undo/redo |
| `DialogueEditorPanel.tsx` | Consolidated `DialogueForm`; same blur + structural pattern for nodes/options/raw JSON |

## Resource keys

- `creature:new` / `creature:<slug>`
- `dialogue:new` / `dialogue:<npcId>`

Top-of-stack must match the open resource (same as Quest). Select / New / Save / Delete clear the prior key.

## Verify

1. Catalog → Creature → edit name → blur → Undo restores prior name  
2. Script → Dialogue → edit node text → blur → Undo  
3. Add/remove node or option → Undo restores structure  
4. Map paint Ctrl+Z remains independent (definition stack is separate)

## Out of scope

Class / Loot definition undo; CRDT collab; map paint stack changes.
