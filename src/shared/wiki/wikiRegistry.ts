/**
 * Saints Gaming Wiki Registry
 * 
 * Centralized metadata registry for all wiki articles, categories, slugs,
 * read times, summaries, and search indexing. This is the single source of
 * truth for wiki content navigation and resolution.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface WikiCategory {
  id: string;
  title: string;
  description: string;
  icon: string; // Lucide icon name
  color: string; // Tailwind gradient/accent color class
  articles: WikiArticleMeta[];
}

export interface WikiArticleMeta {
  slug: string;        // Full URL slug, e.g. "getting-started/overview"
  title: string;
  summary: string;
  readTime: number;    // Estimated read time in minutes
  categoryId: string;
  tags: string[];
  filePath: string;    // Relative path under docs/wiki/
  order: number;       // Sort order within category
}

export interface WikiSearchResult {
  article: WikiArticleMeta;
  category: WikiCategory;
  matchScore: number;
}

// ─── Category Definitions ───────────────────────────────────────────────────

export const WIKI_CATEGORIES: WikiCategory[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    description: "Quickstart guides, installation, and platform architecture overview.",
    icon: "Rocket",
    color: "from-emerald-500 to-teal-500",
    articles: [
      {
        slug: "getting-started/overview",
        title: "Platform & Game Overview",
        summary: "Learn what Saints Gaming is, the core game pillars, and canonical terminology.",
        readTime: 4,
        categoryId: "getting-started",
        tags: ["overview", "introduction", "pillars", "terminology"],
        filePath: "getting-started/overview.md",
        order: 0,
      },
      {
        slug: "getting-started/installation",
        title: "Installation & Local Development",
        summary: "Clone, install, configure .env, run dev servers, package the desktop executable, and use the setup wizard.",
        readTime: 4,
        categoryId: "getting-started",
        tags: ["install", "setup", "node", "prisma", "npm", "dev server", "desktop", "electron", "build:exe"],
        filePath: "getting-started/installation.md",
        order: 1,
      },
      {
        slug: "getting-started/architecture",
        title: "Platform Architecture",
        summary: "High-level architecture of Serapht.js, Go MMO, Babylon.js 3D Voxel Engine, and Desktop Electron Client.",
        readTime: 6,
        categoryId: "getting-started",
        tags: ["architecture", "serapht.js", "go", "babylon", "stack", "desktop", "electron", "voxel"],
        filePath: "getting-started/architecture.md",
        order: 2,
      },
    ],
  },
  {
    id: "game-systems",
    title: "Game Systems",
    description: "Deep-dive into the 2.5D engine, skills, combat, economy, networking, and UI.",
    icon: "Gamepad2",
    color: "from-amber-500 to-orange-500",
    articles: [
      {
        slug: "game-systems/core-loop",
        title: "Core Loop & 3D Voxel Renderer",
        summary: "The requestAnimationFrame game loop, 3D voxel chunk remeshing, volumetric collision, and sprite projection.",
        readTime: 6,
        categoryId: "game-systems",
        tags: ["game loop", "renderer", "babylon", "canvas", "requestAnimationFrame", "voxel", "collision", "remeshing"],
        filePath: "game-systems/core-loop.md",
        order: 0,
      },
      {
        slug: "game-systems/skills-progression",
        title: "27-Skill Progression",
        summary: "Complete skill matrix, XP curves, Grandmaster capstones, Battlepass tiers, and skill cape emotes.",
        readTime: 6,
        categoryId: "game-systems",
        tags: ["skills", "progression", "xp", "levels", "capstone", "battlepass", "cape"],
        filePath: "game-systems/skills-progression.md",
        order: 1,
      },
      {
        slug: "game-systems/combat-encounters",
        title: "Combat & Encounters",
        summary: "Saints Hybrid Combat model: real-time overworld Hero Battles alongside turn-based companion creature battles.",
        readTime: 5,
        categoryId: "game-systems",
        tags: ["combat", "battle", "hybrid combat", "saints hybrid", "hero battles", "buddy battles", "capture", "elemental"],
        filePath: "game-systems/combat-encounters.md",
        order: 2,
      },
      {
        slug: "game-systems/items-economy",
        title: "Items & Economy",
        summary: "Item database schema, equipment tiers, gathering nodes, crafting matrices, and loot tables.",
        readTime: 4,
        categoryId: "game-systems",
        tags: ["items", "economy", "equipment", "crafting", "loot", "drops"],
        filePath: "game-systems/items-economy.md",
        order: 3,
      },
      {
        slug: "game-systems/networking-multiplayer",
        title: "Networking & Multiplayer",
        summary: "Hybrid Go MMO backend, AOI sharding, movement codecs, and map sync webhooks.",
        readTime: 4,
        categoryId: "game-systems",
        tags: ["networking", "multiplayer", "go", "sockets", "aoi", "sharding", "sync"],
        filePath: "game-systems/networking-multiplayer.md",
        order: 4,
      },
      {
        slug: "game-systems/controls-ui",
        title: "Controls & UI",
        summary: "Mobile touch controls, desktop HUD docks, minimap radar, and WebAudio soundscapes.",
        readTime: 3,
        categoryId: "game-systems",
        tags: ["controls", "ui", "mobile", "touch", "hud", "minimap", "audio"],
        filePath: "game-systems/controls-ui.md",
        order: 5,
      },
    ],
  },
  {
    id: "studio",
    title: "World Studio",
    description: "Technical manuals for the in-game creator suite: painting, entities, catalogs, and playtesting.",
    icon: "Sparkles",
    color: "from-purple-500 to-violet-500",
    articles: [
      {
        slug: "studio/overview",
        title: "Studio Architecture",
        summary: "Docking shell, Zustand state management, 5 editor modes, 3D Voxel World architecture, and Desktop App access.",
        readTime: 5,
        categoryId: "studio",
        tags: ["studio", "editor", "modes", "docking", "hotkeys", "voxel", "desktop", "electron"],
        filePath: "studio/overview.md",
        order: 0,
      },
      {
        slug: "studio/tile-painting-maps",
        title: "Tile Painting & 3D Voxel Maps",
        summary: "Dual-grid layers, Greenfield 3D Voxel blocks, face-specific UVs, painting tools, and chunk remeshing.",
        readTime: 5,
        categoryId: "studio",
        tags: ["tile painting", "voxel", "blocks", "layers", "tools", "remeshing", "uv", "collision"],
        filePath: "studio/tile-painting-maps.md",
        order: 1,
      },
      {
        slug: "studio/entities-npcs",
        title: "Entities & NPCs",
        summary: "NPC placement, monster spawners, resource nodes, interactive components, and warp gates.",
        readTime: 3,
        categoryId: "studio",
        tags: ["entities", "npcs", "spawners", "monsters", "warps"],
        filePath: "studio/entities-npcs.md",
        order: 2,
      },
      {
        slug: "studio/catalogs-definitions",
        title: "Catalogs & Definitions",
        summary: "Creature, item, class, starter hero, quest, and dialogue definition editors.",
        readTime: 3,
        categoryId: "studio",
        tags: ["catalogs", "definitions", "creatures", "items", "quests", "classes"],
        filePath: "studio/catalogs-definitions.md",
        order: 3,
      },
      {
        slug: "studio/validation-playtest",
        title: "Validation & Playtesting",
        summary: "Map validation, save pipeline, Go MMO sync, and Play-In-Editor (PIE) runtime.",
        readTime: 3,
        categoryId: "studio",
        tags: ["validation", "playtest", "pie", "save", "sync"],
        filePath: "studio/validation-playtest.md",
        order: 4,
      },
      {
        slug: "studio/asset-management",
        title: "Asset Management",
        summary: "Modular sprite compositing pipeline, tileset importing, and asset organization.",
        readTime: 3,
        categoryId: "studio",
        tags: ["assets", "sprites", "modular", "tilesets", "importing"],
        filePath: "studio/asset-management.md",
        order: 5,
      },
    ],
  },
  {
    id: "creator-guide",
    title: "Creator Guide",
    description: "Hands-on tutorials for building characters, creatures, quests, and worlds.",
    icon: "Wand2",
    color: "from-pink-500 to-rose-500",
    articles: [
      {
        slug: "creator-guide/custom-characters",
        title: "Custom Characters",
        summary: "Design player archetypes with modular sprite compositing, stat distributions, and starter loadouts.",
        readTime: 5,
        categoryId: "creator-guide",
        tags: ["characters", "sprites", "modular", "archetypes", "customization"],
        filePath: "creator-guide/custom-characters.md",
        order: 0,
      },
      {
        slug: "creator-guide/creature-design",
        title: "Creature Design",
        summary: "Create companion creatures with stats, types, moves, evolutions, and shiny variants.",
        readTime: 5,
        categoryId: "creator-guide",
        tags: ["creatures", "companions", "evolutions", "moves", "types"],
        filePath: "creator-guide/creature-design.md",
        order: 1,
      },
      {
        slug: "creator-guide/quest-authoring",
        title: "Quest Authoring",
        summary: "Author multi-stage quest chains with dialogue trees, objectives, and reward payouts.",
        readTime: 4,
        categoryId: "creator-guide",
        tags: ["quests", "dialogue", "objectives", "rewards", "stories"],
        filePath: "creator-guide/quest-authoring.md",
        order: 2,
      },
      {
        slug: "creator-guide/world-building",
        title: "World Building",
        summary: "Build multi-map atlases with connected warps, biome zones, and NPC populations.",
        readTime: 5,
        categoryId: "creator-guide",
        tags: ["world", "maps", "warps", "biomes", "zones", "atlas"],
        filePath: "creator-guide/world-building.md",
        order: 3,
      },
    ],
  },
  {
    id: "api-and-reference",
    title: "API & Reference",
    description: "Database schema, REST API endpoints, and terminology glossary.",
    icon: "BookText",
    color: "from-cyan-500 to-blue-500",
    articles: [
      {
        slug: "api-and-reference/database-schema",
        title: "Database Schema",
        summary: "Prisma models, relationships, and SQLite storage architecture.",
        readTime: 4,
        categoryId: "api-and-reference",
        tags: ["database", "prisma", "schema", "sqlite", "models"],
        filePath: "api-and-reference/database-schema.md",
        order: 0,
      },
      {
        slug: "api-and-reference/api-reference",
        title: "API Reference",
        summary: "REST API endpoints, authentication flows, and webhook integrations.",
        readTime: 5,
        categoryId: "api-and-reference",
        tags: ["api", "rest", "endpoints", "auth", "webhooks"],
        filePath: "api-and-reference/api-reference.md",
        order: 1,
      },
      {
        slug: "api-and-reference/glossary",
        title: "Glossary & Conventions",
        summary: "Canonical terminology, naming conventions, and coding standards.",
        readTime: 3,
        categoryId: "api-and-reference",
        tags: ["glossary", "terminology", "conventions", "naming"],
        filePath: "api-and-reference/glossary.md",
        order: 2,
      },
    ],
  },
];

// ─── Helper Functions ───────────────────────────────────────────────────────

/** Get all wiki categories */
export function getWikiCategories(): WikiCategory[] {
  return WIKI_CATEGORIES;
}

