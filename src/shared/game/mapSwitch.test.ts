import { describe, expect, it } from "vitest";
import { mapDocMatchesId, shouldKeepActiveMapData } from "./mapSwitch";

describe("mapDocMatchesId", () => {
  it("matches bare and channel ids on the same base", () => {
    expect(mapDocMatchesId({ id: "DEMO_SANDBOX" }, "DEMO_SANDBOX")).toBe(true);
    expect(mapDocMatchesId({ id: "DEMO_SANDBOX" }, "DEMO_SANDBOX_ch1")).toBe(true);
    expect(mapDocMatchesId({ id: "FOO_ch2" }, "FOO")).toBe(true);
  });

  it("rejects null / empty / other maps", () => {
    expect(mapDocMatchesId(null, "DEMO_SANDBOX")).toBe(false);
    expect(mapDocMatchesId({ id: "" }, "DEMO_SANDBOX")).toBe(false);
    expect(mapDocMatchesId({ id: "OTHER" }, "DEMO_SANDBOX")).toBe(false);
  });
});

describe("shouldKeepActiveMapData", () => {
  it("keeps only when the live doc matches currentMapId", () => {
    expect(shouldKeepActiveMapData({ id: "A" }, "A")).toBe(true);
    expect(shouldKeepActiveMapData({ id: "A" }, "B")).toBe(false);
    expect(shouldKeepActiveMapData(null, "A")).toBe(false);
  });
});
