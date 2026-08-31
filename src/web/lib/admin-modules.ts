import {
  LayoutDashboard,
  Radio,
  Activity,
  Cpu,
  Gamepad2,
  MapPin,
  Sparkles,
  ScrollText,
  Image as ImageIcon,
  Newspaper,
  MessageSquare,
  Bot,
  LifeBuoy,
  Monitor,
  Rss,
  Users,
  ShieldAlert,
  Award,
  ShieldCheck,
  Server,
  Package,
  Settings,
  Terminal,
  Database,
  RefreshCw,
  Code,
  History,
  Sword,
  Flame,
  Store,
  Share2,
  Flag,
  MessagesSquare,
  BookOpen,
  Crown,
  Coins,
  Megaphone,
  Trophy,
  HardDrive,
  Gift,
  Globe,
  type LucideIcon,
} from "lucide-react";
import { PERMISSION_LEVELS } from "./permissions";

export type AdminCategoryId =
  | "overview"
  | "operations"
  | "community"
  | "identity"
  | "infrastructure"
  | "developer";

export interface AdminCategory {
  id: AdminCategoryId;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  order: number;
}

export const ADMIN_CATEGORIES: Record<AdminCategoryId, AdminCategory> = {
  overview: {
    id: "overview",
    label: "Overview & Telemetry",
    shortLabel: "Overview",
    description: "System health, operational alerts, and real-time command center status.",
    icon: LayoutDashboard,
    order: 1,
  },
  operations: {
    id: "operations",
    label: "World & Game Operations",
    shortLabel: "World & Game",
    description: "Heroes, creature species, quests, crafting items, world events, and pixel assets.",
    icon: Gamepad2,
    order: 2,
  },
  community: {
    id: "community",
    label: "Community & Content",
    shortLabel: "Community",
    description: "Publishing news, managing forum boards, feed moderation, support tickets, and streams.",
    icon: MessageSquare,
    order: 3,
  },
  identity: {
    id: "identity",
    label: "Identity, Progression & Economy",
    shortLabel: "Identity & Roles",
    description: "Community accounts, security roles, XP tiers, achievements, guilds, and player economy.",
    icon: ShieldCheck,
    order: 4,
  },
  infrastructure: {
    id: "infrastructure",
    label: "Game Servers & Infrastructure",
    shortLabel: "Infrastructure",
    description: "Dedicated servers, client modpacks, FiveM txAdmin, site configuration, and broadcasts.",
    icon: Server,
    order: 5,
  },
  developer: {
    id: "developer",
    label: "Developer Console",
    shortLabel: "Developer",
    description: "System index, database diagnostics, background task runners, and API testing sandbox.",
    icon: Terminal,
    order: 6,
  },
};

export interface AdminModule {
  id: string;
  category: AdminCategoryId;
  label: string;
  description: string;
  icon: LucideIcon;
  href: string;
  permission: number;
  exact?: boolean;
  featureFlag?: string;
  statusSource?: string;
  allowWriter?: boolean;
  badge?: string;
  keywords?: string[];
}

