# Discord Bot Bridge

**Endpoint:** `POST /api/discord/events`  
**Auth:** `Authorization: Bearer <DISCORD_BOT_SECRET|SAINTS_INTERNAL_SECRET>`  
**Header (recommended):** `X-Service-Name: discord-bot`

For raw realtime envelopes (already registered event types), the bot may also POST to `/api/internal/events` with a full event envelope (`source: "discord"`).

---

## Actions

### `member_joined`
```json
{ "action": "member_joined", "discordUserId": "…", "discordUsername": "optional" }
```
If the Discord user is linked to a Saints account → SYSTEM notification + `discord.member.linked`.

### `role_sync`
```json
{
  "action": "role_sync",
  "discordUserId": "…",
  "discordRoleIds": ["roleA", "roleB"],
  "forceDemote": false
}
```
Uses `DISCORD_ROLE_MAP` (`{ discordRoleId: permissionLevel }`). Takes the highest mapped level.  
**Never auto-demotes staff (`permissionLevel >= 100`)** unless `forceDemote: true`.

### `community_announce`
```json
{
  "action": "community_announce",
  "message": "Server restart in 10m",
  "link": "/status",
  "targetDiscordUserId": "optional",
  "targetUserId": "optional"
}
```
Targeted → notification. Untargeted → global `discord.community.announce` toast.

### `link_account`
```json
{
  "action": "link_account",
  "discordUserId": "…",
  "saintsUsername": "optional",
  "saintsUserId": "optional"
}
```
Sets `User.discordId` and notifies the user.

---

## Account linking

Discord OAuth sign-in / linkAccount also writes `User.discordId` from `Account.providerAccountId`.
