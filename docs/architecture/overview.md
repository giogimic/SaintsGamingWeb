# Architectural Overview & Core Philosophy

**Saints Gaming is a creator-driven MMO game engine and platform where players explore, battle, build, and shape the world itself.**

It operates with a dual identity:
1. **The Saints Gaming Engine:** A powerful Babylon.js-driven multiplayer platform supporting skills, inventory, hotbars, MMO social features, object-based worlds, and persistent player systems.
2. **The Tuxemon Reference World:** The first complete, playable game package built on the engine. Tuxemon acts as the compatibility benchmark—if the engine can faithfully run a complete Tuxemon RPG (with its maps, NPCs, story, encounters, creatures, and evolution), the foundation is proven.

The goal is to make the full Tuxemon experience playable inside Saints Gaming, while upgrading it with Saints MMO systems. Tuxemon is not a temporary prototype or throwaway demo. It is the proof of the engine.

## The Core Player Fantasy

> *"I can explore a living world, collect powerful creatures, build my own place, develop my skills, play with friends, and eventually create parts of the world myself."*

## The Core Gameplay Loop

The loop encompasses both playing existing worlds and creating new ones. The player journey follows this path:
**Explore → Collect → Progress → Build → Create → Share**

### 1. The Central Hub (The Lobby)
The lobby is not a menu. It is a living MMO location where players meet, form parties, trade, manage inventories, and access adventures.

### 2. Exploration & Collection
Players travel into different world zones (forests, ruins, player-created areas) to discover NPCs, quests, and hidden areas. Creatures are discovered via traditional wild encounters (tall grass) and as physical roaming monsters that trigger real-time MMO combat.

### 3. Real-Time MMO Combat
Combat uses a real-time MMO system, upgrading the traditional creature battle format with ability hotbars, cooldowns, equipment, and party combat roles (Damage, Support, Tank).

### 4. Progression & Base Building
Players level up 27 distinct gathering, crafting, survival, and combat skills. They can capture, train, and breed creatures. Furthermore, players own customizable spaces where they can build shelters, workshops, and automated resource systems using the object-based building system.

### 5. Creator Tools
The engine is creator-driven. The exact same tools used to rebuild Tuxemon are exposed to players, allowing them to build maps, place objects, design quests, and create events.

## The Golden Rule

Every feature built into the architecture must answer:
**"Does this make the world feel more alive, more social, or more creative?"**
If not, it waits.