export const ADMIN_MODULES: AdminModule[] = [
  // ─── OVERVIEW & TELEMETRY ──────────────────────────────────────────────────
  {
    id: "overview-dashboard",
    category: "overview",
    label: "Command Center",
    description: "High-level platform snapshot, urgent action alerts, and quick shortcuts.",
    icon: LayoutDashboard,
    href: "/admin",
    permission: PERMISSION_LEVELS.MODERATOR,
    exact: true,
    allowWriter: true,
    keywords: ["home", "dashboard", "status", "overview", "command center", "stats", "telemetry"],
  },
  {
    id: "overview-activity",
    category: "overview",
    label: "Platform Activity Stream",
    description: "Live operational audit trail of user signups, moderation events, and tickets.",
    icon: History,
    href: "/admin/activity",
    permission: PERMISSION_LEVELS.MODERATOR,
    keywords: ["activity", "audit", "log", "events", "history", "recent", "actions", "signups"],
  },
  {
    id: "overview-realtime",
    category: "overview",
    label: "Realtime Bus",
    description: "Socket.IO cluster health, active connections, and emergency circuit breaker.",
    icon: Radio,
    href: "/admin/realtime",
    permission: PERMISSION_LEVELS.DEVELOPER,
    statusSource: "realtime",
    keywords: ["socket", "bus", "realtime", "circuit breaker", "disconnect", "events", "websocket", "network"],
  },
  {
    id: "overview-metrics",
    category: "overview",
    label: "System Metrics",
    description: "Node.js process RAM usage, CPU load, and host server uptime.",
    icon: Activity,
    href: "/admin/dev/metrics",
    permission: PERMISSION_LEVELS.DEVELOPER,
    keywords: ["metrics", "memory", "cpu", "telemetry", "nodejs", "performance", "ram", "uptime"],
  },
  {
    id: "overview-system",
    category: "overview",
    label: "System State",
    description: "Active environment variables, build version, and router cache invalidation.",
    icon: Cpu,
    href: "/admin/dev/system",
    permission: PERMISSION_LEVELS.DEVELOPER,
    keywords: ["environment", "env", "system", "version", "cache", "build", "state", "revalidate"],
  },

  // ─── WORLD & GAME OPERATIONS ───────────────────────────────────────────────
  {
    id: "game-mmo-sandbox",
    category: "operations",
    label: "Game Operations",
    description: "Active Saint hero roster, inventory item injection, and emergency unstuck tools.",
    icon: Gamepad2,
    href: "/admin/game",
    permission: PERMISSION_LEVELS.DEVELOPER,
    keywords: ["mmo", "characters", "items", "inventory", "inject", "sandbox", "players", "heroes", "unstuck"],
  },
  {
    id: "game-lobby-mgmt",
    category: "operations",
    label: "Lobby & Gateway",
    description: "Go MMO and TypeScript game engine gateway status, player counts, and shards.",
    icon: MapPin,
    href: "/admin/dev/lobby",
    permission: PERMISSION_LEVELS.DEVELOPER,
    statusSource: "mmo-gateway",
    keywords: ["lobby", "gateway", "server status", "shards", "engine", "mmo status", "realtime"],
  },
  {
    id: "game-studio",
    category: "operations",
    label: "World Studio",
    description: "Open the full 2.5D Babylon level builder to paint tiles and place NPCs.",
    icon: Sparkles,
    href: "/studio",
    permission: PERMISSION_LEVELS.ADMIN,
    badge: "Fullscreen",
    keywords: ["studio", "map editor", "world builder", "paint", "tiles", "tilesets", "npcs", "babylon"],
  },
  {
    id: "game-quests",
    category: "operations",
    label: "Quest Creator",
    description: "Write NPC story dialogues, turn-in requirements, and player XP/credit rewards.",
    icon: ScrollText,
    href: "/admin/game-dev/quests",
    permission: PERMISSION_LEVELS.DEVELOPER,
    keywords: ["quests", "dialogue", "npcs", "rewards", "missions", "objectives", "story"],
  },
  {
    id: "game-creatures",
    category: "operations",
    label: "Beast Catalog",
    description: "Browse registered creature species, elemental types, combat stats, and abilities.",
    icon: Gamepad2,
    href: "/admin/game-dev/creatures",
    permission: PERMISSION_LEVELS.DEVELOPER,
    keywords: ["creatures", "beasts", "species", "stats", "moves", "abilities", "monsters", "saints", "dex"],
  },
  {
    id: "game-items",
    category: "operations",
    label: "Items & Crafting",
    description: "Manage weapons, armor, gathering tools, crafting recipes, and professions.",
    icon: Sword,
    href: "/admin/game-dev/items",
    permission: PERMISSION_LEVELS.DEVELOPER,
    keywords: ["items", "crafting", "recipes", "weapons", "armor", "professions", "smithing", "mining", "tools"],
  },
  {
    id: "game-dungeons-events",
    category: "operations",
    label: "Dungeons & Events",
    description: "Configure world multipliers, scheduled server events, and party dungeon entries.",
    icon: Flame,
    href: "/admin/game-dev/events",
    permission: PERMISSION_LEVELS.DEVELOPER,
    keywords: ["dungeons", "events", "world events", "multipliers", "double xp", "bosses", "raids"],
  },
  {
    id: "game-shops",
    category: "operations",
    label: "Shops & Encounters",
    description: "Set merchant stock, item prices, restock timers, and map encounter rates.",
    icon: Store,
    href: "/admin/game-dev/shops",
    permission: PERMISSION_LEVELS.DEVELOPER,
    keywords: ["shops", "merchants", "vendors", "encounters", "spawn rates", "inventory", "prices"],
  },
  {
    id: "game-assets",
    category: "operations",
    label: "Pixel Asset Studio",
    description: "Batch import and categorize 16x16 / 32x32 tiles, sprites, and map decor.",
    icon: ImageIcon,
    href: "/admin/game-dev/assets",
    permission: PERMISSION_LEVELS.DEVELOPER,
    keywords: ["assets", "sprites", "pixel art", "tiles", "textures", "graphics", "importer"],
  },

  // ─── COMMUNITY & CONTENT ───────────────────────────────────────────────────
  {
    id: "content-news",
    category: "community",
    label: "News & Articles",
    description: "Write, schedule, and publish front-page community announcements and patch notes.",
    icon: Newspaper,
    href: "/admin/news",
    permission: PERMISSION_LEVELS.ADMIN,
    allowWriter: true,
    keywords: ["news", "articles", "announcements", "posts", "blog", "cms", "writer", "patch notes"],
  },
  {
    id: "community-forum",
    category: "community",
    label: "Forum Categories",
    description: "Organize forum boards, categories, access permissions, and display order.",
    icon: MessageSquare,
    href: "/admin/forum",
    permission: PERMISSION_LEVELS.HEAD_MODERATOR,
    keywords: ["forum", "categories", "boards", "threads", "discussions", "subcategories"],
  },
  {
    id: "community-forum-settings",
    category: "community",
    label: "Forum & AI Settings",
    description: "Configure forum assistants, local LLM models (Ollama/Gemini), and prompt helpers.",
    icon: Bot,
    href: "/admin/forum/settings",
    permission: PERMISSION_LEVELS.HEAD_MODERATOR,
    keywords: ["ai", "forum settings", "ollama", "gemini", "models", "assistants", "prompts"],
  },
  {
    id: "community-feed",
    category: "community",
    label: "Social Feed",
    description: "Moderate community clips, pin trending posts, and review flagged content.",
    icon: Share2,
    href: "/admin/feed",
    permission: PERMISSION_LEVELS.MODERATOR,
    keywords: ["feed", "social", "posts", "clips", "tiktok", "reels", "moderate", "likes", "flags"],
  },
  {
    id: "community-reports",
    category: "community",
    label: "Moderation Queue",
    description: "Review user reports on forum threads, replies, and community feed posts.",
    icon: Flag,
    href: "/admin/reports",
    permission: PERMISSION_LEVELS.MODERATOR,
    keywords: ["reports", "flags", "moderation queue", "abuse", "spam", "tickets", "review"],
  },
  {
    id: "community-tickets",
    category: "community",
    label: "Support Tickets",
    description: "Help players with support tickets, ban appeals, bug reports, and store inquiries.",
    icon: LifeBuoy,
    href: "/admin/tickets",
    permission: PERMISSION_LEVELS.MODERATOR,
    keywords: ["tickets", "support", "helpdesk", "appeals", "inquiries", "reports", "customer service"],
  },
  {
    id: "community-streams",
    category: "community",
    label: "Stream Approvals",
    description: "Review Twitch and Kick creator submissions and adjust front-page featured priority.",
    icon: Monitor,
    href: "/admin/streams",
    permission: PERMISSION_LEVELS.MODERATOR,
    keywords: ["streams", "twitch", "kick", "streamers", "broadcasts", "live", "creators"],
  },
  {
    id: "community-messenger",
    category: "community",
    label: "Messenger Oversight",
    description: "Monitor group chats, friendship graph health, and E2EE encryption status.",
    icon: MessagesSquare,
    href: "/admin/messenger",
    permission: PERMISSION_LEVELS.ADMIN,
    keywords: ["messenger", "dm", "direct messages", "group chat", "friends", "e2ee", "keys"],
  },
  {
    id: "community-wiki",
    category: "community",
    label: "Wiki & Game Guides",
    description: "Manage official game wiki articles, starter guides, and lore documentation.",
    icon: BookOpen,
    href: "/admin/wiki",
    permission: PERMISSION_LEVELS.HEAD_MODERATOR,
    allowWriter: true,
    keywords: ["wiki", "guides", "documentation", "lore", "help", "knowledge base", "tutorials"],
  },
  {
    id: "content-rss",
    category: "community",
    label: "RSS News Feeds",
    description: "Add automated gaming news RSS feeds to syndicate articles across the site.",
    icon: Rss,
    href: "/admin/rss",
    permission: PERMISSION_LEVELS.COMMUNITY_MANAGER,
    keywords: ["rss", "feeds", "gaming news", "aggregator", "syndication", "external news"],
  },
  {
    id: "community-media",
    category: "community",
    label: "Media Library",
    description: "Browse uploaded thread attachments, user images, and storage disk usage.",
    icon: HardDrive,
    href: "/admin/media",
    permission: PERMISSION_LEVELS.ADMIN,
    keywords: ["media", "uploads", "images", "files", "attachments", "disk", "storage", "pictures"],
  },
  {
    id: "content-promo",
    category: "community",
    label: "Promo & Referral Links",
    description: "Create referral links, track partner traffic, and manage starter gift campaigns.",
    icon: Gift,
    href: "/admin/promo",
    permission: PERMISSION_LEVELS.ADMIN,
    keywords: ["promo", "referrals", "campaigns", "gift codes", "rewards", "coupons", "links"],
  },

  // ─── IDENTITY, PROGRESSION & ECONOMY ───────────────────────────────────────
  {
    id: "identity-users",
    category: "identity",
    label: "User Management",
    description: "Search community members, ban accounts, assign staff roles, and reset passwords.",
    icon: Users,
    href: "/admin/users",
    permission: PERMISSION_LEVELS.ADMIN,
    keywords: ["users", "accounts", "bans", "moderation", "members", "staff", "permissions", "passwords"],
  },
  {
    id: "identity-roles",
    category: "identity",
    label: "Role Management",
    description: "Inspect dynamic RBAC roles, permission security tiers, and user badge colors.",
    icon: ShieldAlert,
    href: "/admin/roles",
    permission: PERMISSION_LEVELS.DEVELOPER,
    keywords: ["roles", "rbac", "permissions", "levels", "groups", "security", "privileges"],
  },
  {
    id: "progression-tiers",
    category: "identity",
    label: "Level Tiers & XP",
    description: "Configure XP thresholds, rank title names, and unlockable rank emojis.",
    icon: Award,
    href: "/admin/tiers",
    permission: PERMISSION_LEVELS.ADMIN,
    keywords: ["tiers", "levels", "xp", "ranks", "progression", "titles", "badges"],
  },
  {
    id: "progression-leaderboards",
    category: "identity",
    label: "Leaderboards",
    description: "Inspect top community contributors, XP standings, and seasonal rankings.",
    icon: Trophy,
    href: "/admin/leaderboards",
    permission: PERMISSION_LEVELS.ADMIN,
    keywords: ["leaderboard", "rankings", "top users", "xp", "levels", "competition", "standings"],
  },
  {
    id: "progression-achievements",
    category: "identity",
    label: "Achievements",
    description: "Grant custom achievement badges and medals to active community members.",
    icon: ShieldCheck,
    href: "/admin/achievements",
    permission: PERMISSION_LEVELS.ADMIN,
    keywords: ["achievements", "badges", "awards", "medals", "honors", "rewards"],
  },
  {
    id: "identity-guilds",
    category: "identity",
    label: "Guilds Oversight",
    description: "Inspect player guilds, member rosters, guild tags, and bank balances.",
    icon: Crown,
    href: "/admin/guilds",
    permission: PERMISSION_LEVELS.ADMIN,
    keywords: ["guilds", "clans", "guild members", "leaders", "guild bank", "teams"],
  },
  {
    id: "identity-economy",
    category: "identity",
    label: "Economy & Audits",
    description: "Audit player inventories, Grand Trade Center listings, and transaction logs.",
    icon: Coins,
    href: "/admin/economy",
    permission: PERMISSION_LEVELS.ADMIN,
    keywords: ["economy", "inventory", "gtc", "marketplace", "gold", "coins", "audit", "logs", "wealth"],
  },

  // ─── GAME SERVERS & INFRASTRUCTURE ─────────────────────────────────────────
  {
    id: "servers-registry",
    category: "infrastructure",
    label: "Game Servers",
    description: "Manage dedicated community servers and toggle maintenance mode banners.",
    icon: Server,
    href: "/admin/game-servers",
    permission: PERMISSION_LEVELS.ADMIN,
    keywords: ["servers", "game servers", "palworld", "dedicated", "maintenance", "ip", "ports"],
  },
  {
    id: "servers-modpacks",
    category: "infrastructure",
    label: "Modpacks & Files",
    description: "Manage client modpack downloads, version hashes, and installation guides.",
    icon: Package,
    href: "/admin/modpacks",
    permission: PERMISSION_LEVELS.ADMIN,
    keywords: ["modpacks", "clients", "downloads", "mods", "patches", "installers"],
  },
  {
    id: "fivem-characters",
    category: "infrastructure",
    label: "FiveM Characters",
    description: "Inspect GTA RP character records, bank wealth, and faction memberships.",
    icon: Users,
    href: "/admin/characters",
    permission: PERMISSION_LEVELS.ADMIN,
    keywords: ["fivem", "gta", "rp", "characters", "cash", "bank", "deceased", "factions"],
  },
  {
    id: "fivem-server-manager",
    category: "infrastructure",
    label: "FiveM txAdmin",
    description: "Start, stop, and control your local FXServer instance and txAdmin panel.",
    icon: Server,
    href: "/admin/server-manager",
    permission: PERMISSION_LEVELS.FIVEM_DEVELOPER,
    keywords: ["fivem", "txadmin", "fxserver", "restart", "start server", "console"],
  },
  {
    id: "infra-notifications",
    category: "infrastructure",
    label: "Broadcasts & Alerts",
    description: "Send site-wide announcement banners, maintenance notices, and player alerts.",
    icon: Megaphone,
    href: "/admin/notifications",
    permission: PERMISSION_LEVELS.ADMIN,
    keywords: ["notifications", "broadcasts", "announcements", "banners", "maintenance alert", "alerts"],
  },
  {
    id: "config-settings",
    category: "infrastructure",
    label: "Platform Settings",
    description: "Configure realm identity, economy defaults, Discord guild sync, and site keys.",
    icon: Settings,
    href: "/admin/settings",
    permission: PERMISSION_LEVELS.DEVELOPER,
    keywords: ["settings", "configuration", "economy", "discord", "realm", "keys", "site version"],
  },
  {
    id: "infra-seo",
    category: "infrastructure",
    label: "SEO & Search Engine Hub",
    description: "Visual Google SERP simulator, meta tag editor, robots.txt, sitemaps, and webmaster tools.",
    icon: Globe,
    href: "/admin/seo",
    permission: PERMISSION_LEVELS.ADMIN,
    keywords: ["seo", "google", "serp", "search", "preview", "sitemap", "robots", "schema", "bing", "verification", "opengraph", "metadata", "social"],
  },

  // ─── DEVELOPER CONSOLE ─────────────────────────────────────────────────────
  {
    id: "dev-console-home",
    category: "developer",
    label: "Console Home",
    description: "System index, complete route directory, and quick developer actions.",
    icon: Terminal,
    href: "/admin/dev",
    permission: PERMISSION_LEVELS.DEVELOPER,
    exact: true,
    keywords: ["dev", "console", "sitemap", "terminal", "actions", "index", "routes"],
  },
  {
    id: "dev-database",
    category: "developer",
    label: "Database Diagnostics",
    description: "Prisma table record counts, connection endpoints, and test dummy content generators.",
    icon: Database,
    href: "/admin/dev/database",
    permission: PERMISSION_LEVELS.DEVELOPER,
    keywords: ["database", "prisma", "sqlite", "tables", "seed", "dummy", "diagnostics", "purge"],
  },
  {
    id: "dev-tasks",
    category: "developer",
    label: "Background Tasks",
    description: "Manually trigger background cron jobs, cache flushes, and stream synchronizations.",
    icon: RefreshCw,
    href: "/admin/dev/tasks",
    permission: PERMISSION_LEVELS.DEVELOPER,
    keywords: ["tasks", "cron", "jobs", "background", "sync", "stream checks", "rss runner"],
  },
  {
    id: "dev-sandbox",
    category: "developer",
    label: "API Sandbox",
    description: "Execute and test internal REST API endpoints and webhooks with ready-made presets.",
    icon: Code,
    href: "/admin/dev/sandbox",
    permission: PERMISSION_LEVELS.DEVELOPER,
    keywords: ["sandbox", "api", "rest", "endpoints", "http", "testing", "fetch", "webhooks"],
  },
];

