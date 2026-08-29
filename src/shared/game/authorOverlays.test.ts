import { describe, expect, it } from "vitest";
import {
  authorOverlayGateMarkers,
  authorOverlayNpcMarkers,
  authorOverlaySpawnMarkers,
} from "./authorOverlays";

describe("authorOverlay markers", () => {
  it("builds gate markers from StudioWarpGate positions", () => {
    expect(
      authorOverlayGateMarkers([
        {
          id: "gate_2_3",
          position: { x: 2, y: 3 },
          targetMapId: "OTHER",
          spawnPoint: { x: 1, y: 1 },
        },
      ])
    ).toEqual([
      {
        key: "gate_2_3",
        x: 2,
        y: 3,
        kind: "gate",
        w: 1,
        h: 1,
        targetMapId: "OTHER",
        category: undefined,
        name: undefined,
      },
    ]);
  });

  it("builds NPC markers", () => {
    expect(
      authorOverlayNpcMarkers([{ id: "npc_a", x: 4, y: 5, name: "Alex" }])
    ).toEqual([{ key: "npc_a", x: 4, y: 5, kind: "npc" }]);
  });

  it("builds destination spawn pins from gates", () => {
    expect(
      authorOverlaySpawnMarkers([
        {
          id: "gate_0_0",
          position: { x: 0, y: 0 },
          targetMapId: "OTHER",
          spawnPoint: { x: 8, y: 9 },
        },
      ])
    ).toEqual([{ key: "spawn_gate_0_0_8_9", x: 8, y: 9, kind: "spawn" }]);
  });

  it("skips empty / invalid", () => {
    expect(authorOverlayGateMarkers(null)).toEqual([]);
    expect(authorOverlayNpcMarkers([{ id: "x", x: NaN, y: 1 }])).toEqual([]);
  });
});
