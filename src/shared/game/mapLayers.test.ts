import { describe, expect, it } from "vitest";
import {
  emptyStudioMapDocument,
  getMapLayerContract,
  runtimeExportLayers,
  stripEditorOverlaysFromMapPayload,
} from "./mapLayers";

describe("mapLayers", () => {
  it("marks editor_overlay as non-export", () => {
    expect(getMapLayerContract("editor_overlay").exportToRuntime).toBe(false);
    expect(runtimeExportLayers()).not.toContain("editor_overlay");
    expect(runtimeExportLayers()).toContain("terrain");
    expect(runtimeExportLayers()).toContain("logic");
  });

  it("strips editor overlay keys from payloads", () => {
    const cleaned = stripEditorOverlaysFromMapPayload({
      mapId: "DEMO_SANDBOX",
      terrain: [1],
      editorOverlays: [{ type: "grid" }],
      studioOverlays: true,
    });
    expect(cleaned.mapId).toBe("DEMO_SANDBOX");
    expect(cleaned.terrain).toEqual([1]);
    expect(cleaned.editorOverlays).toBeUndefined();
    expect(cleaned.studioOverlays).toBeUndefined();
  });

  it("builds an empty additive map document", () => {
    const doc = emptyStudioMapDocument("forest01");
    expect(doc.mapId).toBe("forest01");
    expect(doc.entities).toEqual([]);
    expect(doc.spawners).toEqual([]);
  });
});
