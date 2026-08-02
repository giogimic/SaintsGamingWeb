/**
 * Clone Saints Trail template into a target world profile with namespaced
 * quest slugs + npcIds so Custom 2 (etc.) can edit independently.
 */

import { PrismaClient } from "@prisma/client";
import {
  buildDemoSandboxGrid,
  DEMO_ENCOUNTERS,
  DEMO_MAP_H,
  DEMO_MAP_ID,
  DEMO_MAP_W,
} from "./demoMapSeed";
import {
  SAINTS_TRAIL_DIALOGUES,
  SAINTS_TRAIL_GAME_ID,
  SAINTS_TRAIL_NPCS,
  SAINTS_TRAIL_QUEST_CHAIN,
} from "./saintsTrailQuests";

export type CloneTrailResult = {
  targetSlug: string;
  mapId: string;
  quests: number;
  npcs: number;
  dialogues: number;
};

/** Prefix ids so clones don't collide with custom_1 / Spyder rows. */
export function trailNamespace(targetSlug: string, id: string): string {
  const slug = targetSlug.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
  if (id.startsWith("quest_")) {
    return `quest_${slug}_${id.slice("quest_".length)}`;
  }
  if (id.startsWith("npc_")) {
    return `npc_${slug}_${id.slice("npc_".length)}`;
  }
  return `${slug}_${id}`;
}

function rewriteDialogueTree(
  tree: Record<string, unknown>,
  targetSlug: string
): Record<string, unknown> {
  const toolsQuest = trailNamespace(targetSlug, "quest_tools_of_trade");
  const out: Record<string, unknown> = {};
  for (const [nodeId, raw] of Object.entries(tree)) {
    const node = (raw || {}) as {
      text?: string;
      options?: Array<Record<string, string>>;
    };
    out[nodeId] = {
      text: node.text || "",
      options: (node.options || []).map((o) => {
        const next: Record<string, string> = {
          label: o.label || "…",
          nextNode: o.nextNode || "exit",
        };
        if (o.action) next.action = o.action;
        if (o.questSlug) {
          next.questSlug = trailNamespace(targetSlug, o.questSlug);
        } else if (o.action === "GRANT_DEMO_TOOLS") {
          next.questSlug = toolsQuest;
        }
        return next;
      }),
    };
  }
  return out;
}

function rewriteRewardsJson(rewards: string, targetSlug: string): string {
  try {
    const parsed = JSON.parse(rewards) as { nextQuest?: string; [k: string]: unknown };
    if (parsed.nextQuest) {
      parsed.nextQuest = trailNamespace(targetSlug, parsed.nextQuest);
    }
    return JSON.stringify(parsed);
  } catch {
    return rewards;
  }
}

