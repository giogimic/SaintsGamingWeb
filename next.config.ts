import type { NextConfig } from "next";

function cdnRemotePattern():
  | { protocol: "http" | "https"; hostname: string; pathname: string }
  | null {
  const raw = (process.env.CDN_BASE_URL || process.env.NEXT_PUBLIC_CDN_BASE_URL || "").trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return {
      protocol: url.protocol.replace(":", "") as "http" | "https",
      hostname: url.hostname,
      pathname: "/uploads/**",
    };
  } catch {
    return null;
  }
}

const cdnPattern = cdnRemotePattern();

const nextConfig: NextConfig = {
  // Exclude scripts directory from build
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'].filter(ext => ext),
  // Keep Node redis / socket stack out of the browser compiler
  serverExternalPackages: ["redis", "@redis/client", "socket.io", "socket.io-adapter"],
  webpack: (config) => {
    config.module.rules.push({
      test: /\.tsx?$/,
      exclude: /scripts/,
    });
    // The SQLite database lives inside the repo, so every gameplay write used to
    // trip the dev watcher. The resulting Fast Refresh remounts the Babylon
    // canvas, and remounting clears live Studio paint overlays.
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        "**/.git/**",
        "**/node_modules/**",
        "**/logs/**",
        "**/*.db",
        "**/*.db-journal",
        "**/*.db-wal",
        "**/*.db-shm",
      ],
    };
    return config;
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'i.imgur.com' },
      { protocol: 'https', hostname: 'cdn.discordapp.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'static-cdn.jtvnw.net' }, // Twitch
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      ...(cdnPattern ? [cdnPattern] : []),
    ],
  },
  poweredByHeader: false,
  // Classic flat-canvas /game stub is gone — always send people to the real lobby.
  async redirects() {
    return [
      { source: "/game", destination: "/lobby", permanent: true },
      { source: "/game/:path*", destination: "/lobby", permanent: true },
    ];
  },
  // Legacy broken sprite prefix → real NPC walk sheets (no client URL change)
  async rewrites() {
    return [
      { source: "/assets/sprites/:path*", destination: "/game-assets/npc/:path*" },
      { source: "/game-assets/sprites/:path*", destination: "/game-assets/npc/:path*" },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
