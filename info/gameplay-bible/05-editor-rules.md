# Saints Gaming — Gameplay Bible: Editor Rules (Draft v0.2)

# Editor Identity

## The Editor is the Foundation of Saints Gaming

The editor is not just a developer tool. It is the reason Saints Gaming can grow.

The exact same systems used to import, rebuild, and enhance Tuxemon will eventually allow creators to make entirely new games. 

Everything in Saints Gaming should eventually be created through the same systems used by developers, creators, and advanced players.

The goal:
**Anyone can create. Experts can build worlds.**

---

# Editor Purpose

The editor exists to allow creation of:
* Maps
* Areas
* Buildings
* Objects
* NPCs
* Creatures
* Quests
* Events
* Interfaces
* Player experiences

The editor turns Saints Gaming from a fixed game into a living platform.

---

# Core Editor Rule

## Everything is an Object

The biggest transition:

Old system:
`Image + Tile + Position`

New system:
```
Object
- Position
- Rotation
- Size
- Collision
- Interaction
- Ownership
- State
- Rules
```

A tree is not a picture. A tree is a gameplay object. It can block movement, produce resources, grow, be harvested, be decorated, or be replaced.

---

# Editor Modes

The editor has multiple levels of complexity.

---

# Mode 1 — Player Builder

Designed for normal players. Purpose: Personal creativity.

Allows:
* Place objects
* Move/Rotate objects
* Decorate spaces
* Save layouts
* Share creations

Examples: Build a house, decorate a base, create a shop.

---

# Mode 2 — Creator Editor

Designed for advanced creators.

Allows:
* Build maps
* Place NPCs
* Create interactions
* Design events
* Configure objects
* Create gameplay areas

Examples: Adventure zones, mini-games, community worlds.

---

# Mode 3 — Developer Tools

Designed for core development.

Allows:
* Create systems
* Modify assets
* Manage databases
* Configure world rules
* Import content (e.g., Tuxemon map conversions)

---

# Map Creation Rules

Maps should not feel like painting. They should feel like building a world.

## Layer System
* **Environment Layer**: Ground, Water, Terrain, Background
* **Object Layer**: Buildings, Furniture, Decorations, Interactive items
* **Gameplay Layer**: NPCs, Triggers, Spawn points, Encounters, Events
* **Logic Layer**: Quests, Conditions, Scripts, Rewards

---

# Legacy Compatibility Rule

Saints Gaming supports two map systems.

## Legacy Mode
Purpose: Import and preserve existing content.
Uses: Existing Tuxemon-style maps, original tile placement, existing collision data. This allows fast migration and proves the engine can support existing RPG standards.

## Modern Object Mode
Purpose: Future development and creation.
Everything converts into placeable objects, editable systems, and interactive assets. This becomes the primary system for new Saints Original MMO experiences.

---

# Asset Rules

Assets should never be trapped as images. Every asset has:

## Visual Data
Sprite/model, Animation, Appearance

## Gameplay Data
Collision, Interaction, Permissions, Uses, Crafting links

---

# Placement Rules

Building should be:
* **Simple**: Quickly select, place, move, delete, save.
* **Precise**: Snap placement, adjust layers, modify coordinates.
* **Safe**: Prevent broken maps, impossible collisions, performance issues.

---

# NPC Rules

NPCs are reusable objects with Appearance, Location, Dialogue, Behavior, Conditions, and Rewards.
Future integration includes schedules, shops, and dynamic reactions.

---

# Interaction Rules

Objects should have predictable behavior (e.g., Door opens/teleports/locks, Tree produces wood, Machine crafts).

---

# Publishing Rules

Creators control visibility:
* **Private**: Only owner
* **Friends**: Selected players
* **Public**: Available to community
* **Featured**: Promoted by the game

---

# Quality Rules

Created content should follow standards before publishing:
✓ Performance ✓ Collision ✓ Accessibility ✓ Player safety ✓ Multiplayer stability

---

# AI / Generation Rule

AI-assisted creation supports creators; it does not replace them. Uses include suggesting layouts, generating placeholder assets, or writing dialogue. Final control stays with the creator.

---

# MVP Editor System

First usable version:
✓ Load maps
✓ Place objects
✓ Save objects
✓ Edit properties
✓ Basic NPC placement
✓ Collision editing
✓ Publish/share creations

---

# Long-Term Vision

The editor becomes the reason Saints Gaming can grow forever.

Developers create the foundation.
Players create experiences.
The community expands the world.

---

# Final Editor Rule

**If a player can imagine a place, Saints Gaming should eventually give them the tools to build it.**
