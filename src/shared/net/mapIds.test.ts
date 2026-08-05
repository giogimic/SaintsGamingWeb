import { describe, expect, it } from "vitest";
import {
  canPartyForceJoinInstance,
  isPublicChannelInstanceId,
  isSameBaseMap,
  isStudioPieInstanceId,
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
