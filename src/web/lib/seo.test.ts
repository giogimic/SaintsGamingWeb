import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getSiteBaseUrl,
  constructCanonicalUrl,
  constructPageMetadata,
  getNewsArticleMetadata,
  getForumCategoryMetadata,
  getForumThreadMetadata,
  getUserProfileMetadata,
  getWikiArticleMetadata,
} from "./seo";

describe("SEO & Canonical Metadata Engine (WNC-20237597)", () => {
  const originalSiteUrl = process.env.SERAPHT_PUBLIC_SITE_URL;

  beforeEach(() => {
    process.env.SERAPHT_PUBLIC_SITE_URL = "https://saintsgaming.net";
  });

  afterEach(() => {
    process.env.SERAPHT_PUBLIC_SITE_URL = originalSiteUrl;
  });

  it("normalizes base site URL without trailing slashes", () => {
    process.env.SERAPHT_PUBLIC_SITE_URL = "https://saintsgaming.net///";
    expect(getSiteBaseUrl()).toBe("https://saintsgaming.net");
  });

  it("constructs valid canonical URL from relative and absolute paths", () => {
    expect(constructCanonicalUrl("/news/update-v2")).toBe("https://saintsgaming.net/news/update-v2");
    expect(constructCanonicalUrl("forum/announcements")).toBe("https://saintsgaming.net/forum/announcements");
    expect(constructCanonicalUrl("https://saintsgaming.net/custom")).toBe("https://saintsgaming.net/custom");
  });

  it("generates page metadata with canonical link, OpenGraph, and Twitter tags", () => {
    const meta = constructPageMetadata({
      title: "Community Hub",
      description: "Join our gaming community",
      path: "/hub",
    });

    expect(meta.title).toBe("Community Hub | Saints Gaming");
    expect(meta.description).toBe("Join our gaming community");
    expect(meta.alternates?.canonical).toBe("https://saintsgaming.net/hub");
    expect(meta.openGraph?.url).toBe("https://saintsgaming.net/hub");
    expect(meta.openGraph?.siteName).toBe("Saints Gaming");
    expect((meta.twitter as any)?.card).toBe("summary");
  });

  it("generates news article metadata with article schema and canonical path", () => {
    const meta = getNewsArticleMetadata({
      title: "Major Content Drop",
      body: "# Big changes\nHere are all the new features in Saints Gaming.",
      slug: "major-content-drop",
      coverImage: "/images/news/banner.png",
      author: { username: "Admin" },
    });

    expect(meta.title).toBe("Major Content Drop | Saints Gaming");
    expect(meta.alternates?.canonical).toBe("https://saintsgaming.net/news/major-content-drop");
    expect((meta.openGraph as any)?.type).toBe("article");
    const ogImages = (meta.openGraph as any)?.images;
    expect(Array.isArray(ogImages) ? ogImages[0]?.url : ogImages?.url).toBe("https://saintsgaming.net/images/news/banner.png");


  });

  it("generates forum category metadata", () => {
    const meta = getForumCategoryMetadata({
      name: "Server Discussions",
      description: "Talk about our dedicated game servers",
      slug: "server-discussions",
    });

    expect(meta.title).toBe("Server Discussions | Forums | Saints Gaming");
    expect(meta.alternates?.canonical).toBe("https://saintsgaming.net/forum/server-discussions");
  });

  it("generates forum thread metadata", () => {
    const meta = getForumThreadMetadata({
      title: "Boss Raid Strategy Guide",
      body: "Here is how to defeat Sol Heredit in the Colosseum.",
      slug: "boss-raid-strategy-guide",
      author: { username: "SaintPro" },
    });

    expect(meta.title).toBe("Boss Raid Strategy Guide | Forums | Saints Gaming");
    expect(meta.alternates?.canonical).toBe("https://saintsgaming.net/forum/t/boss-raid-strategy-guide");
    expect((meta.openGraph as any)?.type).toBe("article");

  });

  it("generates user profile metadata", () => {
    const meta = getUserProfileMetadata({
      username: "David",
      bio: "Master Builder & Saint Champion",
    });

    expect(meta.title).toBe("David's Profile | Saints Gaming");
    expect(meta.alternates?.canonical).toBe("https://saintsgaming.net/user/David");
  });

  it("generates wiki article metadata", () => {
    const meta = getWikiArticleMetadata({
      title: "Getting Started Guide",
      content: "Welcome to Saints Gaming. Learn how to play.",
      slug: "getting-started",
    });

    expect(meta.title).toBe("Getting Started Guide | Codex | Saints Gaming");
    expect(meta.alternates?.canonical).toBe("https://saintsgaming.net/wiki/getting-started");
  });
});

