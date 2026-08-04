# Saints Gaming — Gameplay Bible: Combat System Decision (Draft v0.1)

> **Studio combat/ability/status editors:** [`25-studio-gameplay-editors.md`](./25-studio-gameplay-editors.md) · TB: [`11`](./11-turn-based-battle-engine.md)

# Combat Identity

**Saints Gaming uses real-time MMO-style combat with creature abilities, player skills, and cooperative party mechanics.**

The combat system is designed to support:

* Open-world exploration
* Multiplayer parties
* Creature collection
* Boss encounters
* Player progression
* Future MMO expansion

The goal is:

**Easy to understand like classic creature RPGs, but deep enough to support an MMO.**

---

# Combat Choice

## Decision: Real-Time Ability Combat

Saints Gaming will use:

* Real-time movement
* Target-based combat
* Hotbar abilities
* Cooldowns
* Player and creature skills
* Party roles

Inspired by:

* RuneScape-style combat flow
* MMO ability systems
* Creature RPG strategy

---

# Why Not Traditional Turn-Based?

Turn-based combat is excellent for small-scale creature battles, but it creates limitations for the game vision.

Problems:

### Multiplayer

A 4-player battle becomes:

Player 1 waits.
Player 2 waits.
Player 3 waits.

The world feels paused.

---

### Open World

A creature standing in the forest waiting for a turn feels disconnected from the environment.

Real-time combat makes creatures feel like they exist in the world.

---

### MMO Systems

Real-time supports:

* Raids
* World bosses
* Team strategies
* Player skill expression
* Movement mechanics

---

# Combat Structure

## Player Combat

Players have:

### Basic Attack

Always available.

Used for:

* Consistent damage
* Building combat rhythm
* Resource generation

---

### Ability Bar

Players equip abilities.

Example:

```
[1] Strike
[2] Fire Slash
[3] Shield Wall
[4] Heal
[5] Creature Command
```

Abilities have:

* Cooldowns
* Range
* Effects
* Resource costs

---

### Equipment

Equipment modifies play style.

Examples:

Sword:

* Higher damage

Staff:

* Magic abilities

Shield:

* Defense

Tools:

* Gathering/combat hybrid abilities

---

# Creature Combat

Creatures fight alongside players.

They are not replacements for players.

They are partners.

A creature has:

* Basic attacks
* Special abilities
* Elemental traits
* Evolution traits
* Fusion traits

---

Example:

## Forest Wolf

Abilities:

Bite:

* Basic attack

Pack Howl:

* Buffs allies

Root Trap:

* Slows enemies

Forest Spirit:

* Elemental regeneration

---

# Creature Commands

Players control creature behavior.

Simple commands:

* Attack
* Defend
* Follow
* Use ability
* Return

Advanced players can customize:

* Ability priority
* Behavior style
* Combat role

---

# Party Combat

Maximum:

## 4 Player Party

Each player can bring creatures.

Possible setup:

```
Player 1
Tank + Defensive Creature

Player 2
Damage + Offensive Creature

Player 3
Support + Healing Creature

Player 4
Control + Utility Creature
```

---

# Encounter Types

## Normal Encounters

Fast combat.

Examples:

* Wild monsters
* Random creatures
* Resource guardians

Goal:

Quick progression.

---

## Elite Encounters

Harder enemies.

Require:

* Better builds
* Team coordination
* Stronger creatures

Rewards:

* Rare drops
* Evolution items
* Special traits

---

## World Bosses

Large multiplayer events.

Examples:

* Ancient creatures
* Powerful monsters
* Community events

Designed around:

* Movement
* Teamwork
* Strategy

---

# Progression

Combat progression comes from:

## Player Skills

Examples:

* Melee
* Ranged
* Magic
* Defense
* Creature Handling

---

## Creature Mastery

Examples:

* Training
* Bond level
* Ability unlocks
* Evolution paths

---

## Equipment

Examples:

* Weapons
* Armor
* Accessories
* Creature items

---

# Difficulty Philosophy

The game should be:

## Easy To Start

A new player can:

* Click enemy
* Press abilities
* Win fights

---

## Deep To Master

Experienced players optimize:

* Builds
* Timing
* Party composition
* Creature combinations
* Ability rotations

---

# Combat UI

The combat interface should be consistent everywhere.

## Bottom Hotbar

Contains:

* Player abilities
* Creature abilities
* Items
* Commands

---

## Target Frame

Shows:

* Enemy health
* Status effects
* Weaknesses
* Drops

---

## Party Frames

Shows:

* Players
* Creatures
* Health
* Status

---

# Future Expansion

The combat system should allow:

* PvE raids
* PvP arenas
* Guild battles
* Creature tournaments
* Dungeon mechanics
* Boss mechanics
* Advanced classes

---

# Final Combat Rule

**Combat should feel like an MMO, but every creature should still feel like a collectible companion.**

The player is the hero.

The creature is the partner.

The world is the battlefield.

> **Constitution note (see `07-technical-economic-rules.md`):** Real-time MMO combat is for monsters / open-world enemies. **Capturing is turn-based only** — no capture on the MMO hotbar.
