import { describe, it, expect, beforeEach } from "vitest";
import { AuditService } from "./AuditService";
import { contentCache } from "../studio/contentCache";

describe("Enterprise AuditService Compliance Engine", () => {
  beforeEach(() => {
    AuditService.clearMemoryLogs();
    contentCache.clear();
  });

  it("mandates structured audit logging on write calls", async () => {
    const log = await AuditService.write({
      userId: "user_architect_1",
      action: "map.upsert",
      resource: { type: "map", id: "DEMO_SANDBOX" },
      after: { name: "Demo Sandbox Map", version: 2 },
      meta: { clientIp: "127.0.0.1" },
    });

    expect(log.id).toBeDefined();
    expect(log.userId).toBe("user_architect_1");
    expect(log.action).toBe("map.upsert");
    expect(log.resource).toEqual({ type: "map", id: "DEMO_SANDBOX" });
    expect(log.after).toEqual({ name: "Demo Sandbox Map", version: 2 });
    expect(log.at).toBeDefined();

    const recent = AuditService.getRecentLogs();
    expect(recent).toHaveLength(1);
    expect(recent[0].id).toBe(log.id);
  });

  it("invalidates content cache upon writing mutations", async () => {
    contentCache.set("map", "AZURE_ISLAND", { data: "cached_map_payload" });
    expect(contentCache.get("map", "AZURE_ISLAND")).toBeDefined();

    await AuditService.write({
      userId: "user_builder_2",
      action: "map.update",
      resource: { type: "map", id: "AZURE_ISLAND" },
    });

    expect(contentCache.get("map", "AZURE_ISLAND")).toBeNull();
  });
});
