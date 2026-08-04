'use server';

import { prisma } from '@/web/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { addItem, removeItem } from '@/server/inventoryService';

export async function getLiveGtcListings(filterType: string = 'ALL') {
  try {
    const where = filterType !== 'ALL' ? { itemType: filterType } : {};

    const listings = await prisma.gtcListing.findMany({
      where,
      include: {
        seller: {
          select: { name: true, userId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      success: true,
      listings: listings.map((l) => ({
        ...l,
        sellerName: l.seller.name,
        sellerUserId: l.seller.userId,
      })),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getCharacterGtcListings(sellerId: string) {
  try {
    const listings = await prisma.gtcListing.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, listings };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * ALIGNMENT E.2 — cold inventory for website profile (PlayerInventoryItem).
 * Inventory is keyed by User id (same as lobby InventoryManager).
 */
export async function getUserInventory(userId: string) {
  try {
    if (!userId) return { success: false, error: 'userId required', items: [] as { itemSlug: string; quantity: number }[] };
    const rows = await prisma.playerInventoryItem.findMany({
      where: { userId },
      orderBy: { itemSlug: 'asc' },
    });
    const merged = new Map<string, number>();
    for (const row of rows) {
      merged.set(row.itemSlug, (merged.get(row.itemSlug) || 0) + row.quantity);
    }
    const items = Array.from(merged.entries()).map(([itemSlug, quantity]) => ({
      itemSlug,
      quantity,
    }));
    return { success: true, items };
  } catch (error: any) {
    return { success: false, error: error.message, items: [] as { itemSlug: string; quantity: number }[] };
  }
}

/**
 * ALIGNMENT E.2 — async web marketplace buy (bible §10).
 * Same cold-state path as EconomyManager.handlePurchaseListing:
 * debit buyer credits → credit seller → grant PlayerInventoryItem → delete listing.
 * Item appears in lobby after next inventory_sync (join or in-game).
 */
export async function purchaseGtcListing(listingId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }
    const buyerUserId = session.user.id;
    const id = String(listingId || '').trim();
    if (!id) return { success: false, error: 'listingId required' };

    const result = await prisma.$transaction(async (tx) => {
      const listing = await tx.gtcListing.findUnique({ where: { id } });
      if (!listing) throw new Error('Listing no longer exists');

      const buyerChar = await tx.gameCharacter.findFirst({
        where: { userId: buyerUserId },
        orderBy: { updatedAt: 'desc' },
      });
      if (!buyerChar) throw new Error('Buyer character not found');

      if (listing.sellerId === buyerChar.id) {
        throw new Error('Cannot buy your own listing');
      }

      const buyerState = JSON.parse(buyerChar.stateData || '{}');
      if ((buyerState.credits || 0) < listing.price) {
        throw new Error('Not enough credits');
      }

      buyerState.credits -= listing.price;
      await tx.gameCharacter.update({
        where: { id: buyerChar.id },
        data: { stateData: JSON.stringify(buyerState) },
      });

      const sellerChar = await tx.gameCharacter.findUnique({
        where: { id: listing.sellerId },
      });
      if (sellerChar) {
        const sellerState = JSON.parse(sellerChar.stateData || '{}');
        sellerState.credits = (sellerState.credits || 0) + listing.price;
        await tx.gameCharacter.update({
          where: { id: listing.sellerId },
          data: { stateData: JSON.stringify(sellerState) },
        });
      }

      if (listing.itemType === 'MATERIAL' && listing.itemId) {
        await addItem(buyerUserId, listing.itemId, 1, tx);
      } else if (listing.itemType !== 'MATERIAL') {
        throw new Error('Only MATERIAL listings can be purchased on the website for now');
      }

      await tx.gtcListing.delete({ where: { id } });
      return {
        listing,
        buyerCredits: buyerState.credits as number,
        itemSlug: listing.itemId,
      };
    });

    const buyer = await prisma.user.findUnique({
      where: { id: buyerUserId },
      select: { username: true },
    });
    if (buyer?.username) revalidatePath(`/user/${buyer.username}`);
    if (result.listing.sellerId) {
      const seller = await prisma.gameCharacter.findUnique({
        where: { id: result.listing.sellerId },
        select: { user: { select: { username: true } } },
      });
      if (seller?.user?.username) revalidatePath(`/user/${seller.user.username}`);
    }

    return {
      success: true,
      title: result.listing.title,
      itemSlug: result.itemSlug,
      buyerCredits: result.buyerCredits,
    };
  } catch (error: any) {
    console.error('[gtc] purchaseGtcListing failed', error);
    return { success: false, error: error?.message || 'Purchase failed' };
  }
}

/**
 * List a MATERIAL from cold inventory onto GTC (website async sell).
 * Mirrors EconomyManager.handleCreateListing material path.
 */
export async function createGtcListing(input: {
  itemSlug: string;
  title?: string;
  price: number;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = session.user.id;
    const itemSlug = String(input.itemSlug || '').trim();
    const price = Math.floor(Number(input.price) || 0);
    if (!itemSlug) return { success: false, error: 'itemSlug required' };
    if (price < 1) return { success: false, error: 'price must be ≥ 1' };

    const char = await prisma.gameCharacter.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
    if (!char) return { success: false, error: 'No character found' };

    const listing = await prisma.$transaction(async (tx) => {
      const removed = await removeItem(userId, itemSlug, 1, tx);
      if (!removed) {
        throw new Error(`You don't have ${itemSlug}`);
      }

      return tx.gtcListing.create({
        data: {
          sellerId: char.id,
          itemType: 'MATERIAL',
          title: input.title?.trim() || itemSlug,
          price,
          itemId: itemSlug,
        },
      });
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });
    if (user?.username) revalidatePath(`/user/${user.username}`);

    return { success: true, listing };
  } catch (error: any) {
    console.error('[gtc] createGtcListing failed', error);
    return { success: false, error: error?.message || 'List failed' };
  }
}
