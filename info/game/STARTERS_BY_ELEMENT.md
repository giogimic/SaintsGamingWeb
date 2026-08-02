# Demo Starters — One Per Element (Draft)

**Date:** 2026-08-02  
**Status:** Design draft (not fully wired)  
**Context:** Expands MPV beyond single-Rockitten claim; Q3 Grove Sanctuary nests.

Saints element language (from `saints-dex`) with Tuxemon type underneath for assets/combat data.

| Saints element | Tuxemon type | Nest (tutorial) | Starter slug | Display name | Role |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Solar** | fire | Ignis Scrub | `agnite` | **Pyre Drake** (Agnite) | Strength / burn affinity / bramble *Ignite* |
| **Bio** | wood | Verdant Sprout | `budaye` | **Thorn Bud** (Budaye) | Endurance / harvest synergy / *Vine Surge* |
| **Hydro** | water | River Pebble | `dollfin` | **Current Fin** (Dollfin) | Agility / fishing synergy / *Water Jet* |

**Assets present today**

| Slug | Battle sheet | Overworld NPC sprite |
| :--- | :---: | :---: |
| `agnite` | yes (`monster/battle/agnite-sheet.png`) | no — use battle sheet / placeholder until cut |
| `budaye` | yes | no — same |
| `dollfin` | yes | no — same |

**Earth / Geo note:** `rockitten` stays as the **wild RT + tall-grass test species** and optional 4th Geo nest later. Demo Q3 choose-one = the three above unless product wants Geo in the lab too.

---

## Starter profiles (demo numbers)

### Solar — Agnite / “Pyre Drake”
- **Level:** 5 · **HP:** 100  
- **Focus:** Physical Power high, Defense mid, Tempo mid  
- **TB opener:** `ram` / fire-flavored tackle  
- **World synergy (Q4):** *Ignite* on Bramble Wall  
- **Stats JSON sketch:** `{ physicalPower: 16, physicalDefense: 10, abilityPower: 12, abilityDefense: 8, combatTempo: 95 }`

### Bio — Budaye / “Thorn Bud”
- **Level:** 5 · **HP:** 110  
- **Focus:** Defense / endurance, harvest XP flavor later  
- **TB opener:** `ram` / vine slap  
- **World synergy (Q4):** *Vine Surge*  
- **Stats:** `{ physicalPower: 10, physicalDefense: 16, abilityPower: 10, abilityDefense: 14, combatTempo: 85 }`

### Hydro — Dollfin / “Current Fin”
- **Level:** 5 · **HP:** 95  
- **Focus:** Tempo / agility  
- **TB opener:** `ram` / splash  
- **World synergy (Q4):** *Water Jet*  
- **Stats:** `{ physicalPower: 11, physicalDefense: 10, abilityPower: 13, abilityDefense: 11, combatTempo: 110 }`

---

## Claim rules (server)

1. Player may claim **exactly one** starter (`isParty: true`, `slotIndex: 0`).
2. Nest / Lab UI offers the three; `claim_starter` accepts only these slugs (plus legacy `rockitten` until migrated).
3. Claiming grants the `PlayerCreature` row — no fake client-only starter.
4. Wild encounters for MPV can remain Rockitten until encounter tables are expanded per route.

---

## Open (ask if changing)

- Keep Saints display names (Pyre Drake / Thorn Bud / Current Fin) or use raw Tuxemon names (Agnite / Budaye / Dollfin) in UI?
- Include **Geo / Rockitten** as a 4th nest in the same lab, or wild-only?
