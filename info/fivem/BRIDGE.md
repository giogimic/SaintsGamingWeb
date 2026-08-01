# FiveM Server Bridge

**Endpoint:** `POST /api/fivem/events`  
**Auth:** `Authorization: Bearer <FIVEM_API_KEY|SAINTS_INTERNAL_SECRET|AUTH_SECRET>`  
**Header (recommended):** `X-Service-Name: fivem-server`

For raw realtime envelopes (already registered event types), the server may also POST to `/api/internal/events` with a full event envelope (`source: "fivem"`).

**Do not** send per-tick coordinates or inventory spam on either path. Coords stay on `POST /api/fivem/characters` with `action: "updateCoords"`.

---

## Actions

### `player_joined`
```json
{
  "action": "player_joined",
  "fivemLicense": "abc123…",
  "characterId": "optional",
  "characterName": "John Doe",
  "playerCount": 24
}
```
If the license is linked → `fivem.player.online` + `presence.updated` (`playing`).

### `player_left`
```json
{
  "action": "player_left",
  "fivemLicense": "abc123…",
  "playerCount": 23
}
```
→ `fivem.player.offline` + `presence.updated` (`online`).

### `sync_character`
```json
{
  "action": "sync_character",
  "fivemLicense": "abc123…",
  "characterId": "optional-cuid",
  "firstName": "John",
  "lastName": "Doe",
  "cash": 250,
  "bank": 12000,
  "health": 200,
  "armor": 0,
  "isDead": false
}
```
Creates or updates the `Character` row, then emits `fivem.character.updated`.  
Requires `characterId` **or** `firstName` + `lastName` when creating.

### `bank_transaction`
```json
{
  "action": "bank_transaction",
  "characterId": "…",
  "fivemLicense": "optional-verify",
  "type": "DEPOSIT",
  "amount": 500,
  "description": "ATM deposit"
}
```
Types: `DEPOSIT` (cash→bank), `WITHDRAWAL` (bank→cash), `SALARY` / `WIRE_TRANSFER` / `ADJUST` (signed bank delta).  
Writes `BankTransaction`, emits `fivem.bank.updated` + `fivem.character.updated`, then runs achievement checks.

### `link_license`
```json
{
  "action": "link_license",
  "fivemLicense": "abc123…",
  "saintsUsername": "optional",
  "saintsUserId": "optional"
}
```
Sets `User.fivemLicense` (normalized, no `license:` prefix) and notifies the user.

---

## Related endpoints

| Path | Role |
| :--- | :--- |
| `GET/POST /api/fivem/characters` | Legacy sync (coords, drugs, inventory item upsert) |
| `GET /api/fivem/status` | Public `dynamic.json` poll |
| `POST /api/internal/events` | Raw registered realtime envelopes |

Players can also link a license from UCP Settings (`fivemLicense` field).

---

## Realtime events

| Event | Priority | When |
| :--- | :--- | :--- |
| `fivem.player.online` | EPHEMERAL | `player_joined` |
| `fivem.player.offline` | EPHEMERAL | `player_left` |
| `fivem.character.updated` | NORMAL | `sync_character`, bank tx, non-coords character API writes |
| `fivem.bank.updated` | NORMAL | `bank_transaction` |

See [`info/realtime/EVENTS.md`](../realtime/EVENTS.md).
