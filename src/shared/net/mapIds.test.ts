import { describe, expect, it } from "vitest";
import {
  canPartyForceJoinInstance,
  isPublicChannelInstanceId,
  isSameBaseMap,
  isStudioPieInstanceId,
  pickPublicShardAssignment,
  toBaseMapId,
} from "./mapIds";

describe("toBaseMapId", () => {
  it("strips public channel shards", () => {
    expect(toBaseMapId("SAINTS_VILLAGE_ch1")).toBe("SAINTS_VILLAGE");
    expect(toBaseMapId("PLAYER_HOUSE_BEDROOM_ch12")).toBe("PLAYER_HOUSE_BEDROOM");
  });

  it("leaves bare map definitions unchanged", () => {
    expect(toBaseMapId("SAINTS_VILLAGE")).toBe("SAINTS_VILLAGE");
  });

  it("compares logical maps across shards", () => {
    expect(isSameBaseMap("SAINTS_VILLAGE_ch1", "SAINTS_VILLAGE")).toBe(true);
    expect(isSameBaseMap("SAINTS_VILLAGE_ch1", "DEMO_SANDBOX_ch1")).toBe(false);
  });
});

describe("public vs private instance ids", () => {
  it("recognizes only _chN as public lobby shards", () => {
    expect(isPublicChannelInstanceId("DEMO_SANDBOX_ch1")).toBe(true);
    expect(isPublicChannelInstanceId("DEMO_SANDBOX_ch12")).toBe(true);
    expect(isPublicChannelInstanceId("DEMO_SANDBOX")).toBe(false);
    expect(isPublicChannelInstanceId("DEMO_SANDBOX_user123")).toBe(false);
    expect(isPublicChannelInstanceId("studio_pie_user123")).toBe(false);
  });

  it("recognizes PIE rooms", () => {
    expect(isStudioPieInstanceId("studio_pie_abc")).toBe(true);
    expect(isStudioPieInstanceId("DEMO_SANDBOX_ch1")).toBe(false);
  });

  it("party force-join only onto public channels of the same base map", () => {
    expect(canPartyForceJoinInstance("DEMO_SANDBOX_ch1", "DEMO_SANDBOX")).toBe(true);
    expect(canPartyForceJoinInstance("DEMO_SANDBOX_userX", "DEMO_SANDBOX")).toBe(false);
    expect(canPartyForceJoinInstance("studio_pie_userX", "DEMO_SANDBOX")).toBe(false);
    expect(canPartyForceJoinInstance("OTHER_ch1", "DEMO_SANDBOX")).toBe(false);
  });
});

describe("pickPublicShardAssignment", () => {
  it("ignores private and PIE leftovers when picking a public shard", () => {
    const pick = pickPublicShardAssignment(
      "DEMO_SANDBOX",
      [
        { instanceId: "DEMO_SANDBOX_userA", mapId: "DEMO_SANDBOX", playerCount: 0 },
        { instanceId: "studio_pie_userB", mapId: "DEMO_SANDBOX", playerCount: 0 },
        { instanceId: "DEMO_SANDBOX_ch1", mapId: "DEMO_SANDBOX", playerCount: 2 },
      ],
      50
    );
    expect(pick).toEqual({ action: "join", instanceId: "DEMO_SANDBOX_ch1" });
  });

  it("creates _ch1 when only private/PIE rooms exist", () => {
    const pick = pickPublicShardAssignment(
      "DEMO_SANDBOX",
      [
        { instanceId: "DEMO_SANDBOX_userA", mapId: "DEMO_SANDBOX", playerCount: 0 },
        { instanceId: "studio_pie_x", mapId: "DEMO_SANDBOX", playerCount: 1 },
      ],
      50
    );
    expect(pick).toEqual({ action: "create", instanceId: "DEMO_SANDBOX_ch1", shardNum: 1 });
  });

  it("creates the next channel when existing public shards are full", () => {
    const pick = pickPublicShardAssignment(
      "DEMO_SANDBOX",
      [{ instanceId: "DEMO_SANDBOX_ch1", mapId: "DEMO_SANDBOX", playerCount: 50 }],
      50
    );
    expect(pick).toEqual({ action: "create", instanceId: "DEMO_SANDBOX_ch2", shardNum: 2 });
  });
});