/** Get a single category by ID */
export function getWikiCategory(categoryId: string): WikiCategory | undefined {
  return WIKI_CATEGORIES.find((c) => c.id === categoryId);
}

/** Get a flat list of all wiki articles */
export function getAllWikiArticles(): WikiArticleMeta[] {
  return WIKI_CATEGORIES.flatMap((c) => c.articles);
}

/** Look up an article by its full slug (e.g. "game-systems/core-loop") */
export function getWikiArticle(slug: string): WikiArticleMeta | undefined {
  return getAllWikiArticles().find((a) => a.slug === slug);
}

/** Get adjacent articles for prev/serapht navigation */
export function getAdjacentArticles(slug: string): {
  prev: WikiArticleMeta | null;
  serapht: WikiArticleMeta | null;
} {
  const allArticles = getAllWikiArticles();
  const idx = allArticles.findIndex((a) => a.slug === slug);
  return {
    prev: idx > 0 ? allArticles[idx - 1] : null,
    serapht: idx >= 0 && idx < allArticles.length - 1 ? allArticles[idx + 1] : null,
  };
}

/** Build breadcrumb segments from a slug */
export function getWikiBreadcrumbs(slug: string): { label: string; href: string }[] {
  const crumbs: { label: string; href: string }[] = [
    { label: "Wiki", href: "/wiki" },
  ];

  const parts = slug.split("/");
  if (parts.length >= 1) {
    const category = getWikiCategory(parts[0]);
    if (category) {
      crumbs.push({ label: category.title, href: `/wiki/${parts[0]}` });
    }
  }
  if (parts.length >= 2) {
    const article = getWikiArticle(slug);
    if (article) {
      crumbs.push({ label: article.title, href: `/wiki/${slug}` });
    }
  }

  return crumbs;
}

