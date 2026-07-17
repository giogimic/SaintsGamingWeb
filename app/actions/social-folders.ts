"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// ─── Bookmark Folder Management ─────────────────────────────────────

export async function createBookmarkFolder(name: string, color?: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 50) throw new Error("Invalid folder name");

  // Max 20 folders per user
  const count = await prisma.socialBookmarkFolder.count({ where: { userId: session.user.id } });
  if (count >= 20) throw new Error("Maximum of 20 folders allowed");

  return await prisma.socialBookmarkFolder.create({
    data: {
      userId: session.user.id,
      name: trimmed,
      color: color || "#6366f1",
    }
  });
}

export async function deleteBookmarkFolder(folderId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const folder = await prisma.socialBookmarkFolder.findUnique({ where: { id: folderId } });
  if (!folder || folder.userId !== session.user.id) throw new Error("Folder not found");

  // Move bookmarks in this folder to "unfiled" (folderId = null) before deleting
  await prisma.socialBookmark.updateMany({
    where: { folderId },
    data: { folderId: null }
  });

  await prisma.socialBookmarkFolder.delete({ where: { id: folderId } });
  return true;
}

export async function renameBookmarkFolder(folderId: string, name: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 50) throw new Error("Invalid folder name");

  const folder = await prisma.socialBookmarkFolder.findUnique({ where: { id: folderId } });
  if (!folder || folder.userId !== session.user.id) throw new Error("Folder not found");

  return await prisma.socialBookmarkFolder.update({
    where: { id: folderId },
    data: { name: trimmed }
  });
}

export async function getBookmarkFolders() {
  const session = await auth();
  if (!session?.user?.id) return [];

  return await prisma.socialBookmarkFolder.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { bookmarks: true } }
    }
  });
}

export async function moveBookmarkToFolder(bookmarkId: string, folderId: string | null) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const bookmark = await prisma.socialBookmark.findUnique({ where: { id: bookmarkId } });
  if (!bookmark || bookmark.userId !== session.user.id) throw new Error("Bookmark not found");

  if (folderId) {
    const folder = await prisma.socialBookmarkFolder.findUnique({ where: { id: folderId } });
    if (!folder || folder.userId !== session.user.id) throw new Error("Folder not found");
  }

  return await prisma.socialBookmark.update({
    where: { id: bookmarkId },
    data: { folderId }
  });
}

export async function toggleBookmarkWithFolder(postId: string, folderId?: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const existing = await prisma.socialBookmark.findUnique({
    where: { postId_userId: { postId, userId: session.user.id } }
  });

  if (existing) {
    await prisma.socialBookmark.delete({ where: { id: existing.id } });
    return false; // removed
  } else {
    await prisma.socialBookmark.create({
      data: {
        postId,
        userId: session.user.id,
        folderId: folderId || null,
      }
    });
    return true; // added
  }
}

export async function getBookmarksWithFolders(folderId?: string | null) {
  const session = await auth();
  if (!session?.user?.id) return [];

  const whereClause: any = { userId: session.user.id };
  if (folderId === "unfiled") {
    whereClause.folderId = null;
  } else if (folderId) {
    whereClause.folderId = folderId;
  }

  return await prisma.socialBookmark.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    include: {
      post: {
        include: {
          author: { select: { username: true, image: true } },
          _count: { select: { reactions: true, replies: true } }
        }
      }
    }
  });
}