/**
 * Filter modules visible to a user given their permission level and writer status.
 */
export function getVisibleAdminModules(
  permissionLevel: number,
  isWriter: boolean = false
): AdminModule[] {
  return ADMIN_MODULES.filter((m) => {
    if (isWriter && m.allowWriter) return true;
    return permissionLevel >= m.permission;
  });
}

/**
 * Group visible modules by category in canonical order.
 */
export function getCategorizedAdminModules(
  permissionLevel: number,
  isWriter: boolean = false
): Array<{ category: AdminCategory; modules: AdminModule[] }> {
  const visible = getVisibleAdminModules(permissionLevel, isWriter);
  const categories = Object.values(ADMIN_CATEGORIES).sort((a, b) => a.order - b.order);

  return categories
    .map((cat) => ({
      category: cat,
      modules: visible.filter((m) => m.category === cat.id),
    }))
    .filter((group) => group.modules.length > 0);
}

/**
 * Find a specific module by id or route href.
 */
export function getAdminModuleById(idOrHref: string): AdminModule | undefined {
  return ADMIN_MODULES.find((m) => m.id === idOrHref || m.href === idOrHref);
}

/**
 * Find active admin module from current pathname.
 */
export function getActiveAdminModule(pathname: string): AdminModule | undefined {
  // First attempt exact match
  const exact = ADMIN_MODULES.find((m) => m.href === pathname);
  if (exact) return exact;

  // Next match prefix (longest href match)
  const matches = ADMIN_MODULES.filter(
    (m) => !m.exact && pathname.startsWith(m.href + "/")
  ).sort((a, b) => b.href.length - a.href.length);

  return matches[0];
}

/**
 * Search admin modules by keyword, label, or description.
 */
export function searchAdminModules(
  query: string,
  permissionLevel: number,
  isWriter: boolean = false
): AdminModule[] {
  const q = query.trim().toLowerCase();
  if (!q) return getVisibleAdminModules(permissionLevel, isWriter);

  return getVisibleAdminModules(permissionLevel, isWriter).filter((m) => {
    if (m.label.toLowerCase().includes(q)) return true;
    if (m.description.toLowerCase().includes(q)) return true;
    if (m.href.toLowerCase().includes(q)) return true;
    if (m.keywords?.some((k) => k.toLowerCase().includes(q))) return true;
    return false;
  });
}
