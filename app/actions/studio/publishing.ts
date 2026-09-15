"use server";

import { prisma } from "@/web/lib/prisma";
import { revalidatePath } from "next/cache";
import { checkAdminPermission } from "../admin/game-admin";
import { getOrphanedReferences } from "./cross-references";
import { resolveWorldDependencies } from "./world-resolver";

export interface ValidationGateResult {
  valid: boolean;
  errorCount: number;
  warningCount: number;
  errors: string[];
  warnings: string[];
}

export interface ContentSummary {
  dungeonCount: number;
  shopCount: number;
  mountCount: number;
  worldEventCount: number;
  simulationPresetCount: number;
}

/**
 * Validate all world definitions prior to publishing.
 * Runs reference integrity checks, orphan detection, and template sanity checks.
 */
export async function validateWorldForPublish(
  gameId: string = "saints",
  profileId: string = "default"
): Promise<ValidationGateResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // 1. Cross-reference orphan checks
    const orphans = await getOrphanedReferences();
    for (const orph of orphans) {
      errors.push(orph.reason);
    }

    // 2. Query all templates for baseline integrity
    const [dungeons, shops, mounts, events, simulations] = await Promise.all([
      prisma.dungeonTemplate.findMany({ where: { gameId, profileId }, include: { mapReferences: true } }),
      prisma.shopTemplate.findMany({ where: { gameId, profileId }, include: { inventory: true } }),
      prisma.mountTemplate.findMany({ where: { gameId, profileId } }),
      prisma.worldEventTemplate.findMany({ where: { gameId, profileId } }),
      prisma.simulationPreset.findMany({ where: { gameId, profileId } }),
    ]);

    // Check active simulation preset
    const activeSims = simulations.filter((s) => s.isActive);
    if (activeSims.length > 1) {
      warnings.push(`Multiple simulation presets are marked active (${activeSims.map((s) => s.slug).join(", ")}). Only one should be active.`);
    }

    // Check shop item pricing
    for (const shop of shops) {
      if (!shop.inventory || shop.inventory.length === 0) {
        warnings.push(`Shop "${shop.slug}" has no items configured in stock.`);
      }
    }

    // Check dungeon map references
    for (const d of dungeons) {
      if (!d.mapReferences || d.mapReferences.length === 0) {
        warnings.push(`Dungeon "${d.slug}" has no map references configured.`);
      }
    }

    return {
      valid: errors.length === 0,
      errorCount: errors.length,
      warningCount: warnings.length,
      errors,
      warnings,
    };
  } catch (err: any) {
    console.error("[validateWorldForPublish]", err);
    return {
      valid: false,
      errorCount: 1,
      warningCount: 0,
      errors: [`Validation gate failed: ${err.message}`],
      warnings: [],
    };
  }
}

/**
 * Capture an immutable publish snapshot of the current world definitions.
 */