export async function cloneSaintsTrailToProfile(
  prisma: PrismaClient,
  opts: { targetSlug: string; name?: string; force?: boolean }
): Promise<CloneTrailResult> {
  const targetSlug = opts.targetSlug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_");
  if (!targetSlug) throw new Error("Invalid target slug");
  if (targetSlug === SAINTS_TRAIL_GAME_ID) {
    throw new Error("Cannot clone Trail onto custom_1 (source profile)");
  }

  const mapId = `${targetSlug.toUpperCase()}_TRAIL`;
  const force = !!opts.force;

  const displayName = opts.name?.trim() || `Trail clone (${targetSlug})`;
  await prisma.gameConfig.upsert({
    where: { slug: targetSlug },
    create: {
      slug: targetSlug,
      name: displayName,
      description: "Cloned from Saints Trail template",
      isActive: false,
    },
    update: {
      name: displayName,
      description: "Cloned from Saints Trail template",
    },
  });

  // Prefer live DEMO_SANDBOX grid; fall back to generator
  const source = await prisma.worldMap.findUnique({ where: { id: DEMO_MAP_ID } });
  const gridJson = source?.gridData || JSON.stringify(buildDemoSandboxGrid());
  const encountersJson =
    source?.encountersData || JSON.stringify(DEMO_ENCOUNTERS);
  const tilesetsData = source?.tilesetsData || "[]";
  const tileLayersData = source?.tileLayersData || "[]";

  const npcs = SAINTS_TRAIL_NPCS.map((n) => ({
    ...n,
    id: trailNamespace(targetSlug, n.id),
  }));

  const existingMap = await prisma.worldMap.findUnique({ where: { id: mapId } });
  if (existingMap && !force) {
    // Still refresh gameId / allow quest upsert below
    await prisma.worldMap.update({
      where: { id: mapId },
      data: { gameId: targetSlug },
    });
  } else {
    await prisma.worldMap.upsert({
      where: { id: mapId },
      create: {
        id: mapId,
        gameId: targetSlug,
        name: `${opts.name || targetSlug} Trail`,
        gridData: gridJson,
        gatesData: source?.gatesData || "{}",
        npcsData: JSON.stringify(npcs),
        encountersData: encountersJson,
        tileLayersData,
        tilesetsData,
      },
      update: {
        gameId: targetSlug,
        name: `${opts.name || targetSlug} Trail`,
        gridData: gridJson,
        npcsData: JSON.stringify(npcs),
        encountersData: encountersJson,
        version: { increment: 1 },
      },
    });
  }

  await prisma.gameMap.upsert({
    where: { id: mapId },
    create: {
      id: mapId,
      name: `${opts.name || targetSlug} Trail`,
      width: DEMO_MAP_W,
      height: DEMO_MAP_H,
      tilesetData: gridJson,
      npcs: JSON.stringify(npcs),
      encounters: encountersJson,
      gates: "{}",
    },
    update: {
      name: `${opts.name || targetSlug} Trail`,
      npcs: JSON.stringify(npcs),
      tilesetData: gridJson,
      encounters: encountersJson,
    },
  });

  let dialogues = 0;
  for (const [npcId, def] of Object.entries(SAINTS_TRAIL_DIALOGUES)) {
    const clonedId = trailNamespace(targetSlug, npcId);
    const existing = await prisma.npcDialogueTree.findUnique({
      where: { npcId: clonedId },
    });
    if (existing && !force) continue;
    const tree = rewriteDialogueTree(
      def.tree as Record<string, unknown>,
      targetSlug
    );

    await prisma.npcDialogueTree.upsert({
      where: { npcId: clonedId },
      create: {
        npcId: clonedId,
        name: `${def.name} (${targetSlug})`,
        data: JSON.stringify(tree),
      },
      update: {
        name: `${def.name} (${targetSlug})`,
        data: JSON.stringify(tree),
      },
    });
    dialogues++;
  }

  let quests = 0;
  for (const q of SAINTS_TRAIL_QUEST_CHAIN) {
    const slug = trailNamespace(targetSlug, q.slug);
    const existing = await prisma.questTemplate.findUnique({ where: { slug } });
    if (existing && !force) {
      if ((existing as { gameId?: string }).gameId !== targetSlug) {
        await prisma.questTemplate.update({
          where: { id: existing.id },
          data: { gameId: targetSlug },
        });
      }
      continue;
    }

    let questId: string;
    if (existing) {
      await prisma.questObjective.deleteMany({ where: { questId: existing.id } });
      await prisma.questTemplate.update({
        where: { id: existing.id },
        data: {
          gameId: targetSlug,
          title: `${q.title} [${targetSlug}]`,
          description: q.description,
          rewards: rewriteRewardsJson(q.rewards, targetSlug),
        },
      });
      questId = existing.id;
    } else {
      const created = await prisma.questTemplate.create({
        data: {
          slug,
          gameId: targetSlug,
          title: `${q.title} [${targetSlug}]`,
          description: q.description,
          rewards: rewriteRewardsJson(q.rewards, targetSlug),
        },
      });
      questId = created.id;
    }

    for (const obj of q.objectives) {
      const target =
        obj.targetSlug.startsWith("npc_") || obj.targetSlug.startsWith("quest_")
          ? trailNamespace(targetSlug, obj.targetSlug)
          : obj.targetSlug;
      await prisma.questObjective.create({
        data: {
          questId,
          stage: obj.stage,
          type: obj.type,
          targetSlug: target,
          requiredQty: obj.requiredQty,
          description: obj.description,
        },
      });
    }
    quests++;
  }

  // Seed a starter hero pointing at the cloned map if none for profile
  const heroSlug = `${targetSlug}_trailwalker`;
  const heroCount = await prisma.starterHero.count({ where: { gameId: targetSlug } });
  if (heroCount === 0) {
    await prisma.starterHero.upsert({
      where: { slug: heroSlug },
      create: {
        slug: heroSlug,
        gameId: targetSlug,
        name: "Trailwalker",
        classId: "WARRIOR",
        spriteKey: "adventurer",
        flavor: "Cloned Saints Trail starter — edit me in Studio.",
        tag: "Trail Clone",
        tagColor: "#34d399",
        sortOrder: 1,
        isActive: true,
        startingMap: mapId,
        startingX: 14,
        startingY: 15,
        startingInventory: JSON.stringify({
          capture_script: 10,
          patch_kit: 5,
          film_standard: 5,
          soul_camera: 1,
        }),
      },
      update: {
        gameId: targetSlug,
        startingMap: mapId,
        isActive: true,
      },
    });
  }

  return {
    targetSlug,
    mapId,
    quests,
    npcs: npcs.length,
    dialogues,
  };
}
