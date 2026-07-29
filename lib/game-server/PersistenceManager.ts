import { MultiTierCurrency } from "./types";

export interface PersistenceManager {
  savePlayerPosition(accountId: string, mapId: string, x: number, y: number): Promise<void>;
  loadPlayerPosition(accountId: string): Promise<{ mapId: string, x: number, y: number } | null>;
  
  // Economy & Trading
  updateCurrency(accountId: string, currency: Partial<MultiTierCurrency>): Promise<void>;
  modifyInventory(accountId: string, itemId: string, amount: number): Promise<void>;
  transferCreature(fromAccountId: string, toAccountId: string, creatureInstanceId: string): Promise<boolean>;
}

// Placeholder implementation for v1 (interfaces only)
// No fake saving - database schema and storage to be implemented later.
export class DatabasePersistenceManager implements PersistenceManager {
  public async savePlayerPosition(accountId: string, mapId: string, x: number, y: number): Promise<void> {
    // Implemented in future phases with Prisma
  }

  public async loadPlayerPosition(accountId: string): Promise<{ mapId: string, x: number, y: number } | null> {
    // Implemented in future phases with Prisma
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
