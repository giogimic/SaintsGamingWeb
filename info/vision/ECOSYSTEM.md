# Saints Gaming — Ecosystem Vision

**Authoritative product north star.** Prefer improving and integrating existing systems over replacements.

---

## Overview

Saints Gaming is a unified gaming ecosystem that combines a modern community platform with a persistent online multiplayer game.

The long-term vision is for the website, MMO, game editor, administration tools, realtime services, and community features to function as one seamless experience rather than separate applications.

---

## The Game

The game is a modern top-down online RPG built with Babylon.js, combining persistent multiplayer with creature collection, strategic turn-based creature battles, real-time character progression, exploration, quests, NPCs, professions, gathering, crafting, housing, guilds, player trading, social systems, world events, and an extensive content editor.

Players explore a living world where they can discover, collect, train, evolve, and build teams of unique creatures. These creatures form a major part of gameplay through strategic turn-based battles, progression, collection, and exploration. Alongside creature gameplay, players develop their own character through skills, equipment, professions, achievements, and long-term progression within a persistent online world.

The experience blends creature collecting, MMO progression, social gameplay, and community-driven content into one connected ecosystem. The goal is to create a world where both player progression and creature progression feel equally meaningful and naturally support one another.

---

## The Website

The website is not simply a companion site. It is an extension of the game itself, allowing players to manage their account, characters, creatures, inventory, guilds, community interactions, messaging, notifications, achievements, and future game services from one connected platform.

---

## The Editor (Studio)

The editor is a core product, not just a development tool. It will eventually allow authorized users to build maps, quests, NPCs, encounters, dialogue, events, creatures, items, and other game content using the same systems that power the live world.

Current entry: `/studio` (Developer+). Player play surface: `/lobby`. Staff moderation/admin commands live in-game via the Staff floating menu (Moderator+).

---

## Architecture Principles

The project is being developed with a long-term focus on maintainability, scalability, and clean architecture. Existing systems should be improved, completed, and integrated rather than replaced. Every feature should naturally connect with the rest of the ecosystem so the final experience feels like one cohesive platform rather than a collection of independent systems.

When making decisions, always consider the entire Saints Gaming ecosystem—not just the individual file or feature currently being modified. Every improvement should strengthen the overall architecture, preserve consistency, reduce technical debt, and move the project closer to a polished, production-quality platform.

---

## Related

- Game systems: [`../game/OVERVIEW.md`](../game/OVERVIEW.md)
- Permissions: [`../admin/PERMISSIONS.md`](../admin/PERMISSIONS.md)
- Public vision notes: `docs/vision/`
