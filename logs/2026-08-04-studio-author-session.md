# Studio author session (avatar-free)

Date: 2026-08-04  
Branch: `main`

## Change

Studio no longer requires Choose Hero before editing.

- `enterStudioAuthorSession()` in `src/web/components/the-lobby/index.tsx` loads `DEMO_SANDBOX`, hydrates a ghost player from the NextAuth account, enters Development Mode, joins the map room.
- Auth init: if `enableStudio` and no `?characterId=`, call author session instead of `CHARACTER_SELECT`.
- Character selector `onCancel` → back to author session.
- Studio dock **Hero** opens character select for optional Playtest characters.
- Autosave remains gated on `activeCharacterId` (author sessions do not persist character JSON).

## Files

- `src/web/components/the-lobby/index.tsx`
- `src/web/components/the-lobby/character-selector.tsx`
- `src/web/components/the-lobby/editor/StudioEditorShell.tsx`
- `logs/studio-first-hybrid-foundation.md`
- `info/CONTINUE.md`

## Test

1. Pull / deploy, open `/studio` logged in as Admin.
2. Expect Editor tools on DEMO without Choose Hero; player mesh hidden in Editor.
3. Click **Hero** → pick character → Playtest with avatar.
4. From selector, **Back to Author Session**.
