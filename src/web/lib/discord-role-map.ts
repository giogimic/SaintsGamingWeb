/** Parse DISCORD_ROLE_MAP env JSON → { discordRoleId: permissionLevel }. */
export function parseDiscordRoleMap(): Record<string, number> {
  const raw = process.env.DISCORD_ROLE_MAP;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, number>;
    const out: Record<string, number> = {};
    for (const [roleId, level] of Object.entries(parsed)) {
      if (typeof level === "number" && Number.isFinite(level)) {
        out[roleId] = Math.floor(level);
      }
    }
    return out;
  } catch {
    console.error("[DiscordBridge] Invalid DISCORD_ROLE_MAP JSON");
    return {};
  }
}
