import { describe, expect, it } from "vitest";
import {
  createReplySchema,
  createThreadSchema,
  normalizeHashtag,
  reactionSchema,
  registerSchema,
} from "./validators";

describe("normalizeHashtag", () => {
  it("strips #, lowercases, and keeps alphanumerics/hyphens", () => {
    expect(normalizeHashtag("#Hello_World!")).toBe("helloworld");
    expect(normalizeHashtag("Game-Dev")).toBe("game-dev");
  });

  it("caps length at 32", () => {
    expect(normalizeHashtag("a".repeat(40)).length).toBe(32);
  });
});

describe("createThreadSchema", () => {
  const valid = {
    title: "Hello thread",
    body: "This body is long enough.",
    subcategoryId: "sub_1",
  };

  it("accepts a valid thread payload", () => {
    expect(createThreadSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects short titles and bodies", () => {
    expect(createThreadSchema.safeParse({ ...valid, title: "ab" }).success).toBe(false);
    expect(createThreadSchema.safeParse({ ...valid, body: "short" }).success).toBe(false);
  });

  it("caps hashtag count at 10", () => {
    const tags = Array.from({ length: 11 }, (_, i) => `tag${i}`);
    expect(
      createThreadSchema.safeParse({ ...valid, hashtags: tags }).success
    ).toBe(false);
  });
});

describe("createReplySchema", () => {
  it("requires non-empty body and threadId", () => {
    expect(
      createReplySchema.safeParse({ body: "ok", threadId: "t1" }).success
    ).toBe(true);
    expect(createReplySchema.safeParse({ body: "", threadId: "t1" }).success).toBe(false);
    expect(createReplySchema.safeParse({ body: "ok", threadId: "" }).success).toBe(false);
  });
});

describe("reactionSchema", () => {
  it("allows known emoji only", () => {
    expect(reactionSchema.safeParse({ emoji: "👍", threadId: "t1" }).success).toBe(true);
    expect(reactionSchema.safeParse({ emoji: "🙂", threadId: "t1" }).success).toBe(false);
  });
});

describe("registerSchema", () => {
  it("enforces username charset and password length", () => {
    const base = {
      email: "a@b.co",
      username: "saint_1",
      password: "password1",
    };
    expect(registerSchema.safeParse(base).success).toBe(true);
    expect(registerSchema.safeParse({ ...base, username: "bad name" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, password: "short" }).success).toBe(false);
  });
});
