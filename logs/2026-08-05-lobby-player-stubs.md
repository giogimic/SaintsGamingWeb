# Lobby — Party invite + TB creature swap (P12)

**Date:** 2026-08-05  
**Branch:** `giogimic/lobby-player-stubs-2d3d`

## Goal

Close the two player-loop stubs called out after author loops: real party invites and turn-battle creature switch.

## Changes

| Piece | What |
| :--- | :--- |
| `PartyManager.ts` | Resolve username → online user; pending invite TTL; `party_invite` / accept / decline; join via `createOrJoinParty` |
| `SocketHandler.ts` | `party_invite_accept` / `party_invite_decline`; pass `creatureId` on `battle_submit_action` |
| Lobby client | Listen `party_invite` + `party_update`; Y/N hotkeys |
| Friends list | Stop false “sent!” alert (server system line confirms) |
| `EncounterManager.ts` | `SWITCH`/`SWAP` persists HP, picks next healthy party creature, then enemy turn |
| `TurnBattleOverlay.tsx` | CREATURES button emits `SWITCH` |

## Verify

1. Two online lobby users → Friends **+ PARTY** → target sees toast + chat → **Y** → both get party toast / `party_update`  
2. Start a TB encounter with 2+ party creatures → **CREATURES** → lead swaps; foe takes a turn  
3. Single-creature party → CREATURES toasts “No other healthy…”

## Out of scope

Full party UI roster, invite UI modal, RT target HP, Class/Loot def undo.
