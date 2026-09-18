"use server";

import { prisma } from "@/web/lib/prisma";
import { revalidatePath } from "next/cache";
import { checkAdminPermission } from "../admin/game-admin";
import { resolveWorldDependencies } from "./world-resolver";
import { compileWorldRelease } from "./compiler/WorldCompiler";

/**
 * List all historical publish snapshots.
 */
export async function listPublishSnapshots(gameId: string = "saints", profileId: string = "default") {
  try {
    const project = await prisma.worldProject.findFirst({
      where: {
        OR: [{ id: gameId }, { slug: gameId }]
      },
      select: { id: true }
    });
    const candidateIds = [gameId];
    if (project?.id && project.id !== gameId) {
      candidateIds.push(project.id);
    }

    const rows = await prisma.worldRelease.findMany({
      where: { projectId: { in: candidateIds } },
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
    // Phase B: Restore Semantics
    // 1. Auto-Backup Current Working World
    try {
      await compileWorldRelease(snapshot.projectId, "Auto-Backup Pre-Restore", "Automated backup created before restoring a previous snapshot.");
    } catch (e) {
      console.warn("Failed to create auto-backup before restore", e);
    }

    const project = await prisma.worldProject.findUnique({ where: { id: snapshot.projectId } });
    const targetVersion = project?.activeVersion || 1;

    // 2. Wipe Working World records for this project. WorldRegion cascades from WorldMap.
    await prisma.worldMap.deleteMany({
      where: { projectId: snapshot.projectId }
    });

    // 3. Reconstruct Maps EXACTLY as they were from the decoupled snapshots
    const mapSnapshots = await prisma.worldMapSnapshot.findMany({
      where: { releaseId: snapshotId }
    });

    for (const m of mapSnapshots) {
      await prisma.worldMap.create({
        data: {
          id: m.mapId,
          projectId: snapshot.projectId,
          name: m.name,
          gridData: m.gridData || (m.mapType === 'FRACTAL' ? null : "[]"),
          gatesData: m.gatesData || "[]",
          encountersData: m.encountersData || "[]",
          entitiesData: m.entitiesData || "[]",
          freeformLayersData: m.freeformLayersData || "[]",
          mapType: m.mapType || "TILE",
          regionClass: m.regionClass || "authored",
          proceduralConfig: m.proceduralConfig,
          version: targetVersion,
        },
      });
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

