import { describe, expect, it } from "vitest";
import {
  PERMISSION_LEVELS,
  STYLE_MANAGEMENT_PERMISSION,
  canBan,
  canManageUser,
  canMute,
  canPurge,
  getRoleColor,
  getRoleName,
  hasPermission,
} from "./permissions";

describe("permissions", () => {
  it("maps role names at tier boundaries", () => {
    expect(getRoleName(0)).toBe("Lurker");
    expect(getRoleName(PERMISSION_LEVELS.NEW)).toBe("New");
    expect(getRoleName(PERMISSION_LEVELS.USER)).toBe("User");
    expect(getRoleName(PERMISSION_LEVELS.SAINT)).toBe("SAINT");
    expect(getRoleName(PERMISSION_LEVELS.HELPER)).toBe("Helper");
    expect(getRoleName(PERMISSION_LEVELS.MODERATOR)).toBe("Moderator");
    expect(getRoleName(PERMISSION_LEVELS.HEAD_MODERATOR)).toBe("Head Moderator");
    expect(getRoleName(PERMISSION_LEVELS.ADMIN)).toBe("Admin");
    expect(getRoleName(PERMISSION_LEVELS.HEAD_ADMIN)).toBe("Head Admin");
    expect(getRoleName(PERMISSION_LEVELS.COMMUNITY_MANAGER)).toBe("Community Manager");
    expect(getRoleName(PERMISSION_LEVELS.FIVEM_DEVELOPER)).toBe("FiveM Developer");
    expect(getRoleName(PERMISSION_LEVELS.DEVELOPER)).toBe("Developer");
    expect(getRoleName(PERMISSION_LEVELS.MODERATOR + 1)).toBe("Moderator");
  });

  it("returns distinct badge colors for staff tiers", () => {
    expect(getRoleColor(PERMISSION_LEVELS.DEVELOPER)).toBe("text-red-400");
    expect(getRoleColor(PERMISSION_LEVELS.FIVEM_DEVELOPER)).toBe("text-orange-400");
    expect(getRoleColor(PERMISSION_LEVELS.COMMUNITY_MANAGER)).toBe("text-purple-400");
    expect(getRoleColor(PERMISSION_LEVELS.ADMIN)).toBe("text-blue-400");
    expect(getRoleColor(PERMISSION_LEVELS.MODERATOR)).toBe("text-green-400");
    expect(getRoleColor(PERMISSION_LEVELS.USER)).toBe("text-zinc-300");
  });

  it("treats null/undefined user level as lurker for hasPermission", () => {
    expect(hasPermission(undefined, PERMISSION_LEVELS.USER)).toBe(false);
    expect(hasPermission(null, PERMISSION_LEVELS.LURKER)).toBe(true);
    expect(hasPermission(PERMISSION_LEVELS.MODERATOR, STYLE_MANAGEMENT_PERMISSION)).toBe(true);
    expect(hasPermission(PERMISSION_LEVELS.HELPER, STYLE_MANAGEMENT_PERMISSION)).toBe(false);
  });

  it("allows manage only with strictly higher level", () => {
    expect(canManageUser(PERMISSION_LEVELS.ADMIN, PERMISSION_LEVELS.MODERATOR)).toBe(true);
    expect(canManageUser(PERMISSION_LEVELS.ADMIN, PERMISSION_LEVELS.ADMIN)).toBe(false);
    expect(canManageUser(PERMISSION_LEVELS.HELPER, PERMISSION_LEVELS.USER)).toBe(true);
  });

  it("limits mute to mods+ against non-staff", () => {
    expect(canMute(PERMISSION_LEVELS.MODERATOR, PERMISSION_LEVELS.USER)).toBe(true);
    expect(canMute(PERMISSION_LEVELS.HELPER, PERMISSION_LEVELS.USER)).toBe(false);
    expect(canMute(PERMISSION_LEVELS.ADMIN, PERMISSION_LEVELS.MODERATOR)).toBe(false);
    expect(canMute(PERMISSION_LEVELS.HEAD_MODERATOR, PERMISSION_LEVELS.HELPER)).toBe(true);
  });

  it("applies ban matrix by staff tier", () => {
    // Admin: non-staff only
    expect(canBan(PERMISSION_LEVELS.ADMIN, PERMISSION_LEVELS.USER)).toBe(true);
    expect(canBan(PERMISSION_LEVELS.ADMIN, PERMISSION_LEVELS.HELPER)).toBe(true);
    expect(canBan(PERMISSION_LEVELS.ADMIN, PERMISSION_LEVELS.MODERATOR)).toBe(false);

    // Head Admin: below Head Admin
    expect(canBan(PERMISSION_LEVELS.HEAD_ADMIN, PERMISSION_LEVELS.ADMIN)).toBe(true);
    expect(canBan(PERMISSION_LEVELS.HEAD_ADMIN, PERMISSION_LEVELS.HEAD_ADMIN)).toBe(false);

    // CM: anyone strictly below
    expect(canBan(PERMISSION_LEVELS.COMMUNITY_MANAGER, PERMISSION_LEVELS.HEAD_ADMIN)).toBe(true);
    expect(canBan(PERMISSION_LEVELS.COMMUNITY_MANAGER, PERMISSION_LEVELS.COMMUNITY_MANAGER)).toBe(false);
    expect(canBan(PERMISSION_LEVELS.COMMUNITY_MANAGER, PERMISSION_LEVELS.DEVELOPER)).toBe(false);

    // Mod cannot ban
    expect(canBan(PERMISSION_LEVELS.MODERATOR, PERMISSION_LEVELS.USER)).toBe(false);
  });

  it("allows purge from moderator up", () => {
    expect(canPurge(PERMISSION_LEVELS.HELPER)).toBe(false);
    expect(canPurge(PERMISSION_LEVELS.MODERATOR)).toBe(true);
    expect(canPurge(PERMISSION_LEVELS.DEVELOPER)).toBe(true);
  });
});
