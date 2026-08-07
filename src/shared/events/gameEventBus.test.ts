import { describe, it, expect, vi, beforeEach } from "vitest";
import { GameEventBus } from "./gameEventBus";

describe("GameEventBus", () => {
  let bus: GameEventBus;

  beforeEach(() => {
    bus = new GameEventBus();
  });

  it("should deliver events to subscribers", () => {
    const handler = vi.fn();
    bus.subscribe("creature.captured", handler);

    bus.emit("creature.captured", {
      userId: "user_1",
      creatureSlug: "rockitten",
      mapId: "DEMO_SANDBOX",
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({
      userId: "user_1",
      creatureSlug: "rockitten",
      mapId: "DEMO_SANDBOX",
    });
  });

  it("should allow unsubscribing via returned cleanup function", () => {
    const handler = vi.fn();
    const unsubscribe = bus.subscribe("item.crafted", handler);

    bus.emit("item.crafted", { userId: "user_1", itemSlug: "film_standard", quantity: 1 });
    expect(handler).toHaveBeenCalledTimes(1);

    unsubscribe();

    bus.emit("item.crafted", { userId: "user_1", itemSlug: "film_standard", quantity: 2 });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("should isolate handler exceptions gracefully", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const faultyHandler = vi.fn().mockImplementation(() => {
      throw new Error("Boom");
    });
    const normalHandler = vi.fn();

    bus.subscribe("quest.completed", faultyHandler);
    bus.subscribe("quest.completed", normalHandler);

    expect(() => {
      bus.emit("quest.completed", { userId: "user_1", questId: "Q001" });
    }).not.toThrow();

    expect(faultyHandler).toHaveBeenCalledTimes(1);
    expect(normalHandler).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
