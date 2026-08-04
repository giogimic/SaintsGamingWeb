import { afterEach, describe, expect, it } from "vitest";
import {
  getIsEditorMode,
  setEditorMode,
  shouldExportEditorOverlays,
  shouldShowGameplayHud,
  shouldSuppressGameplaySystems,
} from "./studioSession";

describe("studioSession", () => {
  afterEach(() => {
    setEditorMode(false);
  });

  it("toggles isEditorMode", () => {
    expect(getIsEditorMode()).toBe(false);
    setEditorMode(true);
    expect(getIsEditorMode()).toBe(true);
  });

  it("suppresses gameplay only when Studio create tools are open", () => {
    expect(
      shouldSuppressGameplaySystems({ isEditorMode: true, isCreationMode: true })
    ).toBe(true);
    expect(
      shouldSuppressGameplaySystems({ isEditorMode: true, isCreationMode: false })
    ).toBe(false);
    expect(
      shouldSuppressGameplaySystems({ isEditorMode: false, isCreationMode: true })
    ).toBe(false);
  });

  it("hides gameplay HUD during Studio create tools", () => {
    expect(shouldShowGameplayHud({ isEditorMode: true, isCreationMode: true })).toBe(false);
    expect(shouldShowGameplayHud({ isEditorMode: true, isCreationMode: false })).toBe(true);
    expect(shouldShowGameplayHud({ isEditorMode: false, isCreationMode: false })).toBe(true);
  });

  it("never exports editor overlays to runtime", () => {
    expect(shouldExportEditorOverlays()).toBe(false);
  });
});
