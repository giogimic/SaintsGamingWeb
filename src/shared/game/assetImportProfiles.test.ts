import { describe, expect, it } from "vitest";
import {
  getDefaultSlotRole,
  getMissingRequiredRoles,
  inferCategoryForRole,
  inferTypeForProfile,
  isValidAssetImportProfile,
  isValidSlotRole,
  listAssetImportProfiles,
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
});
