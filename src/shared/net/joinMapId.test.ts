import { describe, expect, it } from "vitest";
import { toBaseMapId } from "./mapIds";

/**
 * Mirrors WorldManager.joinMap base-id normalization — keep peers on the same
 * shard tree (never DEMO_SANDBOX_ch1_ch1).
 */
function resolveJoinBaseMapId(mapId: string | undefined | null, demo = "DEMO_SANDBOX"): string {
  const base = toBaseMapId(String(mapId || demo));
  if (!base || base === "SAINTS_VILLAGE") return demo;
  return base;
}

describe("multiplayer join map id", () => {
  it("strips shard suffix before joining", () => {
    expect(resolveJoinBaseMapId("DEMO_SANDBOX_ch1")).toBe("DEMO_SANDBOX");
    expect(resolveJoinBaseMapId("DEMO_SANDBOX_ch2")).toBe("DEMO_SANDBOX");
  });

  it("remaps retired SAINTS_VILLAGE", () => {
    expect(resolveJoinBaseMapId("SAINTS_VILLAGE")).toBe("DEMO_SANDBOX");
    expect(resolveJoinBaseMapId("SAINTS_VILLAGE_ch1")).toBe("DEMO_SANDBOX");
  });

  it("keeps playable base ids", () => {
    expect(resolveJoinBaseMapId("DEMO_SANDBOX")).toBe("DEMO_SANDBOX");
    expect(resolveJoinBaseMapId("AZURE_TOWN")).toBe("AZURE_TOWN");
  });
});

describe("worldToTile math", () => {
  function worldToTile(
    worldX: number,
    worldZ: number,
    w: number,
    h: number,
    s = 1
  ): { r: number; c: number } | null {
    const c = Math.floor(worldX / s + w / 2 + 0.5);
    const r = Math.floor(h / 2 - worldZ / s + 0.5);
    if (r < 0 || c < 0 || r >= h || c >= w) return null;
    return { r, c };
  }

  it("maps center cell for even dimensions", () => {
    // posX = (c - w/2) * s, posZ = (h/2 - r) * s
    // c=14, r=15, w=30,h=30: x=-1, z=0
    expect(worldToTile(-1, 0, 30, 30)).toEqual({ r: 15, c: 14 });
  });

  it("maps the full cell footprint, not only the SE half", () => {
    // Tile c=14 centered at x=-1 spans [-1.5, -0.5]
    expect(worldToTile(-1.4, 0, 30, 30)).toEqual({ r: 15, c: 14 });
    expect(worldToTile(-0.6, 0, 30, 30)).toEqual({ r: 15, c: 14 });
    // Tile r=15 centered at z=0 spans z [-0.5, 0.5]
    expect(worldToTile(-1, 0.4, 30, 30)).toEqual({ r: 15, c: 14 });
    expect(worldToTile(-1, -0.4, 30, 30)).toEqual({ r: 15, c: 14 });
  });

  it("maps origin corner", () => {
    // c=0,r=0 → x=-15, z=15 for 30x30
    expect(worldToTile(-15, 15, 30, 30)).toEqual({ r: 0, c: 0 });
  });

  it("rejects out of bounds", () => {
    expect(worldToTile(-100, 0, 30, 30)).toBeNull();
  });
});
