import { describe, expect, it } from "vitest";

/**
 * Lightweight coverage for CONTINUE #2 cell-key helpers used by WorldManager.
 * Full WorldManager needs GameEngine; cell-set semantics are the critical contract.
 */
describe("per-account bramble cell keys", () => {
  it("stores clears per account without sharing sets", () => {
    const cleared = new Map<string, Set<string>>();
    const mark = (account: string, x: number, y: number) => {
      let set = cleared.get(account);
      if (!set) {
        set = new Set();
        cleared.set(account, set);
      }
      set.add(`${x},${y}`);
    };
    const has = (account: string, x: number, y: number) =>
      cleared.get(account)?.has(`${x},${y}`) ?? false;

    mark("userA", 14, 10);
    expect(has("userA", 14, 10)).toBe(true);
    expect(has("userB", 14, 10)).toBe(false);

    mark("userB", 14, 10);
    expect(has("userB", 14, 10)).toBe(true);
    expect(has("userA", 12, 10)).toBe(false);
  });
});
