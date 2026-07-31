'use server';

import { prisma } from '@/web/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';


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

