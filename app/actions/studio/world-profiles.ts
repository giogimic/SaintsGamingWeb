"use server";

import { prisma } from "@/web/lib/prisma";
import { revalidatePath } from "next/cache";
import { checkAdminPermission } from "../admin/game-admin";
import {
  WORLD_PROFILES,
  DEFAULT_WORLD_PROFILE_ID,
  type WorldProfile,
} from "@/shared/game/worldProfiles";
import { cloneSaintsTrailToProfile } from "@/server/cloneSaintsTrail";

/** GameConfig rows that are class/modpack hosts — not Studio world profiles. */
const NON_WORLD_CONFIG_SLUGS = ["saints", "saints-gaming", "saints-gaming-qol"];

/** Ensure GameConfig rows exist for built-in world profiles; return list + active slug. */
export async function ensureWorldProfiles() {
  try {
    for (const p of WORLD_PROFILES) {
      await prisma.gameConfig.upsert({
        where: { slug: p.id },
        create: {
          slug: p.id,
          name: p.name,
          description: p.description,
          isActive: p.id === DEFAULT_WORLD_PROFILE_ID,
        },
        update: {
          name: p.name,
          description: p.description,
        },
      });
    }

    // Keep legacy "saints" class-config row if present; do not force it active.
    const active = await prisma.gameConfig.findFirst({
      where: {
        isActive: true,
        slug: { notIn: NON_WORLD_CONFIG_SLUGS },
      },
    });
    if (!active) {
      await prisma.gameConfig.updateMany({
        where: { slug: { notIn: NON_WORLD_CONFIG_SLUGS } },
        data: { isActive: false },
      });
      await prisma.gameConfig.update({
        where: { slug: DEFAULT_WORLD_PROFILE_ID },
        data: { isActive: true },
      });
    }

    // Built-ins + any blank worlds created via Studio "New"
    const configs = await prisma.gameConfig.findMany({
      where: { slug: { notIn: NON_WORLD_CONFIG_SLUGS } },
      orderBy: { slug: "asc" },
      select: { slug: true, name: true, description: true, isActive: true },
    });

    return {
      success: true as const,
      profiles: configs.map(
        (c): WorldProfile & { isActive: boolean } => ({
          id: c.slug,
          name: c.name,
          description: c.description || "",
          isActive: c.isActive,
        })
      ),
      activeId:
        configs.find((c) => c.isActive)?.slug || DEFAULT_WORLD_PROFILE_ID,
    };
  } catch (err) {
    console.error("[ensureWorldProfiles]", err);
    return {
      success: false as const,
      profiles: WORLD_PROFILES.map((p) => ({ ...p, isActive: p.id === DEFAULT_WORLD_PROFILE_ID })),
      activeId: DEFAULT_WORLD_PROFILE_ID,
      error: "Failed to load world profiles",
    };
  }
}

export async function setActiveWorldProfile(slug: string) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: "Unauthorized" };

  try {
    const exists = await prisma.gameConfig.findUnique({ where: { slug } });
    if (!exists) {
      const builtin = WORLD_PROFILES.find((p) => p.id === slug);
      if (!builtin) return { success: false, error: "Unknown profile" };
      await prisma.gameConfig.create({
        data: {
          slug: builtin.id,
          name: builtin.name,
          description: builtin.description,
          isActive: false,
        },
      });
    }

    await prisma.$transaction([
      prisma.gameConfig.updateMany({
        where: { slug: { notIn: NON_WORLD_CONFIG_SLUGS } },
        data: { isActive: false },
      }),
      prisma.gameConfig.update({ where: { slug }, data: { isActive: true } }),
    ]);
    revalidatePath("/lobby");
    return { success: true, activeId: slug };
  } catch (err) {
    console.error("[setActiveWorldProfile]", err);
    return { success: false, error: "Failed to switch profile" };
  }
}

/** Create an empty custom world: GameConfig + blank starter map. */
export async function createBlankWorldProfile(opts: {
  slug: string;
  name: string;
  starterMapId?: string;
}) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: "Unauthorized" };

  try {
    const slug = opts.slug.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
    if (!slug) return { success: false, error: "Invalid slug" };

    const mapId = (opts.starterMapId || `${slug.toUpperCase()}_START`).replace(
      /[^A-Z0-9_]/gi,
      "_"
    ).toUpperCase();

    await prisma.gameConfig.upsert({
      where: { slug },
      create: {
        slug,
        name: opts.name.trim() || slug,
        description: "Creator world",
        isActive: false,
      },
      update: { name: opts.name.trim() || slug },
    });

    const h = 24;
    const w = 24;
    const grid = Array.from({ length: h }, (_, r) =>
      Array.from({ length: w }, (_, c) =>
        r === 0 || r === h - 1 || c === 0 || c === w - 1 ? 1 : 0
      )
    );

    await prisma.worldMap.upsert({
      where: { id: mapId },
      create: {
        id: mapId,
        gameId: slug,
        name: `${opts.name || slug} Start`,
        gridData: JSON.stringify(grid),
        gatesData: "{}",
        npcsData: "[]",
        encountersData: "[]",
        tileLayersData: JSON.stringify([{ name: "Ground", grid }]),
        tilesetsData: JSON.stringify([
          {
            firstgid: 1,
            imageSource: "Terrain_by_George.png",
            columns: 15,
            tilewidth: 16,
            tileheight: 16,
          },
        ]),
      },
      update: {
        gameId: slug,
        name: `${opts.name || slug} Start`,
      },
    });
    return { success: true, slug, starterMapId: mapId };
  } catch (err) {
    console.error("[createBlankWorldProfile]", err);
    return { success: false, error: "Failed to create world" };
  }
}

/** Clone Saints Trail template into a profile (namespaced quests/NPCs/map). */
export async function cloneTrailWorldProfile(opts: {
  slug: string;
  name?: string;
  force?: boolean;
}): Promise<
  | {
      success: true;
      targetSlug: string;
      mapId: string;
      quests: number;
      npcs: number;
      dialogues: number;
    }
  | { success: false; error: string }
> {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: "Unauthorized" };

  try {
    const result = await cloneSaintsTrailToProfile(prisma, {
      targetSlug: opts.slug,
      name: opts.name,
      force: opts.force,
    });
    revalidatePath("/lobby");
    return { success: true, ...result };
  } catch (err) {
    console.error("[cloneTrailWorldProfile]", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Clone failed",
    };
  }
}
