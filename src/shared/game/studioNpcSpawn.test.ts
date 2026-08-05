import { describe, expect, it } from "vitest";
import {
  appendNpcToMapDoc,
  buildStudioSpawnNpcEmit,
} from "./studioNpcSpawn";

describe("buildStudioSpawnNpcEmit", () => {
  it("builds a socket payload", () => {
    expect(
      buildStudioSpawnNpcEmit("DEMO_SANDBOX", {
        id: "npc_alex",
        name: "Alex",
        x: 4,
        y: 5,
        sprite: "heroine",
      })
    ).toEqual({
      mapId: "DEMO_SANDBOX",
      npc: { id: "npc_alex", name: "Alex", x: 4, y: 5, sprite: "heroine" },
    });
  });

  it("rejects empty map or id", () => {
    expect(
      buildStudioSpawnNpcEmit("", { id: "npc_a", name: "A", x: 0, y: 0 })
    ).toBeNull();
    expect(
      buildStudioSpawnNpcEmit("DEMO", {
        id: "",
        name: "A",
        x: 0,
        y: 0,
      })
    ).toBeNull();
  });
});

describe("appendNpcToMapDoc", () => {
  it("appends without duplicating", () => {
    const live: { npcs: unknown[] } = { npcs: [] };
    expect(
      appendNpcToMapDoc(live, { id: "npc_a", name: "A", x: 1, y: 2 })
    ).toBe(true);
    expect(live.npcs).toHaveLength(1);
    expect(
      appendNpcToMapDoc(live, { id: "npc_a", name: "A", x: 1, y: 2 })
    ).toBe(false);
    expect(live.npcs).toHaveLength(1);
  });
});
