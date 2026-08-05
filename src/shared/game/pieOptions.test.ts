import { describe, expect, it } from "vitest";
import {
  DEFAULT_PIE_OPTIONS,
  shouldPieSuppressEncounters,
} from "./pieOptions";

describe("pieOptions", () => {
  it("defaults pause spawners on and god mode off", () => {
    expect(DEFAULT_PIE_OPTIONS.pauseSpawners).toBe(true);
    expect(DEFAULT_PIE_OPTIONS.godMode).toBe(false);
    expect(DEFAULT_PIE_OPTIONS.isolateShard).toBe(true);
  });

  it("suppresses encounters when god mode or pause spawners", () => {
    expect(shouldPieSuppressEncounters(DEFAULT_PIE_OPTIONS)).toBe(true);
    expect(
      shouldPieSuppressEncounters({ ...DEFAULT_PIE_OPTIONS, pauseSpawners: false })
    ).toBe(false);
    expect(
      shouldPieSuppressEncounters({
        ...DEFAULT_PIE_OPTIONS,
        pauseSpawners: false,
        godMode: true,
      })
    ).toBe(true);
  });
});
