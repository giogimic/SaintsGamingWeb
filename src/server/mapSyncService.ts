import { prisma } from "@/web/lib/prisma";
import { notifyGoMapSynced } from "./goMmoNotify";

export interface EnqueueMapSyncOptions {
  mapId: string;
  version: number;
  userId?: string;
  eagerPush?: boolean;
}

export class MapSyncService {
  /**
   * Enqueue a map sync task for the game engine / Go MMO shards.
   */
  public static async enqueue(options: EnqueueMapSyncOptions) {
    const entry = await prisma.mapSyncEntry.create({
      data: {
        mapId: options.mapId,
        version: options.version,
        status: "PENDING",
        syncedBy: options.userId || null,
      },
    });

    const isEagerPush = options.eagerPush ?? (process.env.SYNC_MODE !== "pull");
    if (isEagerPush) {
      // Eager push attempt in background
      void (async () => {
        try {
          const map = await prisma.worldMap.findUnique({ where: { id: options.mapId } });
          if (!map) return;

          const res = await notifyGoMapSynced({
            id: map.id,
            name: map.name,
            gridData: JSON.parse(map.gridData || "[]"),
            npcsData: JSON.parse(map.npcsData || "[]"),
            tileLayersData: JSON.parse(map.tileLayersData || "[]"),
            tilesetsData: JSON.parse(map.tilesetsData || "[]"),
          });

          if (res.ok && !res.skipped) {
            await prisma.mapSyncEntry.update({
              where: { id: entry.id },
              data: {
                status: "SYNCED",
                syncedAt: new Date(),
              },
            });
          } else if (!res.ok) {
            await prisma.mapSyncEntry.update({
              where: { id: entry.id },
              data: {
                status: "FAILED",
                error: res.error || "Eager push failed",
              },
            });
          }
        } catch (e: any) {
          await prisma.mapSyncEntry.update({
            where: { id: entry.id },
            data: {
              status: "FAILED",
              error: e?.message || "Sync error",
            },
          });
        }
      })();
    }

    return entry;
  }

  /**
   * Fetch all pending sync entries for pull-based shards.
   */
  public static async getPending(limit = 50) {
    return await prisma.mapSyncEntry.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
  }

  /**
   * Acknowledge sync completion from a game server / Go MMO node.
   */
  public static async acknowledge(entryIds: string[], status: "SYNCED" | "FAILED" = "SYNCED", error?: string) {
    return await prisma.mapSyncEntry.updateMany({
      where: { id: { in: entryIds } },
      data: {
        status,
        syncedAt: new Date(),
        error: error || null,
      },
    });
  }

  /**
   * Get sync status overview for all maps.
   */
  public static async getMapSyncOverview() {
    const maps = await prisma.worldMap.findMany({
      select: {
        id: true,
        name: true,
        version: true,
        updatedAt: true,
      },
      orderBy: { name: "asc" },
    });

    const entries = await prisma.mapSyncEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const syncStatusByMap = new Map<string, { lastSyncedVersion: number; lastSyncedAt: Date | null; status: string; pendingCount: number }>();

    for (const map of maps) {
      const mapEntries = entries.filter((e) => e.mapId === map.id);
      const latestSynced = mapEntries.find((e) => e.status === "SYNCED");
      const hasPending = mapEntries.some((e) => e.status === "PENDING");
      const hasFailed = mapEntries.some((e) => e.status === "FAILED");

      let status = "SYNCED";
      if (hasPending) status = "PENDING";
      else if (hasFailed && (!latestSynced || latestSynced.version < map.version)) status = "FAILED";
      else if (!latestSynced || latestSynced.version < map.version) status = "STALE";

      syncStatusByMap.set(map.id, {
        lastSyncedVersion: latestSynced ? latestSynced.version : 0,
        lastSyncedAt: latestSynced ? latestSynced.syncedAt : null,
        status,
        pendingCount: mapEntries.filter((e) => e.status === "PENDING").length,
      });
    }

    return {
      maps: maps.map((m) => {
        const syncInfo = syncStatusByMap.get(m.id) || {
          lastSyncedVersion: 0,
          lastSyncedAt: null,
          status: "STALE",
          pendingCount: 0,
        };
        return {
          ...m,
          ...syncInfo,
        };
      }),
      recentEntries: entries.slice(0, 30),
    };
  }
}
