"use server";

import { prisma } from "@/web/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function updateProfileMedia(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const youtubeVideoUrl = formData.get("youtubeVideoUrl") as string || null;
  const youtubeMusicUrl = formData.get("youtubeMusicUrl") as string || null;

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      youtubeVideoUrl,
      youtubeMusicUrl
    }
  });

  revalidatePath("/profile");
  revalidatePath(`/user/${session.user.username}`);
}

export async function uploadProfileImage(url: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Check limit (e.g. max 4 images)
  const count = await prisma.profileImage.count({
    where: { userId: session.user.id }
  });

  if (count >= 4) {
    throw new Error("You can only upload up to 4 profile images.");
  }

  await prisma.profileImage.create({
    data: {
      userId: session.user.id,
      url
    }
  });

  revalidatePath("/profile");
  revalidatePath(`/user/${session.user.username}`);
}

export async function deleteProfileImage(imageId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const image = await prisma.profileImage.findUnique({
    where: { id: imageId }
  });

  if (!image || image.userId !== session.user.id) {
    throw new Error("Image not found or unauthorized");
  }

  await prisma.profileImage.delete({
    where: { id: imageId }
  });

  revalidatePath("/profile");
  revalidatePath(`/user/${session.user.username}`);
}

const VALID_ACCENTS = ["SUNSET_GOLD", "OCEAN_CYAN", "VICE_PINK", "PALM_GREEN", "ELECTRIC_VIOLET"];
const VALID_TREATMENTS = ["HORIZON", "NIGHT_DRIVE", "WAVE_GRID"];
const VALID_VISIBILITY = ["PUBLIC", "FRIENDS", "HIDDEN"];

export async function updateProfileSettings(formData: FormData) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  const userId = session.user.id;

  const accent = formData.get("accent") as string;
  const headerTreatment = formData.get("headerTreatment") as string;
  const activityVisibility = formData.get("activityVisibility") as string;
  const achievementsVisibility = formData.get("achievementsVisibility") as string;
  const mediaVisibility = formData.get("mediaVisibility") as string;
  const gameCharactersVisibility = formData.get("gameCharactersVisibility") as string;
  const sampVisibility = formData.get("sampVisibility") as string;
  const friendsVisibility = formData.get("friendsVisibility") as string;
  const steamWishlistVisibility = formData.get("steamWishlistVisibility") as string;
  const galleryVisibility = formData.get("galleryVisibility") as string;
  const showMilestones = formData.get("showMilestones") === "true";

  if (accent && !VALID_ACCENTS.includes(accent)) return { error: "Invalid accent" };
  if (headerTreatment && !VALID_TREATMENTS.includes(headerTreatment)) return { error: "Invalid header treatment" };
  
  const validateVisibility = (val: string) => val && VALID_VISIBILITY.includes(val) ? val : undefined;

  await prisma.profileSettings.upsert({
    where: { userId },
    update: {
      ...(accent && { accent }),
      ...(headerTreatment && { headerTreatment }),
      ...(activityVisibility && { activityVisibility: validateVisibility(activityVisibility) }),
      ...(achievementsVisibility && { achievementsVisibility: validateVisibility(achievementsVisibility) }),
      ...(mediaVisibility && { mediaVisibility: validateVisibility(mediaVisibility) }),
      ...(gameCharactersVisibility && { gameCharactersVisibility: validateVisibility(gameCharactersVisibility) }),
      ...(sampVisibility && { sampVisibility: validateVisibility(sampVisibility) }),
      ...(friendsVisibility && { friendsVisibility: validateVisibility(friendsVisibility) }),
      ...(steamWishlistVisibility && { steamWishlistVisibility: validateVisibility(steamWishlistVisibility) }),
      ...(galleryVisibility && { galleryVisibility: validateVisibility(galleryVisibility) }),
      showMilestones
    },
    create: {
      userId,
      accent: accent || "SUNSET_GOLD",
      headerTreatment: headerTreatment || "HORIZON",
      activityVisibility: validateVisibility(activityVisibility) || "PUBLIC",
      achievementsVisibility: validateVisibility(achievementsVisibility) || "PUBLIC",
      mediaVisibility: validateVisibility(mediaVisibility) || "HIDDEN",
      gameCharactersVisibility: validateVisibility(gameCharactersVisibility) || "HIDDEN",
      sampVisibility: validateVisibility(sampVisibility) || "HIDDEN",
      friendsVisibility: validateVisibility(friendsVisibility) || "HIDDEN",
      steamWishlistVisibility: validateVisibility(steamWishlistVisibility) || "HIDDEN",
      galleryVisibility: validateVisibility(galleryVisibility) || "HIDDEN",
      showMilestones
    }
  });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } });

  revalidatePath("/settings");
  if (user) {
    revalidatePath(`/user/${user.username}`);
  }

  return { success: true };
}
