import { describe, expect, it } from "vitest";
import {
  canEnterStudio,
  canUseStudioDock,
  canUseStudioEngineConfig,
  canUseStudioServerControls,
  canWriteStudioContent,
} from "./studioPermissions";

describe("studioPermissions", () => {
  it("blocks players and mods from Studio entry", () => {
    expect(canEnterStudio(20)).toBe(false);
    expect(canEnterStudio(200)).toBe(false);
  });

  it("allows Admin and Developer into Studio", () => {
    expect(canEnterStudio(400)).toBe(true);
    expect(canEnterStudio(1000)).toBe(true);
  });

  it("gates Dev dock to Admin+", () => {
    expect(canUseStudioDock(400, "dev")).toBe(true);
    expect(canUseStudioDock(200, "dev")).toBe(false);
    expect(canUseStudioDock(1000, "build")).toBe(true);
  });

  it("keeps engine config at Developer+", () => {
    expect(canUseStudioEngineConfig(400)).toBe(false);
    expect(canUseStudioEngineConfig(1000)).toBe(true);
    expect(canUseStudioServerControls(400)).toBe(true);
  });

  it("allows Admin+ content writes", () => {
    expect(canWriteStudioContent(400)).toBe(true);
    expect(canWriteStudioContent(1000)).toBe(true);
    expect(canWriteStudioContent(200)).toBe(false);
  });
});