export async function createPublishSnapshot(input: {
  gameId?: string;
  profileId?: string;
  title: string;
  description?: string;
  version?: string;
  startingMapId?: string;
  defaultMapId?: string;
}) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: "Unauthorized" };

  const gameId = input.gameId || "saints";
  const profileId = input.profileId || "default";

  try {
    // 1. Run validation gates
    const validation = await validateWorldForPublish(gameId, profileId);

    // 2. Fetch all templates
    const [dungeons, shops, mounts, events, simulations, gameConfig, characterClasses] = await Promise.all([
      prisma.dungeonTemplate.findMany({ where: { gameId, profileId } }),
      prisma.shopTemplate.findMany({ where: { gameId, profileId } }),
      prisma.mountTemplate.findMany({ where: { gameId, profileId } }),
      prisma.worldEventTemplate.findMany({ where: { gameId, profileId } }),
      prisma.simulationPreset.findMany({ where: { gameId, profileId } }),
      prisma.gameConfig.findUnique({ where: { slug: gameId } }),
      prisma.characterClass.findMany({ where: { gameId } }),
    ]);

    const contentSummary: ContentSummary = {
      dungeonCount: dungeons.length,
      shopCount: shops.length,
      mountCount: mounts.length,
      worldEventCount: events.length,
      simulationPresetCount: simulations.length,
    };

    const compiledManifest = await resolveWorldDependencies(gameId);

    const payload = {
      projectId: gameId,
      profileId,
      timestamp: new Date().toISOString(),
      world: {
        name: gameConfig?.name || input.title || gameId,
        spawnMap: gameConfig?.defaultSpawnGateId || input.startingMapId || input.defaultMapId || compiledManifest.maps?.[0]?.id || "",
        spawnX: 14,
        spawnY: 14,
        spawnZ: 14,
      },
      dungeons,
      shops,
      mounts,
      events,
      simulations,
      gameConfig,
      characterClasses,
      ...compiledManifest,
    };

    const versionTag =
      input.version?.trim() ||
      `v1.0.${Date.now().toString().slice(-6)}`;

    // Resolve WorldProject ID to satisfy CUID relation
    const projectSlug = gameId || "saints";
    let activeProject = await prisma.worldProject.findUnique({
      where: { slug: projectSlug },
    });
    if (!activeProject) {
      activeProject = await prisma.worldProject.upsert({
        where: { slug: projectSlug },
        create: { slug: projectSlug, name: "Default Project" },
        update: {},
      });
    }

    const saved = await prisma.worldRelease.create({
      data: {
        projectId: activeProject.id,
        version: versionTag,
        title: input.title.trim() || `Release ${versionTag}`,
        description: input.description,
        status: validation.valid ? "PUBLISHED" : "DRAFT",
        validationReport: JSON.stringify(validation),
        contentSummary: JSON.stringify(contentSummary),
        manifestData: JSON.stringify(payload),
      },
    });

    if (saved.status === "PUBLISHED") {
      // Archive previous snapshots for this profile
      await prisma.worldRelease.updateMany({
        where: {
          projectId: activeProject.id,
          status: "PUBLISHED",
          id: { not: saved.id },
        },
        data: {
          status: "ARCHIVED",
        },
      });
    }

    return { success: true as const, data: saved, validation };
  } catch (err: any) {
    console.error("[createPublishSnapshot]", err);
    return { success: false as const, error: "Failed to create publish snapshot" };
  }
}

/**
 * Fetch draft maps from the internal MMO server.
 */
