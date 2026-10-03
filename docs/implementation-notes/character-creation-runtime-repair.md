# Character creation and runtime repair — 2026-10-03

## User requirements

Archetypes are playable character foundations configured during initial setup after a wipe. They support body/face and wardrobe choices for player creation. NPCs support assembled appearances that can be copied independently of dialogue/behavior. Monsters and Creatures accept only complete nonplayer models such as Imp/Puglin or user uploads. Setup/player previews must show the saved appearance, retain a real head, and animate. Live movement animations are required; mapped action animations should remain usable.

## Workspace and continuity

Base commit: `ee295934` (2.2.109). Implementation checkout: `C:\Users\Matth\.codex\worktrees\quaternius-integration\Saints Web`, branch `codex/quaternius-integration`. User's standing instruction is to integrate and push on main. No database wipe, migration, or source asset fabrication is authorized/needed. The local inspected `prisma/dev.db` has no actor/catalog rows and cannot reproduce the user's saved world. Prior catalog counts and passing unit checks did not demonstrate rendered geometry or playback.

## Confirmed causes

1. `prepare-quaternius-base-regions.ts` used accessor labels (`getName()`) as glTF attribute semantics. Both generated bases had body-region attributes `{ "": accessor }` instead of POSITION/NORMAL/JOINTS_0/WEIGHTS_0. Original eyes/eyebrows meshes remained valid: this explains floating eyes. Regenerate from preserved full-body source with `listSemantics()`.
2. Legacy substring hiding could hide `QuaterniusBody_Head` with `body`, defeating region rules. Only clothing-covered regions may be hidden; the base head stays visible.
3. Creation preview callers discard saved URLs/presentation. NPC get/set helpers drop URL, import transform, animation profile, mappings and material/rig data. Player initialization only honors undocumented `isStarterOutfit`, dropping `defaultVisible` authored clothes.
4. Preview loads embedded animations only; the bases have none. It hides load failures, can retain stale models, relies on a remote environment HDR and a fixed camera regardless of imported bounds.
5. Live fallback profiles are skipped when animation config is present but empty; explicit saved URLs bypass catalog hydration. Animation changes are absent from renderer signatures. Per-file clip selectors incorrectly demand file names match internal clip names such as `Unreal Take`.
6. Monster/Creature editors expose wardrobe assembly and legacy category filtering excludes complete generic MODEL uploads. Role eligibility must inspect imported structure/component/playable metadata.
7. Onboarding actor scope defaults to `default`, publication hardcodes `saints`. Publication reads obsolete NPC `templateId/spriteId` and creature sprite fields, losing current appearances and dependencies.

## Implementation plan / ownership

- [x] Root: correct base preprocessing semantics; regenerate male/female GLBs.
- [ ] Root: assert renderable attributes/skin/indices and triangle preservation; protect base head in both preview and Babylon hiding.
- [ ] Root: `ArchetypeModelPreview3D` accepts `worldModel` full binding, resolves catalog + authored data, clears stale state, reports errors, frames visible bounds and previews external mapped clips with safe rig retargeting.
- [ ] Root: discover editable internal mesh parts from asset definitions and canonical models in `ModelWardrobeEditor`.
- [ ] creation_flow_audit: preserve NPC/full creator bindings, share default wardrobe selection, initial/player review previews, focused picker previews, copy/import/export NPC visual snapshot, correct onboarding scope.
- [ ] role_model_audit: shared actor-role eligibility, full asset-to-model binding, strict Monster/Creature picker + no wardrobe assembly, retain release appearance/asset dependencies and Go hydration.
- [ ] live_animation_audit: animation fallback/hydration/signature, locomotion/action priorities, single-file versus named-bank clips, retarget rig targets, attachment bone synchronization, actual playback proof.
- [ ] Root: focused regression checks requested by user, actual visual and motion checks, typecheck/build, independent code review, v2.2.110 changelog/version/handoff, commit/integrate/push main.

## Cross-task interface

`WorldModelValue` keeps `assetId` (identity) AND `modelUrl/source` (resolved location), import `modelScale/modelRotationY/grounding/cameraHeightOffset`, actor `scale` multiplier, animation profile/config, rig/material/socket/assetDefinition metadata and `modularAttachments`. Import scale and actor scale multiply once at render boundary. Preview accepts this full value via optional `worldModel` while preserving legacy props. Shared role checks distinguish complete models from components irrespective of legacy database type.

## Verification required / risks

Check both base GLBs have valid POSITION/NORMAL/JOINTS_0/WEIGHTS_0, nonempty indexed head and conserved total body triangles. Show an assembled base with head and clothing. Advance actual loaded animation groups/mixer and assert bone transforms change for idle/locomotion/jump; test named banks and sole differently named clips. Check role filter rejects playable bases/components for Monsters/Creatures and accepts complete nonplayer uploads. Check default clothes survive creation and appearance survives release JSON. A compatible humanoid may use UAL; arbitrary quadrupeds/custom rigs require their own compatible mappings. Do not claim all uploaded rigs can use humanoid animation.

## Progress and evidence

Initial geometry inspection confirmed empty semantic keys in all five regions on male and female; original full-body GLBs contain correct semantic attributes. Generator corrected and both files regenerated successfully. Remaining verification and agent findings will be recorded here before completion.
