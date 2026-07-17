"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createSocialPost(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const content = formData.get("content") as string;
  const visibility = formData.get("visibility") as string; // PUBLIC or FRIENDS
  
  if (!content || content.trim().length === 0) return;

  // Simple hashtag extractor
  const rawHashtags = content.match(/#[a-zA-Z0-9_]+/g) || [];
  const uniqueHashtags = Array.from(new Set(rawHashtags.map(h => h.substring(1).toLowerCase())));

  // Note: mediaUrl would be handled by a client-side upload or separate field
  const mediaUrl = formData.get("mediaUrl") as string;

  const post = await prisma.socialPost.create({
    data: {
      authorId: session.user.id,
      body: content,
      visibility: visibility === "FRIENDS" ? "FRIENDS" : "PUBLIC",
      mediaUrl: mediaUrl || null,
    }
  });

  // Handle hashtags
  for (const tag of uniqueHashtags) {
    let hashtag = await prisma.socialHashtag.findUnique({ where: { name: tag } });
    if (!hashtag) {
      hashtag = await prisma.socialHashtag.create({ data: { name: tag } });
    }
    await prisma.socialPostHashtag.create({
      data: {
        postId: post.id,
        hashtagId: hashtag.id
      }
    });
  }

  revalidatePath("/ucp/social");
}

export async function toggleReaction(postId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const existing = await prisma.socialReaction.findFirst({
    where: {
      postId,
      userId: session.user.id
    }
  });

  if (existing) {
    await prisma.socialReaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.socialReaction.create({
      data: {
        postId,
        userId: session.user.id
      }
    });
  }

  revalidatePath("/ucp/social");
}

export async function deleteSocialPost(postId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const post = await prisma.socialPost.findUnique({
    where: { id: postId },
    select: { authorId: true }
  });

  if (!post) throw new Error("Post not found");
  if (post.authorId !== session.user.id) throw new Error("Forbidden");

  await prisma.socialPost.delete({ where: { id: postId } });

  revalidatePath("/ucp/social");
}
