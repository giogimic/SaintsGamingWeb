import { describe, expect, it } from "vitest";
import {
  listGateTargets,
  normalizeGatesToArray,
  resolveGateSpawn,
} from "./mapGates";

describe("mapGates", () => {
  it("normalizes position arrays and aliases spawnPoint → targetSpawn", () => {
    const gates = normalizeGatesToArray([
      {
        position: { x: 49, y: 25 },
        targetMapId: "SPYDER_ROUTE1",
        spawnPoint: { x: 2, y: 10 },
      },
    ]);
    expect(gates).toHaveLength(1);
    expect(gates[0].targetSpawn).toEqual({ x: 2, y: 10 });
    expect(gates[0].spawnPoint).toEqual({ x: 2, y: 10 });
  });

  it("normalizes x,y record keys", () => {
    const gates = normalizeGatesToArray({
      "10,5": { targetMapId: "AZURE_TOWN", targetSpawn: { x: 47, y: 25 } },
    });
    expect(gates[0].position).toEqual({ x: 10, y: 5 });
    expect(gates[0].targetMapId).toBe("AZURE_TOWN");
  });

  it("skips legacy tile-id records without coordinates", () => {
    expect(
      normalizeGatesToArray({
        "3": { targetMapId: "FOO", spawnPoint: { x: 1, y: 1 } },
      })
    ).toEqual([]);
  });

  it("resolveGateSpawn prefers targetSpawn", () => {
    expect(
      resolveGateSpawn({
        targetSpawn: { x: 1, y: 2 },
        spawnPoint: { x: 9, y: 9 },
      })
    ).toEqual({ x: 1, y: 2 });
  });

  it("lists unique targets from mixed shapes", () => {
    expect(
      listGateTargets([
        { position: { x: 1, y: 1 }, targetMapId: "A", targetSpawn: { x: 0, y: 0 } },
        { position: { x: 2, y: 2 }, targetMapId: "A", targetSpawn: { x: 0, y: 0 } },
        { position: { x: 3, y: 3 }, targetMapId: "B", targetSpawn: { x: 0, y: 0 } },
      ])
    ).toEqual(["A", "B"]);
  });
});
