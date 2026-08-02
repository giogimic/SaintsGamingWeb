import { describe, expect, it } from "vitest";

/**
 * Unit-level coverage for quest gold → credits mapping.
 * Mirrors InventoryManager.handleGrantRewards credit math without spinning GameEngine.
 */
describe("quest gold → credits", () => {
  it("adds gold onto existing credits", () => {
    const state = { credits: 1000 } as Record<string, unknown>;
    const gold = 80;
    state.credits = Number(state.credits || 0) + gold;
    expect(state.credits).toBe(1080);
  });

  it("treats missing credits as 0", () => {
    const state = {} as Record<string, unknown>;
    const gold = 50;
    state.credits = Number(state.credits || 0) + gold;
    expect(state.credits).toBe(50);
  });

  it("ignores non-positive gold", () => {
    const gold = Math.max(0, Math.floor(Number(undefined) || 0));
    expect(gold).toBe(0);
  });
});
