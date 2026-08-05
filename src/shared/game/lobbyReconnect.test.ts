import { describe, expect, it } from "vitest";
import {
  mergeMapDocumentInPlace,
  shouldApplyMapReload,
  shouldClearPeersOnDisconnect,
} from "./lobbyReconnect";

describe("shouldClearPeersOnDisconnect", () => {
  it("keeps peers on soft transport disconnect", () => {
    expect(shouldClearPeersOnDisconnect("transport close")).toBe(false);
    expect(shouldClearPeersOnDisconnect("ping timeout")).toBe(false);
    expect(shouldClearPeersOnDisconnect("io client disconnect")).toBe(false);
  });

  it("clears peers on server force disconnect", () => {
    expect(shouldClearPeersOnDisconnect("io server disconnect")).toBe(true);
  });
});

describe("shouldApplyMapReload", () => {
  it("applies only for the current base map", () => {
    expect(
      shouldApplyMapReload({
        reloadMapId: "DEMO_SANDBOX",
        currentMapId: "DEMO_SANDBOX_ch1",
        isStudio: false,
        mapDirty: false,
      })
    ).toBe(true);
    expect(
      shouldApplyMapReload({
        reloadMapId: "OTHER",
        currentMapId: "DEMO_SANDBOX",
        isStudio: false,
        mapDirty: false,
      })
    ).toBe(false);
  });

  it("skips Studio when map paint is dirty", () => {
    expect(
      shouldApplyMapReload({
        reloadMapId: "DEMO_SANDBOX",
        currentMapId: "DEMO_SANDBOX",
        isStudio: true,
        mapDirty: true,
      })
    ).toBe(false);
    expect(
      shouldApplyMapReload({
        reloadMapId: "DEMO_SANDBOX",
        currentMapId: "DEMO_SANDBOX",
        isStudio: true,
        mapDirty: false,
      })
    ).toBe(true);
  });
});

describe("mergeMapDocumentInPlace", () => {
  it("mutates the live object without replacing identity", () => {
    const live: Record<string, unknown> = {
      id: "DEMO_SANDBOX",
      grid: [[1]],
      tileLayers: [],
    };
    const same = live;
    mergeMapDocumentInPlace(live, {
      id: "DEMO_SANDBOX",
      grid: [[2]],
      tileLayers: [{ name: "Ground", grid: [[17]] }],
      name: "Demo",
    });
    expect(live).toBe(same);
    expect(live.grid).toEqual([[2]]);
    expect(live.name).toBe("Demo");
  });
});
