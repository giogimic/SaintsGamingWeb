import { prisma } from "./prisma";

/**
 * Extracts unique @usernames from a text block.
 */
export function extractMentions(text: string): string[] {
  if (!text) return [];
  // Match @username (alphanumeric and underscores, typical for usernames)
  const matches = text.match(/@([a-zA-Z0-9_]+)/g);
  if (!matches) return [];

  // Remove the @ symbol and get unique lowercase usernames
  const uniqueNames = Array.from(new Set(matches.map(m => m.slice(1).toLowerCase())));
  return uniqueNames;
}

/**
 * Parses text for @mentions and creates a notification for each mentioned user.
 * 
 * @param text The body of the post or reply
 * @param authorId The ID of the user who made the post/reply (so they don't notify themselves)
 * @param link The URL to redirect to when the notification is clicked
 */
export async function processMentions(text: string, authorId: string, link: string) {
  const usernames = extractMentions(text);
  if (usernames.length === 0) return;

  try {
    const author = await prisma.user.findUnique({ where: { id: authorId }, select: { username: true } });
    const authorName = author?.username || "Someone";

    // Find all users matching the extracted usernames
    const users = await prisma.user.findMany({
      where: {
        username: { in: usernames },
        id: { not: authorId } // don't notify self
      },
      select: { id: true, username: true }
    });

    if (users.length === 0) return;

    // Create notifications for all matched users
    await prisma.notification.createMany({
      data: users.map(user => ({
        userId: user.id,
        type: "MENTION",
        message: `${authorName} mentioned you in a post.`,
        link: link,
      }))
    });
  } catch (error) {
    console.error("Failed to process mentions:", error);
  }
}