export async function fetchDraftMaps() {
  try {
    const goMmoBase = process.env.GO_MMO_INTERNAL_URL || process.env.NEXT_PUBLIC_GO_MMO_URL || 'http://localhost:24011';
    const res = await fetch(`${goMmoBase}/api/maps?action=drafts`);
    if (res.ok) {
      return { success: true, data: await res.json() };
    }
    return { success: false, error: "Failed to fetch maps" };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * List all historical publish snapshots.
 */
export async function listPublishSnapshots(gameId: string = "saints", profileId: string = "default") {
  try {
    const rows = await prisma.worldRelease.findMany({
      where: { projectId: gameId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return { success: true as const, data: rows };
  } catch (err) {
    console.error("[listPublishSnapshots]", err);
    return { success: false as const, data: [], error: "Failed to list snapshots" };
  }
}

/**
 * True Restore Implementation
 * Wipes current Working World (WorldMap, WorldRegion)
 * Reconstructs exactly from manifest (Release-owned state)
 * Retains Player State (GameCharacter) and WorldProject untouched.
 */
export async function restoreWorldRelease(snapshotId: string) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: "Unauthorized" };

  try {
    const snapshot = await prisma.worldRelease.findUnique({
      where: { id: snapshotId },
    });

    if (!snapshot) return { success: false, error: "Snapshot not found" };

    const payload = JSON.parse(snapshot.manifestData);
    const { maps, atlas, gameConfig, characterClasses, actors } = payload;
    
    // Wipe Working World records for this project. WorldRegion cascades from WorldMap.
    await prisma.worldMap.deleteMany({
      where: { projectId: snapshot.projectId }
    });

    // Reconstruct Maps EXACTLY as they were
    if (Array.isArray(maps)) {
      for (const m of maps) {
        await prisma.worldMap.create({
          data: {
            id: m.id,
            projectId: snapshot.projectId,
            name: m.name,
            gridData: m.gridData || "[]",
            gatesData: m.gatesData || "[]",
            encountersData: m.encountersData || "[]",
            entitiesData: m.entitiesData || "[]",
            freeformLayersData: m.freeformLayersData || "[]",
            mapType: m.mapType || "TILE",
            version: m.version || 1,
          },
        });
      }
    }

    // Reconstruct Atlas Regions exactly as they were
    if (atlas && typeof atlas === 'object') {
      for (const [key, checksum] of Object.entries(atlas)) {
        const parts = key.split('_');
        if (parts.length >= 3) {
          const mapId = parts.slice(0, parts.length - 2).join('_');
          const regionX = parseInt(parts[parts.length - 2], 10);
          const regionZ = parseInt(parts[parts.length - 1], 10);
          
          if (!isNaN(regionX) && !isNaN(regionZ)) {
            await prisma.worldRegion.create({
              data: {
                mapId,
                regionX,
                regionZ,
                status: "COMPLETED",
                artifactChecksum: checksum as string,
              }
            });
          }
        }
      }
    }
    
    // Restore GameConfig exactly
    if (gameConfig && gameConfig.slug) {
      await prisma.gameConfig.update({
        where: { slug: gameConfig.slug },
        data: {
          defaultSpawnGateId: gameConfig.defaultSpawnGateId,
          baseStats: gameConfig.baseStats,
          combatFormula: gameConfig.combatFormula,
          skillFormula: gameConfig.skillFormula,
          xpCurve: gameConfig.xpCurve,
          globalShinyChancePercent: gameConfig.globalShinyChancePercent,
          maxEntitiesPerMap: gameConfig.maxEntitiesPerMap,
          maxPlayersPerMap: gameConfig.maxPlayersPerMap,
        }
      });
    }

    // Restore CharacterClasses exactly
    if (Array.isArray(characterClasses)) {
      for (const cc of characterClasses) {
        if (cc.id) {
          await prisma.characterClass.updateMany({
            where: { id: cc.id },
            data: {
              name: cc.name,
              description: cc.description,
              icon: cc.icon,
              color: cc.color,
              iconAssetId: cc.iconAssetId,
              baseStats: cc.baseStats,
              statDeltas: cc.statDeltas,
              skillDeltas: cc.skillDeltas,
              classId: cc.classId,
              growthRates: cc.growthRates,
              allowedSpriteTags: cc.allowedSpriteTags,
              spriteFilters: cc.spriteFilters,
              startingEquipment: cc.startingEquipment,
              learnableSkills: cc.learnableSkills,
              perks: cc.perks,
              abilities: cc.abilities,
              skillProgression: cc.skillProgression,
              abilityProgression: cc.abilityProgression,
              perkProgression: cc.perkProgression,
              isPlayable: cc.isPlayable,
              sortOrder: cc.sortOrder,
            }
          });
        }
      }
    }

    // Restore CreatureDefs exactly
    if (actors && Array.isArray(actors.creatures)) {
      for (const creature of actors.creatures) {
        if (creature.slug) {
          await prisma.creatureDef.updateMany({
            where: { slug: creature.slug },
            data: {
              name: creature.name,
              dexNumber: creature.dexNumber,
              typePrimary: creature.typePrimary,
              typeSecondary: creature.typeSecondary,
              mythos: creature.mythos,
              spriteOverworld: creature.spriteOverworld,
              spriteBattle: creature.spriteBattle,
              spriteBack: creature.spriteBack,
              shinyEnabled: creature.shinyEnabled,
              shinyUseGlobalChance: creature.shinyUseGlobalChance,
              shinyChancePercent: creature.shinyChancePercent,
              shinySpriteOverworld: creature.shinySpriteOverworld,
              shinySpriteBattle: creature.shinySpriteBattle,
              shinySpriteBack: creature.shinySpriteBack,
              baseHp: creature.baseHp,
              physicalPower: creature.physicalPower,
              physicalDefense: creature.physicalDefense,
              abilityPower: creature.abilityPower,
              abilityDefense: creature.abilityDefense,
              combatTempo: creature.combatTempo,
              catchRate: creature.catchRate,
              isCapturable: creature.isCapturable,
              starterLevel: creature.starterLevel,
              passivesJson: creature.passivesJson,
              worldSkillName: creature.worldSkillName,
              worldSkillDescription: creature.worldSkillDescription,
              abilitiesJson: creature.abilitiesJson,
              flavor: creature.flavor,
              tag: creature.tag,
              tagColor: creature.tagColor,
              stage: creature.stage,
              isStarter: creature.isStarter,
              isWildSpawn: creature.isWildSpawn,
              isActive: creature.isActive,
              sortOrder: creature.sortOrder,
              evolutionsJson: creature.evolutionsJson,
            }
          });
        }
      }
    }

    return { success: true as const };
  } catch (err: any) {
    console.error("[restoreWorldRelease]", err);
    return { success: false as const, error: "Failed to restore" };
  }
}

