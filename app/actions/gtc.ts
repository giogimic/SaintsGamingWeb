'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export async function createGtcListing(payload: {
  itemType: string;
  title: string;
  price: number;
  itemId?: string;
  rarity?: string;
  affixes?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    const char = await prisma.gameCharacter.findFirst({
      where: { userId: session.user.id }
    });

    if (!char) return { success: false, error: 'Character not found' };

    const listing = await prisma.gtcListing.create({
      data: {
        sellerId: char.id,
        itemType: payload.itemType,
        title: payload.title,
        price: payload.price,
        itemId: payload.itemId,
        rarity: payload.rarity,
        affixes: payload.affixes,
      }
    });

    revalidatePath('/profile');
    return { success: true, listing };
  } catch (error: any) {
    console.error('Failed to create GTC listing:', error);
    return { success: false, error: error.message };
  }
}

export async function getLiveGtcListings(filterType: string = 'ALL') {
  try {
    const where = filterType !== 'ALL' ? { itemType: filterType } : {};
    
    const listings = await prisma.gtcListing.findMany({
      where,
      include: {
        seller: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    return { 
      success: true, 
      listings: listings.map(l => ({
        ...l,
        sellerName: l.seller.name
      })) 
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getCharacterGtcListings(sellerId: string) {
  try {
    const listings = await prisma.gtcListing.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, listings };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function buyGtcListing(listingId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    const result = await prisma.$transaction(async (tx) => {
      const listing = await tx.gtcListing.findUnique({
        where: { id: listingId }
      });

      if (!listing) throw new Error('Listing no longer exists');

      const sellerChar = await tx.gameCharacter.findUnique({ where: { id: listing.sellerId } });
      if (sellerChar) {
        const state = JSON.parse(sellerChar.stateData);
        state.credits = (state.credits || 0) + listing.price;
        await tx.gameCharacter.update({
          where: { id: listing.sellerId },
          data: { stateData: JSON.stringify(state) }
        });
      }

      await tx.gtcListing.delete({ where: { id: listingId } });
      return listing;
    });

    return { success: true, item: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
