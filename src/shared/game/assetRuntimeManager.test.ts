import { describe, expect, it, vi } from "vitest";
import { RuntimeAssetManager } from "./assetRuntimeManager";

describe("RuntimeAssetManager", () => {
  it("should register assets with DISCOVERED state and correct dependencies", () => {
    const manager = new RuntimeAssetManager();

    const sprite = manager.registerAsset({
      id: "sprite_hero",
      name: "Hero Sprite",
      type: "SPRITE",
      sourceUrl: "/assets/hero.png",
      tags: ["hero", "player"],
    });

    const character = manager.registerAsset({
      id: "char_hero_def",
      name: "Hero Definition",
      type: "CHARACTER",
      sourceUrl: "/defs/hero.json",
      dependencies: ["sprite_hero"],
      preloadGroup: "player",
    });

    expect(sprite.state).toBe("DISCOVERED");
    expect(character.state).toBe("DISCOVERED");
    expect(sprite.dependents).toContain("char_hero_def");
  });

  it("should load an asset and resolve its dependencies in sequence", async () => {
    const manager = new RuntimeAssetManager();

    manager.registerAsset({
      id: "anim_walk",
      name: "Walk Anim",
      type: "ANIMATION",
      sourceUrl: "/anims/walk.json",
    });

    manager.registerAsset({
      id: "sprite_char",
      name: "Character Sprite",
      type: "SPRITE",
      sourceUrl: "/sprites/char.png",
      dependencies: ["anim_walk"],
    });

    const statesRecorded: string[] = [];
    manager.onStateChange((asset) => {
      statesRecorded.push(`${asset.id}:${asset.state}`);
    });

    const loaded = await manager.loadAsset("sprite_char");
    expect(loaded.state).toBe("READY");

    const anim = manager.getAsset("anim_walk");
    expect(anim?.state).toBe("READY");

    expect(statesRecorded).toContain("anim_walk:READY");
    expect(statesRecorded).toContain("sprite_char:READY");
  });

  it("should report ERROR if dependency is missing", async () => {
    const manager = new RuntimeAssetManager();

    manager.registerAsset({
      id: "creature_boss",
      name: "Boss Creature",
      type: "CREATURE",
      sourceUrl: "/defs/boss.json",
      dependencies: ["missing_sound_fx"],
    });

    await expect(manager.loadAsset("creature_boss")).rejects.toThrow("Missing dependencies: missing_sound_fx");

    const boss = manager.getAsset("creature_boss");
    expect(boss?.state).toBe("ERROR");
    expect(boss?.error).toContain("missing_sound_fx");
  });

  it("should handle containers, warming, activation, and map transitions", async () => {
    const manager = new RuntimeAssetManager();

    manager.registerAsset({
      id: "town_tiles",
      name: "Town Tileset",
      type: "TILESET",
      sourceUrl: "/tiles/town.png",
    });

    manager.registerAsset({
      id: "town_ambience",
      name: "Town Ambience",
      type: "AUDIO",
      sourceUrl: "/audio/town.mp3",
    });

    manager.registerAsset({
      id: "dungeon_tiles",
      name: "Dungeon Tileset",
      type: "TILESET",
      sourceUrl: "/tiles/dungeon.png",
    });

    const townContainer = manager.createContainer({
      id: "container_town",
      name: "Town Map Container",
      type: "map",
      primaryAssetId: "town_tiles",
      extraAssetIds: ["town_ambience"],
    });

    const dungeonContainer = manager.createContainer({
      id: "container_dungeon",
      name: "Dungeon Map Container",
      type: "map",
      primaryAssetId: "dungeon_tiles",
    });

    // 1. Warm container
    await manager.warmContainer("container_town");
    expect(townContainer.state).toBe("WARM");
    expect(manager.getAsset("town_tiles")?.state).toBe("READY");

    // 2. Activate container
    await manager.activateContainer("container_town");
    expect(townContainer.state).toBe("ACTIVE");
    expect(manager.getAsset("town_tiles")?.state).toBe("ACTIVE");

    // 3. Transition to Dungeon
    const transition = await manager.handleMapTransition({
      destinationMapContainerId: "container_dungeon",
      releaseColdAssets: true,
    });

    expect(transition.ready).toBe(true);
    expect(dungeonContainer.state).toBe("ACTIVE");
    expect(manager.getAsset("dungeon_tiles")?.state).toBe("ACTIVE");
    expect(townContainer.state).toBe("COLD");
    expect(manager.getAsset("town_tiles")?.state).toBe("RELEASED");
  });

  it("should provide comprehensive diagnostics", () => {
    const manager = new RuntimeAssetManager();

    manager.registerAsset({
      id: "asset_valid",
      name: "Valid Asset",
      type: "OBJECT",
      sourceUrl: "/obj.png",
    });

    manager.registerAsset({
      id: "asset_broken",
      name: "Broken Asset",
      type: "OBJECT",
      sourceUrl: "/broken.png",
      dependencies: ["non_existent_dep"],
    });

    const diag = manager.getDiagnostics();
    expect(diag.totalRegistered).toBe(2);
    expect(diag.missingDependencies.length).toBe(1);
    expect(diag.missingDependencies[0]).toEqual({
      assetId: "asset_broken",
      missingId: "non_existent_dep",
    });
  });

  it("warm asset transitions to active on use", async () => {
    const manager = new RuntimeAssetManager();
    manager.registerAsset({
      id: "spell_fireball",
      name: "Fireball FX",
      type: "EFFECT",
      sourceUrl: "/fx/fireball.png",
    });

    await manager.loadAsset("spell_fireball");
    expect(manager.getAsset("spell_fireball")?.state).toBe("READY");

    manager.activateAsset("spell_fireball");
    expect(manager.getAsset("spell_fireball")?.state).toBe("ACTIVE");
  });

  it("active asset transitions to cached on release/deactivate", async () => {
    const manager = new RuntimeAssetManager();
    manager.registerAsset({
      id: "boss_music",
      name: "Boss Theme",
      type: "AUDIO",
      sourceUrl: "/audio/boss.mp3",
    });

    await manager.loadAsset("boss_music");
    manager.activateAsset("boss_music");
    expect(manager.getAsset("boss_music")?.state).toBe("ACTIVE");

    manager.deactivateAsset("boss_music");
    expect(manager.getAsset("boss_music")?.state).toBe("CACHED");
  });

  it("cached asset transitions to ready / active on re-request", async () => {
    const manager = new RuntimeAssetManager();
    manager.registerAsset({
      id: "dungeon_map",
      name: "Dungeon Map",
      type: "MAP",
      sourceUrl: "/maps/dungeon.json",
    });

    await manager.loadAsset("dungeon_map");
    manager.activateAsset("dungeon_map");
    manager.deactivateAsset("dungeon_map");
    expect(manager.getAsset("dungeon_map")?.state).toBe("CACHED");

    // Re-activating from cached state
    manager.activateAsset("dungeon_map");
    expect(manager.getAsset("dungeon_map")?.state).toBe("ACTIVE");
  });
});
