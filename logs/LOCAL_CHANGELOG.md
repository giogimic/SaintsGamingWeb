# Local Changelog

## 2026-08-04 — Staging build break (duplicate import)

### Problem
Docker deploy on staging failed at `next build`:

`GameCanvasBabylon.tsx` — `Identifier 'useEditorStore' has already been declared`

Cause: PR #26 (`e015f61`) added a second identical import of `useEditorStore` (lines 7 and 22).

### Fix
- Removed duplicate import in `src/web/components/the-lobby/babylon/GameCanvasBabylon.tsx`
- Ran `npx prisma generate` (stale client missing `globalShinyChancePercent`)
- `npm install` (missing `@aws-sdk/client-s3` after pull)
- **Verified:** `npm run build` succeeds on `main` + this one-line fix
- Committed and pushed to `origin/main` (`4d1ba70`)

### Deploy note
Staging: pull latest `main`, rebuild the web container.

---

## 2026-08-04 — Game engine editor foundation (Phase 1 + 2a)

See `logs/studio-first-hybrid-foundation.md`.

- Phase 1: Editor/Playtest hard split, worldDocument paint path, EditorOp undo, canonical mode labels
- Phase 2a: editor camera pan (MMB / Space+drag), CatalogEditorShell, SchemaFieldRenderer on NPC panel

---

## 2026-08-04 — Remote branch merge readiness

Compared all `origin/giogimic/*` tips to `origin/main` (`e015f61`).

### Already in main (safe to delete remote branches)
| Branch | Notes |
| :--- | :--- |
| `giogimic/realtime-milestone-2-1aba` | Merged via PR #1 |
| `giogimic/branch-cleanup-defeat-fix-49b4` | Tip is ancestor of main |
| `giogimic/studio-architecture-phase1-370c` | Tip is ancestor of main |
| `giogimic/studio-demo-tileset-seed-370c` | Tip is ancestor of main |
| `giogimic/studio-demo-visible-ground-49b4` | Tip is ancestor of main |
| `giogimic/studio-master-architecture-49b4` | Tip is ancestor of main |
| `giogimic/studio-paint-permissions-ux-49b4` | **0 file diff** vs main (squash #26) |
| `giogimic/studio-dev-mode-ux-e53a` | Content landed in #26 |
| `giogimic/studio-paint-and-permission-fixes-72c8` | Content landed in #26 |
| `giogimic/studio-paint-and-permission-audit-56ee` | Content landed in #26 |
| `giogimic/studio-systems-audit-e53a` | Audit docs on main; tip behind #26 |

### Do **not** merge (stale / would regress)
| Branch | Why |
| :--- | :--- |
| `giogimic/lobby-click-pass-all-49b4` | Older than main; removes Admin-only Start Realm gate already on main |
| `giogimic/ucp-back-line-1aba` | Docs-only intent already on main `CONTINUE` / `PROJECT_REPORT`; tip is ~80 commits behind |
| `giogimic/studio-paint-permissions-audit-*` | Older audit docs; merging would drop newer #26 code |

### Verdict
**No feature branches need merging right now.** Main already has the Studio paint/permission/Dev Mode work via #26. Only blocker for staging is the duplicate-import fix above.
