import type { EntityInstanceV1 } from './entities/types';
import { describe, expect, it } from "vitest";
import {
  appendNpcToMapDoc,
  buildStudioDespawnNpcEmit,
  buildStudioSpawnNpcEmit,
  removeNpcFromMapDoc,
  upsertNpcInMapDoc,
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
    const live: { entities: unknown[] } = { entities: [] };
    expect(
      appendNpcToMapDoc(live, { schemaVersion: 1, id: 'npc_a', archetype: 'npc', components: { identity: { name: 'A', slug: 'b' }, transform: { x: 1, y: 2, facing: 'S' } } } as EntityInstanceV1)
    ).toBe(true);
    expect(live.entities).toHaveLength(1);
    expect(
      appendNpcToMapDoc(live, { schemaVersion: 1, id: 'npc_a', archetype: 'npc', components: { identity: { name: 'A', slug: 'b' }, transform: { x: 1, y: 2, facing: 'S' } } } as EntityInstanceV1)
    ).toBe(false);
    expect(live.entities).toHaveLength(1);
  });
});

describe("remove / upsert / despawn emit", () => {
  it("removes by id", () => {
    const live: { entities: unknown[] } = {
      entities: [{ schemaVersion: 1, id: 'npc_a', archetype: 'npc', components: { identity: { name: 'A', slug: 'b' }, transform: { x: 1, y: 2, facing: 'S' } } } as EntityInstanceV1],
    };
    expect(removeNpcFromMapDoc(live, "npc_a")).toBe(true);
    expect(live.entities).toHaveLength(0);
  });

  it("upserts existing", () => {
    const live: { entities: unknown[] } = {
      entities: [{ schemaVersion: 1, id: 'npc_a', archetype: 'npc', components: { identity: { name: 'A', slug: 'b' }, transform: { x: 1, y: 2, facing: 'S' } } } as EntityInstanceV1],
    };
    expect(
      upsertNpcInMapDoc(live, { schemaVersion: 1, id: 'npc_a', archetype: 'npc', components: { identity: { name: 'B', slug: 'b' }, transform: { x: 3, y: 4, facing: 'S' } } } as EntityInstanceV1)
    ).toBe(true);
    expect(live.entities[0]).toMatchObject({ name: "B", x: 3, y: 4 });
  });

  it("builds despawn emit", () => {
    expect(buildStudioDespawnNpcEmit("DEMO", "npc_a")).toEqual({
      mapId: "DEMO",
      npcId: "npc_a",
    });
    expect(buildStudioDespawnNpcEmit("", "npc_a")).toBeNull();
  });
});
