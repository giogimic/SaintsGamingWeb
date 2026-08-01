import { afterEach, describe, expect, it } from "vitest";
import { InterestManager } from "./InterestManager";

describe("InterestManager", () => {
  const originalZone = process.env.MMO_AOI_ZONE_SIZE;

  afterEach(() => {
    if (originalZone === undefined) delete process.env.MMO_AOI_ZONE_SIZE;
    else process.env.MMO_AOI_ZONE_SIZE = originalZone;
  });

  it("uses default zone size 16 when env unset/invalid", () => {
    delete process.env.MMO_AOI_ZONE_SIZE;
    expect(InterestManager.zoneSize()).toBe(16);

    process.env.MMO_AOI_ZONE_SIZE = "0";
    expect(InterestManager.zoneSize()).toBe(16);

    process.env.MMO_AOI_ZONE_SIZE = "NaN";
    expect(InterestManager.zoneSize()).toBe(16);
  });

  it("reads custom zone size from env", () => {
    process.env.MMO_AOI_ZONE_SIZE = "32";
    expect(InterestManager.zoneSize()).toBe(32);
  });

  it("computes zone boundaries at size 16", () => {
    expect(InterestManager.zoneOf(0, 0, 16)).toEqual({ zx: 0, zy: 0 });
    expect(InterestManager.zoneOf(15, 15, 16)).toEqual({ zx: 0, zy: 0 });
    expect(InterestManager.zoneOf(16, 16, 16)).toEqual({ zx: 1, zy: 1 });
    expect(InterestManager.zoneOf(-1, -1, 16)).toEqual({ zx: -1, zy: -1 });
  });

  it("formats room keys", () => {
    expect(InterestManager.roomKey("AZURE_TOWN", 2, -1)).toBe("aoi:AZURE_TOWN:2:-1");
  });

  it("returns a 3×3 neighborhood including the center", () => {
    const rooms = InterestManager.neighborRooms("map_a", 5, 7);
    expect(rooms).toHaveLength(9);
    expect(rooms).toContain("aoi:map_a:5:7");
    expect(rooms).toContain("aoi:map_a:4:6");
    expect(rooms).toContain("aoi:map_a:6:8");
    expect(new Set(rooms).size).toBe(9);
  });

  it("roomsForPosition matches zoneOf + neighborRooms", () => {
    const mapId = "route_1";
    const x = 40;
    const y = 8;
    const { zx, zy } = InterestManager.zoneOf(x, y, 16);
    expect(InterestManager.roomsForPosition(mapId, x, y)).toEqual(
      InterestManager.neighborRooms(mapId, zx, zy)
    );
  });
});

describe("InterestManager synthetic multi-entity soak", () => {
  const MAP = "soak_map";
  const ZONE = 16;

  function broadcastTargets(x: number, y: number): Set<string> {
    const { zx, zy } = InterestManager.zoneOf(x, y, ZONE);
    return new Set(InterestManager.neighborRooms(MAP, zx, zy));
  }

  function roomsOverlap(a: Set<string>, b: Set<string>): boolean {
    for (const room of a) {
      if (b.has(room)) return true;
    }
    return false;
  }

  it("far entities (zone Δ ≥ 2) never share a broadcast neighborhood", () => {
    const entities = [
      { id: "near_a", x: 8, y: 8 }, // zone 0,0
      { id: "near_b", x: 12, y: 4 }, // zone 0,0
      { id: "mid", x: 24, y: 24 }, // zone 1,1
      { id: "far", x: 80, y: 80 }, // zone 5,5
    ];

    const targets = Object.fromEntries(
      entities.map((e) => [e.id, broadcastTargets(e.x, e.y)])
    );

    // Same / adjacent zones can overlap
    expect(roomsOverlap(targets.near_a, targets.near_b)).toBe(true);
    expect(roomsOverlap(targets.near_a, targets.mid)).toBe(true);

    // Far entity must not hear near entities
    expect(roomsOverlap(targets.near_a, targets.far)).toBe(false);
    expect(roomsOverlap(targets.near_b, targets.far)).toBe(false);
    expect(roomsOverlap(targets.mid, targets.far)).toBe(false);
  });

  it("walker crossing a zone boundary changes membership", () => {
    const before = InterestManager.roomsForPosition(MAP, 15, 8); // zone 0,0
    const after = InterestManager.roomsForPosition(MAP, 16, 8); // zone 1,0
    expect(before).not.toEqual(after);
    expect(before).toContain("aoi:soak_map:0:0");
    expect(after).toContain("aoi:soak_map:1:0");
  });

  it("AOI fanout is much smaller than full-map broadcast for sparse entities", () => {
    const entityCount = 50;
    const mapWidth = 512;
    const mapHeight = 512;
    const entities = Array.from({ length: entityCount }, (_, i) => ({
      x: (i * 37) % mapWidth,
      y: (i * 53) % mapHeight,
    }));

    let aoiEmits = 0;
    for (const mover of entities) {
      const targets = broadcastTargets(mover.x, mover.y);
      // Count how many other entities would receive if they are in any target room
      // (approximate: entity receives if their home room is in mover's neighbor set)
      for (const other of entities) {
        if (other === mover) continue;
        const home = InterestManager.roomKey(
          MAP,
          InterestManager.zoneOf(other.x, other.y, ZONE).zx,
          InterestManager.zoneOf(other.x, other.y, ZONE).zy
        );
        if (targets.has(home)) aoiEmits++;
      }
    }

    const fullBroadcastEmits = entityCount * (entityCount - 1);
    expect(aoiEmits).toBeLessThan(fullBroadcastEmits);
    expect(aoiEmits / fullBroadcastEmits).toBeLessThan(0.35);
  });
});
