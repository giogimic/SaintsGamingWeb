import { afterEach, describe, expect, it } from "vitest";
import {
  getIsEditorMode,
  isCreationActive,
  setEditorMode,
  shouldDisableGameplayInput,
  shouldExportEditorOverlays,
  shouldHidePlayerAvatar,
  shouldShowGameplayHud,
  shouldSuppressGameplaySystems,
  studioRuntimeFromCreation,
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

  it("maps creation flag to editor|playtest runtime", () => {
    expect(studioRuntimeFromCreation(true)).toBe("editor");
    expect(studioRuntimeFromCreation(false)).toBe("playtest");
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

  it("hard-disables gameplay input in editor runtime", () => {
    expect(
      shouldDisableGameplayInput({ isEditorMode: true, isCreationMode: true })
    ).toBe(true);
    expect(
      shouldDisableGameplayInput({ isEditorMode: true, isCreationMode: false })
    ).toBe(false);
    expect(isCreationActive({ isEditorMode: true, isCreationMode: true })).toBe(true);
  });

  it("hides gameplay HUD during Studio create tools", () => {
    expect(shouldShowGameplayHud({ isEditorMode: true, isCreationMode: true })).toBe(false);
    expect(shouldShowGameplayHud({ isEditorMode: true, isCreationMode: false })).toBe(true);
    expect(shouldShowGameplayHud({ isEditorMode: false, isCreationMode: false })).toBe(true);
  });

  it("hides player avatar during Studio editor runtime", () => {
    expect(
      shouldHidePlayerAvatar({ isEditorMode: true, isCreationMode: true })
    ).toBe(true);
    expect(
      shouldHidePlayerAvatar({ isEditorMode: true, isCreationMode: false })
    ).toBe(false);
  });

  it("never exports editor overlays to runtime", () => {
    expect(shouldExportEditorOverlays()).toBe(false);
  });
});
