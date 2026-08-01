# CONTINUE HERE — AI / Dev Handoff

**Last updated:** 2026-08-01  
**Point every new agent session at this file first.**

This folder (`/info/`) and `/logs/` are internal knowledge. Public repo docs are: `README.md`, `CHANGELOG.md`, `docs/TUXEMON_ATTRIBUTION.md`.

---

## Current Focus

**Ecosystem bridges in progress — Discord + achievement automation landed (v2.1.99).**

### Done

- **M1–M4**: Realtime platform + MMO AOI/binary/Redis scaling
- **Discord bridge (v2.1.99)**: `POST /api/discord/events` + `info/discord/BRIDGE.md`
  - Actions: `member_joined`, `role_sync`, `community_announce`, `link_account`
  - Events: `discord.member.linked`, `discord.role.synced`, `discord.community.announce`
  - OAuth syncs `User.discordId`
- **Achievement automation (v2.1.99)**:
  - New badges: `first_reply`, `social_starter`, `tipper`
  - Auto-award + live notification on unlock
  - Wired after forum replies, social posts, tips (threads/friends/login already existed)

### Next concrete steps (in order)

1. Finish campaign map migration `campaign-maps.ts` → `WorldMap` DB
2. Optional: FiveM → `/api/internal/events` character/stats bridge
3. Optional: S3/CDN for uploads; deeper multi-client AOI soak test

---

## Mandatory Read Order (before coding)

1. **This file** — current task
2. `info/AI_DEVELOPMENT_RULES.md` — constraints + existing solutions
3. `info/PROJECT_REPORT.md` — what exists / broken / order
4. Discord bot: `info/discord/BRIDGE.md`
5. If realtime: `info/realtime/ARCHITECTURE.md` then `info/realtime/EVENTS.md`
6. `/logs/LOCAL_CHANGELOG.md` — recent local work notes
