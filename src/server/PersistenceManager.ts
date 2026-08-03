import { MultiTierCurrency } from "./types";
import { toBaseMapId } from "@/shared/net/mapIds";
import { PrismaClient } from "@prisma/client";

export interface PersistenceManager {
  savePlayerPosition(accountId: string, mapId: string, x: number, y: number): Promise<void>;
  loadPlayerPosition(accountId: string): Promise<{ mapId: string, x: number, y: number } | null>;
  
  // Economy & Trading
  updateCurrency(accountId: string, currency: Partial<MultiTierCurrency>): Promise<void>;
  modifyInventory(accountId: string, itemId: string, amount: number): Promise<void>;
  transferCreature(fromAccountId: string, toAccountId: string, creatureInstanceId: string): Promise<boolean>;
}

const prisma = new PrismaClient();
export class DatabasePersistenceManager implements PersistenceManager {
  public async savePlayerPosition(accountId: string, mapId: string, x: number, y: number): Promise<void> {
    if (accountId.startsWith("acc_")) return; // Skip anonymous connections
    
    try {
      const dbUser = await prisma.account.findFirst({
        where: { id: accountId },
        select: { userId: true }
      });
      const userId = dbUser?.userId || accountId;

      const character = await prisma.gameCharacter.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' }
      });

      if (character) {
        const stateData = JSON.parse(character.stateData || "{}");
        // Persist the map definition, never a live shard id (…_ch1)
        let baseMap = toBaseMapId(mapId);
        // Retired sandbox — do not keep writing SAINTS_VILLAGE into character saves
        if (baseMap === "SAINTS_VILLAGE") {
          baseMap = "DEMO_SANDBOX";
        }
        stateData.mapId = baseMap;
        stateData.currentMapId = baseMap;
        stateData.x = x;
        stateData.y = y;
        stateData.position = { x, y };

        await prisma.gameCharacter.update({
          where: { id: character.id },
          data: { stateData: JSON.stringify(stateData) }
        });
        console.log(`[PersistenceManager] Saved position for ${userId} to ${baseMap} (${x}, ${y})`);
      }
    } catch (err) {
      console.error("[PersistenceManager] Failed to save player position:", err);
    }
  }

  public async loadPlayerPosition(accountId: string): Promise<{ mapId: string, x: number, y: number } | null> {
    if (accountId.startsWith("acc_")) return null;
    
    try {
      const dbUser = await prisma.account.findFirst({
        where: { id: accountId },
        select: { userId: true }
      });
      const userId = dbUser?.userId || accountId;

      const character = await prisma.gameCharacter.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' }
      });

      if (character && character.stateData) {
        const stateData = JSON.parse(character.stateData);
        if (stateData.mapId && typeof stateData.x === 'number' && typeof stateData.y === 'number') {
          return { mapId: stateData.mapId, x: stateData.x, y: stateData.y };
        }
      }
    } catch (err) {
      console.error("[PersistenceManager] Failed to load player position:", err);
    }
    return null;
  }

  public async updateCurrency(accountId: string, currency: Partial<MultiTierCurrency>): Promise<void> {
    // Implement via Prisma later
  }

  public async modifyInventory(accountId: string, itemId: string, amount: number): Promise<void> {
    // Implement via Prisma later
  }

  public async transferCreature(fromAccountId: string, toAccountId: string, creatureInstanceId: string): Promise<boolean> {
    // Implement via Prisma later
    return true;
  }
}
