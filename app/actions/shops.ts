"use server";

import { prisma } from "@/web/lib/prisma";
import { revalidatePath } from "next/cache";
import { checkAdminPermission } from "./game-admin";

export type ShopTemplateInput = {
  gameId?: string;
  profileId?: string;
  slug: string;
  name: string;
  description?: string;
  currency: string;
  refreshInterval?: number;
  itemsSoldData: string;
};

export async function listShops(searchQuery?: string) {
  try {
    const rows = await prisma.shopTemplate.findMany({
      orderBy: { name: "asc" },
      take: 200,
      include: { inventory: true }
    });
    const needle = (searchQuery || "").trim().toLowerCase();
    const data = needle
      ? rows.filter(
          (r) =>
            r.slug.toLowerCase().includes(needle) ||
            r.name.toLowerCase().includes(needle)
        )
      : rows;
      
    const transformedData = data.map(r => {
      const { inventory, ...rest } = r;
      return {
        ...rest,
        itemsSoldData: JSON.stringify(inventory.map((inv: any) => ({
          itemId: inv.itemSlug,
          price: inv.price,
          stock: inv.stock,
          restockSec: inv.restockSec
        })))
      };
    });
    return { success: true as const, data: transformedData };
  } catch (err) {
    console.error("[listShops]", err);
    return { success: false as const, data: [], error: "Failed to list shops" };
  }
}

export async function getShop(slug: string) {
  try {
    const row = await prisma.shopTemplate.findUnique({ 
      where: { slug },
      include: { inventory: true }
    });
    if (!row) return { success: false as const, error: "Not found" };
    
    const { inventory, ...rest } = row;
    const transformedRow = {
      ...rest,
      itemsSoldData: JSON.stringify(inventory.map((inv: any) => ({
        itemId: inv.itemSlug,
        price: inv.price,
        stock: inv.stock,
        restockSec: inv.restockSec
      })))
    };
    
    return { success: true as const, data: transformedRow };
  } catch (err) {
    console.error("[getShop]", err);
    return { success: false as const, error: "Failed to load shop" };
  }
}

export async function upsertShop(input: ShopTemplateInput) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: "Unauthorized" };

  const slug = input.slug.trim();
  if (!slug) return { success: false, error: "slug required" };

  try {
    let parsedInventory = [];
    try {
      if (input.itemsSoldData) {
        parsedInventory = JSON.parse(input.itemsSoldData).map((inv: any) => ({
          itemSlug: inv.itemSlug || inv.itemId, // support both
          price: inv.price || 0,
          stock: inv.stock || null,
          restockSec: inv.restockSec || null
        }));
      }
    } catch (e) {
      console.error("Invalid itemsSoldData JSON", e);
    }

    const saved = await prisma.shopTemplate.upsert({
      where: { slug },
      create: {
        gameId: input.gameId || "saints",
        profileId: input.profileId || "default",
        slug,
        name: input.name.trim() || slug,
        description: input.description,
        currency: input.currency || "gold",
        refreshInterval: input.refreshInterval,
        inventory: {
          create: parsedInventory
        }
      },
      update: {
        gameId: input.gameId || "saints",
        profileId: input.profileId || "default",
        name: input.name.trim() || slug,
        description: input.description,
        currency: input.currency || "gold",
        refreshInterval: input.refreshInterval,
        inventory: {
          deleteMany: {},
          create: parsedInventory
        }
      },
    });

    revalidatePath("/studio");
    return { success: true as const, data: saved };
  } catch (err: any) {
    console.error("[upsertShop] Error:", err.message);
    return { success: false as const, error: "Database error saving shop" };
  }
}

export async function deleteShop(slug: string) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: "Unauthorized" };

  if (!slug) return { success: false, error: "slug required" };

  try {
    await prisma.shopTemplate.delete({
      where: { slug },
    });
    revalidatePath("/studio");
    return { success: true as const };
  } catch (err: any) {
    console.error("[deleteShop] Error:", err.message);
    return { success: false as const, error: "Failed to delete shop" };
  }
}