/** Fuzzy search across all wiki articles by query string */
export function searchWikiArticles(query: string): WikiSearchResult[] {
  if (!query || query.trim().length < 2) return [];

  const normalizedQuery = query.toLowerCase().trim();
  const tokens = normalizedQuery.split(/\s+/);
  const results: WikiSearchResult[] = [];

  for (const category of WIKI_CATEGORIES) {
    for (const article of category.articles) {
      let score = 0;
      const haystack = [
        article.title,
        article.summary,
        ...article.tags,
        category.title,
      ]
        .join(" ")
        .toLowerCase();

      for (const token of tokens) {
        if (article.title.toLowerCase().includes(token)) score += 10;
        if (article.summary.toLowerCase().includes(token)) score += 5;
        if (article.tags.some((t) => t.includes(token))) score += 8;
        if (category.title.toLowerCase().includes(token)) score += 3;
        if (haystack.includes(token)) score += 1;
      }

      if (score > 0) {
        results.push({ article, category, matchScore: score });
      }
    }
  }

  return results.sort((a, b) => b.matchScore - a.matchScore);
}

/** Get total article count */
export function getWikiArticleCount(): number {
  return getAllWikiArticles().length;
}

/** Featured guides slugs for the landing page */
export const FEATURED_GUIDES: string[] = [
  "game-systems/core-loop",
  "game-systems/skills-progression",
  "studio/tile-painting-maps",
  "creator-guide/world-building",
];
