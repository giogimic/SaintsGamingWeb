# Saints Gaming — Gameplay Bible

**Status:** Draft set ingested 2026-08-02 (16 pages) + Studio economy architecture (17)  
**Role:** Product + systems constitution for the MMO / engine / Studio  
**Companion vision:** [`../vision/ECOSYSTEM.md`](../vision/ECOSYSTEM.md)

Read order for implementers: **01 → 07 → 06 → 12**, then topic docs as needed.  
Always pair **08 + 16 + 17** for editor work. Always pair **02 + 07 + 11** for combat/capture.

---

## Index

| # | File | Topic |
| ---: | :--- | :--- |
| 01 | [`01-gameplay-bible.md`](./01-gameplay-bible.md) | Identity, fantasy, core loop |
| 02 | [`02-combat-system.md`](./02-combat-system.md) | Real-time MMO combat decision |
| 03 | [`03-lobby-purpose.md`](./03-lobby-purpose.md) | Lobby as living hub |
| 04 | [`04-base-system.md`](./04-base-system.md) | Personal / guild / public bases |
| 05 | [`05-editor-rules.md`](./05-editor-rules.md) | Editor modes & object rules |
| 06 | [`06-mpv.md`](./06-mpv.md) | Minimum Playable Version |
| 07 | [`07-technical-economic-rules.md`](./07-technical-economic-rules.md) | **Constitution** — authority, capture, economy |
| 08 | [`08-world-building-editor-architecture.md`](./08-world-building-editor-architecture.md) | Map layers, DB, UGC flow |
| 09 | [`09-progression-27-skills.md`](./09-progression-27-skills.md) | Skill curve & matrix (overview) |
| 10 | [`10-web-architecture-persistence.md`](./10-web-architecture-persistence.md) | Next.js boundary, hot/cold state |
| 11 | [`11-turn-based-battle-engine.md`](./11-turn-based-battle-engine.md) | Capture / TB battles |
| 12 | [`12-demo-vertical-slice-roadmap.md`](./12-demo-vertical-slice-roadmap.md) | Vertical-slice phases |
| 13 | [`13-database-event-architecture.md`](./13-database-event-architecture.md) | Prisma + socket dictionary |
| 14 | [`14-skills-economy-deep-dive.md`](./14-skills-economy-deep-dive.md) | Full 27 skills + sinks |
| 15 | [`15-quests-dialogue-npc-ai.md`](./15-quests-dialogue-npc-ai.md) | Quests, dialogue, NPC FSM |
| 16 | [`16-studio-editor-philosophy.md`](./16-studio-editor-philosophy.md) | Creator UX / Studio philosophy |
| 17 | [`17-studio-world-builder-economy.md`](./17-studio-world-builder-economy.md) | Studio isolation, layers, entities, loot/economy |

## Alignment

Codebase gap analysis (honest vs roadmap checkboxes): [`ALIGNMENT.md`](./ALIGNMENT.md)

## Golden rules (from bible)

1. Does this make the world feel more **alive**, more **social**, or more **creative**? If not, it waits.
2. Client requests; **server decides**.
3. Capture is **turn-based only** — never on the MMO hotbar.
4. Editor exposes **game concepts**, not engine internals (08 + 16).
