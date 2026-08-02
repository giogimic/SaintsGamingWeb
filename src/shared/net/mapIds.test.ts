import { describe, expect, it } from "vitest";
import { isSameBaseMap, toBaseMapId } from "./mapIds";

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
