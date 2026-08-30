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
    description: "System health, live operations, and command center status.",
    icon: LayoutDashboard,
    order: 1,
  },
  operations: {
    id: "operations",
    label: "World & Game Operations",
    shortLabel: "World & MMO",
    description: "MMO runtime management, Studio, quests, creatures, and assets.",
    icon: Gamepad2,
    order: 2,
  },
  community: {
    id: "community",
    label: "Community & Content",
    shortLabel: "Community",
    description: "Publishing, forums, moderation, support, and live streaming.",
    icon: MessageSquare,
    order: 3,
  },
  identity: {
    id: "identity",
    label: "Identity, Progression & Economy",
    shortLabel: "Identity & Roles",
    description: "User security, RBAC roles, XP progression, and achievement badges.",
    icon: ShieldCheck,
    order: 4,
  },
  infrastructure: {
    id: "infrastructure",
    label: "Game Servers & Infrastructure",
    shortLabel: "Infrastructure",
    description: "Dedicated servers, client modpacks, FiveM, and site configuration.",
    icon: Server,
    order: 5,
  },
  developer: {
    id: "developer",
    label: "Developer Console",
    shortLabel: "Developer",
    description: "Technical diagnostics, database utilities, API sandbox, and background tasks.",
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
    description: "Operational overview, health strip, and quick actions.",
    icon: LayoutDashboard,
    href: "/admin",
    permission: PERMISSION_LEVELS.MODERATOR,
    exact: true,
    allowWriter: true,
    keywords: ["home", "dashboard", "status", "overview", "command center", "stats"],
  },
  {
    id: "overview-realtime",
    category: "overview",
    label: "Realtime Bus",
    description: "Socket.IO bus metrics, circuit breaker, and live connections.",
    icon: Radio,
    href: "/admin/realtime",
    permission: PERMISSION_LEVELS.DEVELOPER,
    statusSource: "realtime",
    keywords: ["socket", "bus", "realtime", "circuit breaker", "disconnect", "events", "websocket"],
  },
  {
    id: "overview-metrics",
    category: "overview",
    label: "System Metrics",
    description: "Node.js process telemetry, memory consumption, and load.",
    icon: Activity,
    href: "/admin/dev/metrics",
    permission: PERMISSION_LEVELS.DEVELOPER,
    keywords: ["metrics", "memory", "cpu", "telemetry", "nodejs", "performance"],
  },
  {
    id: "overview-system",
    category: "overview",
    label: "System State",
    description: "Environment variables, deployment build, and cache management.",
    icon: Cpu,
    href: "/admin/dev/system",
    permission: PERMISSION_LEVELS.DEVELOPER,
    keywords: ["environment", "env", "system", "version", "cache", "build", "state"],
  },

  // ─── WORLD & GAME OPERATIONS ───────────────────────────────────────────────
  {
    id: "game-mmo-sandbox",
    category: "operations",
    label: "MMO Operations",
    description: "Active MMO character roster and live item injection.",
    icon: Gamepad2,
    href: "/admin/game",
    permission: PERMISSION_LEVELS.DEVELOPER,
    keywords: ["mmo", "characters", "items", "inventory", "inject", "sandbox", "players"],
  },
  {
    id: "game-lobby-mgmt",
    category: "operations",
    label: "Lobby & MMO Gateway",
    description: "Go MMO and TypeScript game engine gateway status.",
    icon: MapPin,
    href: "/admin/dev/lobby",
    permission: PERMISSION_LEVELS.DEVELOPER,
    statusSource: "mmo-gateway",
    keywords: ["lobby", "gateway", "server status", "shards", "engine", "mmo status"],
  },
  {
    id: "game-studio",
    category: "operations",
    label: "World Studio",
    description: "Launch the 2.5D Babylon world builder and level editor.",
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
    description: "Build narrative NPC dialogues, requirements, and reward tables.",
    icon: ScrollText,
    href: "/admin/game-dev/quests",
    permission: PERMISSION_LEVELS.DEVELOPER,
    keywords: ["quests", "dialogue", "npcs", "rewards", "missions", "objectives"],
  },
  {
    id: "game-creatures",
    category: "operations",
    label: "Beast & Creature Catalog",
    description: "Explore registered creature species, element types, passives, and movesets.",
    icon: Gamepad2,
    href: "/studio?tab=creatures",
    permission: PERMISSION_LEVELS.DEVELOPER,
    keywords: ["creatures", "beasts", "species", "stats", "moves", "abilities", "monsters", "saints"],
  },
  {
    id: "game-assets",
    category: "operations",
    label: "Pixel Asset Studio",
    description: "Batch import and categorize 16x16 / 32x32 tiles and sprites.",
    icon: ImageIcon,
    href: "/admin/game-dev/assets",
    permission: PERMISSION_LEVELS.DEVELOPER,
    keywords: ["assets", "sprites", "pixel art", "tiles", "textures", "graphics", "importer"],
  },

  // ─── COMMUNITY & CONTENT ───────────────────────────────────────────────────
  {
    id: "content-news",
    category: "community",
    label: "News & Announcements",
    description: "Draft, schedule, and publish front-page community articles.",
    icon: Newspaper,
    href: "/admin/news",
    permission: PERMISSION_LEVELS.ADMIN,
    allowWriter: true,
    keywords: ["news", "articles", "announcements", "posts", "blog", "cms", "writer"],
  },
  {
    id: "community-forum",
    category: "community",
    label: "Forum Categories",
    description: "Manage forum boards, categories, and hierarchical ordering.",
    icon: MessageSquare,
    href: "/admin/forum",
    permission: PERMISSION_LEVELS.HEAD_MODERATOR,
    keywords: ["forum", "categories", "boards", "threads", "discussions", "subcategories"],
  },
  {
    id: "community-forum-settings",
    category: "community",
    label: "Forum & AI Settings",
    description: "Configure forum assistants, local LLM models, and enhancement prompts.",
    icon: Bot,
    href: "/admin/forum/settings",
    permission: PERMISSION_LEVELS.HEAD_MODERATOR,
    keywords: ["ai", "forum settings", "ollama", "gemini", "models", "assistants"],
  },
  {
    id: "community-tickets",
    category: "community",
    label: "Support Tickets",
    description: "Review and respond to player appeals, inquiries, and reports.",
    icon: LifeBuoy,
    href: "/admin/tickets",
    permission: PERMISSION_LEVELS.MODERATOR,
    keywords: ["tickets", "support", "helpdesk", "appeals", "inquiries", "reports"],
  },
  {
    id: "community-streams",
    category: "community",
    label: "Stream Approvals",
    description: "Review and authorize Twitch / Kick community stream submissions.",
    icon: Monitor,
    href: "/admin/streams",
    permission: PERMISSION_LEVELS.MODERATOR,
    keywords: ["streams", "twitch", "kick", "streamers", "broadcasts", "live"],
  },
  {
    id: "content-rss",
    category: "community",
    label: "RSS Feeds",
    description: "Configure automated gaming news RSS aggregators and sync intervals.",
    icon: Rss,
    href: "/admin/rss",
    permission: PERMISSION_LEVELS.COMMUNITY_MANAGER,
    keywords: ["rss", "feeds", "gaming news", "aggregator", "syndication"],
  },

  // ─── IDENTITY, PROGRESSION & ECONOMY ───────────────────────────────────────
  {
    id: "identity-users",
    category: "identity",
    label: "User Management",
    description: "Search community members, ban accounts, and assign staff roles.",
    icon: Users,
    href: "/admin/users",
    permission: PERMISSION_LEVELS.ADMIN,
    keywords: ["users", "accounts", "bans", "moderation", "members", "staff", "permissions"],
  },
  {
    id: "identity-roles",
    category: "identity",
    label: "Role Management",
    description: "Inspect dynamic RBAC roles, permission levels, and badge styles.",
    icon: ShieldAlert,
    href: "/admin/roles",
    permission: PERMISSION_LEVELS.DEVELOPER,
    keywords: ["roles", "rbac", "permissions", "levels", "groups", "security"],
  },
  {
    id: "progression-tiers",
    category: "identity",
    label: "Level Tiers & XP",
    description: "Manage XP rank thresholds, level numbers, and title badges.",
    icon: Award,
    href: "/admin/tiers",
    permission: PERMISSION_LEVELS.ADMIN,
    keywords: ["tiers", "levels", "xp", "ranks", "progression", "titles"],
  },
  {
    id: "progression-achievements",
    category: "identity",
    label: "Achievements",
    description: "Grant and manage community achievement badges.",
    icon: ShieldCheck,
    href: "/admin/achievements",
    permission: PERMISSION_LEVELS.ADMIN,
    keywords: ["achievements", "badges", "awards", "medals", "honors"],
  },

  // ─── GAME SERVERS & INFRASTRUCTURE ─────────────────────────────────────────
  {
    id: "servers-registry",
    category: "infrastructure",
    label: "Game Servers",
    description: "Manage official community game servers and maintenance flags.",
    icon: Server,
    href: "/admin/game-servers",
    permission: PERMISSION_LEVELS.ADMIN,
    keywords: ["servers", "game servers", "palworld", "dedicated", "maintenance", "ip", "ports"],
  },
  {
    id: "servers-modpacks",
    category: "infrastructure",
    label: "Modpacks & Client Files",
    description: "Manage client modpack downloads, hashes, and installation guides.",
    icon: Package,
    href: "/admin/modpacks",
    permission: PERMISSION_LEVELS.ADMIN,
    keywords: ["modpacks", "clients", "downloads", "mods", "patches", "installers"],
  },
  {
    id: "fivem-characters",
    category: "infrastructure",
    label: "FiveM Characters",
    description: "Inspect and manage GTA RP character records and statuses.",
    icon: Users,
    href: "/admin/characters",
    permission: PERMISSION_LEVELS.ADMIN,
    keywords: ["fivem", "gta", "rp", "characters", "cash", "bank", "deceased"],
  },
  {
    id: "fivem-server-manager",
    category: "infrastructure",
    label: "FiveM txAdmin",
    description: "Start, stop, and control local FXServer and txAdmin panel.",
    icon: Server,
    href: "/admin/server-manager",
    permission: PERMISSION_LEVELS.FIVEM_DEVELOPER,
    keywords: ["fivem", "txadmin", "fxserver", "restart", "start server", "console"],
  },
  {
    id: "config-settings",
    category: "infrastructure",
    label: "Platform Settings",
    description: "Configure realm identity, economy defaults, Discord, and site keys.",
    icon: Settings,
    href: "/admin/settings",
    permission: PERMISSION_LEVELS.DEVELOPER,
    keywords: ["settings", "configuration", "economy", "discord", "realm", "keys", "site version"],
  },

  // ─── DEVELOPER CONSOLE ─────────────────────────────────────────────────────
  {
    id: "dev-console-home",
    category: "developer",
    label: "Console Home",
    description: "System index, live route directory, and developer action triggers.",
    icon: Terminal,
    href: "/admin/dev",
    permission: PERMISSION_LEVELS.DEVELOPER,
    exact: true,
    keywords: ["dev", "console", "sitemap", "terminal", "actions", "index"],
  },
  {
    id: "dev-database",
    category: "developer",
    label: "Database Diagnostics",
    description: "Prisma SQLite table diagnostics, record counts, and dummy seeding.",
    icon: Database,
    href: "/admin/dev/database",
    permission: PERMISSION_LEVELS.DEVELOPER,
    keywords: ["database", "prisma", "sqlite", "tables", "seed", "dummy", "diagnostics"],
  },
  {
    id: "dev-tasks",
    category: "developer",
    label: "Background Tasks",
    description: "Manual trigger and status dashboard for background cron runners.",
    icon: RefreshCw,
    href: "/admin/dev/tasks",
    permission: PERMISSION_LEVELS.DEVELOPER,
    keywords: ["tasks", "cron", "jobs", "background", "sync", "stream checks", "rss runner"],
  },
  {
    id: "dev-sandbox",
    category: "developer",
    label: "API Sandbox",
    description: "Execute and test internal REST API endpoints with presets.",
    icon: Code,
    href: "/admin/dev/sandbox",
    permission: PERMISSION_LEVELS.DEVELOPER,
    keywords: ["sandbox", "api", "rest", "endpoints", "http", "testing", "fetch"],
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
