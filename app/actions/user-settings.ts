"use server";

import { prisma } from "@/web/lib/prisma";
import { auth } from "@/auth";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function getUserSettingsData() {
  const session = await auth();
  if (!session?.user?.id) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        displayName: true,
        username: true,
        email: true,
        image: true,
        permissionLevel: true,
        isVIP: true,
        isFounder: true,
        isTrusted: true,
        isWriter: true,
        youtubeVideoUrl: true,
        youtubeMusicUrl: true,
        coins: true,
        xp: true,
        level: true,
        createdAt: true,
        profileImages: {
          orderBy: { createdAt: "desc" },
          take: 6,
        },
      },
    });

    return user;
  } catch (error) {
    console.error("Failed to fetch user settings data:", error);
    return null;
  }
}

export async function updateUserSettingsProfile(payload: {
  displayName?: string;
  image?: string;
  youtubeVideoUrl?: string;
  youtubeMusicUrl?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const dataToUpdate: any = {};
    if (typeof payload.displayName === "string") {
      dataToUpdate.displayName = payload.displayName.trim().slice(0, 50);
    }
    if (typeof payload.image === "string") {
      dataToUpdate.image = payload.image.trim();
    }
    if (payload.youtubeVideoUrl !== undefined) {
      dataToUpdate.youtubeVideoUrl = payload.youtubeVideoUrl ? payload.youtubeVideoUrl.trim() : null;
    }
    if (payload.youtubeMusicUrl !== undefined) {
      dataToUpdate.youtubeMusicUrl = payload.youtubeMusicUrl ? payload.youtubeMusicUrl.trim() : null;
    }

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: dataToUpdate,
    });

    revalidatePath("/profile");
    revalidatePath("/hub");
    revalidatePath("/feed");

    return { success: true, user: updated };
  } catch (error: any) {
    console.error("Failed to update user profile:", error);
    return { success: false, error: error.message || "Failed to update profile" };
  }
}

export async function changeUserSettingsPassword(payload: {
  currentPassword?: string;
  newPassword: string;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  if (!payload.newPassword || payload.newPassword.length < 8) {
    return { success: false, error: "New password must be at least 8 characters." };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // If user already has a password, verify current password
    if (user.passwordHash && payload.currentPassword) {
      const isValid = await bcrypt.compare(payload.currentPassword, user.passwordHash);
      if (!isValid) {
        return { success: false, error: "Current password is incorrect." };
      }
    }

    const newHash = await bcrypt.hash(payload.newPassword, 10);
    await prisma.user.update({
      where: { id: session.user.id },
      data: { passwordHash: newHash, forcePasswordChange: false },
    });

    return { success: true, message: "Password updated successfully." };
  } catch (error: any) {
    console.error("Failed to change password:", error);
    return { success: false, error: error.message || "Failed to change password." };
  }
}

export async function getUserManagedPosts(page = 1, limit = 20) {
  const session = await auth();
  if (!session?.user?.id) return { posts: [], total: 0 };

  try {
    const skip = (page - 1) * limit;
    const [posts, total] = await Promise.all([
      prisma.socialPost.findMany({
        where: { authorId: session.user.id },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              reactions: true,
              replies: true,
            },
          },
        },
      }),
      prisma.socialPost.count({
        where: { authorId: session.user.id },
      }),
    ]);

    return {
      posts: posts.map((p) => ({
        id: p.id,
        body: p.body,
        mediaUrl: p.mediaUrl,
        thumbnailUrl: p.thumbnailUrl,
        createdAt: p.createdAt.toISOString(),
        viewCount: p.viewCount,
        likeCount: p._count.reactions,
        replyCount: p._count.replies,
        isSubscriberOnly: p.isSubscriberOnly,
      })),
      total,
    };
  } catch (error) {
    console.error("Failed to fetch user managed posts:", error);
    return { posts: [], total: 0 };
  }
}

export async function deleteUserSocialPost(postId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const post = await prisma.socialPost.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });

    if (!post) {
      return { success: false, error: "Post not found." };
    }

    if (post.authorId !== session.user.id) {
      return { success: false, error: "You cannot delete another user's post." };
    }

    await prisma.socialPost.delete({
      where: { id: postId },
    });

    revalidatePath("/feed");
    revalidatePath("/profile");

    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete user post:", error);
    return { success: false, error: error.message || "Failed to delete post." };
  }
}
