"use server";

import { prisma } from "@/lib/prisma";
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
