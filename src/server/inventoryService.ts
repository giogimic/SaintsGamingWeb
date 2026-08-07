/**
 * Single inventory mutation path for server managers + GTC actions.
 * All add/remove/snapshot of playerInventoryItem should go through here.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "@/web/lib/prisma";

/** Client usable inside prisma.$transaction */
export type InventoryDb = Prisma.TransactionClient | typeof prisma;

export type InventoryReason =
  | "gather"
  | "craft"
  | "quest_reward"
  | "shop_buy"
  | "shop_sell"
  | "trade"
  | "loot"
  | "npc_grant"
  | "capture_cost"
  | "admin"
  | "system";

export interface InventoryTransaction {
  userId: string;
  itemSlug: string;
  quantity: number; // positive = add, negative = remove
  reason: InventoryReason;
  source?: string;
  metadata?: Record<string, unknown>;
}

export async function executeTransaction(
  tx: InventoryTransaction,
  db: InventoryDb = prisma
): Promise<{ success: boolean; newQuantity: number }> {
  const { userId, itemSlug, quantity, reason, source, metadata } = tx;
  if (!userId || !itemSlug || quantity === 0) {
    return { success: false, newQuantity: 0 };
  }

  let success = false;
  let newQuantity = 0;

  if (quantity > 0) {
    await addItem(userId, itemSlug, quantity, db);
    success = true;
  } else {
    success = await removeItem(userId, itemSlug, -quantity, db);
  }

  if (success) {
    const snap = await inventorySnapshot(userId, db);
    newQuantity = snap[itemSlug] || 0;

    try {
      await db.inventoryLog.create({
        data: {
          userId,
          itemSlug,
          quantity,
          reason,
          source: source || null,
          metadata: metadata ? JSON.stringify(metadata) : null,
        },
      });
    } catch {
      // Non-fatal logging fallback
    }
  }

  return { success, newQuantity };
}

export async function resolveUserId(
  accountOrUserId: string
): Promise<string | null> {
  if (!accountOrUserId) return null;
  const asAccount = await prisma.account.findFirst({
    where: { id: accountOrUserId },
    select: { userId: true },
  });
  if (asAccount?.userId) return asAccount.userId;
  const asUser = await prisma.user.findFirst({
    where: { id: accountOrUserId },
    select: { id: true },
  });
  return asUser?.id ?? null;
}

export async function inventorySnapshot(
  userId: string,
  db: InventoryDb = prisma
): Promise<Record<string, number>> {
  const rows = await db.playerInventoryItem.findMany({ where: { userId } });
  const inv: Record<string, number> = {};
  for (const row of rows) {
    inv[row.itemSlug] = (inv[row.itemSlug] || 0) + row.quantity;
  }
  return inv;
}

export async function addItem(
  userId: string,
  itemSlug: string,
  qty: number,
  db: InventoryDb = prisma
): Promise<void> {
  if (!userId || !itemSlug || qty <= 0) return;
  const existing = await db.playerInventoryItem.findFirst({
    where: { userId, itemSlug },
  });
  if (existing) {
    await db.playerInventoryItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + qty },
    });
  } else {
    await db.playerInventoryItem.create({
      data: { userId, itemSlug, quantity: qty },
    });
  }
}

export async function addItems(
  userId: string,
  items: { slug: string; qty: number }[],
  db: InventoryDb = prisma
): Promise<void> {
  for (const item of items) {
    await addItem(userId, item.slug, item.qty, db);
  }
}

export async function removeItem(
  userId: string,
  itemSlug: string,
  qty: number,
  db: InventoryDb = prisma
): Promise<boolean> {
  if (!userId || !itemSlug || qty <= 0) return false;
  const existing = await db.playerInventoryItem.findFirst({
    where: { userId, itemSlug },
  });
  if (!existing || existing.quantity < qty) return false;
  if (existing.quantity === qty) {
    await db.playerInventoryItem.delete({ where: { id: existing.id } });
  } else {
    await db.playerInventoryItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity - qty },
    });
  }
  return true;
}

export async function modifyInventory(
  userId: string,
  itemSlug: string,
  delta: number,
  db: InventoryDb = prisma
): Promise<boolean> {
  if (delta > 0) {
    await addItem(userId, itemSlug, delta, db);
    return true;
  }
  if (delta < 0) {
    return removeItem(userId, itemSlug, -delta, db);
  }
  return true;
}

export type AddItemMetaOptions = {
  quantity: number;
  durability?: number | null;
  /** JSON string or null — unique affix rows never stack */
  affixes?: string | null;
  stackable?: boolean;
};

/**
 * Craft / gear grants that may carry durability or unique affixes.
 * Affixed or non-stackable items always create new rows.
 */
export async function addItemWithMeta(
  userId: string,
  itemSlug: string,
  opts: AddItemMetaOptions,
  db: InventoryDb = prisma
): Promise<void> {
  if (!userId || !itemSlug || opts.quantity <= 0) return;
  const stackable = opts.stackable ?? true;
  const hasUniqueMeta = !!opts.affixes;

  if (!stackable || hasUniqueMeta) {
    for (let i = 0; i < opts.quantity; i++) {
      await db.playerInventoryItem.create({
        data: {
          userId,
          itemSlug,
          quantity: 1,
          durability: opts.durability ?? null,
          affixes: opts.affixes ?? null,
        },
      });
    }
    return;
  }

  if (opts.durability == null && !opts.affixes) {
    await addItem(userId, itemSlug, opts.quantity, db);
    return;
  }

  const existing = await db.playerInventoryItem.findFirst({
    where: { userId, itemSlug, affixes: null },
  });
  if (existing) {
    await db.playerInventoryItem.update({
      where: { id: existing.id },
      data: {
        quantity: existing.quantity + opts.quantity,
        ...(opts.durability != null ? { durability: opts.durability } : {}),
      },
    });
  } else {
    await db.playerInventoryItem.create({
      data: {
        userId,
        itemSlug,
        quantity: opts.quantity,
        durability: opts.durability ?? null,
        affixes: null,
      },
    });
  }
}

/** Repair item durability by row id. */
export async function repairItemDurability(
  itemRowId: string,
  targetDurability: number,
  db: InventoryDb = prisma
): Promise<boolean> {
  const existing = await db.playerInventoryItem.findUnique({
    where: { id: itemRowId },
  });
  if (!existing) return false;
  await db.playerInventoryItem.update({
    where: { id: itemRowId },
    data: { durability: targetDurability },
  });
  return true;
}

/** Wear tool durability by row id. Returns whether the tool broke. */
export async function wearToolDurability(
  toolRowId: string,
  amount: number = 1,
  db: InventoryDb = prisma
): Promise<"ok" | "broken" | "missing"> {
  const tool = await db.playerInventoryItem.findUnique({
    where: { id: toolRowId },
  });
  if (!tool) return "missing";
  if (tool.durability === null || tool.durability === undefined) return "ok";

  const next = tool.durability - amount;
  if (next <= 0) {
    await db.playerInventoryItem.delete({ where: { id: tool.id } });
    return "broken";
  }
  await db.playerInventoryItem.update({
    where: { id: tool.id },
    data: { durability: next },
  });
  return "ok";
}
