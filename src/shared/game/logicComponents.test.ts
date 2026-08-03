import { describe, expect, it } from "vitest";
import {
  LOGIC_COMPONENT_PRESETS,
  buildPayloadsFromFields,
  defaultFieldValues,
  normalizeGates,
  upsertWarpGate,
} from "./logicComponents";

describe("logicComponents", () => {
  it("builds harvest payloads from form fields", () => {
    const preset = LOGIC_COMPONENT_PRESETS.find((p) => p.kind === "harvest_wood")!;
    const values = defaultFieldValues(preset);
    values.xp = 40;
    const { onInteractPayload, onStepPayload } = buildPayloadsFromFields(preset, values);
    expect(onInteractPayload).toEqual({ xp: 40, resource: "wood" });
    expect(onStepPayload).toBeNull();
  });

  it("builds encounter step payload", () => {
    const preset = LOGIC_COMPONENT_PRESETS.find((p) => p.kind === "encounter")!;
    const { onStepPayload } = buildPayloadsFromFields(preset, { chance: 0.25 });
    expect(onStepPayload).toEqual({ chance: 0.25 });
  });

  it("normalizes array gates", () => {
    const gates = normalizeGates([
      { id: "a", position: { x: 2, y: 3 }, targetMapId: "DEMO_SANDBOX", spawnPoint: { x: 1, y: 1 } },
      { broken: true },
    ]);
    expect(gates).toHaveLength(1);
    expect(gates[0].position).toEqual({ x: 2, y: 3 });
  });

  it("normalizes Record gates keyed by x,y", () => {
    const gates = normalizeGates({
      "5,6": { targetMapId: "OTHER", spawnPoint: { x: 0, y: 0 } },
      "3": { targetMapId: "NO_POS" },
    });
    expect(gates).toHaveLength(1);
    expect(gates[0].position).toEqual({ x: 5, y: 6 });
  });

  it("upserts warp gates by tile", () => {
    const a = upsertWarpGate([], {
      id: "g1",
      position: { x: 1, y: 1 },
      targetMapId: "A",
      spawnPoint: { x: 2, y: 2 },
    });
    const b = upsertWarpGate(a, {
      id: "g2",
      position: { x: 1, y: 1 },
      targetMapId: "B",
      spawnPoint: { x: 3, y: 3 },
    });
    expect(b).toHaveLength(1);
    expect(b[0].targetMapId).toBe("B");
  });
});
