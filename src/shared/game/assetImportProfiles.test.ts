import { describe, expect, it } from "vitest";
import {
  getDefaultSlotRole,
  getMissingRequiredRoles,
  inferCategoryForRole,
  inferCharacterViewFromFacing,
  inferTypeForProfile,
  isCharacterComponentCategory,
  isValidAssetImportProfile,
  isValidSlotRole,
  listAssetImportProfiles,
  listCharacterComponentCategories,
  listCharacterViewDirections,
  listSlotRolesForProfile,
} from "./assetImportProfiles";

describe("asset import profiles", () => {
  it("validates profile ids", () => {
    expect(isValidAssetImportProfile("character")).toBe(true);
    expect(isValidAssetImportProfile("unknown")).toBe(false);
  });

  it("returns deterministic profile helpers", () => {
    expect(listAssetImportProfiles()).toContain("item");
    expect(listSlotRolesForProfile("tile")).toContain("base");
    expect(getDefaultSlotRole("effect")).toBe("impact");
    expect(inferTypeForProfile("ui")).toBe("UI");
  });

  it("validates slot roles by profile", () => {
    expect(isValidSlotRole("character", "walk")).toBe(true);
    expect(isValidSlotRole("character", "panel")).toBe(false);
  });

  it("infers categories and required role gaps", () => {
    expect(inferCategoryForRole("icon")).not.toBeNull();
    expect(inferCategoryForRole("not_a_role")).toBeNull();
    expect(getMissingRequiredRoles("creature", ["front"]).sort()).toEqual(["back"]);
  });

  it("supports modular character sprite components", () => {
    expect(isCharacterComponentCategory("hair")).toBe(true);
    expect(isCharacterComponentCategory("unknown-layer")).toBe(false);
    expect(listCharacterComponentCategories()).toContain("hat");
    expect(listCharacterComponentCategories()).toContain("clothing");
  });

  it("supports the full-sprite exclusion branch for modular filtering", () => {
    expect(isCharacterComponentCategory("hat")).toBe(true);
    expect(listCharacterComponentCategories()).not.toContain("unknown-component");
  });

  it("supports explicit front, back, and side-view direction metadata", () => {
    expect(listCharacterViewDirections()).toContain("front");
    expect(listCharacterViewDirections()).toContain("back");
    expect(listCharacterViewDirections()).toContain("left");
    expect(listCharacterViewDirections()).toContain("right");
    expect(inferCharacterViewFromFacing("S")).toBe("front");
    expect(inferCharacterViewFromFacing("N")).toBe("back");
    expect(inferCharacterViewFromFacing("W")).toBe("left");
    expect(inferCharacterViewFromFacing("E")).toBe("right");
  });
});
