import { describe, expect, it } from "vitest";
import {
  emptyEditorOpStack,
  paintCellWithHistory,
  pushEditorOp,
  redoEditorOp,
  undoEditorOp,
  deduplicatePaintedCells,
} from "./editorOps";
import type { PaintableMap } from "./tilePaint";

function makeMap(): PaintableMap {
  return {
    grid: [
      [0, 0],
      [0, 0],
    ],
    tileLayers: [
      {
        name: "Ground",
        grid: [
          [1, 1],
          [1, 1],
        ],
      },
    ],
    tilesets: [{ firstgid: 1 }],
  };
}

describe("editorOps", () => {
  it("records paint history and undoes/redoes a cell", () => {
    const map = makeMap();
    const painted = paintCellWithHistory(map, 0, 0, 1, 17);
    expect("cell" in painted).toBe(true);
    if (!("cell" in painted)) return;
    expect(map.tileLayers![0]!.grid![0]![1]).toBe(17);

    let stack = emptyEditorOpStack();
    stack = pushEditorOp(stack, { kind: "paint_cells", cells: [painted.cell] });

    const undone = undoEditorOp(map, stack);
    expect(undone.op).not.toBeNull();
    expect(map.tileLayers![0]!.grid![0]![1]).toBe(1);
    stack = undone.stack;

    const redone = redoEditorOp(map, stack);
    expect(redone.op).not.toBeNull();
    expect(map.tileLayers![0]!.grid![0]![1]).toBe(17);
  });

  it("paints logic layer (−1) with history", () => {
    const map = makeMap();
    const painted = paintCellWithHistory(map, -1, 1, 0, 3);
    expect("cell" in painted).toBe(true);
    if (!("cell" in painted)) return;
    expect(map.grid![1]![0]).toBe(3);

    const stack = pushEditorOp(emptyEditorOpStack(), {
      kind: "paint_cells",
      cells: [painted.cell],
    });
    undoEditorOp(map, stack);
    expect(map.grid![1]![0]).toBe(0);
  });

  it("deduplicates repeated cell writes in a single stroke preserving initial before and final after", () => {
    const cells = [
      { layerIdx: 0, r: 1, c: 1, before: 1, after: 5 },
      { layerIdx: 0, r: 1, c: 1, before: 5, after: 17 },
      { layerIdx: -1, r: 0, c: 0, before: 0, after: 2 },
    ];
    const deduped = deduplicatePaintedCells(cells);
    expect(deduped).toHaveLength(2);
    expect(deduped[0]).toEqual({ layerIdx: 0, r: 1, c: 1, before: 1, after: 17 });
    expect(deduped[1]).toEqual({ layerIdx: -1, r: 0, c: 0, before: 0, after: 2 });
  });

  it("omits cells with no net change from deduplicated op", () => {
    const cells = [
      { layerIdx: 0, r: 0, c: 0, before: 1, after: 5 },
      { layerIdx: 0, r: 0, c: 0, before: 5, after: 1 },
    ];
    const deduped = deduplicatePaintedCells(cells);
    expect(deduped).toHaveLength(0);
  });

  describe("Generalized Layer Operations", () => {
    it("creates and undoes/redoes layer addition", () => {
      const map = makeMap();
      let stack = emptyEditorOpStack();

      const newLayer = { name: "Decals", grid: [[0, 0], [0, 0]] };
      const op = { kind: "create_layer" as const, layerIdx: 1, layer: newLayer };

      // Apply DO
      map.tileLayers!.push(newLayer);
      stack = pushEditorOp(stack, op);
      expect(map.tileLayers).toHaveLength(2);
      expect(map.tileLayers![1].name).toBe("Decals");

      // Undo
      const undone = undoEditorOp(map, stack);
      expect(map.tileLayers).toHaveLength(1);
      expect(map.tileLayers![0].name).toBe("Ground");

      // Redo
      const redone = redoEditorOp(map, undone.stack);
      expect(map.tileLayers).toHaveLength(2);
      expect(map.tileLayers![1].name).toBe("Decals");
    });

    it("deletes and undoes/redoes layer removal", () => {
      const map = makeMap();
      let stack = emptyEditorOpStack();

      const deletedLayer = map.tileLayers![0];
      const op = { kind: "delete_layer" as const, layerIdx: 0, layer: deletedLayer };

      map.tileLayers!.splice(0, 1);
      stack = pushEditorOp(stack, op);
      expect(map.tileLayers).toHaveLength(0);

      // Undo deletion
      const undone = undoEditorOp(map, stack);
      expect(map.tileLayers).toHaveLength(1);
      expect(map.tileLayers![0].name).toBe("Ground");

      // Redo deletion
      const redone = redoEditorOp(map, undone.stack);
      expect(map.tileLayers).toHaveLength(0);
    });

    it("reorders layers and undoes/redoes", () => {
      const map = makeMap();
      map.tileLayers!.push({ name: "Overlay", grid: [[0, 0], [0, 0]] });

      let stack = emptyEditorOpStack();
      const op = { kind: "reorder_layer" as const, fromIdx: 0, toIdx: 1 };

      // Reorder 0 to 1
      const [first] = map.tileLayers!.splice(0, 1);
      map.tileLayers!.splice(1, 0, first);
      stack = pushEditorOp(stack, op);
      expect(map.tileLayers![0].name).toBe("Overlay");
      expect(map.tileLayers![1].name).toBe("Ground");

      // Undo
      const undone = undoEditorOp(map, stack);
      expect(map.tileLayers![0].name).toBe("Ground");
      expect(map.tileLayers![1].name).toBe("Overlay");

      // Redo
      redoEditorOp(map, undone.stack);
      expect(map.tileLayers![0].name).toBe("Overlay");
      expect(map.tileLayers![1].name).toBe("Ground");
    });

    it("renames layer and undoes/redoes", () => {
      const map = makeMap();
      let stack = emptyEditorOpStack();

      const op = { kind: "rename_layer" as const, layerIdx: 0, before: "Ground", after: "Base Terrain" };
      map.tileLayers![0].name = "Base Terrain";
      stack = pushEditorOp(stack, op);

      // Undo rename
      const undone = undoEditorOp(map, stack);
      expect(map.tileLayers![0].name).toBe("Ground");

      // Redo rename
      redoEditorOp(map, undone.stack);
      expect(map.tileLayers![0].name).toBe("Base Terrain");
    });
  });

  describe("Generalized Entity Operations", () => {
    it("creates, moves, modifies, and deletes entities with reversible history", () => {
      const map: any = { ...makeMap(), entities: [] };
      let stack = emptyEditorOpStack();

      const entity = { id: "npc_bob", name: "Bob", position: { x: 5, y: 5 } };
      const createOp = { kind: "create_entity" as const, entity };

      map.entities.push(entity);
      stack = pushEditorOp(stack, createOp);
      expect(map.entities).toHaveLength(1);

      // Move entity
      const moveOp = { kind: "move_entity" as const, entityId: "npc_bob", before: { x: 5, y: 5 }, after: { x: 8, y: 8 } };
      entity.position = { x: 8, y: 8 };
      stack = pushEditorOp(stack, moveOp);
      expect(map.entities[0].position).toEqual({ x: 8, y: 8 });

      // Undo move
      const undoMove = undoEditorOp(map, stack);
      expect(map.entities[0].position).toEqual({ x: 5, y: 5 });

      // Undo create
      const undoCreate = undoEditorOp(map, undoMove.stack);
      expect(map.entities).toHaveLength(0);

      // Redo create
      const redoCreate = redoEditorOp(map, undoCreate.stack);
      expect(map.entities).toHaveLength(1);
      expect(map.entities[0].id).toBe("npc_bob");

      // Redo move
      redoEditorOp(map, redoCreate.stack);
      expect(map.entities[0].position).toEqual({ x: 8, y: 8 });
    });
  });

  describe("Generalized Gate & Map Properties Operations", () => {
    it("creates gate and applies tileChange with reversible history", () => {
      const map: any = { ...makeMap(), gates: [] };
      let stack = emptyEditorOpStack();

      const gate = { id: "gate_1", position: { x: 0, y: 1 }, targetMapId: "DUNGEON_01" };
      const tileChange = { layerIdx: -1, r: 1, c: 0, before: 0, after: 14 };
      const op = { kind: "create_gate" as const, gate, tileChange };

      map.gates.push(gate);
      map.grid[1][0] = 14;
      stack = pushEditorOp(stack, op);

      expect(map.gates).toHaveLength(1);
      expect(map.grid[1][0]).toBe(14);

      // Undo gate creation
      const undone = undoEditorOp(map, stack);
      expect(map.gates).toHaveLength(0);
      expect(map.grid[1][0]).toBe(0);

      // Redo gate creation
      redoEditorOp(map, undone.stack);
      expect(map.gates).toHaveLength(1);
      expect(map.grid[1][0]).toBe(14);
    });

    it("modifies map properties with reversible history", () => {
      const map: any = { ...makeMap(), name: "Old Map", gameId: "tuxemon" };
      let stack = emptyEditorOpStack();

      const op = {
        kind: "modify_map_props" as const,
        before: { name: "Old Map" },
        after: { name: "New Realm Name" },
      };

      map.name = "New Realm Name";
      stack = pushEditorOp(stack, op);

      // Undo
      const undone = undoEditorOp(map, stack);
      expect(map.name).toBe("Old Map");

      // Redo
      redoEditorOp(map, undone.stack);
      expect(map.name).toBe("New Realm Name");
    });
  });

  describe("Compound Operations", () => {
    it("reverses a compound operation (create layer + paint cells) atomically in reverse order", () => {
      const map = makeMap();
      let stack = emptyEditorOpStack();

      const newLayer = { name: "Overlay 2", grid: [[0, 0], [0, 0]] };
      map.tileLayers = map.tileLayers || [];
      map.tileLayers.push(newLayer);
      const layer1 = map.tileLayers[1];
      if (layer1 && layer1.grid && layer1.grid[0]) {
        layer1.grid[0][0] = 77;
      }

      const compoundOp = {
        kind: "compound" as const,
        description: "New Layer Paste",
        ops: [
          { kind: "create_layer" as const, layerIdx: 1, layer: newLayer },
          { kind: "paint_cells" as const, cells: [{ layerIdx: 1, r: 0, c: 0, before: 0, after: 77 }] },
        ],
      };

      stack = pushEditorOp(stack, compoundOp);
      expect(map.tileLayers).toHaveLength(2);
      expect(map.tileLayers[1]?.grid?.[0]?.[0]).toBe(77);

      // Single Undo reverses both paint and layer creation
      const undone = undoEditorOp(map, stack);
      expect(map.tileLayers).toHaveLength(1);
      expect(map.tileLayers[0]?.name).toBe("Ground");

      // Single Redo restores both
      redoEditorOp(map, undone.stack);
      expect(map.tileLayers).toHaveLength(2);
      expect(map.tileLayers[1]?.name).toBe("Overlay 2");
      expect(map.tileLayers[1]?.grid?.[0]?.[0]).toBe(77);
    });
  });
});

