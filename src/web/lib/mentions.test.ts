import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./prisma", () => ({ prisma: {} }));
vi.mock("./realtime-emit", () => ({ emitNotificationCreated: vi.fn() }));

import { extractMentions } from "./mentions";

describe("extractMentions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty for blank text", () => {
    expect(extractMentions("")).toEqual([]);
    expect(extractMentions("no mentions here")).toEqual([]);
  });

  it("extracts unique lowercase usernames", () => {
    expect(extractMentions("Hey @Alice and @bob and @Alice")).toEqual([
      "alice",
      "bob",
    ]);
  });

  it("allows underscores in usernames", () => {
    expect(extractMentions("cc @saint_user please")).toEqual(["saint_user"]);
  });
});
