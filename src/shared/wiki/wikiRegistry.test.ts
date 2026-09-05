import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import {
  getWikiCategories,
  getWikiCategory,
  getAllWikiArticles,
  getWikiArticle,
  getAdjacentArticles,
  getWikiBreadcrumbs,
  searchWikiArticles,
  getWikiArticleCount,
  FEATURED_GUIDES,
  WIKI_CATEGORIES,
} from "./wikiRegistry";

describe("wikiRegistry", () => {
  describe("WIKI_CATEGORIES", () => {
    it("should have 5 categories", () => {
      expect(WIKI_CATEGORIES).toHaveLength(5);
    });

    it("should have unique category IDs", () => {
      const ids = WIKI_CATEGORIES.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("should have at least 1 article per category", () => {
      for (const cat of WIKI_CATEGORIES) {
        expect(cat.articles.length).toBeGreaterThan(0);
      }
    });
  });

  describe("getWikiCategories", () => {
    it("should return all categories", () => {
      expect(getWikiCategories()).toEqual(WIKI_CATEGORIES);
    });
  });

  describe("getWikiCategory", () => {
    it("should find a category by ID", () => {
      const cat = getWikiCategory("game-systems");
      expect(cat).toBeDefined();
      expect(cat!.title).toBe("Game Systems");
    });

    it("should return undefined for unknown ID", () => {
      expect(getWikiCategory("noseraphistent")).toBeUndefined();
    });
  });

  describe("getAllWikiArticles", () => {
    it("should return a flat array of all articles", () => {
      const articles = getAllWikiArticles();
      const totalExpected = WIKI_CATEGORIES.reduce(
        (sum, c) => sum + c.articles.length,
        0
      );
      expect(articles).toHaveLength(totalExpected);
    });

    it("should have unique slugs across all articles", () => {
      const slugs = getAllWikiArticles().map((a) => a.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
    });
  });

  describe("getWikiArticle", () => {
    it("should find an article by slug", () => {
      const article = getWikiArticle("getting-started/overview");
      expect(article).toBeDefined();
      expect(article!.title).toBe("Platform & Game Overview");
    });

    it("should return undefined for unknown slug", () => {
      expect(getWikiArticle("fake/slug")).toBeUndefined();
    });
  });

  describe("getAdjacentArticles", () => {
    it("should return null prev for the first article", () => {
      const first = getAllWikiArticles()[0];
      const { prev, serapht } = getAdjacentArticles(first.slug);
      expect(prev).toBeNull();
      expect(serapht).not.toBeNull();
    });

    it("should return null serapht for the last article", () => {
      const all = getAllWikiArticles();
      const last = all[all.length - 1];
      const { prev, serapht } = getAdjacentArticles(last.slug);
      expect(prev).not.toBeNull();
      expect(serapht).toBeNull();
    });

    it("should return both for a middle article", () => {
      const all = getAllWikiArticles();
      if (all.length >= 3) {
        const mid = all[1];
        const { prev, serapht } = getAdjacentArticles(mid.slug);
        expect(prev).not.toBeNull();
        expect(serapht).not.toBeNull();
      }
    });
  });

  describe("getWikiBreadcrumbs", () => {
    it("should start with Wiki root", () => {
      const crumbs = getWikiBreadcrumbs("getting-started/overview");
      expect(crumbs[0]).toEqual({ label: "Wiki", href: "/wiki" });
    });

    it("should include category and article", () => {
      const crumbs = getWikiBreadcrumbs("game-systems/core-loop");
      expect(crumbs).toHaveLength(3);
      expect(crumbs[1].label).toBe("Game Systems");
      expect(crumbs[2].label).toBe("Core Loop & 3D Voxel Renderer");
    });
  });

  describe("searchWikiArticles", () => {
    it("should return empty array for empty query", () => {
      expect(searchWikiArticles("")).toEqual([]);
    });

    it("should return empty array for single-char query", () => {
      expect(searchWikiArticles("a")).toEqual([]);
    });

    it("should find articles matching query", () => {
      const results = searchWikiArticles("combat");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].article.title.toLowerCase()).toContain("combat");
    });

    it("should rank title matches higher than tag matches", () => {
      const results = searchWikiArticles("skills progression");
      expect(results.length).toBeGreaterThan(0);
      // The article with "skills" in the title should rank first
      expect(results[0].article.slug).toBe("game-systems/skills-progression");
    });

    it("should search across tags", () => {
      const results = searchWikiArticles("babylon");
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe("getWikiArticleCount", () => {
    it("should return total count of all articles", () => {
      expect(getWikiArticleCount()).toBe(getAllWikiArticles().length);
    });
  });

  describe("FEATURED_GUIDES", () => {
    it("should reference valid article slugs", () => {
      for (const slug of FEATURED_GUIDES) {
        const article = getWikiArticle(slug);
        expect(article).toBeDefined();
      }
    });
  });

  describe("Markdown file resolution", () => {
    it("should have a valid markdown file for every article", () => {
      const articles = getAllWikiArticles();
      for (const article of articles) {
        const fullPath = path.join(
          process.cwd(),
          "docs",
          "wiki",
          article.filePath
        );
        const exists = fs.existsSync(fullPath);
        expect(exists, `Missing markdown file: ${article.filePath}`).toBe(true);
      }
    });

    it("all markdown files should be non-empty", () => {
      const articles = getAllWikiArticles();
      for (const article of articles) {
        const fullPath = path.join(
          process.cwd(),
          "docs",
          "wiki",
          article.filePath
        );
        const content = fs.readFileSync(fullPath, "utf-8");
        expect(
          content.trim().length,
          `Empty markdown file: ${article.filePath}`
        ).toBeGreaterThan(0);
      }
    });
  });
});
