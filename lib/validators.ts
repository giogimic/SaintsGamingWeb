/**
 * Saints Gaming — Zod Validation Schemas
 * Shared between client and server for consistent validation.
 */

import { z } from "zod";

// ─── Auth ───────────────────────────────────────────────────────

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(24, "Username must be at most 24 characters")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Username can only contain letters, numbers, underscores, and dashes"
    ),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters"),
  displayName: z.string().max(32).optional(),
});

export const loginSchema = z.object({
  identifier: z.string().min(1, "Username or email is required"),
  password: z.string().min(1, "Password is required"),
});

// ─── Forum ──────────────────────────────────────────────────────

export const createCategorySchema = z.object({
  name: z.string().min(1).max(64),
  description: z.string().max(256).optional(),
  icon: z.string().max(32).optional(),
  order: z.number().int().min(0).default(0),
});

export const createSubCategorySchema = z.object({
  name: z.string().min(1).max(64),
  description: z.string().max(256).optional(),
  categoryId: z.string().min(1),
  order: z.number().int().min(0).default(0),
});

export const createThreadSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(128),
  body: z.string().min(10, "Post must be at least 10 characters").max(50000),
  subcategoryId: z.string().min(1),
  hashtags: z
    .array(z.string().max(32))
    .max(10, "Maximum 10 hashtags")
    .optional(),
});

export const createReplySchema = z.object({
  body: z.string().min(1, "Reply cannot be empty").max(50000),
  threadId: z.string().min(1),
  quotedId: z.string().optional(),
});

export const reactionSchema = z.object({
  emoji: z.enum(["👍", "🔥", "😂", "❤️", "💀", "🎮"]),
  threadId: z.string().optional(),
  replyId: z.string().optional(),
});

// ─── News ───────────────────────────────────────────────────────

export const createNewsSchema = z.object({
  title: z.string().min(3).max(256),
  excerpt: z.string().max(512).optional(),
  body: z.string().min(10).max(100000),
  hashtags: z.array(z.string().max(32)).max(10).optional(),
  isPublished: z.boolean().default(false),
});

// ─── Modpacks ───────────────────────────────────────────────────

export const createModpackSchema = z.object({
  name: z.string().min(1).max(128),
  game: z.string().max(64).default("Minecraft"),
  description: z.string().max(10000).optional(),
  version: z.string().max(32).optional(),
  status: z.enum(["Active", "Inactive", "Archived"]).default("Active"),
  downloadUrl: z.string().url().optional().or(z.literal("")),
  installNotes: z.string().max(10000).optional(),
  changelog: z.string().max(50000).optional(),
});

// ─── Streams ────────────────────────────────────────────────────

export const streamProfileSchema = z.object({
  platform: z.enum(["twitch", "youtube", "kick"]),
  channelUrl: z.string().url("Invalid channel URL"),
  channelId: z.string().max(128).optional(),
  priority: z.number().int().min(0).max(1000).default(0),
});

// ─── User Profile ───────────────────────────────────────────────

export const updateProfileSchema = z.object({
  displayName: z.string().max(32).optional(),
  bio: z.string().max(500).optional(),
});

// ─── Hashtag ────────────────────────────────────────────────────

/** Normalize a hashtag: lowercase, strip #, alphanumeric + hyphens only */
export function normalizeHashtag(tag: string): string {
  return tag
    .toLowerCase()
    .replace(/^#/, "")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 32);
}

// ─── Type Exports ───────────────────────────────────────────────

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateThreadInput = z.infer<typeof createThreadSchema>;
export type CreateReplyInput = z.infer<typeof createReplySchema>;
export type ReactionInput = z.infer<typeof reactionSchema>;
export type CreateNewsInput = z.infer<typeof createNewsSchema>;
export type CreateModpackInput = z.infer<typeof createModpackSchema>;
export type StreamProfileInput = z.infer<typeof streamProfileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
