"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function addSteamWishlistItem(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const input = formData.get("steamInput") as string;
  if (!input) {
    throw new Error("Input is required");
  }

  // Parse the input. Can be an ID like '252490' or a URL like 'https://store.steampowered.com/app/252490/Rust/'
  let appId = "";
  if (/^\d+$/.test(input.trim())) {
    appId = input.trim();
  } else {
    // Try to extract from URL
    const match = input.match(/\/app\/(\d+)/);
    if (match && match[1]) {
      appId = match[1];
    } else {
      throw new Error("Invalid Steam input. Provide an App ID or a store link.");
    }
  }

  // Fetch from Steam API
  let name = `App ${appId}`;
  let image = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`;

  try {
    const res = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}`, {
      next: { revalidate: 3600 }
    });
    const data = await res.json();
    
    if (data && data[appId] && data[appId].success && data[appId].data) {
      name = data[appId].data.name;
      if (data[appId].data.header_image) {
        image = data[appId].data.header_image;
      }
    } else {
      throw new Error("Steam App not found or API failed.");
    }
  } catch (error) {
    console.error("Steam API Error:", error);
    throw new Error("Failed to fetch Steam data. Make sure the App ID is valid.");
  }

  // Save to DB
  try {
    await prisma.steamWishlistItem.create({
      data: {
        userId: session.user.id,
        appId,
        name,
        image
      }
    });
  } catch (e: any) {
    if (e.code === 'P2002') {
      throw new Error("This game is already in your wishlist!");
    }
    throw new Error("Failed to add to wishlist.");
  }

  revalidatePath("/profile");
}

export async function removeSteamWishlistItem(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const id = formData.get("id") as string;
  if (!id) {
    throw new Error("ID is required");
  }

  await prisma.steamWishlistItem.deleteMany({
    where: {
      id,
      userId: session.user.id
    }
  });

  revalidatePath("/profile");
}
