import { describe, expect, it } from "vitest";
import {
  clearDefinitionOpsForKey,
  definitionOpValue,
  emptyDefinitionOpStack,
  pushDefinitionOp,
  redoDefinitionOp,
  undoDefinitionOp,
} from "./definitionOps";

describe("definitionOps", () => {
  it("pushes snapshots and undoes to before", () => {
    let stack = emptyDefinitionOpStack();
    stack = pushDefinitionOp(stack, "quest:a", { title: "A" }, { title: "B" });
    stack = pushDefinitionOp(stack, "quest:a", { title: "B" }, { title: "C" });
    expect(stack.undo).toHaveLength(2);

    const u1 = undoDefinitionOp(stack);
    expect(definitionOpValue(u1.op!, "undo")).toEqual({ title: "B" });
    const u2 = undoDefinitionOp(u1.stack);
    expect(definitionOpValue(u2.op!, "undo")).toEqual({ title: "A" });
    expect(u2.stack.undo).toHaveLength(0);
    expect(u2.stack.redo).toHaveLength(2);
  });

  it("ignores no-op snapshots", () => {
    let stack = emptyDefinitionOpStack();
    stack = pushDefinitionOp(stack, "quest:a", { x: 1 }, { x: 1 });
    expect(stack.undo).toHaveLength(0);
  });

  it("redoes after undo", () => {
    let stack = pushDefinitionOp(
      emptyDefinitionOpStack(),
      "quest:a",
      { title: "A" },
      { title: "B" }
    );
    const undone = undoDefinitionOp(stack);
    const redone = redoDefinitionOp(undone.stack);
    expect(definitionOpValue(redone.op!, "redo")).toEqual({ title: "B" });
    expect(redone.stack.undo).toHaveLength(1);
  });

  it("clears ops for one resource key", () => {
    let stack = emptyDefinitionOpStack();
    stack = pushDefinitionOp(stack, "quest:a", { a: 1 }, { a: 2 });
    stack = pushDefinitionOp(stack, "quest:b", { b: 1 }, { b: 2 });
    stack = clearDefinitionOpsForKey(stack, "quest:a");
    expect(stack.undo.map((o) => o.resourceKey)).toEqual(["quest:b"]);
  });
});
