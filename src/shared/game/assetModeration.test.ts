import { describe, it, expect } from "vitest";
import {
  canUserModerateAssets,
  canUserAccessAsset,
  getAssetAttribution,
  AssetEntity,
} from "./assetPermissions";

describe("Asset Governance & Permissions (Bible 35 §6-7)", () => {
  const publicApprovedAsset: AssetEntity = {
    id: "asset_1",
    createdById: "user_artist",
    visibility: "PUBLIC",
    moderationStatus: "APPROVED",
    license: "CC0",
    createdBy: { displayName: "PixelArtis" },
  };

  const personalPendingAsset: AssetEntity = {
    id: "asset_2",
    createdById: "user_artist",
    visibility: "PERSONAL",
    moderationStatus: "PENDING",
    license: "MIT",
    createdBy: { username: "artist_bob" },
  };

  const projectAsset: AssetEntity = {
    id: "asset_3",
    createdById: "user_bob",
    visibility: "PROJECT",
    moderationStatus: "APPROVED",
    gameId: "realm_alpha",
    license: "Custom",
  };

  it("identifies moderator authority correctly based on permissionLevel", () => {
    expect(canUserModerateAssets({ id: "u1", permissionLevel: 100 })).toBe(false);
    expect(canUserModerateAssets({ id: "u2", permissionLevel: 200 })).toBe(true);
    expect(canUserModerateAssets({ id: "u3", permissionLevel: 400 })).toBe(true);
    expect(canUserModerateAssets(null)).toBe(false);
  });

  it("allows public approved assets to be accessed by any user or guest", () => {
    expect(canUserAccessAsset(publicApprovedAsset, null)).toBe(true);
    expect(canUserAccessAsset(publicApprovedAsset, { id: "stranger" })).toBe(true);
  });

  it("restricts unapproved pending assets to owner and moderators only", () => {
    expect(canUserAccessAsset(personalPendingAsset, null)).toBe(false);
    expect(canUserAccessAsset(personalPendingAsset, { id: "stranger" })).toBe(false);
    expect(canUserAccessAsset(personalPendingAsset, { id: "user_artist" })).toBe(true);
    expect(canUserAccessAsset(personalPendingAsset, { id: "mod_user", permissionLevel: 200 })).toBe(true);
  });

  it("verifies project realm scoping for PROJECT assets", () => {
    expect(canUserAccessAsset(projectAsset, { id: "u1", gameId: "realm_beta" })).toBe(false);
    expect(canUserAccessAsset(projectAsset, { id: "u2", gameId: "realm_alpha" })).toBe(true);
  });

  it("formats attribution strings with author and license", () => {
    expect(getAssetAttribution(publicApprovedAsset)).toBe("Created by PixelArtis • License: CC0");
    expect(getAssetAttribution(personalPendingAsset)).toBe("Created by artist_bob • License: MIT");
  });
});
