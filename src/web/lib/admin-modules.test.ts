import { describe, it, expect } from "vitest";
import {
  ADMIN_CATEGORIES,
  ADMIN_MODULES,
  getVisibleAdminModules,
  getCategorizedAdminModules,
  getAdminModuleById,
  getActiveAdminModule,
  searchAdminModules,
} from "./admin-modules";
import { PERMISSION_LEVELS } from "./permissions";

describe("Admin Module Registry (Phase 2)", () => {
  it("defines all canonical categories with valid order", () => {
    const categories = Object.values(ADMIN_CATEGORIES);
    expect(categories.length).toBe(6);
    expect(categories.map((c) => c.id)).toEqual([
      "overview",
      "operations",
      "community",
      "identity",
      "infrastructure",
      "developer",
    ]);
  });

  it("contains unique module IDs and valid href routes", () => {
    const ids = new Set<string>();
    const hrefs = new Set<string>();

    for (const mod of ADMIN_MODULES) {
      expect(ids.has(mod.id)).toBe(false);
      ids.add(mod.id);

      expect(mod.href.startsWith("/")).toBe(true);
      expect(mod.category in ADMIN_CATEGORIES).toBe(true);
      expect(mod.label.length).toBeGreaterThan(0);
      expect(mod.description.length).toBeGreaterThan(0);
    }
  });

  it("correctly filters visible modules by permission level and writer flag", () => {
    // Normal user (level 20): no admin modules visible
    const userModules = getVisibleAdminModules(PERMISSION_LEVELS.USER, false);
    expect(userModules.length).toBe(0);

    // Writer (level 20, isWriter = true): overview dashboard, news CMS, and wiki visible
    const writerModules = getVisibleAdminModules(PERMISSION_LEVELS.USER, true);
    expect(writerModules.map((m) => m.id)).toEqual(["overview-dashboard", "content-news", "community-wiki"]);

    // Moderator (level 200)
    const modModules = getVisibleAdminModules(PERMISSION_LEVELS.MODERATOR, false);
    const modIds = modModules.map((m) => m.id);
    expect(modIds).toContain("overview-dashboard");
    expect(modIds).toContain("community-tickets");
    expect(modIds).toContain("community-streams");
    expect(modIds).not.toContain("identity-users"); // Admin only

    // Admin (level 400)
    const adminModules = getVisibleAdminModules(PERMISSION_LEVELS.ADMIN, false);
    const adminIds = adminModules.map((m) => m.id);
    expect(adminIds).toContain("identity-users");
    expect(adminIds).toContain("servers-registry");
    expect(adminIds).toContain("game-studio");
    expect(adminIds).not.toContain("identity-roles"); // Developer only

    // Developer (level 1000): all modules visible
    const devModules = getVisibleAdminModules(PERMISSION_LEVELS.DEVELOPER, false);
    expect(devModules.length).toBe(ADMIN_MODULES.length);
  });

  it("groups visible modules by category in order", () => {
    const categorized = getCategorizedAdminModules(PERMISSION_LEVELS.ADMIN);
    expect(categorized.length).toBeGreaterThan(0);

    // Verify ordering
    for (let i = 0; i < categorized.length - 1; i++) {
      expect(categorized[i].category.order).toBeLessThan(categorized[i + 1].category.order);
    }
  });

  it("resolves active module by exact match and prefix match", () => {
    expect(getActiveAdminModule("/admin")?.id).toBe("overview-dashboard");
    expect(getActiveAdminModule("/admin/users")?.id).toBe("identity-users");
    expect(getActiveAdminModule("/admin/news/new")?.id).toBe("content-news");
    expect(getActiveAdminModule("/admin/dev/database")?.id).toBe("dev-database");
    expect(getActiveAdminModule("/studio")?.id).toBe("game-studio");
  });

  it("searches modules by query, label, description, and keywords", () => {
    const results = searchAdminModules("socket", PERMISSION_LEVELS.DEVELOPER);
    expect(results.some((m) => m.id === "overview-realtime")).toBe(true);

    const ticketResults = searchAdminModules("support", PERMISSION_LEVELS.MODERATOR);
    expect(ticketResults.some((m) => m.id === "community-tickets")).toBe(true);

    const emptyResults = searchAdminModules("nonexistentxyz", PERMISSION_LEVELS.DEVELOPER);
    expect(emptyResults.length).toBe(0);
  });
});
